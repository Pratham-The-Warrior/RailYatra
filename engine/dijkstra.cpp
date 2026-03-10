#include "dijkstra.hpp"
#include "time_utils.hpp"

#include <queue>
#include <limits>
#include <algorithm>
#include <unordered_set>
#include <iostream>
#include <cctype>
#include <functional>

struct TraceNode {
    int stationId;
    int arrivalAbsMin;   // absolute minutes from day-0 00:00
    int switches;
    int trainId;
    int fromStopIdx;
    int toStopIdx;
    int departAbsMin;    // when we departed the previous station
    int parentIdx;       // index in traceNodes, -1 for root
};

struct PQState {
    int traceIdx;
    int cost;
    int switches;

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

static std::vector<RouteResult> runDijkstraPass(
    const Graph& graph,
    int fromId,
    int toId,
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

    const auto& startTrains = graph.trainsAtStation(fromId);

    for (int tId : startTrains) {
        const TrainInfo& t = graph.getTrain(tId);

        for (int si = 0; si < (int)t.schedule.size(); ++si) {
            const auto& stop = t.schedule[si];
            if (stop.stationId != fromId || stop.departureMin < 0)
                continue;

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

                bool isDest = (dest.stationId == toId);

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

    std::vector<RouteResult> results;

    while (!pq.empty() && (int)results.size() < neededCount) {
        PQState top = pq.top();
        pq.pop();

        const TraceNode& curr = trace[top.traceIdx];

        if (curr.stationId == toId) {
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

        const auto& connectingTrains = graph.trainsAtStation(curr.stationId);

        for (int tId : connectingTrains) {
            if (tId == curr.trainId) continue; // already handled via skip-stop seeds

            const TrainInfo& nextTrain = graph.getTrain(tId);

            for (int si = 0; si < (int)nextTrain.schedule.size(); ++si) {
                const auto& stop = nextTrain.schedule[si];
                if (stop.stationId != curr.stationId || stop.departureMin < 0)
                    continue;

                // Try departures across the next 3 days to handle day wrap
                int arrivalDay = curr.arrivalAbsMin / 1440;

                for (int d = 0; d <= 2; ++d) {
                    int checkDay       = arrivalDay + d;
                    int potentialDepAbs = checkDay * 1440 + stop.departureMin;

                    int waitTime = potentialDepAbs - curr.arrivalAbsMin;
                    if (waitTime < 30)         continue; // minimum 30-min connection
                    if (waitTime > maxWaitMin) break;    // too long — skip further days

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
                            default:                 cost = arrAbs; break; // TIME
                        }

                        bool isDest = (dest.stationId == toId);

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

    std::vector<RouteResult> allResults;
    std::unordered_set<std::string> seenFingerprints;

    for (int passMax = 0; passMax <= maxSwitches; ++passMax) {
        if ((int)allResults.size() >= topK) break;

        int needed = topK - (int)allResults.size();

        auto passResults = runDijkstraPass(
            graph, fromId, toId, queryDayOfWeek,
            passMax, maxWaitMin, needed, sortMode, seenFingerprints);

        for (auto& r : passResults) {
            allResults.push_back(std::move(r));
            if ((int)allResults.size() >= topK) break;
        }
    }

    return allResults;
}


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
