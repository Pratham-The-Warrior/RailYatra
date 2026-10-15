"""
Usage:
  python3 -m datapipe build   [--config datapipe/sources.json] [--report out.md]
  python3 -m datapipe publish [--config ...] [--report out.md] [--force]
  python3 -m datapipe check   [--config ...]

build:   run sources + validation, print the report, write nothing.
publish: as build, then (if the publish gate passes, or --force) atomically
         write the trains/stations/category files and data/manifest.json.
check:   exit 1 unless the committed data files are exactly what the pipeline
         would publish (catches hand edits that skipped validation).
Exit codes: 0 ok, 1 gate blocked / check failed, 2 error.
"""
import argparse
import json
import os
import sys

from . import pipeline, report


def main(argv=None):
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap = argparse.ArgumentParser(prog='datapipe')
    ap.add_argument('command', choices=['build', 'publish', 'check'])
    ap.add_argument('--config', default=os.path.join(root, 'datapipe', 'sources.json'))
    ap.add_argument('--report')
    ap.add_argument('--force', action='store_true', help='publish even if the gate blocks')
    args = ap.parse_args(argv)

    config = pipeline.load_config(args.config)
    result = pipeline.build(config, root)

    old_path = os.path.join(root, config['output']['trains'])
    old = []
    if os.path.exists(old_path):
        with open(old_path, encoding='utf-8') as f:
            old = json.load(f)
    d = pipeline.diff(old, result['trains'])
    reasons = pipeline.gate(old, result['trains'], config)
    if args.command == 'check':
        stale = [rel for rel, data in pipeline.outputs(result, config).items()
                 if not os.path.exists(os.path.join(root, rel))
                 or json.load(open(os.path.join(root, rel), encoding='utf-8')) != data]
        if stale or result['rejected']:
            print('Data check FAILED. Files that differ from pipeline output: '
                  + (', '.join(stale) or 'none') + f"; rejected trains: {len(result['rejected'])}."
                  + ' Run: python3 -m datapipe publish', file=sys.stderr)
            return 1
        print(f"Data check OK: {len(result['trains'])} trains, files match pipeline output.")
        return 0
    text = report.render(result, d, reasons, config, root)
    if args.report:
        with open(args.report, 'w', encoding='utf-8') as f:
            f.write(text)
    print(text)

    if args.command == 'publish':
        if reasons and not args.force:
            print('Not published: gate blocked (use --force after reviewing the report).', file=sys.stderr)
            return 1
        written = pipeline.publish(pipeline.outputs(result, config), root, pipeline.make_manifest(result, config))
        if written:
            print('Published: ' + ', '.join(written) + '. Send SIGHUP to the server (or redeploy) to load it.', file=sys.stderr)
        else:
            print('No changes: published data is already up to date.', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
