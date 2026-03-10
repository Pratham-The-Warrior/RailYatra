#ifndef DIJKSTRA_HPP
#define DIJKSTRA_HPP

#include "graph.hpp"
#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;

struct Leg {
    std::string trainNumber;
    std::string trainName;
    std::string trainType;
    std::string fromCode, fromName;
    std::string toCode,   toName;
    std::string departureTime;   // "HH:MM"
    std::string arrivalTime;     // "HH:MM"
    int         distanceKm;
    int         travelTimeMin;
    std::vector<std::string> classes;
};

struct RouteResult {
    int totalDistanceKm;
    int totalTimeMin;
    int totalBufferMin;
    std::string totalTimeFormatted;
    int switches;
    std::vector<Leg> legs;
};

enum class SortMode { TIME, DISTANCE, SWITCHES };

class DijkstraSolver {
public:
    explicit DijkstraSolver(const Graph& g) : graph(g) {}

    std::vector<RouteResult> findRoutes(
        const std::string& fromCode,
        const std::string& toCode,
        const std::string& dateStr,
        int maxSwitches   = 5,
        int maxWaitMin    = 1200,
        int topK          = 7,
        SortMode sortMode = SortMode::TIME
    );

    static json toJson(const std::vector<RouteResult>& results);

private:
    const Graph& graph;
};

#endif // DIJKSTRA_HPP
