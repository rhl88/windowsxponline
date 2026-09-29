#!/usr/bin/env python3
"""d29: 裁切托盘 « 钮并放大 + 像素测量（胶囊 bbox / 字形 bbox / 颜色）
用法: python3 d29-measure.py <截图路径> <输出前缀> [右裁宽] [下裁高]
测量逻辑:
  1) 裁右下角托盘条 → 6x 最近邻放大存档
  2) 找「浅色胶囊」像素(亮且低饱和) → 最大连通簇 = 按钮本体
  3) 胶囊内找暗像素(亮度<120) → 字形 bbox + 平均颜色
"""
import sys
from PIL import Image

src, prefix = sys.argv[1], sys.argv[2]
CW = int(sys.argv[3]) if len(sys.argv) > 3 else 300
CH = int(sys.argv[4]) if len(sys.argv) > 4 else 46

img = Image.open(src).convert('RGB')
W, H = img.size
print(f'src {W}x{H}')
crop = img.crop((W - CW, H - CH, W, H))
crop.save(f'{prefix}-tray.png')
z = crop.resize((crop.width * 6, crop.height * 6), Image.NEAREST)
z.save(f'{prefix}-tray-zoom6.png')

px = crop.load()
cw, ch = crop.size

def lum(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
def sat(c): return max(c) - min(c)

# 1) 浅色胶囊候选（亮、低饱和——#f6f6f0..#c4c4b8 区间）
cand = [[x, y] for y in range(ch) for x in range(cw)
        if lum(px[x, y]) > 165 and sat(px[x, y]) < 38]
# 简易连通簇（BFS）
seen = set()
best = []
for p in cand:
    if (p[0], p[1]) in seen:
        continue
    stack, cluster = [p], []
    seen.add((p[0], p[1]))
    while stack:
        x, y = stack.pop()
        cluster.append((x, y))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < cw and 0 <= ny < ch and (nx, ny) not in seen and lum(px[nx, ny]) > 165 and sat(px[nx, ny]) < 38:
                seen.add((nx, ny))
                stack.append([nx, ny])
    if len(cluster) > len(best):
        best = cluster

if not best:
    print('!! 未找到浅色胶囊')
    sys.exit(0)
xs = [p[0] for p in best]; ys = [p[1] for p in best]
bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
print(f'胶囊 bbox {bx1-bx0+1}x{by1-by0+1} @crop({bx0},{by0})  像素数={len(best)}')

# 2) 胶囊内暗像素 → 字形
dark = [(x, y) for y in range(by0, by1 + 1) for x in range(bx0, bx1 + 1)
        if lum(px[x, y]) < 120]
if dark:
    dxs = [p[0] for p in dark]; dys = [p[1] for p in dark]
    gx0, gx1, gy0, gy1 = min(dxs), max(dxs), min(dys), max(dys)
    n = len(dark)
    avg = tuple(sum(px[x, y][i] for x, y in dark) // n for i in range(3))
    print(f'字形 bbox {gx1-gx0+1}x{gy1-gy0+1} @crop({gx0},{gy0})  暗像素数={n}  平均色=#{avg[0]:02x}{avg[1]:02x}{avg[2]:02x}')
    # 字形逐行形态（# = 暗像素）——直观看粗细
    for y in range(gy0, gy1 + 1):
        row = ''.join('#' if lum(px[x, y]) < 120 else '.' for x in range(gx0, gx1 + 1))
        print('   ', row)
else:
    print('!! 胶囊内无暗像素字形')

# 3) 胶囊上下取色
print(f'胶囊顶色 #{px[bx0 + (bx1-bx0)//2, by0][0]:02x}{px[bx0 + (bx1-bx0)//2, by0][1]:02x}{px[bx0 + (bx1-bx0)//2, by0][2]:02x}'
      f'  底色 #{px[bx0 + (bx1-bx0)//2, by1][0]:02x}{px[bx0 + (bx1-bx0)//2, by1][1]:02x}{px[bx0 + (bx1-bx0)//2, by1][2]:02x}')
print('done')
