# RailYatra Dijkstra Algorithm Logic

This document details the logic and architecture of the routing engine (implemented in `engine/dijkstra.cpp` and `engine/dijkstra.hpp`).

## Overview
The routing engine uses a **Layered Multi-Pass Dijkstra** to find valid train connections between two railway stations. Because train schedules involve time dependencies (trains only depart at certain times on specific days) and complex user constraints (maximum transfers, specific connection buffer times), standard single-pass Dijkstra isn't sufficient.

The algorithm maps out a time-expanded state-space graph where nodes represent being at a **Specific Station**, at a **Specific Absolute Time**, with a **Specific Number of Previous Switches**. To guarantee that direct routes always appear before 1-transfer routes (and 1-transfer before 2-transfer, etc.), the engine runs **one independent Dijkstra pass per transfer level**, collecting results until 7 routes are found.

---

## 1. Layered Pass Strategy (Top-Level Architecture)

```
findRoutes(from, to, date, maxSwitches=5, maxWaitMin=1200, topK=7, sortMode=TIME):
  seenFingerprints = {}            // shared across all passes (deduplication)
  allResults       = []

  for passMax = 0, 1, 2, ..., maxSwitches:
      if allResults.size() >= topK: break
      needed      = topK - allResults.size()
      passResults = runDijkstraPass(passMax, maxWaitMin, needed, sortMode, seenFingerprints)
      // Within each pass, results are already sorted by cost
      append passResults to allResults

  return allResults
```

**Why this is necessary:**  
The old single-pass approach stored only *one* best cost per `(station, switches)` in its pruning table. This meant only one direct train to the destination could ever be found per run — all others were pruned before they reached the PQ. The layered approach gives each transfer tier its own independent search, allowing multiple direct (or N-transfer) trains to be discovered correctly.

---

## 2. Graph State and Priority Queue

Each pass runs a standard `PQState`-driven Dijkstra:

- **`PQState`**: Tracks the trace index (`traceIdx`), cumulative `cost`, and number of `switches`. Minimum-cost floats to the top.
- **`TraceNode`**: Each node records a taken leg (stationId, arrivalAbsMin, departAbsMin, trainId, fromStopIdx, toStopIdx) plus a `parentIdx` pointer. At destination, the engine walks `parentIdx` backwards to reconstruct the full itinerary.

---

## 3. Seed Generation (Source Initialization)

Each pass kicks off by fetching all trains at the origin station:
- Validates operating days by offsetting the query date with `dayOfJourney`.
- For valid departures, generates a PQ entry for **every subsequent downstream stop** on that train — natively evaluating skip-stop direct routes.
- **Cost calculation**: `arrAbs` (absolute arrival minutes from day 0) for TIME mode; raw distance for DISTANCE mode.

---

## 4. `bestCost` Pruning Table (Intermediate Stations Only)

Without pruning, the search tree grows exponentially. Each pass maintains:

```
bestCost[stationId][switches] = lowest cost seen so far
```

**Critical rule — Destination Exemption:**  
The destination station is **never pruned via `bestCost`**. Every train that reaches the destination is enqueued, regardless of whether a faster train already got there. This is what allows the engine to return multiple direct (or N-transfer) routes rather than just one. Deduplication is handled at result-collection time via `routeFingerprint`.

Intermediate stations are still pruned normally (Pareto Optimality — discard if cost ≥ existing best for same switch count). Each pass re-initialises `bestCost` from scratch, allowing independent exploration per tier.

---

## 5. Connecting Trains (Transfers)

If a popped node is not the destination and `switches < passMax`:
- Loads all trains at the current station, skips the train just alighted from.
- **Temporal window**: Scans departures over the next 3 days. Wait time must be:
  - ≥ 30 min (realistic platform transfer buffer)
  - ≤ `maxWaitMin` (default: 20 hours)
- Validates week-day operating days with the shifted absolute day.
- Generates edges to all downstream stops on the connecting train, incrementing `switches` by 1.
- Destination stops: always enqueued. Intermediate stops: pruned via `bestCost`.

---

## 6. Path Reconstruction & Deduplication

When the destination is popped from the PQ:
1. Walk `parentIdx` chain back to root → collect legs in reverse → reverse to get forward order.
2. Compute `totalTimeMin` = last arrival − first departure (absolute minutes).
3. Compute `totalDistanceKm` = Σ leg distances.
4. Generate `routeFingerprint` = `"trainNumber:fromCode->toCode|"` for each leg.
5. Skip if fingerprint already in `seenFingerprints` (shared across passes).
6. Otherwise, add to pass results.

---

## 7. Final Output Contract

| Property | Guarantee |
|---|---|
| Max results | ≤ `topK` (default 7) |
| Transfer ordering | Non-decreasing: all direct routes before 1-transfer, etc. |
| Within-tier ordering | Sorted by `totalTimeMin` ascending |
| Duplicates | None — fingerprint-deduplicated across all passes |
| Trace memory | Hard-capped at `MAX_TRACE = 500,000` nodes |

---

## System Verifications

- **Modulo Bug Safety**: Operating days math `((query - offset) % 7 + 7) % 7` avoids C++ negative-modulo errors.
- **Time Overflow Safety**: Absolute minutes (`day * 1440 + minute`) handle multi-day travel seamlessly.
- **Trace Heap Safety**: `MAX_TRACE = 500,000` prevents unbounded memory growth.
- **Multi-Direct-Route Bug**: Fixed by destination-exempt `bestCost` + per-pass reset. Previously, only one direct train per destination could be found.
