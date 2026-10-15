#ifndef TRIP_ROUTER_HPP
#define TRIP_ROUTER_HPP

#include "graph.hpp"
#include "dijkstra.hpp"
#include <string>
#include <vector>

/**
 * TripRouter: exact Pareto search over (arrival time, number of transfers).
 *
 * Based on trip-based public transit routing: the search state is a concrete
 * trip instance (train + calendar day) boarded at a stop index. Unlike
 * station-label algorithms (classic RAPTOR), this stays exact under a
 * MAXIMUM transfer wait, where arriving earlier at a junction can make a
 * connection infeasible.
 *
 * Rules (identical to the layered Dijkstra engine):
 *   - first departure is on the query day (00:00–23:59) from a source station
 *   - transfers need >= 30 min and <= maxWaitMin between arrival and departure
 *   - a train only runs on its operating days (by the day it starts its journey)
 *   - no transfer back onto the same train (by train id)
 *   - maxWaitMin is capped at 30 + 1439 min (transfer windows shorter than a day)
 *
 * Returns, for each transfer count k = 0..maxSwitches, the earliest-arriving
 * journey with exactly k transfers, but only if it arrives strictly earlier
 * than every journey with fewer transfers (the Pareto frontier).
 */
class TripRouter {
public:
    explicit TripRouter(const Graph& g);

    std::vector<RouteResult> paretoRoutes(
        const std::vector<std::string>& fromCodes,
        const std::vector<std::string>& toCodes,
        const std::string& dateStr,
        int maxSwitches,
        int maxWaitMin) const;

    static constexpr int MIN_TRANSFER_MIN = 30;

private:
    const Graph& graph;

    // Per train: stop offsets in minutes from 00:00 of the train's start day,
    // normalized to be non-decreasing along the route (-1 = not applicable).
    std::vector<std::vector<int>> arrOff, depOff;

    // Per station: departures sorted by clock time (minute of day), so the
    // transfer window can be found by binary search.
    struct Departure {
        int clock;   // depOff % 1440
        int train;
        int stopIdx;
        int depOff;
    };
    std::vector<std::vector<Departure>> departuresAt;

    // Trip-instance day window relative to the query day.
    static constexpr int MIN_DAY = -8;
    static constexpr int MAX_DAY = 40;
    static constexpr int DAY_SLOTS = MAX_DAY - MIN_DAY + 1;
};

#endif // TRIP_ROUTER_HPP
