#!/usr/bin/env python3
"""d19: wmp9b-3 PIL 取色（标题栏/左条/主区/底条）+ 行扫描定位结构"""
from PIL import Image

REF = '/home/z/my-project/.zscripts/ref'
im = Image.open(f'{REF}/wmp9b-3.jpg').convert('RGB')
W, H = im.size
px = im.load()

def hexc(c): return '#%02x%02x%02x' % c

print('== 全图横带平均色（每 4% 高度）==')
for fy in range(0, 100, 4):
    y = int(H * fy / 100)
    rs = gs = bs = n = 0
    for x in range(0, W, 8):
        r, g, b = px[x, y]
        rs += r; gs += g; bs += b; n += 1
    print(f'y={fy:3d}% ({y}px): {hexc((rs//n, gs//n, bs//n))}')

print()
print('== 定点采样 ==')
pts = {
    '标题栏左(0.02,0.02)': (0.02, 0.02),
    '标题栏中(0.30,0.02)': (0.30, 0.02),
    '菜单栏行(0.05,0.045)': (0.05, 0.045),
    '左条上部(0.06,0.20)': (0.06, 0.20),
    '左条中部(0.06,0.50)': (0.06, 0.50),
    '主区左上(0.35,0.25)': (0.35, 0.25),
    '主区中(0.50,0.45)': (0.50, 0.45),
    '播放列表头(0.85,0.22)': (0.85, 0.22),
    '底条左(0.10,0.94)': (0.10, 0.94),
    '底条中(0.45,0.94)': (0.45, 0.94),
    '底条右(0.85,0.94)': (0.85, 0.94),
}
for name, (fx, fy) in pts.items():
    x, y = int(W*fx), int(H*fy)
    print(f'{name}: {hexc(px[x,y])}')
