#include "dijkstra.hpp"
#include "time_utils.hpp"

#include <queue>
#include <limits>
#include <algorithm>
#include <unordered_set>
#include <iostream>
#include <cctype>
#include <functional>

/* TraceNode stores a single visit to a station during the search.
 * It's essentially a pointer in a tree that allows us to backtrack and reconstruct
 * the full path (sequence of trains and stations) once we find the destination.
 */
struct TraceNode {
    int stationId;
    int arrivalAbsMin;   // Absolute time from the start of the query day
    int switches;        // How many times the passenger had to change trains to get here
    int trainId;         // The train that brought us here
    int fromStopIdx;     // Where we got ON this train
    int toStopIdx;       // Where we got OFF this train (this station)
    int departAbsMin;    // When we left the previous station on this train
    int parentIdx;       // The index of the previous TraceNode (for path reconstruction)
};

/**
 * PQState: The "active" status of our search in the priority queue.
 * Dijkstra's algorithm uses this to decide which station to explore next.
 * We prioritize lower "cost" (usually time or distance) and fewer "switches".
 */
struct PQState {
    int traceIdx; // Points to the TraceNode that tells us HOW we got here
    int cost;     // The accumulated cost (minutes or km) to reach this point
    int switches; // How many train changes were made to get here

    // This operator defines the "priority" in our Priority Queue.
    // Lower cost always comes first.
    bool operator>(const PQState& o) const {
        if (cost != o.cost) return cost > o.cost;
        return switches > o.switches;
    }
};

static std::string routeFingerprint(const RouteResult& r) {
    std::string fp;
    for (const auto& leg : r.legs)
        fp += leg.trainNumber + ":" + leg.fromCode + "->" + leg.toCode + "|";
    return fp;
}

/**
 * reconstructRoute: Working backwards from the destination.
 * 
 * Once the search finds the target station, we have a 'traceIdx' pointing 
 * to the final stop. We follow the 'parentIdx' links all the way back to 
 * the start to build the final list of "Legs" (train segments) for the user.
 */
static RouteResult reconstructRoute(
    const std::vector<TraceNode>& trace,
    int traceIdx,
    const Graph& graph)
{
    RouteResult rr;
    rr.switches        = trace[traceIdx].switches;
    rr.totalDistanceKm = 0;
    rr.totalTimeMin    = 0;
    rr.totalBufferMin  = 0;

    std::vector<Leg> legs;
    int ptr = traceIdx;

    while (ptr != -1) {
        const TraceNode& node = trace[ptr];
        const TrainInfo& t    = graph.getTrain(node.trainId);

        Leg leg;
        leg.trainNumber = t.number;
        leg.trainName   = t.name;
        leg.trainType   = t.type;

        int fromSid  = t.schedule[node.fromStopIdx].stationId;
        leg.fromCode = graph.getStationCode(fromSid);
        leg.fromName = graph.getStationName(fromSid);

        leg.toCode = graph.getStationCode(node.stationId);
        leg.toName = graph.getStationName(node.stationId);

        leg.departureTime   = TimeUtils::formatTime(node.departAbsMin % 1440);
        leg.arrivalTime     = TimeUtils::formatTime(node.arrivalAbsMin % 1440);

        int fromDist   = t.schedule[node.fromStopIdx].distanceKm;
        int toDist     = t.schedule[node.toStopIdx].distanceKm;
        leg.distanceKm = toDist - fromDist;
        if (leg.distanceKm < 0) leg.distanceKm = 0;

        leg.travelTimeMin = node.arrivalAbsMin - node.departAbsMin;
        if (leg.travelTimeMin < 0) leg.travelTimeMin = 0;

        for (const auto& cls : t.classes)
            leg.classes.push_back(cls);

        legs.push_back(std::move(leg));
        ptr = node.parentIdx;
    }

    std::reverse(legs.begin(), legs.end());
    rr.legs = std::move(legs);

    for (const auto& leg : rr.legs)
        rr.totalDistanceKm += leg.distanceKm;

    // We also calculate "Buffer Time" — the total time spent waiting 
    // at junctions between trains.
    if (!rr.legs.empty()) {
        int p2     = traceIdx;
        int lastArr = trace[p2].arrivalAbsMin;
        while (trace[p2].parentIdx != -1) p2 = trace[p2].parentIdx;
        int firstDep = trace[p2].departAbsMin;

        rr.totalTimeMin = lastArr - firstDep;
        if (rr.totalTimeMin < 0) rr.totalTimeMin = 0;

        int totalTravelTime = 0;
        for (const auto& leg : rr.legs) totalTravelTime += leg.travelTimeMin;
        rr.totalBufferMin = rr.totalTimeMin - totalTravelTime;
        if (rr.totalBufferMin < 0) rr.totalBufferMin = 0;
    }

    rr.totalTimeFormatted = TimeUtils::formatDuration(rr.totalTimeMin);
    return rr;
}

/**
 * runDijkstraPass: The core search engine (unified multi-source, multi-dest).
 * 
 * Seeds the priority queue with trains from ALL source stations in fromIds,
 * and checks arrival at ANY destination station in toIdSet.
 *
 * For single source/dest searches, the callers simply wrap their single IDs
 * in a one-element vector/set — the logic is identical.
 *
 * Uses a "multi-pass" approach: we first look for 0-switch (direct) routes,
 * then 1-switch, and so on. This ensures we prioritize simpler, more
 * convenient journeys even if they take slightly longer.
 */
static std::vector<RouteResult> runDijkstraPass(
    const Graph& graph,
    const std::vector<int>& fromIds,
    const std::unordered_set<int>& toIdSet,
    int queryDayOfWeek,
    int passMaxSwitches,
    int maxWaitMin,
    int neededCount,
    SortMode sortMode,
    std::unordered_set<std::string>& seenFingerprints)
{
    int numStations = graph.stationCount();

    // Per-pass bestCost — intermediate pruning only
    std::vector<std::vector<int>> bestCost(
        numStations,
        std::vector<int>(passMaxSwitches + 2, std::numeric_limits<int>::max()));

    std::vector<TraceNode> trace;
    trace.reserve(100000);
    const size_t MAX_TRACE = 500000;

    std::priority_queue<PQState, std::vector<PQState>, std::greater<PQState>> pq;

    // ── Seed phase: iterate over ALL source stations ──
    for (int fromId : fromIds) {
        const auto& startTrains = graph.trainsAtStation(fromId);

        for (int tId : startTrains) {
            const TrainInfo& t = graph.getTrain(tId);

            // A train might stop at our starting station multiple times (rare) or 
            // have a complex schedule. we check every stop to see if it matches a source.
            for (int si = 0; si < (int)t.schedule.size(); ++si) {
                const auto& stop = t.schedule[si];
                if (stop.stationId != fromId || stop.departureMin < 0)
                    continue;

                // Check if this train actually runs on the query day.
                int daysSinceStart  = stop.dayOfJourney - 1;
                int trainStartWkDay = ((queryDayOfWeek - daysSinceStart) % 7 + 7) % 7;
                if (!t.operatingDays[trainStartWkDay])
                    continue;

                int depAbs = stop.departureMin;

                for (int sj = si + 1; sj < (int)t.schedule.size(); ++sj) {
                    const auto& dest = t.schedule[sj];
                    if (dest.arrivalMin < 0) continue;

                    int arrAbs = (dest.dayOfJourney - stop.dayOfJourney) * 1440
                               + dest.arrivalMin;
                    if (arrAbs <= depAbs) {
                        arrAbs = depAbs + (dest.arrivalMin - stop.departureMin);
                        if (arrAbs <= depAbs) arrAbs += 1440;
                    }

                    int dist = dest.distanceKm - stop.distanceKm;
                    if (dist < 0) dist = 0;

                    int cost;
                    switch (sortMode) {
                        case SortMode::DISTANCE: cost = dist; break;
                        default:                 cost = arrAbs; break;
                    }

                    bool isDest = toIdSet.count(dest.stationId) > 0;

                    if (!isDest) {
                        if (cost >= bestCost[dest.stationId][0]) continue;
                        bestCost[dest.stationId][0] = cost;
                    }

                    if (trace.size() >= MAX_TRACE) continue;

                    TraceNode tn;
                    tn.stationId     = dest.stationId;
                    tn.arrivalAbsMin = arrAbs;
                    tn.switches      = 0;
                    tn.trainId       = t.id;
                    tn.fromStopIdx   = si;
                    tn.toStopIdx     = sj;
                    tn.departAbsMin  = depAbs;
                    tn.parentIdx     = -1;

                    int idx = (int)trace.size();
                    trace.push_back(tn);
                    pq.push({idx, cost, 0});
                }
            }
        }
    }

    std::vector<RouteResult> results;

    while (!pq.empty() && (int)results.size() < neededCount) {
        PQState top = pq.top();
        pq.pop();

        const TraceNode& curr = trace[top.traceIdx];

        // Check if we've reached any destination station
        if (toIdSet.count(curr.stationId) > 0) {
            RouteResult rr = reconstructRoute(trace, top.traceIdx, graph);
            std::string fp = routeFingerprint(rr);
            if (!seenFingerprints.count(fp)) {
                seenFingerprints.insert(fp);
                results.push_back(std::move(rr));
            }
            continue;
        }

        if (curr.switches >= passMaxSwitches)
            continue;

        // Search for all trains departing from the current station
        const auto& connectingTrains = graph.trainsAtStation(curr.stationId);

        for (int tId : connectingTrains) {
            if (tId == curr.trainId) continue;

            const TrainInfo& nextTrain = graph.getTrain(tId);

            for (int si = 0; si < (int)nextTrain.schedule.size(); ++si) {
                const auto& stop = nextTrain.schedule[si];
                if (stop.stationId != curr.stationId || stop.departureMin < 0)
                    continue;

                // Handle 'Day Wrap': Many Indian trains run across multiple days.
                int arrivalDay = curr.arrivalAbsMin / 1440;

                for (int d = 0; d <= 2; ++d) {
                    int checkDay       = arrivalDay + d;
                    int potentialDepAbs = checkDay * 1440 + stop.departureMin;

                    int waitTime = potentialDepAbs - curr.arrivalAbsMin;
                    
                    // 30-minute minimum buffer for connections.
                    if (waitTime < 30)         continue;
                    if (waitTime > maxWaitMin) break;

                    int daysSinceTrainStart  = stop.dayOfJourney - 1;
                    int absoluteTrainStartDay = checkDay - daysSinceTrainStart;
                    int trainStartWkDay = ((queryDayOfWeek + absoluteTrainStartDay) % 7 + 7) % 7;
                    if (!nextTrain.operatingDays[trainStartWkDay])
                        continue;

                    for (int sj = si + 1; sj < (int)nextTrain.schedule.size(); ++sj) {
                        const auto& dest = nextTrain.schedule[sj];
                        if (dest.arrivalMin < 0) continue;

                        int depAbs = potentialDepAbs;
                        int arrAbs = (dest.dayOfJourney - stop.dayOfJourney) * 1440
                                   + dest.arrivalMin
                                   + checkDay * 1440;
                        if (arrAbs <= depAbs) {
                            arrAbs = depAbs + ((dest.dayOfJourney - stop.dayOfJourney) * 1440
                                     + dest.arrivalMin - stop.departureMin);
                            if (arrAbs <= depAbs) arrAbs += 1440;
                        }

                        int newSwitches = curr.switches + 1;

                        int dist = dest.distanceKm - stop.distanceKm;
                        if (dist < 0) dist = 0;

                        int cost;
                        switch (sortMode) {
                            case SortMode::DISTANCE: cost = dist; break;
                            default:                 cost = arrAbs; break;
                        }

                        bool isDest = toIdSet.count(dest.stationId) > 0;

                        if (!isDest) {
                            if (newSwitches > passMaxSwitches) continue;
                            if (cost >= bestCost[dest.stationId][newSwitches]) continue;
                            bestCost[dest.stationId][newSwitches] = cost;
                        }

                        if (trace.size() >= MAX_TRACE) continue;

                        TraceNode tn;
                        tn.stationId     = dest.stationId;
                        tn.arrivalAbsMin = arrAbs;
                        tn.switches      = newSwitches;
                        tn.trainId       = nextTrain.id;
                        tn.fromStopIdx   = si;
                        tn.toStopIdx     = sj;
                        tn.departAbsMin  = depAbs;
                        tn.parentIdx     = top.traceIdx;

                        int idx = (int)trace.size();
                        trace.push_back(tn);
                        pq.push({idx, cost, newSwitches});
                    }
                }
            }
        }
    }

    std::sort(results.begin(), results.end(),
        [](const RouteResult& a, const RouteResult& b) {
            if (a.totalTimeMin != b.totalTimeMin)
                return a.totalTimeMin < b.totalTimeMin;
            return a.totalBufferMin < b.totalBufferMin;
        });

    return results;
}

/**
 * findRoutes: The top-level entry point for a single source/dest route search.
 * 
 * Wraps the single source/dest into vector/set and delegates to the
 * unified runDijkstraPass. Coordinates the "Multi-Pass" strategy.
 */
std::vector<RouteResult> DijkstraSolver::findRoutes(
    const std::string& fromCode,
    const std::string& toCode,
    const std::string& dateStr,
    int maxSwitches,
    int maxWaitMin,
    int topK,
    SortMode sortMode)
{
    std::string fromUpper = fromCode, toUpper = toCode;
    for (auto& c : fromUpper) c = (char)toupper((unsigned char)c);
    for (auto& c : toUpper)   c = (char)toupper((unsigned char)c);

    int fromId = graph.getStationId(fromUpper);
    int toId   = graph.getStationId(toUpper);

    if (fromId == -1 || toId == -1 || fromId == toId)
        return {};

    int queryDayOfWeek = TimeUtils::getDayFromDate(dateStr);

    // Wrap single source/dest into containers for the unified search
    std::vector<int> fromIds = { fromId };
    std::unordered_set<int> toIdSet = { toId };

    std::vector<RouteResult> allResults;
    std::unordered_set<std::string> seenFingerprints;

    for (int passMax = 0; passMax <= maxSwitches; ++passMax) {
        if ((int)allResults.size() >= topK) break;

        int needed = topK - (int)allResults.size();

        auto passResults = runDijkstraPass(
            graph, fromIds, toIdSet, queryDayOfWeek,
            passMax, maxWaitMin, needed, sortMode, seenFingerprints);

        for (auto& r : passResults) {
            allResults.push_back(std::move(r));
            if ((int)allResults.size() >= topK) break;
        }
    }

    return allResults;
}


/**
 * toJson: Converting our internal RouteResult objects into 
 * standard JSON for the Node.js backend.
 */
json DijkstraSolver::toJson(const std::vector<RouteResult>& results) {
    json arr = json::array();

    for (const auto& r : results) {
        json route;
        route["total_distance_km"]    = r.totalDistanceKm;
        route["total_time_min"]       = r.totalTimeMin;
        route["total_buffer_min"]     = r.totalBufferMin;
        route["total_time_formatted"] = r.totalTimeFormatted;
        route["switches"]             = r.switches;

        json legsArr = json::array();
        for (const auto& leg : r.legs) {
            json jl;
            jl["train_number"]    = leg.trainNumber;
            jl["train_name"]      = leg.trainName;
            jl["train_type"]      = leg.trainType;
            jl["from_code"]       = leg.fromCode;
            jl["from_name"]       = leg.fromName;
            jl["to_code"]         = leg.toCode;
            jl["to_name"]         = leg.toName;
            jl["departure_time"]  = leg.departureTime;
            jl["arrival_time"]    = leg.arrivalTime;
            jl["distance_km"]     = leg.distanceKm;
            jl["travel_time_min"] = leg.travelTimeMin;

            json cls = json::array();
            for (const auto& c : leg.classes) cls.push_back(c);
            jl["classes"] = cls;

            legsArr.push_back(jl);
        }
        route["legs"] = legsArr;
        arr.push_back(route);
    }

    return arr;
}

/**
 * findRoutesMulti: Top-level entry for multi-source, multi-destination search.
 *
 * Coordinates the same multi-pass strategy as findRoutes (0 switches first,
 * then 1, etc.) using the same unified runDijkstraPass.
 */
std::vector<RouteResult> DijkstraSolver::findRoutesMulti(
    const std::vector<std::string>& fromCodes,
    const std::vector<std::string>& toCodes,
    const std::string& dateStr,
    int maxSwitches,
    int maxWaitMin,
    int topK,
    SortMode sortMode)
{
    // Resolve all source station codes to IDs, filtering out invalid ones
    std::vector<int> fromIds;
    for (const auto& code : fromCodes) {
        std::string upper = code;
        for (auto& c : upper) c = (char)toupper((unsigned char)c);
        int id = graph.getStationId(upper);
        if (id != -1) fromIds.push_back(id);
    }

    // Resolve all destination station codes to IDs
    std::unordered_set<int> toIdSet;
    for (const auto& code : toCodes) {
        std::string upper = code;
        for (auto& c : upper) c = (char)toupper((unsigned char)c);
        int id = graph.getStationId(upper);
        if (id != -1) toIdSet.insert(id);
    }

    // Remove any overlap (a station that's both source and dest)
    // to avoid trivial zero-distance routes
    std::vector<int> cleanFromIds;
    for (int id : fromIds) {
        if (!toIdSet.count(id)) cleanFromIds.push_back(id);
    }
    // If all sources are also destinations, use the original list
    if (cleanFromIds.empty()) cleanFromIds = fromIds;

    if (cleanFromIds.empty() || toIdSet.empty())
        return {};

    int queryDayOfWeek = TimeUtils::getDayFromDate(dateStr);

    std::vector<RouteResult> allResults;
    std::unordered_set<std::string> seenFingerprints;

    for (int passMax = 0; passMax <= maxSwitches; ++passMax) {
        if ((int)allResults.size() >= topK) break;

        int needed = topK - (int)allResults.size();

        auto passResults = runDijkstraPass(
            graph, cleanFromIds, toIdSet, queryDayOfWeek,
            passMax, maxWaitMin, needed, sortMode, seenFingerprints);

        for (auto& r : passResults) {
            allResults.push_back(std::move(r));
            if ((int)allResults.size() >= topK) break;
        }
    }

    return allResults;
}
