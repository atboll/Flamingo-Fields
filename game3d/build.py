#!/usr/bin/env python3
"""Build the page to publish.

    python3 build.py            the game, into build/
    python3 build.py dunes      a page that opens in a dev mode (level2, dunes, flamingo, or dev for plain dev), into build-<mode>/

It writes index.html without the outer <!doctype>/<head>/<body> wrapper (the publishing page adds its own),
stamps it with the commit and date (shown in the dev stamp), and copies the game's scripts beside it.
The assets are not copied: they are published once and stay where they are (assets/...).

Most of the time you don't need a dev-mode build: the published game opens in any dev mode by adding #dev, #dev-level2,
#dev-dunes or #dev-flamingo to its link.
"""
import re, sys, shutil, subprocess, datetime, pathlib

HERE = pathlib.Path(__file__).resolve().parent
mode = sys.argv[1] if len(sys.argv) > 1 else ''
if mode not in ('', 'dev', 'level2', 'dunes', 'flamingo'):
    sys.exit('mode must be one of: dev, level2, dunes, flamingo')
out = HERE / ('build' if not mode else 'build-' + mode)
out.mkdir(exist_ok=True)

try:
    commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=HERE, capture_output=True, text=True).stdout.strip()
    dirty = subprocess.run(['git', 'status', '--porcelain', '--', '.'], cwd=HERE, capture_output=True, text=True).stdout.strip()
except FileNotFoundError:
    commit, dirty = 'unknown', ''
stamp = f"{commit}{'+' if dirty else ''} {datetime.date.today().isoformat()}"

s = (HERE / 'index.html').read_text()
s = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*', '', s)
s = s.replace('<meta charset="utf-8">\n', '').replace('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n', '')
s = s.replace('</head>\n<body>\n', '').replace('</body>\n</html>\n', '')
flags = f"window.BUILD={stamp!r};" + (f" window.DEVMODE={('' if mode == 'dev' else mode)!r};" if mode else '')
s = s.replace('<script src="settings.js">', f'<script>{flags}</script>\n<script src="settings.js">', 1)
if mode:
    s = s.replace('<title>Flamingo Fields 3D</title>', f'<title>Flamingo Fields 3D Dev{" " + mode.title() if mode != "dev" else ""}</title>', 1)
(out / 'index.html').write_text(s)

scripts = re.findall(r'<script src="([a-z0-9]+\.js)"></script>', s)
for f in scripts:
    shutil.copy(HERE / f, out / f)
print(f'built {out.name}/ ({stamp}): index.html and', ', '.join(scripts))
