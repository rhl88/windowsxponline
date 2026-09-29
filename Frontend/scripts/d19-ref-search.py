#!/usr/bin/env python3
"""d19 参考图收集：WMP9 全模式 + Outlook Express 6"""
import json, subprocess, sys, os, urllib.request

OUT = '/home/z/my-project/.zscripts/ref'
os.makedirs(OUT, exist_ok=True)

QUERIES = [
    ('wmp9', 'Windows Media Player 9 series full mode screenshot', 8),
    ('oe6', 'Outlook Express 6 inbox screenshot', 8),
]

def search(q, count):
    r = subprocess.run(
        ['z-ai', 'image-search', '-q', q, '--count', str(count), '--gl', 'us', '--no-rank'],
        capture_output=True, text=True, timeout=120)
    raw = r.stdout
    i = raw.find('{')
    if i < 0:
        print(f'!! no JSON for {q}: {raw[:200]}', file=sys.stderr)
        return []
    try:
        data = json.loads(raw[i:])
    except Exception as e:
        print(f'!! parse fail {q}: {e}', file=sys.stderr)
        return []
    items = data.get('results') or []
    return items

def download(url, dest):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as resp, open(dest, 'wb') as f:
            f.write(resp.read())
        return os.path.getsize(dest) > 5000
    except Exception as e:
        print(f'  dl fail {url[:80]}: {e}', file=sys.stderr)
        return False

for tag, q, cnt in QUERIES:
    print(f'=== {tag}: {q}')
    items = search(q, cnt)
    print(f'  got {len(items)} results')
    n = 0
    for it in items:
        url = it.get('original_url') or it.get('url') or it.get('imageUrl') or ''
        if not url or not url.startswith('http'):
            continue
        ext = '.jpg'
        if '.png' in url: ext = '.png'
        dest = f'{OUT}/{tag}-{n+1}{ext}'
        if download(url, dest):
            print(f'  ok {dest}')
            n += 1
        if n >= 6:
            break
print('done')
