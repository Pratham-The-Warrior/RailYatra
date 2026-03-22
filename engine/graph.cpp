#include "graph.hpp"
#include "time_utils.hpp"
#include "json.hpp"

#include <iostream>
#include <fstream>
#include <algorithm>

#ifdef _WIN32
#include <windows.h>
#else
#include <dirent.h>
#endif

using json = nlohmann::json;

// ── Station helpers ──────────────────────────────────────────────

/**
 * @brief Gets the ID of a station, creating it if it doesn't exist.
 * @param code The unique code for the station.
 * @param name The full name of the station. If empty, the code is used as name.
 * @return The integer ID of the station.
 */
int Graph::getOrCreateStation(const std::string& code, const std::string& name) {
    // Check if the station already exists.
    auto it = codeToId.find(code);
    if (it != codeToId.end()) return it->second; // If found, return its existing ID.

    // If not found, create a new station.
    int id = (int)stations.size(); // Assign a new unique ID.
    // Store the station's metadata. If name is empty, use code as name.
    stations.push_back({id, code, name.empty() ? code : name});
    codeToId[code] = id; // Map the station code to its new ID.
    adj.push_back({}); // Initialize an empty adjacency list for this new station.
    stationToTrains.push_back({}); // Initialize an empty list for trains stopping at this station.
    return id; // Return the ID of the newly created station.
}

int Graph::getStationId(const std::string& code) const {
    auto it = codeToId.find(code);
    return it != codeToId.end() ? it->second : -1;
}

std::string Graph::getStationCode(int id) const {
    if (id >= 0 && id < (int)stations.size()) return stations[id].code;
    return std::string("???");
}

std::string Graph::getStationName(int id) const {
    if (id >= 0 && id < (int)stations.size()) return stations[id].name;
    return std::string("Unknown");
}

const std::vector<Edge>& Graph::edgesFrom(int stationId) const {
    static const std::vector<Edge> empty;
    if (stationId < 0 || stationId >= (int)adj.size()) return empty;
    return adj[stationId];
}

const std::vector<int>& Graph::trainsAtStation(int stationId) const {
    static const std::vector<int> empty;
    if (stationId < 0 || stationId >= (int)stationToTrains.size()) return empty;
    return stationToTrains[stationId];
}

// ── Load one JSON train file ─────────────────────────────────────

static bool loadTrainFile(const std::string& path, json& out) {
    std::ifstream f(path);
    if (!f.is_open()) return false;
    try {
        out = json::parse(f);
        return true;
    } catch (...) {
        return false;
    }
}

// ── Build the full graph ─────────────────────────────────────────

/**
 * processTrainData: The heart of the graph builder.
 * It takes a single train's JSON data (route, schedule, operating days) 
 * and maps it into our internal graph structure.
 */
void Graph::processTrainData(json& jData) {
    // Create a new TrainInfo object and populate its basic details.
    TrainInfo t;
    t.id     = (int)trains.size(); // Assign a unique ID to the train.
    t.number = jData.value("train_number", "UNKNOWN"); // Get train number, default to UNKNOWN.
    t.name   = jData.value("train_name", ""); // Get train name.
    t.type   = jData.value("type", "Express"); // Get train type, default to Express.

    // Parse available classes for the train.
    if (jData.contains("classes_available")) {
        for (auto& c : jData["classes_available"])
            t.classes.insert(c.get<std::string>());
    } else if (jData.contains("classes")) { // Handle alternative key for classes.
        for (auto& c : jData["classes"])
            t.classes.insert(c.get<std::string>());
    }

    // Initialize operating days to false for all days.
    for (int i = 0; i < 7; ++i) t.operatingDays[i] = false;
    // Parse operating days from JSON.
    if (jData.contains("operating_days")) {
        auto& ops = jData["operating_days"];
        for (auto it = ops.begin(); it != ops.end(); ++it) {
            int dayIdx = TimeUtils::getDayOfWeek(it.key()); // Convert day name to index (0-6).
            if (dayIdx >= 0 && dayIdx < 7)
                t.operatingDays[dayIdx] = it.value().get<bool>(); // Set operating status for the day.
        }
    }

    // Check if schedule data exists; if not, this train cannot be processed.
    if (!jData.contains("schedule")) return;

    // Iterate through each stop in the train's schedule.
    for (auto& stop : jData["schedule"]) {
        std::string sCode = stop.value("station_code", ""); // Get station code.
        std::string sName = stop.value("station_name", ""); // Get station name.
        if (sCode.empty()) continue; // Skip if station code is missing.

        // Create a ScheduleStop object.
        ScheduleStop ss;
        // Get or create the station and assign its ID.
        ss.stationId = getOrCreateStation(sCode, sName);

        // Parse arrival time.
        if (stop.contains("arrival_time") && !stop["arrival_time"].is_null())
            ss.arrivalMin = TimeUtils::parseTime(stop["arrival_time"].get<std::string>());
        else
            ss.arrivalMin = -1; // Indicate no arrival time.

        // Parse departure time.
        if (stop.contains("departure_time") && !stop["departure_time"].is_null())
            ss.departureMin = TimeUtils::parseTime(stop["departure_time"].get<std::string>());
        else
            ss.departureMin = -1; // Indicate no departure time.

        ss.dayOfJourney = stop.value("day_of_journey", 1); // Get day of journey, default to 1.
        ss.distanceKm   = (int)stop.value("distance_km", 0.0); // Get distance, default to 0.

        t.schedule.push_back(ss); // Add the stop to the train's schedule.
    }

    // If the schedule is empty after parsing, this train is invalid.
    if (t.schedule.empty()) return;

    // ── Build edges ────────────
    // We create "edges" for every possible leg of the journey. 
    // If a train goes A -> B -> C, we create edges for:
    // A -> B, B -> C (direct) AND A -> C (skip-stop).
    // This pre-computation makes Dijkstra much faster because 
    // the 'cost' of staying on the same train is baked into a single edge.

    // First loop: Create direct edges between consecutive stops.
    for (int i = 0; i < (int)t.schedule.size() - 1; ++i) {
        const auto& from = t.schedule[i];     // The starting stop of the leg.
        const auto& to   = t.schedule[i + 1]; // The next stop in the schedule.

        // Ensure both stops have valid departure and arrival times.
        if (from.departureMin < 0 || to.arrivalMin < 0) continue;

        // Calculate absolute departure and arrival times in minutes from journey start.
        int depAbs = (from.dayOfJourney - 1) * 1440 + from.departureMin;
        int arrAbs = (to.dayOfJourney   - 1) * 1440 + to.arrivalMin;
        
        // Basic sanity check for duration.
        int travelTime = arrAbs - depAbs;
        if (travelTime < 0) travelTime += 1440; // Handles simple overnight legs by adding a day.

        // Calculate distance for this leg.
        int dist = to.distanceKm - from.distanceKm;
        if (dist < 0) dist = 0; // Distance should not be negative.

        // Create a new Edge object.
        Edge e;
        e.toStation     = to.stationId;     // Destination station ID.
        e.distanceKm    = dist;             // Distance of this leg.
        e.travelTimeMin = travelTime;       // Travel time for this leg.
        e.trainId       = t.id;             // ID of the train.
        e.fromStopIdx   = i;                // Index of the departure stop in the train's schedule.
        e.toStopIdx     = i + 1;            // Index of the arrival stop in the train's schedule.

        // Add the edge to the adjacency list of the departure station.
        adj[from.stationId].push_back(e);
    }

    // Second loop: Generate skip-stop edges for all subsequent stations in the schedule.
    // This pre-calculates the travel cost between any two stops on the same train,
    // which significantly speeds up the Dijkstra search by reducing node expansions.
    for (int i = 0; i < (int)t.schedule.size(); ++i) {
        const auto& stop = t.schedule[i]; // The boarding station for this potential journey.
        if (stop.departureMin < 0) continue; // Skip if no departure time from this stop.

        for (int j = i + 1; j < (int)t.schedule.size(); ++j) { // Iterate through all subsequent stops.
            const auto& dest = t.schedule[j]; // The future destination station.
            if (dest.arrivalMin < 0) continue; // Skip if no arrival time at the destination.

            // Calculate absolute departure time from the boarding station.
            int depAbs = (stop.dayOfJourney - 1) * 1440 + stop.departureMin;
            // Calculate absolute arrival time at the destination station.
            int arrAbs = (dest.dayOfJourney - 1) * 1440 + dest.arrivalMin;
            
            // Calculate travel time. Handle cases where arrival is on a subsequent day.
            int travelTime = arrAbs - depAbs;
            if (travelTime < 0) {
                // If arrival is before departure, it must be on a later day.
                // This can happen if the train crosses midnight multiple times or if dayOfJourney is not strictly increasing.
                // For simplicity, we assume it's the next day if travelTime is negative.
                // A more robust solution might involve checking dayOfJourney difference.
                travelTime += 1440; 
            }
            if (travelTime < 0) continue; // If still negative, it's an invalid leg.

            // Calculate physical distance for this segment.
            int dist = dest.distanceKm - stop.distanceKm;
            if (dist < 0) dist = 0; // Distance should not be negative.

            // Create a new Edge object for this skip-stop journey.
            Edge e;
            e.toStation     = dest.stationId; // Destination station ID.
            e.distanceKm    = dist;           // Physical distance of this segment.
            e.travelTimeMin = travelTime;     // Total travel time for this segment.
            e.trainId       = t.id;           // ID of the train.
            e.fromStopIdx   = i;              // Index of the boarding stop.
            e.toStopIdx     = j;              // Index of the alighting stop.

            // Add the edge to the adjacency list of the boarding station.
            adj[stop.stationId].push_back(e);
        }
    }

    // Populate stationToTrains mapping: for each stop, add the train's ID to the station's list.
    for (auto& ss : t.schedule) {
        stationToTrains[ss.stationId].push_back(t.id);
    }

    trains.push_back(std::move(t));
}

void Graph::loadFromDirectory(const std::string& dirPath) {
    std::vector<std::string> files;
#ifdef _WIN32
    WIN32_FIND_DATAA fd;
    std::string pattern = dirPath + "\\*.json";
    HANDLE h = FindFirstFileA(pattern.c_str(), &fd);
    if (h != INVALID_HANDLE_VALUE) {
        do {
            if (!(fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY))
                files.push_back(dirPath + "\\" + fd.cFileName);
        } while (FindNextFileA(h, &fd));
        FindClose(h);
    }
#else
    DIR* dir = opendir(dirPath.c_str());
    if (dir) {
        struct dirent* ent;
        while ((ent = readdir(dir)) != nullptr) {
            std::string fname = ent->d_name;
            if (fname.size() > 5 && fname.substr(fname.size()-5) == ".json")
                files.push_back(dirPath + "/" + fname);
        }
        closedir(dir);
    }
#endif
    std::sort(files.begin(), files.end());
    for (const auto& fPath : files) {
        json jData;
        if (loadTrainFile(fPath, jData)) processTrainData(jData);
    }
    
    for (auto& vec : stationToTrains) {
        std::sort(vec.begin(), vec.end());
        vec.erase(std::unique(vec.begin(), vec.end()), vec.end());
    }
    std::cerr << "Graph: loaded " << trains.size() << " trains." << std::endl;
}

void Graph::loadFromFile(const std::string& filePath) {
    std::ifstream f(filePath);
    if (!f.is_open()) return;
    try {
        json masterData = json::parse(f);
        if (masterData.is_array()) {
            for (auto& jData : masterData) processTrainData(jData);
        }
        for (auto& vec : stationToTrains) {
            std::sort(vec.begin(), vec.end());
            vec.erase(std::unique(vec.begin(), vec.end()), vec.end());
        }
        std::cerr << "Graph: loaded " << trains.size() << " trains from file." << std::endl;
    } catch (...) {}
}

std::string Graph::getTrainSchedule(const std::string& trainNumber) const {
    for (const auto& t : trains) {
        if (t.number == trainNumber) {
            json res;
            res["train_number"] = t.number;
            res["train_name"]   = t.name;
            res["type"]         = t.type;
            res["classes_available"] = t.classes;
            
            json ops;
            static const char* dayNames[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
            for (int i = 0; i < 7; ++i) {
                ops[dayNames[i]] = t.operatingDays[i];
            }
            res["operating_days"] = ops;

            json sched = json::array();
            for (size_t idx = 0; idx < t.schedule.size(); ++idx) {
                const auto& ss = t.schedule[idx];
                json stop;
                
                stop["station_code"] = getStationCode(ss.stationId);
                stop["station_name"] = getStationName(ss.stationId);
                
                if (ss.arrivalMin < 0) {
                    stop["arrival_time"] = nullptr;
                } else {
                    stop["arrival_time"] = TimeUtils::formatTime(ss.arrivalMin);
                }
                
                if (ss.departureMin < 0) {
                    stop["departure_time"] = nullptr;
                } else {
                    stop["departure_time"] = TimeUtils::formatTime(ss.departureMin);
                }
                
                stop["day_of_journey"] = ss.dayOfJourney;
                stop["distance_km"] = ss.distanceKm;
                sched.push_back(stop);
            }
            res["schedule"] = sched;
            return res.dump();
        }
    }
    return "{}";
}
