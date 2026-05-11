# Routing Engine Logic

How the Dijkstra engine works. Code lives in `engine/dijkstra.cpp` and `engine/dijkstra.hpp`.

## Overview

The engine uses a layered multi-pass Dijkstra to find train connections. Standard Dijkstra doesn't work here because trains have fixed schedules, operating days, and we need to handle transfers with buffer times.

Each node in the search space is: (station, absolute time, number of switches so far). To make sure direct routes always show up before 1-transfer routes, the engine runs one Dijkstra pass per transfer level and collects results until topK is hit.

## How it works

### 1. Layered passes

```
findRoutes(from, to, date, maxSwitches=5, maxWaitMin=600, topK=10, sortMode=TIME):
  seenFingerprints = {}
  allResults = []

  for passMax = 0, 1, 2, ..., maxSwitches:
      if allResults.size() >= topK: break
      needed = topK - allResults.size()
      passResults = runDijkstraPass(passMax, maxWaitMin, needed, sortMode, seenFingerprints)
      append passResults to allResults

  return allResults
```

There's also `findRoutesMulti(fromCodes, toCodes)` for city-level searches. Same logic, but it seeds from all stations in fromCodes and accepts arrival at any station in toCodes.

### 2. Priority queue state

- `PQState` — tracks trace index, cumulative cost, switch count. Min-cost pops first.
- `TraceNode` — records each leg (station, times, train, stop indices) plus a parent pointer. At the destination, walk the parent chain backwards to reconstruct the route.

### 3. Seeding (source init)

Each pass loads all trains at the origin station (or all origin stations for `findRoutesMulti`):
- Checks operating days using `dayOfJourney` offset
- Creates a PQ entry for every downstream stop on valid trains (this handles skip-stop direct routes naturally)
- Cost is absolute arrival minutes (TIME mode) or raw distance (DISTANCE mode)

### 4. Pruning with bestCost

Each pass maintains `bestCost[stationId][switches]` to avoid exploring worse paths.

Important: the destination station is never pruned. Every train reaching the destination gets enqueued, even if a faster one already got there. This is how we return multiple direct routes instead of just one. Dedup happens later via route fingerprints.

Intermediate stations are pruned normally (discard if cost >= best for same switch count). bestCost resets each pass so tiers explore independently.

### 5. Transfers

When a popped node isn't the destination and switches < passMax:
- Load all trains at current station, skip the one we just got off
- Scan departures over the next 3 days
- Wait time must be >= 30 min (platform transfer buffer) and <= maxWaitMin
- Validate operating days for the shifted day
- Generate edges to all downstream stops, increment switches by 1
- Destination stops always enqueued, intermediates pruned via bestCost

### 6. Path reconstruction

When destination is popped from PQ:
1. Walk parentIdx chain back to root, collect legs, reverse them
2. Compute totalTimeMin = last arrival - first departure
3. Compute totalBufferMin = totalTimeMin - sum of leg travel times
4. Compute totalDistanceKm = sum of leg distances
5. Generate routeFingerprint = "trainNumber:fromCode->toCode|" per leg
6. Skip if fingerprint already seen (shared across passes)
7. Otherwise add to results

### 7. Output guarantees

- Max results: topK (default 10, frontend requests 50)
- Transfer ordering: non-decreasing (direct before 1-transfer, etc.)
- Within-tier ordering: by totalTimeMin asc, then totalBufferMin asc
- No duplicates (fingerprint dedup across all passes)
- Trace memory capped at MAX_TRACE = 500,000 nodes

## Safety notes

- Operating days math uses `((query - offset) % 7 + 7) % 7` to avoid C++ negative-modulo bugs
- Absolute minutes (`day * 1440 + minute`) handles multi-day travel
- MAX_TRACE = 500,000 prevents unbounded memory growth
- Destination-exempt bestCost + per-pass reset fixed a bug where only one direct train per destination was found
