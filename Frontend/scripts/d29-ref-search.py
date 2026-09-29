#!/usr/bin/env python3
"""d29 参考图收集：真实 XP 任务栏截图（含托盘 « 展开钮）
1) z-ai image-search 三组查询下载候选
2) 门禁：底部蓝色任务栏条高度 28-33px（1:1）或 56-66px（2x）——照片/缩放图出局
3) 通过者裁右下托盘条 + 4x 放大存档，供 VLM/PIL 分析
"""
import json, subprocess, sys, os, urllib.request
from PIL import Image

OUT = '/home/z/my-project/.zscripts/ref29'
os.makedirs(OUT, exist_ok=True)

QUERIES = [
    ('xp1', 'Windows XP desktop screenshot with taskbar and system tray notification area', 10, 'us'),
    ('xp2', 'Windows XP Luna blue taskbar close-up notification area clock volume icons', 10, 'us'),
    ('xp3', 'Windows XP 原版系统 桌面截图 任务栏 通知区域 时钟', 10, 'cn'),
]

def search(q, count, gl):
    r = subprocess.run(['z-ai', 'image-search', '-q', q, '--count', str(count), '--gl', gl, '--no-rank'],
                       capture_output=True, text=True, timeout=150)
    raw = r.stdout
    i = raw.find('{')
    if i < 0:
        print(f'!! no JSON: {raw[:160]}', file=sys.stderr); return []
    try:
        return json.loads(raw[i:]).get('results') or []
    except Exception as e:
        print(f'!! parse: {e}', file=sys.stderr); return []

def download(url, dest):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as resp, open(dest, 'wb') as f:
            f.write(resp.read())
        return os.path.getsize(dest) > 8000
    except Exception:
        return False

def taskbar_height(path):
    """自底向上数连续蓝行；返回 (条高, W, H)，非蓝底返回 0"""
    try:
        img = Image.open(path).convert('RGB')
    except Exception:
        return 0, 0, 0
    W, H = img.size
    if W < 400 or H < 300:
        return 0, W, H
    px = img.load()
    step = max(1, W // 80)
    def blue_ratio(y):
        n = b = 0
        for x in range(0, W, step):
            r, g, bb = px[x, y]
            n += 1
            if bb > 95 and bb > r + 35 and bb >= g:
                b += 1
        return b / max(1, n)
    h = 0
    y = H - 1
    while y >= H - 80 and y >= 0:
        if blue_ratio(y) > 0.7:
            h += 1; y -= 1
        else:
            break
    return h, W, H

n_total = 0
for tag, q, cnt, gl in QUERIES:
    print(f'=== {tag}: {q}')
    items = search(q, cnt, gl)
    print(f'  got {len(items)} results')
    n = 0
    for it in items:
        url = it.get('original_url') or ''
        if not url.startswith('http'):
            continue
        ext = '.png' if '.png' in url.lower() else '.jpg'
        dest = f'{OUT}/{tag}-{n+1}{ext}'
        if not download(url, dest):
            continue
        n += 1; n_total += 1
        th, W, H = taskbar_height(dest)
        scale = '1x' if 28 <= th <= 33 else ('2x' if 56 <= th <= 66 else f'?{th}')
        print(f'  {dest}  {W}x{H}  taskbar={th}px  {scale}')
        if 28 <= th <= 33 or 56 <= th <= 66:
            img = Image.open(dest).convert('RGB')
            div = 2 if th > 40 else 1
            strip_h = (th + 4) // div + 2
            strip_w = min(300, W) // div
            crop = img.crop((W - strip_w * div, H - strip_h * div, W, H))
            if div == 2:
                crop = crop.resize((crop.width // 2, crop.height // 2), Image.NEAREST)
            crop.save(f'{OUT}/strip-{tag}-{n}.png')
            z = crop.resize((crop.width * 4, crop.height * 4), Image.NEAREST)
            z.save(f'{OUT}/strip-{tag}-{n}-zoom4.png')
        if n >= 10:
            break
print(f'total downloaded {n_total}')
