#!/usr/bin/env python3
"""d29 精细探针: 细分类字符图
图例: .=蓝底 L=浅蓝 W=白 ,=浅灰 +=中灰 n=藏青 #=暗 g=绿 y=黄 r=红 ~=其他
用法: d29-fine.py <图> <x0> <x1> [y0] [y1]
"""
import sys
from PIL import Image

src = sys.argv[1]
x0, x1 = int(sys.argv[2]), int(sys.argv[3])
y0 = int(sys.argv[4]) if len(sys.argv) > 4 else 0
y1 = int(sys.argv[5]) if len(sys.argv) > 5 else 10**9

img = Image.open(src).convert('RGB')
W, H = img.size
x0, x1 = max(0, x0), min(W, x1)
y0, y1 = max(0, y0), min(H, y1)
px = img.load()

def cls(c):
    r, g, b = c
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx, mn = max(c), min(c)
    sat = mx - mn
    if b > r + 30 and b > 100:
        return 'L' if lum > 175 else '.'
    if sat < 42:
        if lum > 228: return 'W'
        if lum > 195: return ','
        if lum > 150: return '+'
        if lum > 105: return 'o'
        return '#'
    if b > r and lum < 175 and b > 110:
        return 'n'
    if g > r + 20 and g > b + 20: return 'g'
    if r > 150 and g > 110 and b < 110: return 'y'
    if r > g + 30 and r > b + 30: return 'r'
    return '~'

print(f'{src} {W}x{H}  x[{x0},{x1}) y[{y0},{y1}]')
hdr = '     ' + ''.join(str((x // 10) % 10) for x in range(x0, x1))
print(hdr)
for y in range(y0, y1):
    print(f'{y:3d}  ' + ''.join(cls(px[x, y]) for x in range(x0, x1)))
