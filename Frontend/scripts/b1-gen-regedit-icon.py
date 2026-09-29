#!/usr/bin/env python3
"""b1 批：regedit 图标三桶（PIL 复刻 XP regedit.exe 蓝色立方块）
XP 原版：由小方块组成的立体蓝色「注册表蜂巢」立方体（两块叠放+高光）。
32/48 用 4x 超采样 LANCZOS；16 直接像素画。
"""
from PIL import Image, ImageDraw

def save(im, path):
    im.save(path)
    print(path, im.size)

def draw_cube(scale):
    """在 scale 倍画布上绘制：底座大方块（正面深蓝+顶面浅蓝）+ 上层小方块"""
    S = 16 * scale  # 基准 16 网格
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # 等距立方体参数（以 16 网格计）
    # 底座立方体：顶面菱形 (3,5)-(8,2.5)-(13,5)-(8,7.5)；左面 (3,5)-(8,7.5)-(8,13)-(3,10.5)；右面镜像
    def cube(cx, top_y, w, h, lift):
        """cx 中心x；top_y 顶点y；w 半宽；h 体高；lift 顶面半高"""
        L = cx - w, top_y + lift
        T = cx, top_y
        R = cx + w, top_y + lift
        B = cx, top_y + lift * 2
        # 顶面
        d.polygon([T, R, B, L], fill=(112, 168, 236, 255), outline=(30, 70, 140, 255))
        # 左面
        d.polygon([L, B, (B[0], B[1] + h), (L[0], L[1] + h)], fill=(32, 84, 186, 255), outline=(16, 48, 120, 255))
        # 右面
        d.polygon([B, R, (R[0], R[1] + h), (B[0], B[1] + h)], fill=(58, 120, 220, 255), outline=(16, 48, 120, 255))
        # 顶面高光
        d.line([T, L], fill=(200, 228, 255, 255), width=max(1, scale // 2))
        return B

    # 底座
    cube(8 * scale, 6.2 * scale, 4.6 * scale, 5.2 * scale, 1.8 * scale)
    # 上层小方块（略偏右上，制造叠放感）
    cube(8 * scale, 1.6 * scale, 3.4 * scale, 4.2 * scale, 1.4 * scale)
    return im

# 48 桶（3x 超采样）
for size, ss in [(48, 3), (32, 2)]:
    big = draw_cube(ss)
    save(big.resize((size, size), Image.LANCZOS), f'/home/z/my-project/public/icons/{size}/regedit.png')

# 16 桶：像素画（硬边）
im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
# 上层小立方
d.polygon([(8, 1), (12, 3), (8, 5), (4, 3)], fill=(112, 168, 236), outline=(30, 70, 140))
d.polygon([(4, 3), (8, 5), (8, 8), (4, 6)], fill=(32, 84, 186))
d.polygon([(8, 5), (12, 3), (12, 6), (8, 8)], fill=(58, 120, 220))
# 底座立方
d.polygon([(8, 6), (13, 8.5), (8, 11), (3, 8.5)], fill=(120, 176, 240), outline=(30, 70, 140))
d.polygon([(3, 8.5), (8, 11), (8, 15), (3, 12.5)], fill=(32, 84, 186))
d.polygon([(8, 11), (13, 8.5), (13, 12.5), (8, 15)], fill=(58, 120, 220))
# 顶面高光
d.line([(8, 1), (4, 3)], fill=(210, 235, 255))
save(im, '/home/z/my-project/public/icons/16/regedit.png')
print('DONE')
