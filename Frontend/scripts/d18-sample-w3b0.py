#!/usr/bin/env python3
"""d18: w3b-0.png (WS2003 classic taskpane) 像素级采样验证 VLM 描述"""
from PIL import Image
import collections

im = Image.open('/home/z/my-project/.zscripts/ref/w3b-0.jpg').convert('RGB')
W, H = im.size
px = im.load()

def q(c):
    return (c[0] // 8 * 8, c[1] // 8 * 8, c[2] // 8 * 8)

# 1) 列扫描：找任务窗格横向范围（白色竖带 + 灰边框）
print('── 列扫描（每 24px）──')
for x in range(0, W, 24):
    cnt = collections.Counter()
    for y in range(0, H, 4):
        cnt[q(px[x, y])] += 1
    top = cnt.most_common(2)
    print(f'x={x:4d} ' + ' '.join(f'{c}:{n}' for c, n in top))
