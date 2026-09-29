#!/usr/bin/env python3
"""d18: 裁切 classic-1.png 任务窗格区域 + 逐行扫描找面板结构（标题/边框/折叠钮行）"""
from PIL import Image
import collections

im = Image.open('/home/z/my-project/.zscripts/ref/classic-1.png').convert('RGB')
W, H = im.size
# 侧栏区域：x 20..190（列扫描 240 主色带），窗口可能有标题栏，先按行找侧栏纵向范围
# 行扫描：在 x=100 列附近看颜色变化，定位窗口顶/底
px = im.load()

# 先裁一版全景侧栏（找纵向边界）
crop = im.crop((0, 0, 200, H))
crop.save('/home/z/my-project/.zscripts/ref/classic-1-pane.png')

# 行扫描 x=60（侧栏中部）：打印每 8 行的主色
def q(c):
    return (c[0] // 8 * 8, c[1] // 8 * 8, c[2] // 8 * 8)

prev = None
for y in range(0, H, 2):
    c = px[60, y]
    if prev is None or q(c) != prev:
        print(f'y={y:4d}  rgb{c}')
        prev = q(c)
