#include "trip_router.hpp"
#include "time_utils.hpp"

#include <algorithm>
#include <cctype>
#include <limits>
#include <unordered_set>

namespace {

// Floor division that is correct for negative numerators.
int floorDiv(int a, int b) { return (a >= 0) ? a / b : -((-a + b - 1) / b); }

std::string upper(std::string s) {
    for (auto& c : s) c = (char)toupper((unsigned char)c);
    return s;
}

struct Entry {
    int train;
    int day;        // trip start day relative to the query day
    int boardIdx;   // stop index where this trip was boarded
    int endIdx;     // last stop index newly reachable through this entry
    int parent;     // index of the entry we transferred from (-1 = origin)
    int parentAlightIdx;
};

} // namespace

TripRouter::TripRouter(const Graph& g) : graph(g) {
    const auto& trains = graph.getTrains();
    arrOff.resize(trains.size());
    depOff.resize(trains.size());
    departuresAt.resize(graph.stationCount());

    for (const auto& t : trains) {
        auto& A = arrOff[t.id];
        auto& D = depOff[t.id];
        A.assign(t.schedule.size(), -1);
        D.assign(t.schedule.size(), -1);
        // Graph already derived consistent arrival/departure days from the
        // times, so these offsets are non-decreasing along the route.
        for (size_t i = 0; i < t.schedule.size(); ++i) {
            const auto& s = t.schedule[i];
            if (s.arrivalMin >= 0)
                A[i] = (s.dayOfJourney - 1) * 1440 + s.arrivalMin;
            if (s.departureMin >= 0) {
                D[i] = (s.depDayOfJourney - 1) * 1440 + s.departureMin;
                if (i + 1 < t.schedule.size())
                    departuresAt[s.stationId].push_back({D[i] % 1440, t.id, (int)i, D[i]});
            }
        }
    }
    for (auto& v : departuresAt)
        std::sort(v.begin(), v.end(), [](const Departure& a, const Departure& b) { return a.clock < b.clock; });
}

std::vector<RouteResult> TripRouter::paretoRoutes(
    const std::vector<std::string>& fromCodes,
    const std::vector<std::string>& toCodes,
    const std::string& dateStr,
    int maxSwitches,
    int maxWaitMin) const
{
    std::unordered_set<int> sources, targets;
    for (const auto& c : fromCodes) { int id = graph.getStationId(upper(c)); if (id >= 0) sources.insert(id); }
    for (const auto& c : toCodes)   { int id = graph.getStationId(upper(c)); if (id >= 0) targets.insert(id); }
    // A station that is both source and destination would yield empty trips.
    for (int id : targets) sources.erase(id);
    if (sources.empty() || targets.empty()) return {};
    std::vector<char> isTarget(graph.stationCount(), 0);
    for (int id : targets) isTarget[id] = 1;

    // Transfer window [arr + MIN, arr + maxWait] spans < 1 day, so each
    // departure clock maps to exactly one calendar day inside it.
    // (max_wait < 30 means no transfer is possible, as in the classic engine.)
    const bool transfersAllowed = maxWaitMin >= MIN_TRANSFER_MIN;
    if (maxWaitMin > MIN_TRANSFER_MIN + 1439) maxWaitMin = MIN_TRANSFER_MIN + 1439;

    const int qdow = TimeUtils::getDayFromDate(dateStr);
    const auto& trains = graph.getTrains();

    auto runs = [&](int train, int day) {
        return trains[train].operatingDays[((qdow + day) % 7 + 7) % 7];
    };

    // reached[train * DAY_SLOTS + slot] = lowest boarding index seen so far.
    std::vector<int> reached(trains.size() * DAY_SLOTS, std::numeric_limits<int>::max());
    std::vector<Entry> entries;
    entries.reserve(4096);

    // Enqueue a boarding; returns false if dominated by an earlier boarding.
    auto enqueue = [&](std::vector<int>& queue, int train, int day, int boardIdx,
                       int parent, int parentAlightIdx) {
        if (day < MIN_DAY || day > MAX_DAY) return;
        int& r = reached[(size_t)train * DAY_SLOTS + (day - MIN_DAY)];
        if (boardIdx >= r) return;
        int n = (int)trains[train].schedule.size();
        int end = (r == std::numeric_limits<int>::max()) ? n - 1 : r;
        r = boardIdx;
        queue.push_back((int)entries.size());
        entries.push_back({train, day, boardIdx, end, parent, parentAlightIdx});
    };

    // Round 0: board any train departing a source station on the query day.
    std::vector<int> queue, next;
    for (int sid : sources) {
        for (const auto& dp : departuresAt[sid]) {
            int day = -floorDiv(dp.depOff, 1440);    // so that day*1440 + d is in [0, 1440)
            if (runs(dp.train, day)) enqueue(queue, dp.train, day, dp.stopIdx, -1, -1);
        }
    }

    const int INF = std::numeric_limits<int>::max();
    int bestArrival = INF;
    std::vector<RouteResult> results;

    for (int round = 0; round <= maxSwitches && !queue.empty(); ++round) {
        int roundBest = INF, roundEntry = -1, roundAlight = -1;
        next.clear();

        for (int ei : queue) {
            const Entry e = entries[ei];   // copy: entries may reallocate
            const auto& A = arrOff[e.train];
            const auto& sched = trains[e.train].schedule;
            for (int j = e.boardIdx + 1; j <= e.endIdx; ++j) {
                if (A[j] < 0) continue;
                int arr = e.day * 1440 + A[j];
                if (arr >= bestArrival) break;   // later stops arrive even later
                int sid = sched[j].stationId;

                if (isTarget[sid]) {
                    if (arr < roundBest) { roundBest = arr; roundEntry = ei; roundAlight = j; }
                    continue;
                }
                if (round == maxSwitches || !transfersAllowed) continue;
                if (arr + MIN_TRANSFER_MIN >= bestArrival) continue;

                // Walk departures whose clock lies in the (circular) window.
                const auto& deps = departuresAt[sid];
                if (deps.empty()) continue;
                const int earliest = arr + MIN_TRANSFER_MIN;
                const int span = maxWaitMin - MIN_TRANSFER_MIN;   // < 1440
                const int startClock = ((earliest % 1440) + 1440) % 1440;
                auto it = std::lower_bound(deps.begin(), deps.end(), startClock,
                    [](const Departure& a, int c) { return a.clock < c; });
                size_t pos = (size_t)(it - deps.begin());
                for (size_t n = 0; n < deps.size(); ++n, ++pos) {
                    const Departure& dp = deps[pos % deps.size()];
                    int gap = ((dp.clock - startClock) % 1440 + 1440) % 1440;
                    if (gap > span) break;                     // sorted: rest is outside
                    if (dp.train == e.train) continue;        // no re-boarding the same train
                    int depAbs = earliest + gap;              // absolute departure time
                    int day2 = floorDiv(depAbs - dp.depOff, 1440);
                    if (runs(dp.train, day2)) enqueue(next, dp.train, day2, dp.stopIdx, ei, j);
                }
            }
        }

        if (roundEntry >= 0 && roundBest < bestArrival) {
            bestArrival = roundBest;

            // Reconstruct legs by walking parent pointers.
            RouteResult rr;
            rr.switches = round;
            std::vector<Leg> legs;
            int firstDep = 0, travel = 0, dist = 0;
            int ei = roundEntry, alight = roundAlight;
            while (ei >= 0) {
                const Entry& e = entries[ei];
                const TrainInfo& t = trains[e.train];
                Leg leg;
                leg.trainNumber = t.number;
                leg.trainName   = t.name;
                leg.trainType   = t.type;
                int fromSid = t.schedule[e.boardIdx].stationId;
                int toSid   = t.schedule[alight].stationId;
                leg.fromCode = graph.getStationCode(fromSid);
                leg.fromName = graph.getStationName(fromSid);
                leg.toCode   = graph.getStationCode(toSid);
                leg.toName   = graph.getStationName(toSid);
                int dep = e.day * 1440 + depOff[e.train][e.boardIdx];
                int arr = e.day * 1440 + arrOff[e.train][alight];
                leg.departureTime = TimeUtils::formatTime(((dep % 1440) + 1440) % 1440);
                leg.arrivalTime   = TimeUtils::formatTime(((arr % 1440) + 1440) % 1440);
                leg.travelTimeMin = arr - dep;
                leg.distanceKm = std::max(0, t.schedule[alight].distanceKm - t.schedule[e.boardIdx].distanceKm);
                for (const auto& c : t.classes) leg.classes.push_back(c);
                travel += leg.travelTimeMin;
                dist += leg.distanceKm;
                firstDep = dep;
                legs.push_back(std::move(leg));
                alight = e.parentAlightIdx;
                ei = e.parent;
            }
            std::reverse(legs.begin(), legs.end());
            rr.legs = std::move(legs);
            rr.totalDistanceKm = dist;
            rr.totalTimeMin = roundBest - firstDep;
            rr.totalBufferMin = std::max(0, rr.totalTimeMin - travel);
            rr.totalTimeFormatted = TimeUtils::formatDuration(rr.totalTimeMin);
            results.push_back(std::move(rr));
        }

        queue.swap(next);
    }

    return results;
}
