#!/usr/bin/env python3
"""d18: c3-5.jpg (真实 XP Luna, 1600x900) 任务窗格像素采样
边界框约 [72.0%,26.2%,80.5%,50.8%] → x 1152..1288, y 236..457
细化：用列扫描精确定位侧栏（蓝渐变竖带），再采面板渐变/边框/文字色
"""
from PIL import Image
import collections

im = Image.open('/home/z/my-project/.zscripts/ref/c3-5.jpg').convert('RGB')
W, H = im.size
px = im.load()

def q(c):
    return (c[0] // 8 * 8, c[1] // 8 * 8, c[2] // 8 * 8)

# 列扫描 1050..1350 找蓝带边界
print('── 列扫描（找侧栏横向边界）──')
for x in range(1050, 1380, 10):
    cnt = collections.Counter()
    for y in range(200, 500, 3):
        cnt[q(px[x, y])] += 1
    top = cnt.most_common(2)
    print(f'x={x:4d} ' + ' '.join(f'{c}:{n}' for c, n in top))
