#ifndef GRAPH_HPP
#define GRAPH_HPP

#include <string>
#include <vector>
#include <set>
#include <unordered_map>
#include "json.hpp"

using json = nlohmann::json;

// ── Station ──────────────────────────────────────────────────────
struct Station {
    int    id;
    std::string code;
    std::string name;
};

// ── Schedule stop (internal, kept per train) ─────────────────────
struct ScheduleStop {
    int stationId;
    int arrivalMin;     // -1 for origin
    int departureMin;   // -1 for terminus
    int dayOfJourney;   // 1-based
    int distanceKm;
};

// ── Train metadata ───────────────────────────────────────────────
struct TrainInfo {
    int         id;
    std::string number;
    std::string name;
    std::string type;
    std::set<std::string> classes;
    bool        operatingDays[7]; // 0=Sun .. 6=Sat
    std::vector<ScheduleStop> schedule;
};

// ── Weighted directed edge in the adjacency list ─────────────────
struct Edge {
    int toStation;       // destination station id
    int distanceKm;      // km between pair
    int travelTimeMin;   // minutes of travel
    int trainId;         // index into Graph::trains
    int fromStopIdx;     // index in train's schedule
    int toStopIdx;       // index in train's schedule
};

// ── The weighted directed graph ──────────────────────────────────
class Graph {
public:
    // Build the graph from a directory of JSON files or a single master file
    void loadFromDirectory(const std::string& dirPath);
    void loadFromFile(const std::string& filePath);

    // Station lookups
    int         getStationId(const std::string& code) const;
    std::string getStationCode(int id) const;
    std::string getStationName(int id) const;
    int         stationCount() const { return (int)stations.size(); }

    // Accessors
    const std::vector<Edge>&      edgesFrom(int stationId) const;
    const std::vector<Station>&   getStations() const { return stations; }
    const std::vector<TrainInfo>& getTrains()   const { return trains; }
    const TrainInfo&              getTrain(int id) const { return trains[id]; }

    // Station → list of train IDs that stop there
    const std::vector<int>& trainsAtStation(int stationId) const;

    // Train schedule lookup (returns JSON string)
    std::string getTrainSchedule(const std::string& trainNumber) const;

private:
    std::vector<Station>   stations;
    std::vector<TrainInfo> trains;

    // Helper for loading train data
    void processTrainData(json& jData);

    // Adjacency list: adj[stationId] = vector of outgoing edges
    std::vector<std::vector<Edge>> adj;

    // Fast lookups
    std::unordered_map<std::string, int> codeToId;
    std::vector<std::vector<int>>        stationToTrains;

    int getOrCreateStation(const std::string& code, const std::string& name);
};

#endif // GRAPH_HPP
