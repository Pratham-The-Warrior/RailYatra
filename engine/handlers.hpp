#ifndef HANDLERS_HPP
#define HANDLERS_HPP

/**
 * Engine request handlers.
 *
 * Protocol: one JSON request per stdin line, one JSON response per stdout line.
 *   request:  {"request_id": "...", "type": "<handler>", ...handler fields}
 *   success:  {"request_id", "elapsed_ms", ...handler body (e.g. "results")}
 *   error:    {"request_id", "error"}
 * Unknown or missing "type" is treated as "route" (backwards compatible).
 *
 * To add a capability: write a function with the Handler signature and add it
 * to makeHandlerRegistry(). The request loop in main.cpp does not change.
 */

#include <functional>
#include <stdexcept>
#include <string>
#include <unordered_map>

#include "dijkstra.hpp"
#include "graph.hpp"
#include "json.hpp"
#include "trip_router.hpp"

using json = nlohmann::json;

/** A user-input problem: answered as {"request_id", "error"} for this request. */
class RequestError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

struct HandlerContext {
    const Graph& graph;
    DijkstraSolver& solver;
    const TripRouter& tripRouter;
};

struct HandlerResult {
    json body;              // merged into the response envelope
    std::string logPrefix;  // stderr log: "<prefix> in <ms>ms<suffix>"
    std::string logSuffix;
};

using Handler = std::function<HandlerResult(const json& req, const std::string& reqId, HandlerContext& ctx)>;

std::unordered_map<std::string, Handler> makeHandlerRegistry();

#endif // HANDLERS_HPP
