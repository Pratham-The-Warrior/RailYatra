"""Generate a deterministic batch of engine route requests (JSON lines) for micro-benchmarks."""
import json, random, sys
random.seed(int(sys.argv[2]) if len(sys.argv) > 2 else 7)
S = ['BZA','ET','CNB','BSL','KYN','DDU','NGP','VGLJ','HWH','BBS','LKO','NDLS','KUR','ST','KGP','BPL',
     'BRC','PUNE','MMR','ASN','VSKP','RJY','NZM','KPD','UMB','MB','CTC','GZB','TNA','BSB','CSMT','KOP','MAS','SBC']
for i in range(int(sys.argv[1]) if len(sys.argv) > 1 else 400):
    a, b = random.sample(S, 2)
    print(json.dumps({"request_id": str(i), "from": a, "to": b, "date": "2026-11-%02d" % random.randint(1, 28),
                      "max_switches": 5, "max_wait": 600, "sort_by": "switches", "top_k": 50}))
