"""Human-readable data quality and coverage report (Markdown)."""
import json
import os


def unserved_city_stations(result, config, root):
    """{city: [codes]} for city-search stations that no train serves (empty if all are served)."""
    city_path = os.path.join(root, config.get('coverage', {}).get('city_stations', 'city_stations.json'))
    if not os.path.exists(city_path):
        return {}
    with open(city_path, encoding='utf-8') as f:
        cities = json.load(f)
    codes = {s['station_code'] for t in result['trains'] for s in t['schedule']}
    missing = {city: [c for c in v['stations'] if c not in codes] for city, v in cities.items()}
    return {k: v for k, v in missing.items() if v}


def render(result, d, gate_reasons, config, root, max_list=25):
    trains = result['trains']
    codes = {s['station_code'] for t in trains for s in t['schedule']}
    lines = ['# Timetable data report', '']
    lines += [f"- Trains accepted: **{len(trains)}**",
              f"- Trains rejected: **{len(result['rejected'])}**",
              f"- Stations served: **{len(codes)}**",
              f"- Sources: " + ', '.join(f'{k} ({v} trains)' for k, v in result['source_stats'].items()), '']

    lines += ['## Change vs published data', '',
              f"- Added: {len(d['added'])}", f"- Removed: {len(d['removed'])}", f"- Changed: {len(d['changed'])}"]
    for label in ('added', 'removed', 'changed'):
        if d[label]:
            lines.append(f"- {label.capitalize()} (first {max_list}): " + ', '.join(d[label][:max_list]))
    lines += ['', '## Publish gate', '']
    lines += [f'- BLOCKED: {r}' for r in gate_reasons] or ['- OK']

    # Coverage checks against reference files the product depends on.
    lines += ['', '## Coverage', '']
    missing = unserved_city_stations(result, config, root)
    if missing:
        lines.append('City searches reference stations with **no trains** in the data:')
        lines += [f'- {city}: ' + ', '.join(v) for city, v in sorted(missing.items())]
    else:
        lines.append('- Every station referenced by city searches has trains.')
    by_count = {}
    for t in trains:
        for s in t['schedule']:
            by_count[s['station_code']] = by_count.get(s['station_code'], 0) + 1
    thin = sorted(c for c, n in by_count.items() if n == 1)
    lines.append(f'- Stations served by exactly one train: {len(thin)}')

    lines += ['', '## Rejected trains', '']
    if result['rejected']:
        for num, errs in list(result['rejected'].items())[:max_list]:
            lines.append(f'- {num}: ' + '; '.join(errs[:3]) + (' …' if len(errs) > 3 else ''))
    else:
        lines.append('- None')

    lines += ['', '## Warnings (repaired or worth checking)', '']
    if result['warnings']:
        items = list(result['warnings'].items())
        for key, warns in items[:max_list]:
            lines.append(f'- {key}: ' + '; '.join(warns[:2]) + (f' (+{len(warns) - 2} more)' if len(warns) > 2 else ''))
        if len(items) > max_list:
            lines.append(f'- … and {len(items) - max_list} more')
    else:
        lines.append('- None')
    return '\n'.join(lines) + '\n'
