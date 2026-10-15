"""
Source adapters. Each adapter is a function `load(cfg, ctx) -> list[train]`
returning canonical records (see datapipe/model.py). `ctx` provides the
project root and a PoliteFetcher for network sources.

To add a provider: write an adapter that converts its format into canonical
records, register it in ADAPTERS, and add an entry to datapipe/sources.json.
"""
from . import railyatra_json, gtfs

ADAPTERS = {
    'railyatra_json': railyatra_json.load,
    'gtfs': gtfs.load,
}
