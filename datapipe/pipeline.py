"""Build -> validate -> diff -> (gate) -> publish."""
import hashlib
import json
import os
import time

from .fetch import PoliteFetcher
from .sources import ADAPTERS
from .validate import validate_all


def load_config(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def merge(source_results):
    """
    source_results: list of (source_name, trains) in priority order (first wins).
    Returns (trains, provenance) where provenance maps train_number -> source.
    """
    merged, provenance = {}, {}
    for name, trains in source_results:
        for t in trains:
            num = str(t.get('train_number') or '').strip()
            if num and num not in merged:
                merged[num] = t
                provenance[num] = name
    return list(merged.values()), provenance


def canonical_bytes(trains):
    return json.dumps(trains, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')


def diff(old, new):
    """Train-level diff between two lists of canonical records."""
    o = {t['train_number']: t for t in old}
    n = {t['train_number']: t for t in new}
    added = sorted(set(n) - set(o))
    removed = sorted(set(o) - set(n))
    changed = sorted(k for k in set(o) & set(n)
                     if canonical_bytes([o[k]]) != canonical_bytes([n[k]]))
    return {'added': added, 'removed': removed, 'changed': changed}


def build(config, root, fetcher=None):
    """Runs every enabled source and validation. Returns a build result dict."""
    if fetcher is None and any(s.get('enabled', True) and ('url' in s) for s in config['sources']):
        fetch_cfg = config.get('fetch', {})
        fetcher = PoliteFetcher(user_agent=fetch_cfg['user_agent'],
                                cache_dir=os.path.join(root, fetch_cfg.get('cache_dir', '.datapipe-cache')),
                                min_interval_s=fetch_cfg.get('min_interval_s', 2.0))
    ctx = {'root': root, 'fetcher': fetcher}
    results, source_stats = [], {}
    for src in config['sources']:
        if not src.get('enabled', True):
            continue
        trains = ADAPTERS[src['adapter']](src, ctx)
        results.append((src['name'], trains))
        source_stats[src['name']] = len(trains)
    merged, provenance = merge(results)
    accepted, rejected, warnings, station_names = validate_all(merged)
    return {'trains': accepted, 'rejected': rejected, 'warnings': warnings,
            'station_names': station_names, 'provenance': provenance, 'source_stats': source_stats}


def outputs(result, config):
    """Derived files: stations.json and category files, generated from the trains."""
    trains = result['trains']
    stations = sorted(({'name': name, 'code': code} for code, name in result['station_names'].items()),
                      key=lambda s: s['code'])
    files = {
        config['output']['trains']: trains,
        config['output']['stations']: stations,
    }
    for cat in config.get('categories', []):
        files[cat['file']] = [t for t in trains if (t.get('type') or '').upper() == cat['type'].upper()]
    return files


def gate(old_trains, new_trains, config):
    """Returns a list of reasons NOT to publish (empty = OK)."""
    g = config.get('publish_gate', {})
    reasons = []
    if len(new_trains) < g.get('min_trains', 1):
        reasons.append(f"only {len(new_trains)} trains (< min_trains {g.get('min_trains')})")
    if old_trains:
        d = diff(old_trains, new_trains)
        pct = 100.0 * len(d['removed']) / len(old_trains)
        if pct > g.get('max_removed_pct', 5):
            reasons.append(f"{len(d['removed'])} trains removed ({pct:.1f}% > max_removed_pct {g.get('max_removed_pct', 5)}%)")
    return reasons


def publish(files, root, manifest):
    """
    Atomic write (temp file + rename) of every output file whose content
    changed. Returns the list of files written; when nothing changed, nothing
    (not even the manifest timestamp) is touched, so scheduled runs stay quiet.
    """
    changed = []
    for rel, data in files.items():
        path = os.path.join(root, rel)
        if os.path.exists(path):
            with open(path, encoding='utf-8') as f:
                if json.load(f) == data:
                    continue
        changed.append(rel)
    if not changed and os.path.exists(os.path.join(root, manifest['path'])):
        return []
    for rel in changed:
        data = files[rel]
        path = os.path.join(root, rel)
        tmp = path + '.tmp'
        # Same formatting as the hand-maintained files (4-space indent, no
        # trailing newline) so data PRs show readable line-level diffs.
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        os.replace(tmp, path)
    mpath = os.path.join(root, manifest['path'])
    with open(mpath + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(manifest['data'], f, indent=2, sort_keys=True)
    os.replace(mpath + '.tmp', mpath)
    return changed


def make_manifest(result, config):
    trains = result['trains']
    return {
        'path': config['output']['manifest'],
        'data': {
            'version': hashlib.sha256(canonical_bytes(trains)).hexdigest()[:12],
            'built_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'train_count': len(trains),
            'station_count': len(result['station_names']),
            'sources': result['source_stats'],
            'trains_by_source': {s: sum(1 for v in result['provenance'].values() if v == s)
                                 for s in result['source_stats']},
            'rejected_count': len(result['rejected']),
            'warning_count': sum(len(v) for v in result['warnings'].values()),
        },
    }
