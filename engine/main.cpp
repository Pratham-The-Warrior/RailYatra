#include <iostream>
#include <string>
#include <chrono>
#include "graph.hpp"
#include "dijkstra.hpp"
#include "json.hpp"

using json = nlohmann::json;

int main(int argc, char* argv[]) {
    // Fast I/O
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(nullptr);

    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <json_data_dir> [--stations]" << std::endl;
        return 1;
    }

    // ── Load graph ──────────────────────────────────────────
    Graph graph;
    std::string dataPath(argv[1]);
    std::cerr << "Loading data from " << dataPath << "..." << std::endl;

    // Basic file vs directory detection (suffix check or stat)
    if (dataPath.size() > 5 && dataPath.substr(dataPath.size() - 5) == ".json") {
        graph.loadFromFile(dataPath);
    } else {
        graph.loadFromDirectory(dataPath);
    }
    std::cerr << "Ready for requests." << std::endl;

    // ── --stations mode: dump station list and exit ──────────
    if (argc > 2 && std::string(argv[2]) == "--stations") {
        json arr = json::array();
        for (const auto& s : graph.getStations()) {
            arr.push_back({{"code", s.code}, {"name", s.name}});
        }
        std::cout << arr.dump() << std::endl;
        return 0;
    }

    // ── Interactive request loop ────────────────────────────
    DijkstraSolver solver(graph);

    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        if (line == "exit" || line == "quit") break;

        try {
            auto startTime = std::chrono::high_resolution_clock::now();
            json req = json::parse(line);
            std::string reqId = req.value("request_id", "0");
            std::string type  = req.value("type", "route");

            if (type == "schedule") {
                if (!req.contains("train_number")) {
                    throw std::runtime_error("Missing required field: train_number for schedule request");
                }
                std::string tNum = req["train_number"].get<std::string>();
                std::string schedStr = graph.getTrainSchedule(tNum);
                json sched = json::parse(schedStr);
                
                json response;
                response["request_id"] = reqId;
                response["type"] = "schedule";
                response["results"] = sched;
                
                auto endTime = std::chrono::high_resolution_clock::now();
                std::chrono::duration<double, std::milli> elapsed = endTime - startTime;
                response["elapsed_ms"] = elapsed.count();
                
                std::cout << response.dump() << std::endl;
                std::cerr << "Schedule Request [" << reqId << "] for train " << tNum << " in " << elapsed.count() << "ms." << std::endl;
                continue;
            }

            // ── Standard Route Request ──────────────────────────
            // Validate required fields
            if (!req.contains("from") || !req.contains("to") || !req.contains("date")) {
                throw std::runtime_error("Missing required fields: from, to, date");
            }

            std::string from = req["from"].get<std::string>();
            std::string to   = req["to"].get<std::string>();
            std::string date = req["date"].get<std::string>();

            // Validate from != to
            std::string fromUpper = from, toUpper = to;
            for (auto& c : fromUpper) c = (char)toupper((unsigned char)c);
            for (auto& c : toUpper)   c = (char)toupper((unsigned char)c);

            if (fromUpper == toUpper) {
                json err;
                err["request_id"] = reqId;
                err["error"] = "Source and destination stations cannot be the same.";
                std::cout << err.dump() << std::endl;
                continue;
            }

            // Validate stations exist
            if (graph.getStationId(fromUpper) == -1) {
                json err;
                err["request_id"] = reqId;
                err["error"] = "Unknown source station: " + fromUpper;
                std::cout << err.dump() << std::endl;
                continue;
            }
            if (graph.getStationId(toUpper) == -1) {
                json err;
                err["request_id"] = reqId;
                err["error"] = "Unknown destination station: " + toUpper;
                std::cout << err.dump() << std::endl;
                continue;
            }

            int maxSwitches = req.value("max_switches", 4);
            int maxWait     = req.value("max_wait", 600);
            int topK        = req.value("top_k", 10);

            // Sort mode
            SortMode sortMode = SortMode::TIME;
            if (req.contains("sort_by")) {
                std::string sb = req["sort_by"].get<std::string>();
                if (sb == "distance") sortMode = SortMode::DISTANCE;
                else if (sb == "switches") sortMode = SortMode::SWITCHES;
            }

            // Run Dijkstra
            auto results = solver.findRoutes(
                from, to, date, maxSwitches, maxWait, topK, sortMode);

            auto endTime = std::chrono::high_resolution_clock::now();
            std::chrono::duration<double, std::milli> elapsed = endTime - startTime;

            // Build response
            json response;
            response["request_id"] = reqId;
            response["results"]    = DijkstraSolver::toJson(results);
            response["elapsed_ms"] = elapsed.count();

            std::cout << response.dump() << std::endl;

            std::cerr << "Request [" << reqId << "] " << from << " -> " << to
                      << " in " << elapsed.count() << "ms. Found "
                      << results.size() << " routes." << std::endl;

        } catch (const std::exception& e) {
            json err;
            try {
                json req = json::parse(line);
                err["request_id"] = req.value("request_id", "unknown");
            } catch (...) {
                err["request_id"] = "invalid_json";
            }
            err["error"] = e.what();
            std::cout << err.dump() << std::endl;
            std::cerr << "Error: " << e.what() << std::endl;
        }
    }

    return 0;
}
