#!/usr/bin/env python3
"""d29: 任务栏结构分段器——枚举所有非蓝底结构 + 精确取色
用法: d29-segment.py <图> [顶空白行数]
输出: 每个结构的 bbox/尺寸/非蓝像素主色/中心行像素序列(hex)
"""
import sys
from PIL import Image

src = sys.argv[1]
img = Image.open(src).convert('RGB')
W, H = img.size
px = img.load()

def is_blue(c):
    r, g, b = c
    return b > 100 and b > r + 30 and b >= g - 5

# 列非蓝计数
colcnt = [sum(0 if is_blue(px[x, y]) else 1 for y in range(H)) for x in range(W)]
# 连续非零列段
segs = []
x = 0
while x < W:
    if colcnt[x] > 0:
        x0 = x
        while x < W and colcnt[x] > 0:
            x += 1
        segs.append((x0, x - 1))
    else:
        x += 1

print(f'{src} {W}x{H}  {len(segs)} 段')
for i, (a, b) in enumerate(segs):
    # 行范围
    rows = [y for y in range(H) if any(not is_blue(px[x, y]) for x in range(a, b + 1))]
    y0, y1 = min(rows), max(rows)
    # 非蓝像素主色
    from collections import Counter
    cnt = Counter()
    for x in range(a, b + 1):
        for y in range(y0, y1 + 1):
            c = px[x, y]
            if not is_blue(c):
                cnt[(c[0] // 24, c[1] // 24, c[2] // 24)] += 1
    top = cnt.most_common(4)
    tops = ' '.join(f'#{t[0][0]*24:02x}{t[0][1]*24:02x}{t[0][2]*24:02x}x{t[1]}' for t in top)
    print(f'[{i}] x[{a},{b}] w={b-a+1} y[{y0},{y1}] h={y1-y0+1}  主色 {tops}')
