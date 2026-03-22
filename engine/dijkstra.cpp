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
 * runDijkstraPass: The core search engine.
 * 
 * Unlike a standard shortest-path search, we use a "multi-pass" approach.
 * We first look for 0-switch (direct) routes, then 1-switch, and so on.
 * This ensures we prioritize simpler, more convenient journeys for the user
 * even if they take slightly longer.
 */
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

        // A train might stop at our starting station multiple times (rare) or 
        // have a complex schedule. we check every stop to see if it's our "fromId".
        for (int si = 0; si < (int)t.schedule.size(); ++si) {
            const auto& stop = t.schedule[si];
            if (stop.stationId != fromId || stop.departureMin < 0)
                continue;

            // Check if this train actually runs on the query day.
            // We calculate the 'start day' of the train based on when it reaches our station.
            int daysSinceStart  = stop.dayOfJourney - 1; // Calculate days offset from first station
            int trainStartWkDay = ((queryDayOfWeek - daysSinceStart) % 7 + 7) % 7; // Adjust for wraps
            if (!t.operatingDays[trainStartWkDay]) // Skip if train doesn't run on this weekday
                continue;

            int depAbs = stop.departureMin; // Store absolute departure time for seeding

            for (int sj = si + 1; sj < (int)t.schedule.size(); ++sj) {
                const auto& dest = t.schedule[sj];
                if (dest.arrivalMin < 0) continue;

                // Calculate total travel time considering day boundaries
                int arrAbs = (dest.dayOfJourney - stop.dayOfJourney) * 1440
                           + dest.arrivalMin;
                if (arrAbs <= depAbs) { // Handle overnight wrap
                    arrAbs = depAbs + (dest.arrivalMin - stop.departureMin);
                    if (arrAbs <= depAbs) arrAbs += 1440; // Force positive duration
                }

                int dist = dest.distanceKm - stop.distanceKm; // Net distance for this segment
                if (dist < 0) dist = 0; // Guard against negative distance data

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
                tn.stationId     = dest.stationId;   // Where the train stops
                tn.arrivalAbsMin = arrAbs;           // When it arrives there
                tn.switches      = 0;                // Direct train (no switches yet)
                tn.trainId       = t.id;             // Reference to the train object
                tn.fromStopIdx   = si;               // Boarding index
                tn.toStopIdx     = sj;               // Alighting index
                tn.departAbsMin  = depAbs;           // Boarding time
                tn.parentIdx     = -1;               // Root node (no parent)

                int idx = (int)trace.size();         // Get unique index for this trace entry
                trace.push_back(tn);                 // Save to persistent trace vector
                pq.push({idx, cost, 0});             // Push to search frontier
            }
        }
    }

    std::vector<RouteResult> results;

    while (!pq.empty() && (int)results.size() < neededCount) {
        PQState top = pq.top(); // Get the state with the lowest cost
        pq.pop();               // Remove it from the priority queue

        const TraceNode& curr = trace[top.traceIdx]; // Access the detailed trace entry

        if (curr.stationId == toId) { // Check if we've reached the destination
            RouteResult rr = reconstructRoute(trace, top.traceIdx, graph); // Build the path
            std::string fp = routeFingerprint(rr); // Generate unique ID for this route
            if (!seenFingerprints.count(fp)) {      // Deduplicate similar routes
                seenFingerprints.insert(fp);         // Mark this fingerprint as seen
                results.push_back(std::move(rr));    // Add to our results collection
            }
            continue; // Keep searching for alternative routes
        }

        if (curr.switches >= passMaxSwitches) // Don't exceed the switch limit for this pass
            continue;

        // Search for all trains departing from the current station
        const auto& connectingTrains = graph.trainsAtStation(curr.stationId);

        for (int tId : connectingTrains) {
            if (tId == curr.trainId) continue; // Skip the train we just arrived on

            const TrainInfo& nextTrain = graph.getTrain(tId); // Get metadata for the next train

            for (int si = 0; si < (int)nextTrain.schedule.size(); ++si) {
                const auto& stop = nextTrain.schedule[si];
                if (stop.stationId != curr.stationId || stop.departureMin < 0)
                    continue; // Find where this train stops at our current junction                // Handle 'Day Wrap': Many Indian trains run across multiple days.
                // If we arrive at a junction late at night, the connecting train 
                // might depart early the next morning or even the day after.
                int arrivalDay = curr.arrivalAbsMin / 1440; // Current day of the journey

                for (int d = 0; d <= 2; ++d) { // Check today, tomorrow, and day-after connections
                    int checkDay       = arrivalDay + d; // The specific day we are checking
                    int potentialDepAbs = checkDay * 1440 + stop.departureMin; // Absolute departure time

                    int waitTime = potentialDepAbs - curr.arrivalAbsMin; // How long we wait at the station
                    
                    // We enforce a 30-minute minimum buffer for connections.
                    // This accounts for walking between platforms or minor arrival delays.
                    if (waitTime < 30)         continue; // Buffer too short
                    if (waitTime > maxWaitMin) break;    // Wait time exceeds user preference

                    int daysSinceTrainStart  = stop.dayOfJourney - 1; // Days since train left source
                    int absoluteTrainStartDay = checkDay - daysSinceTrainStart; // Absolute start day
                    int trainStartWkDay = ((queryDayOfWeek + absoluteTrainStartDay) % 7 + 7) % 7; // Target weekday
                    if (!nextTrain.operatingDays[trainStartWkDay]) // check if train runs on this day
                        continue;

                    for (int sj = si + 1; sj < (int)nextTrain.schedule.size(); ++sj) {
                        const auto& dest = nextTrain.schedule[sj];
                        if (dest.arrivalMin < 0) continue;

                        int depAbs = potentialDepAbs; // The departure time we've committed to
                        // Calculate arrival time at next station
                        int arrAbs = (dest.dayOfJourney - stop.dayOfJourney) * 1440
                                   + dest.arrivalMin
                                   + checkDay * 1440;
                        if (arrAbs <= depAbs) { // Consistency check for arrival/departure
                            arrAbs = depAbs + ((dest.dayOfJourney - stop.dayOfJourney) * 1440
                                     + dest.arrivalMin - stop.departureMin);
                            if (arrAbs <= depAbs) arrAbs += 1440; // Correction for travel spanning days
                        }

                        int newSwitches = curr.switches + 1; // Increment switch count for this leg

                        int dist = dest.distanceKm - stop.distanceKm; // Calculate segment distance
                        if (dist < 0) dist = 0; // Data cleanup

                        int cost;
                        switch (sortMode) {
                            case SortMode::DISTANCE: cost = dist; break;
                            default:                 cost = arrAbs; break; // TIME
                        }

                        bool isDest = (dest.stationId == toId); // Check if this leg reaches final target

                        if (!isDest) { // Pruning logic for intermediate stations
                            if (newSwitches > passMaxSwitches) continue; // Skip if too many switches
                            if (cost >= bestCost[dest.stationId][newSwitches]) continue; // Skip if not a better path
                            bestCost[dest.stationId][newSwitches] = cost; // Update best known cost
                        }

                        if (trace.size() >= MAX_TRACE) continue; // Guard against memory overflow

                        TraceNode tn;
                        tn.stationId     = dest.stationId;    // Destination station ID
                        tn.arrivalAbsMin = arrAbs;            // Absolute arrival time
                        tn.switches      = newSwitches;       // Updated total switches
                        tn.trainId       = nextTrain.id;      // Current train ID
                        tn.fromStopIdx   = si;                // Departure stop index
                        tn.toStopIdx     = sj;                // Arrival stop index
                        tn.departAbsMin  = depAbs;            // Absolute departure time
                        tn.parentIdx     = top.traceIdx;      // Pointer to parent trace node

                        int idx = (int)trace.size();          // Unique index for the new node
                        trace.push_back(tn);                  // Record in trace
                        pq.push({idx, cost, newSwitches});    // Enqueue for further exploration
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
 * findRoutes: The top-level entry point for a route search.
 * 
 * This method coordinates the "Multi-Pass" strategy. It starts by looking 
 * for direct trains (0 switches). If it finds enough, it stops. Otherwise, 
 * it increments the switch limit and runs a deeper search. This makes 
 * results feel "smarter" because we don't suggest 3-train connections 
 * if a direct train exists.
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


/**
 * toJson: Converting our internal RouteResult objects into 
 * standard JSON for the Node.js backend.
 * 
 * We iterate through every found route and every segment (leg) within 
 * those routes, mapping them to keys like "train_number", "departure_time", 
 * etc. that the frontend expects.
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
