#!/usr/bin/env python3
"""d19: WMP9 二轮补搜（多关键词）"""
import json, subprocess, sys, os, urllib.request

OUT = '/home/z/my-project/.zscripts/ref'
os.makedirs(OUT, exist_ok=True)

QUERIES = [
    ('wmp9b', '"Windows Media Player 9" screenshot now playing visualization blue'),
    ('wmp9c', 'Windows Media Player 9 中文版 正在播放 截图'),
    ('wmp9d', 'Windows XP media player default interface 2003 taskbar blue gradient'),
]

def search(q, count):
    r = subprocess.run(
        ['z-ai', 'image-search', '-q', q, '--count', str(count), '--gl', 'us', '--no-rank'],
        capture_output=True, text=True, timeout=120)
    raw = r.stdout
    i = raw.find('{')
    if i < 0: return []
    try:
        return json.loads(raw[i:]).get('results') or []
    except Exception:
        return []

def download(url, dest):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as resp, open(dest, 'wb') as f:
            f.write(resp.read())
        return os.path.getsize(dest) > 5000
    except Exception:
        return False

for tag, q in QUERIES:
    print(f'=== {tag}: {q}')
    items = search(q, 8)
    print(f'  got {len(items)}')
    n = 0
    for it in items:
        url = it.get('original_url') or ''
        if not url.startswith('http'): continue
        ext = '.png' if '.png' in url else '.jpg'
        dest = f'{OUT}/{tag}-{n+1}{ext}'
        if download(url, dest):
            print(f'  ok {dest}')
            n += 1
        if n >= 4: break
print('done')
