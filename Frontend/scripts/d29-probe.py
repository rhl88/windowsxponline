#!/usr/bin/env python3
"""d29: 参考图 strip 探针——色彩分类字符图 + 字形定位
用法: d29-probe.py <strip路径> [左偏移] [宽]
分类: #=暗(字形候选) +=中暗 W=白/极亮 ,=浅灰蓝 B=蓝 ~=其他
"""
import sys
from PIL import Image

src = sys.argv[1]
off = int(sys.argv[2]) if len(sys.argv) > 2 else 0
wd = int(sys.argv[3]) if len(sys.argv) > 3 else 120

img = Image.open(src).convert('RGB')
W, H = img.size
x0 = max(0, off)
x1 = min(W, x0 + wd)
px = img.load()

def cls(c):
    r, g, b = c
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    if b > r + 35 and b > 110:
        return '.'  # 蓝底
    if lum < 95:
        return '#'
    if lum < 150:
        return '+'
    if lum > 225:
        return 'W'
    if lum > 190:
        return ','
    return '~'

print(f'{src}  {W}x{H}  区域 x[{x0},{x1})')
for y in range(H):
    print(f'{y:3d} ' + ''.join(cls(px[x, y]) for x in range(x0, x1)))

# 字形暗像素统计（全 strip）
dark = [(x, y) for y in range(H) for x in range(W)
        if cls(px[x, y]) in ('#',) or (cls(px[x, y]) == '+' and px[x, y][2] < px[x, y][0] + 35)]
if dark:
    dxs = [p[0] for p in dark]; dys = [p[1] for p in dark]
    n = len(dark)
    avg = tuple(sum(px[x, y][i] for x, y in dark) // n for i in range(3))
    print(f'暗字形候选 bbox x[{min(dxs)},{max(dxs)}] y[{min(dys)},{max(dys)}]  {max(dxs)-min(dxs)+1}x{max(dys)-min(dys)+1}  n={n}  avg=#{avg[0]:02x}{avg[1]:02x}{avg[2]:02x}')
