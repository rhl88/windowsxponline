#!/usr/bin/env python3
"""d18: 在 classic-1.png 中定位任务窗格：按列扫描颜色分布，找出浅色侧栏区域"""
from PIL import Image
import collections

im = Image.open('/home/z/my-project/.zscripts/ref/classic-1.png').convert('RGB')
W, H = im.size
print('size', W, H)
px = im.load()

# 每列采样的主色（把每列颜色量化到 16 级取众数），打印每 20px 一列的色带
def q(c):
    return (c[0] // 16 * 16, c[1] // 16 * 16, c[2] // 16 * 16)

for x in range(0, W, 20):
    cnt = collections.Counter()
    for y in range(0, H, 4):
        cnt[q(px[x, y])] += 1
    top = cnt.most_common(3)
    print(f'x={x:4d}  ' + '  '.join(f'{c}:{n}' for c, n in top))
