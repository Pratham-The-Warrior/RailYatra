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

int Graph::getOrCreateStation(const std::string& code, const std::string& name) {
    auto it = codeToId.find(code);
    if (it != codeToId.end()) return it->second;

    int id = (int)stations.size();
    stations.push_back({id, code, name.empty() ? code : name});
    codeToId[code] = id;
    return id;
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

void Graph::processTrainData(json& jData) {
    TrainInfo t;
    t.id     = (int)trains.size();
    t.number = jData.value("train_number", "UNKNOWN");
    t.name   = jData.value("train_name", "");
    t.type   = jData.value("type", "Express");

    // Classes
    if (jData.contains("classes_available")) {
        for (auto& c : jData["classes_available"])
            t.classes.insert(c.get<std::string>());
    } else if (jData.contains("classes")) {
        for (auto& c : jData["classes"])
            t.classes.insert(c.get<std::string>());
    }

    // Operating days
    for (int i = 0; i < 7; ++i) t.operatingDays[i] = false;
    if (jData.contains("operating_days")) {
        auto& ops = jData["operating_days"];
        for (auto it = ops.begin(); it != ops.end(); ++it) {
            int dayIdx = TimeUtils::getDayOfWeek(it.key());
            if (dayIdx >= 0 && dayIdx < 7)
                t.operatingDays[dayIdx] = it.value().get<bool>();
        }
    }

    // Schedule
    if (!jData.contains("schedule")) return;

    for (auto& stop : jData["schedule"]) {
        std::string sCode = stop.value("station_code", "");
        std::string sName = stop.value("station_name", "");
        if (sCode.empty()) continue;

        ScheduleStop ss;
        ss.stationId = getOrCreateStation(sCode, sName);

        // Parse arrival
        if (stop.contains("arrival_time") && !stop["arrival_time"].is_null())
            ss.arrivalMin = TimeUtils::parseTime(stop["arrival_time"].get<std::string>());
        else
            ss.arrivalMin = -1;

        // Parse departure
        if (stop.contains("departure_time") && !stop["departure_time"].is_null())
            ss.departureMin = TimeUtils::parseTime(stop["departure_time"].get<std::string>());
        else
            ss.departureMin = -1;

        ss.dayOfJourney = stop.value("day_of_journey", 1);
        ss.distanceKm   = (int)stop.value("distance_km", 0.0);

        t.schedule.push_back(ss);
    }

    if (t.schedule.empty()) return;

    // ── Build edges ────────────
    int maxSid = 0;
    for (auto& ss : t.schedule)
        maxSid = std::max(maxSid, ss.stationId);

    if ((int)adj.size() <= maxSid)
        adj.resize(maxSid + 1);
    if ((int)stationToTrains.size() <= maxSid)
        stationToTrains.resize(maxSid + 1);

    for (int i = 0; i < (int)t.schedule.size() - 1; ++i) {
        const auto& from = t.schedule[i];
        const auto& to   = t.schedule[i + 1];

        if (from.departureMin < 0 || to.arrivalMin < 0) continue;

        int depAbs = (from.dayOfJourney - 1) * 1440 + from.departureMin;
        int arrAbs = (to.dayOfJourney   - 1) * 1440 + to.arrivalMin;
        int travelTime = arrAbs - depAbs;
        if (travelTime < 0) travelTime += 1440;

        int dist = to.distanceKm - from.distanceKm;
        if (dist < 0) dist = 0;

        Edge e;
        e.toStation     = to.stationId;
        e.distanceKm    = dist;
        e.travelTimeMin = travelTime;
        e.trainId       = t.id;
        e.fromStopIdx   = i;
        e.toStopIdx     = i + 1;

        adj[from.stationId].push_back(e);
    }

    for (int i = 0; i < (int)t.schedule.size(); ++i) {
        const auto& from = t.schedule[i];
        if (from.departureMin < 0) continue;

        for (int j = i + 2; j < (int)t.schedule.size(); ++j) {
            const auto& to = t.schedule[j];
            if (to.arrivalMin < 0) continue;

            int depAbs = (from.dayOfJourney - 1) * 1440 + from.departureMin;
            int arrAbs = (to.dayOfJourney   - 1) * 1440 + to.arrivalMin;
            int travelTime = arrAbs - depAbs;
            if (travelTime < 0) continue; 

            int dist = to.distanceKm - from.distanceKm;
            if (dist < 0) dist = 0;

            Edge e;
            e.toStation     = to.stationId;
            e.distanceKm    = dist;
            e.travelTimeMin = travelTime;
            e.trainId       = t.id;
            e.fromStopIdx   = i;
            e.toStopIdx     = j;

            adj[from.stationId].push_back(e);
        }
    }

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
