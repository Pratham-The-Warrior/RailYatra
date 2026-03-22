/**
 * transformer.service.js
 * 
 * Logic to transform raw scraper JSON into frontend-ready data.
 * Centralizes station positioning, delay calculation, and timeline state.
 */

/**
 * Self-contained time parser to avoid external dependencies for now.
 */
const parseTimeAndDate = (timeStr) => {
    if (!timeStr || timeStr === '--' || timeStr.includes('SOURCE') || timeStr.includes('DEST')) {
        return { time: timeStr, date: null };
    }
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length > 1) {
        const timePart = parts.find(p => p.includes(':'));
        const datePart = parts.find(p => !p.includes(':'));
        return { time: timePart || timeStr, date: datePart || null };
    }
    return { time: timeStr, date: null };
};

/**
 * Helper to format absolute minutes back into HH:mm format,
 * preserving existing date suffix if possible.
 */
const formatMinutes = (absMin, originalStr) => {
    if (absMin === null) return originalStr;
    const parts = (originalStr || "").trim().split(/\s+/);
    const datePart = parts.length > 1 ? parts.find(p => !p.includes(':')) : null;
    const totalMins = ((absMin % 1440) + 1440) % 1440;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return datePart ? `${timeStr} ${datePart}` : timeStr;
};

/**
 * Calculates absolute minutes from a start date and time.
 */
const getAbsoluteMinutes = (timeStr, baseDateStr) => {
    if (!timeStr || timeStr === '--' || timeStr === 'SOURCE' || timeStr === 'DEST') return null;

    const timeParts = timeStr.trim().split(/\s+/);
    let time = timeParts[0];
    let ampm = timeParts.length > 1 ? timeParts[1].toUpperCase() : null;
    let explicitDate = timeParts.length > 2 ? timeParts[2] : (timeParts.length > 1 && !['AM', 'PM'].includes(ampm) ? ampm : null);

    if (ampm && !['AM', 'PM'].includes(ampm)) {
        explicitDate = ampm;
        ampm = null;
    }

    let [h, m] = time.split(':').map(Number);
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    let total = h * 60 + m;

    if (explicitDate && baseDateStr) {
        try {
            // explicitDate is "DD-MMM" (e.g., "23-MAR") or "DD" (e.g., "23")
            // baseDateStr is "DD-MMM-YYYY" (e.g., "21-MAR-2026")
            const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

            const [dStr, mStr] = explicitDate.split(/[-/]/);
            const [bdStr, bmStr, byStr] = baseDateStr.split(/[-/]/);

            const day = parseInt(dStr);
            const baseDay = parseInt(bdStr);
            const baseMonth = months.indexOf(bmStr.toUpperCase());
            const baseYear = parseInt(byStr);

            // If month is missing in explicitDate, assume same as baseMonth
            let month = mStr ? months.indexOf(mStr.toUpperCase()) : baseMonth;
            let year = baseYear;

            // Simple heuristic for month/year rollover if mStr is missing
            if (!mStr && day < baseDay) {
                month++;
                if (month > 11) {
                    month = 0;
                    year++;
                }
            }

            const baseDate = new Date(baseYear, baseMonth, baseDay);
            let targetDate = new Date(year, month, day);

            // Handle year rollover (e.g., Dec 31 to Jan 1)
            if (targetDate < baseDate && (baseMonth === 11 && month === 0)) {
                targetDate.setFullYear(targetDate.getFullYear() + 1);
            }

            const diffMs = targetDate - baseDate;
            const dayDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (!isNaN(dayDiff)) {
                total += dayDiff * 1440;
            }
        } catch (e) { }
    }
    return total;
};

exports.transformLiveStatus = (statusData) => {
    const meta = statusData.meta;
    const itinerary = statusData.itinerary || [];
    const currentLoc = (meta.current_location || "").toUpperCase();
    const startDate = meta.start_date;

    let lastSchMin = -720, lastActMin = -720;
    itinerary.forEach((stop, i) => {
        const rSA = getAbsoluteMinutes(stop.timings.sch_arr, startDate);
        const rSD = getAbsoluteMinutes(stop.timings.sch_dep, startDate);
        const rAA = getAbsoluteMinutes(stop.timings.act_arr, startDate);
        const rAD = getAbsoluteMinutes(stop.timings.act_dep, startDate);
        let sA = null, sD = null, aA = null, aD = null;
        if (rSA !== null) { sA = rSA; while (sA < lastSchMin - 120) sA += 1440; lastSchMin = Math.max(lastSchMin, sA); }
        if (rSD !== null) { sD = rSD; while (sD < lastSchMin - 120) sD += 1440; lastSchMin = Math.max(lastSchMin, sD); }
        if (rAA !== null) { let base = lastActMin > -720 ? lastActMin : (sA || 0); aA = rAA; while (aA < base - 720) aA += 1440; lastActMin = Math.max(lastActMin, aA); }
        if (rAD !== null) { let base = lastActMin > -720 ? lastActMin : (sD || 0); aD = rAD; while (aD < base - 720) aD += 1440; lastActMin = Math.max(lastActMin, aD); }

        // --- FIX: Propagate Arrival Delay to Departure ---
        // If the train arrives late, the expected departure should AT LEAST be
        // (Actual Arrival + Scheduled Halt).
        if (sA !== null && sD !== null && aA !== null && aD !== null && sD >= sA) {
            const schHalt = sD - sA;
            if (aD < aA + schHalt) {
                aD = aA + schHalt;
                stop.timings.act_dep = formatMinutes(aD, stop.timings.act_dep);
                lastActMin = Math.max(lastActMin, aD);
            }
        }

        stop.absMins = { sch_arr: sA, sch_dep: sD, act_arr: aA, act_dep: aD };
    });

    let activeIdx = 0;
    let isMoving = false;
    let found = false;

    // --- 1. Pattern Matching (Relational & Direct) ---

    // Pattern: "Running between A and B" or "Between A and B"
    const betweenMatch = currentLoc.match(/(?:RUNNING\s+)?BETWEEN\s+(.+?)\s+AND\s+(.+?)(?:\s+AT\s+|$)/i);
    if (betweenMatch) {
        const stationA = betweenMatch[1].trim();
        const stationB = betweenMatch[2].trim();
        const idxA = itinerary.findIndex(s => stationA.includes(s.station.toUpperCase()) || s.station.toUpperCase().includes(stationA));
        const idxB = itinerary.findIndex(s => stationB.includes(s.station.toUpperCase()) || s.station.toUpperCase().includes(stationB));

        if (idxA !== -1) {
            activeIdx = idxA;
            isMoving = true;
            found = true;
        } else if (idxB !== -1) {
            activeIdx = Math.max(0, idxB - 1);
            isMoving = true;
            found = true;
        }
    }


    // Pattern: "Departed A" or "Left A"
    if (!found) {
        const departedMatch = currentLoc.match(/(?:DEPARTED|LEFT|FROM)\s+(.+?)(?:\s+AT\s+|$)/i);
        if (departedMatch) {
            const station = departedMatch[1].trim();
            const idx = itinerary.findIndex(s => station.includes(s.station.toUpperCase()) || s.station.toUpperCase().includes(station));
            if (idx !== -1) {
                activeIdx = idx;
                isMoving = true;
                found = true;
            }
        }
    }

    // Pattern: "Arrived A" or "At A"
    if (!found) {
        const arrivedMatch = currentLoc.match(/(?:ARRIVED|AT)\s+(.+?)(?:\s+AT\s+|$)/i);
        if (arrivedMatch) {
            const station = arrivedMatch[1].trim();
            const idx = itinerary.findIndex(s => station.includes(s.station.toUpperCase()) || s.station.toUpperCase().includes(station));
            if (idx !== -1) {
                activeIdx = idx;
                isMoving = false;
                found = true;
            }
        }
    }

    if (!found) {
        for (let i = itinerary.length - 1; i >= 0; i--) {
            const s = (itinerary[i].status || "").toUpperCase();
            if (s.includes("DEPARTED") || s.includes("LEFT") || s.includes("PASSED")) {
                activeIdx = i;
                isMoving = true;
                found = true;
                break;
            }
            if (s.includes("ARRIVED") || s.includes("HALTED") || s.includes("REACHED")) {
                activeIdx = i;
                isMoving = s.includes("PASSED");
                found = true;
                break;
            }
        }
    }

    // --- 3. Time-based matching / Passing Station Logic ---
    // If it mentions a station we don't know, or we still haven't found it
    const timeMatch = currentLoc.match(/AT\s+(\d{1,2}:\d{2}(?:\s+\d{1,2}-[a-zA-Z]{3})?)/i);
    let refAbsMin = null;
    if (timeMatch) {
        let rawRefMin = getAbsoluteMinutes(timeMatch[1], startDate);
        if (rawRefMin !== null) {
            refAbsMin = rawRefMin;
            const hasDate = timeMatch[1].trim().split(/\s+/).length > 1;
            if (!hasDate) {
                // Approximate fallback if date missing
                refAbsMin += 0;
            }
        }
    }

    if (!found || (found && isMoving)) {
        if (refAbsMin !== null) {
            let latestTimeIdx = -1;
            for (let i = 0; i < itinerary.length; i++) {
                const current = itinerary[i];
                let compareMin = current.absMins.act_dep ?? current.absMins.sch_dep;

                if (compareMin === null) {
                    compareMin = current.absMins.act_arr ?? current.absMins.sch_arr;
                }

                if (compareMin !== null && refAbsMin >= compareMin) {
                    latestTimeIdx = i;
                }
            }
            if (latestTimeIdx !== -1 && (!found || latestTimeIdx > activeIdx)) {
                activeIdx = latestTimeIdx;
                isMoving = latestTimeIdx < itinerary.length - 1; // Not moving if at final stop
                found = true;
            }
        }
    }

    // --- Final Enrichment ---
    const enrichedItinerary = itinerary.map((stop, stopIdx) => {
        const isPassed = isMoving ? stopIdx <= activeIdx : stopIdx < activeIdx;
        const isCurrent = !isMoving && stopIdx === activeIdx;

        let haltMins = 0;
        const arrMin = stop.absMins.act_arr ?? stop.absMins.sch_arr;
        const depMin = stop.absMins.act_dep ?? stop.absMins.sch_dep;
        if (arrMin !== null && depMin !== null && depMin > arrMin) {
            haltMins = depMin - arrMin;
        }

        return {
            ...stop,
            isPassed,
            isCurrent,
            isUpcoming: stopIdx > activeIdx,
            haltMins
        };
    });


    const coveredStationsCount = currentLoc.includes('ARRIVED') || currentLoc.includes('DEPARTED') || currentLoc.includes('LEFT') ? activeIdx + 1 : activeIdx;

    // Calculate remainingTime: destination arrival - current station departure
    let remainingTime = "--:--";
    if (activeIdx < itinerary.length - 1) {
        try {
            const dest = itinerary[itinerary.length - 1];
            const activeStop = itinerary[activeIdx];

            const destMins = dest.timings.act_arr !== '--' && dest.absMins.act_arr !== null ? dest.absMins.act_arr : dest.absMins.sch_arr;
            const depMins = activeStop.timings.act_dep !== '--' && activeStop.absMins.act_dep !== null ? activeStop.absMins.act_dep : activeStop.absMins.sch_dep;

            if (destMins !== null && depMins !== null && destMins > depMins) {
                let diffMins = destMins - depMins;

                // --- Optimization: Subtract elapsed time if moving ---
                const timeMatch = currentLoc.match(/AT\s+(\d{1,2}:\d{2}(?:\s+\d{1,2}-[a-zA-Z]{3})?)/i);
                if (isMoving && timeMatch) {
                    let rawRefMin = getAbsoluteMinutes(timeMatch[1], startDate);
                    if (rawRefMin !== null) {
                        let locRefAbsMin = rawRefMin;
                        const hasDate = timeMatch[1].trim().split(/\s+/).length > 1;
                        if (!hasDate) {
                            while (locRefAbsMin < depMins - 720) locRefAbsMin += 1440;
                        }
                        if (locRefAbsMin > depMins) {
                            const elapsed = locRefAbsMin - depMins;
                            diffMins = Math.max(0, diffMins - elapsed);
                        }
                    }
                }

                const diffHrs = Math.floor(diffMins / 60);
                const diffRem = diffMins % 60;
                remainingTime = `${String(diffHrs).padStart(2, '0')}:${String(diffRem).padStart(2, '0')}`;
            }
        } catch (e) { }
    }

    // Extract a clean location name (e.g., from "Arrived at KOSI KALAN (KSV)" to "KOSI KALAN")
    let displayLocation = currentLoc.replace(/\s+AT\s+\d{1,2}:\d{2}.*/i, '')
        .replace(/\s+AND\s+.*/i, '')
        .replace(/\(.*\)/, '')
        .trim();

    // Remove prefixes like "ARRIVED AT", "DEPARTED FROM", etc.
    displayLocation = displayLocation.replace(/^(?:ARRIVED\s+AT|DEPARTED\s+FROM|RUNNING\s+BETWEEN|BETWEEN|DEPARTED|ARRIVED|LEFT|FROM|AT)\s+/i, '')
        .trim();

    // --- Position Interpolation ---
    let progressPercent = 0;
    let currentKM = 0;
    let avgSpeed = 0;

    if (isMoving && activeIdx < itinerary.length - 1) {
        const prev = enrichedItinerary[activeIdx];
        const next = enrichedItinerary[activeIdx + 1];

        const depMin = prev.absMins.act_dep ?? prev.absMins.sch_dep;
        let arrNextMin = next.absMins.act_arr ?? next.absMins.sch_arr;

        // --- Handle outdated arrival estimates ---
        // If next stop arrival is unupdated (shows before prev departure), assume delay propagated
        if (arrNextMin !== null && depMin !== null && arrNextMin <= depMin) {
            const schNextArr = next.absMins.sch_arr;
            const schPrevDep = prev.absMins.sch_dep;
            if (schNextArr !== null && schPrevDep !== null && schNextArr > schPrevDep) {
                arrNextMin = depMin + (schNextArr - schPrevDep);
            } else {
                arrNextMin = depMin + 15; // Fallback
            }
        }

        // Get current ref time from location string if available, else use "now" (simulated)
        const timeMatch = currentLoc.match(/AT\s+(\d{1,2}:\d{2}(?:\s+\d{1,2}-[a-zA-Z]{3})?)/i);
        let refAbsMin = null;
        if (timeMatch) {
            let rawRefMin = getAbsoluteMinutes(timeMatch[1], startDate);
            if (rawRefMin !== null) {
                refAbsMin = rawRefMin;
                const hasDate = timeMatch[1].trim().split(/\s+/).length > 1;
                if (!hasDate) {
                    while (refAbsMin < depMin - 720) refAbsMin += 1440;
                }
            }
        }

        if (depMin !== null && arrNextMin !== null && refAbsMin !== null && arrNextMin > depMin) {
            const totalMins = arrNextMin - depMin;
            const elapsedMins = Math.max(0, refAbsMin - depMin);
            progressPercent = Math.min(100, Math.floor((elapsedMins / totalMins) * 100));

            if (prev.distance_km !== undefined && next.distance_km !== undefined) {
                const distDiff = next.distance_km - prev.distance_km;
                const coveredDist = (elapsedMins / totalMins) * distDiff;
                currentKM = prev.distance_km + Math.floor(coveredDist);

                // --- Calculate Overall Journey Average Speed ---
                const firstStation = enrichedItinerary[0];
                const startDepMin = firstStation.absMins.act_dep ?? firstStation.absMins.sch_dep;

                if (startDepMin !== null && refAbsMin !== null && refAbsMin > startDepMin) {
                    const totalTime = refAbsMin - startDepMin;
                    const totalDist = currentKM - (firstStation.distance_km || 0);
                    avgSpeed = Math.floor((totalDist / totalTime) * 60);
                }
            }
        }
    } else if (!isMoving) {
        const currentStop = enrichedItinerary[activeIdx];
        currentKM = currentStop?.distance_km || 0;
        progressPercent = 0;

        // --- Calculate Overall Journey Average Speed for Halted State ---
        if (activeIdx > 0) {
            const firstStation = enrichedItinerary[0];
            const startDepMin = firstStation.absMins.act_dep ?? firstStation.absMins.sch_dep;

            if (startDepMin !== null && refAbsMin !== null && refAbsMin > startDepMin) {
                const totalTime = refAbsMin - startDepMin;
                const totalDist = currentKM - (firstStation.distance_km || 0);
                avgSpeed = Math.floor((totalDist / totalTime) * 60);
            }
        } else {
            avgSpeed = 0; // SOURCE station
        }
    }

    return {
        ...statusData,
        activeIdx,
        isMoving,
        displayLocation,
        itinerary: enrichedItinerary,
        coveredStationsCount,
        totalStations: itinerary.length,
        remainingTime,
        progressPercent,
        currentKM,
        avgSpeed
    };
};

