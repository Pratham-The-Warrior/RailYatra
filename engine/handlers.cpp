#include "handlers.hpp"

#include <algorithm>
#include <cctype>
#include <vector>

namespace {

std::vector<std::string> codeList(const json& v) {
    std::vector<std::string> out;
    if (v.is_array()) for (auto& c : v) out.push_back(c.get<std::string>());
    else out.push_back(v.get<std::string>());
    return out;
}

std::string upper(std::string s) {
    for (auto& c : s) c = (char)toupper((unsigned char)c);
    return s;
}

SortMode sortModeOf(const json& req) {
    SortMode mode = SortMode::TIME;
    if (req.contains("sort_by")) {
        std::string sb = req["sort_by"].get<std::string>();
        if (sb == "distance") mode = SortMode::DISTANCE;
        else if (sb == "switches") mode = SortMode::SWITCHES;
    }
    return mode;
}

void requireRouteFields(const json& req, const char* message) {
    if (!req.contains("from") || !req.contains("to") || !req.contains("date"))
        throw std::runtime_error(message);
}

std::string foundSuffix(size_t n) { return ". Found " + std::to_string(n) + " routes."; }

// ── schedule: full timetable of one train ────────────────────────
HandlerResult handleSchedule(const json& req, const std::string& reqId, HandlerContext& ctx) {
    if (!req.contains("train_number"))
        throw std::runtime_error("Missing required field: train_number for schedule request");
    std::string tNum = req["train_number"].get<std::string>();
    json body;
    body["type"] = "schedule";
    body["results"] = json::parse(ctx.graph.getTrainSchedule(tNum));
    return {body, "Schedule Request [" + reqId + "] for train " + tNum, "."};
}

// ── pareto: earliest arrival per number of changes ──────────────
HandlerResult handlePareto(const json& req, const std::string& reqId, HandlerContext& ctx) {
    requireRouteFields(req, "Missing required fields: from, to, date for pareto request");
    std::vector<std::string> fromCodes = codeList(req["from"]);
    std::vector<std::string> toCodes   = codeList(req["to"]);
    std::string date = req["date"].get<std::string>();
    int maxSwitches = req.value("max_switches", 4);
    int maxWait     = req.value("max_wait", 600);

    // Same validation semantics as the classic route request.
    auto known = [&](const std::vector<std::string>& codes) {
        std::vector<std::string> out;
        for (const auto& c : codes) {
            std::string u = upper(c);
            if (ctx.graph.getStationId(u) != -1) out.push_back(u);
        }
        return out;
    };
    std::vector<std::string> knownFrom = known(fromCodes), knownTo = known(toCodes);
    if (knownFrom.empty())
        throw RequestError("Unknown source station: " + (fromCodes.empty() ? std::string() : fromCodes[0]));
    if (knownTo.empty())
        throw RequestError("Unknown destination station: " + (toCodes.empty() ? std::string() : toCodes[0]));
    bool allSame = std::all_of(knownFrom.begin(), knownFrom.end(), [&](const std::string& f) {
        return std::find(knownTo.begin(), knownTo.end(), f) != knownTo.end();
    });
    if (allSame) throw RequestError("Source and destination stations cannot be the same.");

    auto results = ctx.tripRouter.paretoRoutes(knownFrom, knownTo, date, maxSwitches, maxWait);
    json body;
    body["results"] = DijkstraSolver::toJson(results);
    return {body,
            "Pareto [" + reqId + "] " + std::to_string(fromCodes.size()) + " sources -> " +
                std::to_string(toCodes.size()) + " dests",
            foundSuffix(results.size())};
}

// ── multi_route: ranked list between station sets (city search) ──
HandlerResult handleMultiRoute(const json& req, const std::string& reqId, HandlerContext& ctx) {
    requireRouteFields(req, "Missing required fields: from, to, date for multi_route request");
    std::vector<std::string> fromCodes = codeList(req["from"]);
    std::vector<std::string> toCodes   = codeList(req["to"]);
    std::string date = req["date"].get<std::string>();
    int maxSwitches = req.value("max_switches", 4);
    int maxWait     = req.value("max_wait", 600);
    int topK        = req.value("top_k", 10);
    SortMode mode   = sortModeOf(req);

    auto results = ctx.solver.findRoutesMulti(fromCodes, toCodes, date, maxSwitches, maxWait, topK, mode);
    json body;
    body["results"] = DijkstraSolver::toJson(results);
    return {body,
            "MultiRoute [" + reqId + "] " + std::to_string(fromCodes.size()) + " sources -> " +
                std::to_string(toCodes.size()) + " dests",
            foundSuffix(results.size())};
}

// ── route: ranked list between two stations (default type) ──────
HandlerResult handleRoute(const json& req, const std::string& reqId, HandlerContext& ctx) {
    requireRouteFields(req, "Missing required fields: from, to, date");
    std::string from = req["from"].get<std::string>();
    std::string to   = req["to"].get<std::string>();
    std::string date = req["date"].get<std::string>();
    std::string fromUpper = upper(from), toUpper = upper(to);

    if (fromUpper == toUpper) throw RequestError("Source and destination stations cannot be the same.");
    if (ctx.graph.getStationId(fromUpper) == -1) throw RequestError("Unknown source station: " + fromUpper);
    if (ctx.graph.getStationId(toUpper) == -1) throw RequestError("Unknown destination station: " + toUpper);

    int maxSwitches = req.value("max_switches", 4);
    int maxWait     = req.value("max_wait", 600);
    int topK        = req.value("top_k", 10);
    SortMode mode   = sortModeOf(req);

    auto results = ctx.solver.findRoutes(from, to, date, maxSwitches, maxWait, topK, mode);
    json body;
    body["results"] = DijkstraSolver::toJson(results);
    return {body, "Request [" + reqId + "] " + from + " -> " + to, foundSuffix(results.size())};
}

} // namespace

std::unordered_map<std::string, Handler> makeHandlerRegistry() {
    return {
        {"route", handleRoute},
        {"multi_route", handleMultiRoute},
        {"pareto", handlePareto},
        {"schedule", handleSchedule},
    };
}
