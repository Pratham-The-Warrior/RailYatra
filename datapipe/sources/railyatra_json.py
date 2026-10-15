"""Source: an existing RailYatra-format JSON file (the current master data)."""
import json
import os


def load(cfg, ctx):
    path = os.path.join(ctx['root'], cfg['path'])
    with open(path, encoding='utf-8') as f:
        trains = json.load(f)
    if not isinstance(trains, list):
        raise ValueError(f'{path}: expected a JSON array of trains')
    return trains
