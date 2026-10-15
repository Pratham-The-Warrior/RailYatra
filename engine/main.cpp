#include <iostream>
#include <string>
#include <chrono>
#include "graph.hpp"
#include "dijkstra.hpp"
#include "trip_router.hpp"
#include "handlers.hpp"
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
    TripRouter tripRouter(graph);   // precomputes normalized timetables once
    HandlerContext ctx{graph, solver, tripRouter};
    const auto handlers = makeHandlerRegistry();
    const Handler& defaultHandler = handlers.at("route");

    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        if (line == "exit" || line == "quit") break;

        try {
            auto startTime = std::chrono::high_resolution_clock::now();
            json req = json::parse(line);
            std::string reqId = req.value("request_id", "0");
            std::string type  = req.value("type", "route");
            auto it = handlers.find(type);
            const Handler& handler = (it != handlers.end()) ? it->second : defaultHandler;

            try {
                HandlerResult result = handler(req, reqId, ctx);
                std::chrono::duration<double, std::milli> elapsed =
                    std::chrono::high_resolution_clock::now() - startTime;

                json response = std::move(result.body);
                response["request_id"] = reqId;
                response["elapsed_ms"] = elapsed.count();
                std::cout << response.dump() << std::endl;
                std::cerr << result.logPrefix << " in " << elapsed.count() << "ms" << result.logSuffix << std::endl;
            } catch (const RequestError& e) {
                json err;
                err["request_id"] = reqId;
                err["error"] = e.what();
                std::cout << err.dump() << std::endl;
            }
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
