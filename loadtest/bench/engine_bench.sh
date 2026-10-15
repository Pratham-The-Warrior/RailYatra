#!/bin/sh
# Micro-benchmark: feed N requests straight into the engine and report latency percentiles.
# Usage: loadtest/bench/engine_bench.sh [engine_binary] [N] [out.jsonl]
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
BIN=${1:-$ROOT/engine/route_engine}; N=${2:-400}; OUT=${3:-/dev/null}
python3 "$ROOT/loadtest/bench/gen_requests.py" "$N" > /tmp/ry_reqs.jsonl
START=$(date +%s.%N)
"$BIN" "$ROOT/master_train_data.json" < /tmp/ry_reqs.jsonl > "$OUT" 2>/tmp/ry_err.log
END=$(date +%s.%N)
echo "wall: $(echo "$END - $START" | bc)s for $N requests (includes ~load time)"
grep -o "in [0-9.]*ms" /tmp/ry_err.log | awk '{gsub("ms","",$2); print $2}' | sort -n | \
  awk '{a[NR]=$1; s+=$1} END{printf "engine ms: mean %.2f p50 %.2f p90 %.2f p99 %.2f max %.2f\n", s/NR, a[int(NR*.5)], a[int(NR*.9)], a[int(NR*.99)], a[NR]}'
