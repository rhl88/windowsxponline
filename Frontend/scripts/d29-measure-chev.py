#!/usr/bin/env python3
"""d29: 按 DOM rect 精确裁 « 钮并测量字形（避开 CH 按钮干扰）
用法: d29-measure-chev.py <截图> <x> <y> <w> <h> <输出前缀>
"""
import sys
from PIL import Image

src = sys.argv[1]
x, y, w, h = map(int, sys.argv[2:6])
prefix = sys.argv[6]
M = 4

img = Image.open(src).convert('RGB')
W, H = img.size
crop = img.crop((max(0, x - M), max(0, y - M), min(W, x + w + M), min(H, y + h + M)))
crop.save(f'{prefix}-btn.png')
z = crop.resize((crop.width * 8, crop.height * 8), Image.NEAREST)
z.save(f'{prefix}-btn-zoom8.png')
px = crop.load()

def lum(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

# 按钮内区（避开 1px 边框）——白字形（亮）与暗字形（经典）都测
x0, y0, x1, y1 = M + 1, M + 1, M + w - 2, M + h - 2
for label, pred in (('白', lambda c: (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) > 242),
                    ('暗', lambda c: (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) < 110)):
    glyph = [(xx, yy) for yy in range(y0, y1 + 1) for xx in range(x0, x1 + 1) if pred(px[xx, yy])]
    if not glyph:
        print(f'!! 按钮内无{label}像素字形')
        continue
    dxs = [p[0] for p in glyph]; dys = [p[1] for p in glyph]
    gx0, gx1, gy0, gy1 = min(dxs), max(dxs), min(dys), max(dys)
    n = len(glyph)
    avg = tuple(sum(px[xx, yy][i] for xx, yy in glyph) // n for i in range(3))
    print(f'[{label}字形] bbox {gx1-gx0+1}x{gy1-gy0+1}  像素={n}  平均色=#{avg[0]:02x}{avg[1]:02x}{avg[2]:02x}')
    for yy in range(gy0, gy1 + 1):
        print('   ', ''.join('#' if pred(px[xx, yy]) else '.' for xx in range(gx0, gx1 + 1)))
# 胶囊取色（内区顶部/底部中点）
cx = (x0 + x1) // 2
print(f'胶囊顶 #{px[cx, y0][0]:02x}{px[cx, y0][1]:02x}{px[cx, y0][2]:02x}  中 #{px[cx, (y0+y1)//2][0]:02x}{px[cx, (y0+y1)//2][1]:02x}{px[cx, (y0+y1)//2][2]:02x}  底 #{px[cx, y1][0]:02x}{px[cx, y1][1]:02x}{px[cx, y1][2]:02x}')
print('done')
