# RailYatra data pipeline

The single way timetable data gets into RailYatra. Every published file
(`master_train_data.json`, `stations.json`, `master_train_data_vandebharat.json`,
`data/manifest.json`) is **generated** by this pipeline; CI fails if they are
edited by hand (`python3 -m datapipe check`).

```
sources (priority order)  ->  merge  ->  validate + repair  ->  diff + gate  ->  publish  ->  PR  ->  deploy / SIGHUP
```

## Commands

```bash
python3 -m datapipe build   --report report.md   # dry run: report only
python3 -m datapipe publish --report report.md   # write files if the gate passes
python3 -m datapipe check                        # CI: committed files == pipeline output
python3 -m unittest discover -s datapipe/tests -t .
```

After publishing on a running server: `kill -HUP <pid>` hot-reloads the
timetable with zero downtime (see `docs/SCALING_ROADMAP.md`, Phase 3).

## Automation

`.github/workflows/data-refresh.yml` runs every Monday (and on demand). It
rebuilds from all enabled sources, runs the engine validator and backend tests
on the result, and opens a **pull request with the data report** when anything
changed. People review the diff; merging deploys it. A scheduled run with no
real change writes nothing and opens no PR.

## What validation guarantees

| Check | On failure |
|---|---|
| ≥ 2 stops, origin departs, terminus arrives, times are valid `HH:MM` | train rejected |
| runs on at least one weekday | rejected |
| every stop has a numeric `distance_km` (never invented) | rejected |
| station code present and alphanumeric | rejected |
| numbers-only station code (source corruption, e.g. `08` for Raipur Jn) | repaired by station name when unambiguous, else rejected |
| `day_of_journey` inconsistent with clock times | repaired from the times |
| unusual code (looks like a name, e.g. `KARAMNASA`), distance decreasing, same station twice, one code with several names | warning in the report |
| duplicate train number | first (highest-priority) kept |

Publish gate (`publish_gate` in `sources.json`): refuses to publish if fewer
than `min_trains` remain or more than `max_removed_pct` of trains disappear —
the typical signature of a broken source. Override only with `--force` after
reading the report.

## Adding a data source

1. If the provider offers **GTFS** (the global transit standard), no code is
   needed: add a `gtfs` entry to `sources.json` with its `url`, set
   `distance_unit`, place it **above** `railyatra-master` (first source wins
   per train), and set `enabled: true`.
2. Otherwise write an adapter in `datapipe/sources/` that returns canonical
   records (`datapipe/model.py`), register it in `sources/__init__.py`, and add
   tests with a small fixture (see `tests/test_datapipe.py`).
3. All network access goes through `PoliteFetcher` (`fetch.py`): identifying
   User-Agent with contact, robots.txt, per-host rate limit, backoff on
   429/5xx with `Retry-After`, and ETag/Last-Modified caching.

## Where the data can come from (researched October 2026)

| Source | What it is | Usable? |
|---|---|---|
| Current `master_train_data.json` | 1,979 trains, origin undocumented | Yes, as the lowest-priority source |
| **Licensed provider / authorized IRCTC-CRIS arrangement** | Complete, current, legally clear | **The recommended path**: a business agreement, then a `gtfs` or custom adapter |
| [Neo2308/indianrailways-gtfs](https://github.com/Neo2308/indianrailways-gtfs) | Unofficial national GTFS feed, ~10,500 routes, generated Nov 2025 from an unnamed API | **No licence stated**: don't ship it without written permission from the author; useful as a coverage benchmark |
| [datameet/railways](https://github.com/datameet/railways) | Stations (with coordinates), trains, schedules | CC0 licence, but compiled in 2016: stale for schedules, fine for station geography |
| [data.gov.in "Indian Railways Train Time Table"](https://www.data.gov.in/catalog/indian-railways-train-time-table) | Catalog listing | Could not confirm a current downloadable file |

### Why there is no NTES / IRCTC scraper here

An earlier version scraped NTES using a faked browser identity and a
proxy service to avoid being blocked. This pipeline deliberately does
not do that, and `PoliteFetcher` refuses to (it requires an honest User-Agent
and obeys robots.txt):

- it breaks whenever the site changes or tightens blocking, so the data
  silently stops updating;
- getting around a site's access controls carries legal risk for the business;
- a licensed feed gives complete, current, structured data that scraping
  cannot, and is what established rail apps rely on.

If a source permits automated access (open data portal, published feed,
licensed API), add it as above; the rate limiting and caching make it cheap for
both sides.

## Findings from the first run (fixed in the published data)

- 36 trains had `day_of_journey` values contradicting their own times.
- 10 trains (20705/06, 20825/26, 20843–47) had station codes for Raipur Jn,
  Gondia Jn and Jalna replaced by numbers like `08`, hiding them from
  searches at those stations (Raipur → Gondia direct trains: 15 → 17).
- `master_train_data_vandebharat.json` was missing 3 Vande Bharat trains
  (22477, 22478, 22926); `stations.json` was missing CBSA and listed a station
  (`J`) with no trains.
- `city_stations.json` referenced 9 station codes that no train serves (e.g.
  Mumbai Central as `BCT`; the timetable uses `MMCT`) and a few stations from
  other cities (Balharshah under Kolkata). Fixed; `python3 -m datapipe check`
  now fails if a city search lists a station that no train serves.
- Still open, needs a better source: Jalna is coded `JALNA` instead of the
  official `J`; 13009/13010 use `KARAMNASA` as a station code.
