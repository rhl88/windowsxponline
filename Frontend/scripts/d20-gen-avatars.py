#!/usr/bin/env python3
"""d20: XP 默认用户图片集（帐户头像）—— 彩色渐变底 + 白色剪影，4x 超采样 LANCZOS 降至 48px
风格基准：Windows XP「用户帐户→更改我的图片」默认位图（userblp.bmp 系列）
产出：public/icons/48/avatar-{admin,chess,guest,fish,plane}.png
"""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons', '48')
S = 192  # 4x 超采样画布


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def grad_bg(c_top, c_bot, radius=4):
    """垂直渐变底 + 2px 深色描边（XP 帐户图片细边框）"""
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=radius, fill=c_top)
    for y in range(S):
        t = y / (S - 1)
        d.line([(2, y), (S - 3, y)], fill=lerp(c_top, c_bot, t))
    # 边框：渐变底色各加深
    dark_top = lerp(c_top, (0, 0, 0), 0.45)
    dark_bot = lerp(c_bot, (0, 0, 0), 0.45)
    for y in range(S):
        t = y / (S - 1)
        col = lerp(dark_top, dark_bot, t)
        d.point((0, y), fill=col)
        d.point((1, y), fill=col)
        d.point((S - 1, y), fill=col)
        d.point((S - 2, y), fill=col)
    for x in range(S):
        t = x / (S - 1)
        col = lerp(dark_top, dark_bot, t * 0.6)
        d.point((x, 0), fill=col)
        d.point((x, 1), fill=col)
        d.point((x, S - 1), fill=col)
        d.point((x, S - 2), fill=col)
    return im


def shadow(im, off=3, alpha=46):
    """白色剪影下的柔和投影（同形状偏移暗化）"""
    a = im.split()[3]
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    black = Image.new('RGBA', im.size, (10, 20, 40, alpha))
    sh.paste(black, (off, off), a)
    return Image.alpha_composite(sh, im)


WHITE = (255, 255, 255, 255)


def avatar_admin():
    """经典人形剪影（头 + 肩），蓝色渐变—— Administrator"""
    im = grad_bg((122, 176, 240), (42, 92, 200))
    d = ImageDraw.Draw(im)
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(lay)
    dl.ellipse([70, 40, 122, 92], fill=WHITE)          # 头
    dl.ellipse([52, 108, 140, 196], fill=WHITE)        # 肩（圆肩轮廓）
    lay = shadow(lay)
    return Image.alpha_composite(im, lay)


def avatar_chess():
    """国际象棋骑士（马头）剪影，绿色渐变—— XP 默认头像 chess"""
    im = grad_bg((168, 224, 120), (58, 138, 42))
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(lay)
    # 马头剪影（朝左；长口鼻 + 双耳 + 颈背鬃毛锯齿），顺时针绕行
    dl.polygon([
        (58, 92), (62, 78), (84, 62), (104, 54), (110, 36), (118, 30), (124, 50),
        (130, 44), (138, 60), (144, 84), (148, 104), (140, 116), (146, 134),
        (138, 150), (74, 158), (70, 130), (64, 112), (52, 108), (56, 96),
    ], fill=WHITE)
    # 底座（单层圆角横条）
    dl.rounded_rectangle([56, 158, 144, 174], radius=5, fill=WHITE)
    lay = shadow(lay)
    out = Image.alpha_composite(im, lay)
    # 嘴线：鼻尖向后刻一道底色细线（增强马脸辨识）
    d = ImageDraw.Draw(out)
    mcol = lerp((168, 224, 120), (58, 138, 42), (96 - 60) / (158 - 60))
    d.line([(60, 90), (76, 84)], fill=(*mcol, 255), width=3)
    return out


def avatar_guest():
    """公文包剪影，青蓝渐变—— XP Guest 帐户默认图片"""
    im = grad_bg((120, 200, 216), (26, 122, 154))
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(lay)
    dl.rounded_rectangle([48, 76, 144, 158], radius=7, fill=WHITE)   # 箱体
    # 提手（外环挖空内芯）
    dl.rounded_rectangle([78, 50, 114, 80], radius=9, fill=WHITE)
    bg = im.copy()
    hole = Image.new('RGBA', im.size, (0, 0, 0, 0))
    dh = ImageDraw.Draw(hole)
    dh.rounded_rectangle([86, 58, 106, 80], radius=6, fill=(255, 255, 255, 255))
    lay = Image.composite(Image.new('RGBA', im.size, (0, 0, 0, 0)), lay, hole.split()[3])
    # 中线（拉链分隔，透出底色）
    lay = Image.composite(Image.new('RGBA', im.size, (0, 0, 0, 0)), lay, Image.new('L', im.size, 0))
    lay2 = lay.copy()
    d2 = ImageDraw.Draw(lay2)
    d2.rectangle([48, 100, 144, 106], fill=(0, 0, 0, 0))
    # 用底色重新填充中线（合成后再画底色线）
    out = Image.alpha_composite(im, shadow(lay))
    dd = ImageDraw.Draw(out)
    # 挖线：直接画渐变色的近似中线色
    mid = lerp((120, 200, 216), (26, 122, 154), (104 - 76) / (158 - 76))
    dd.rectangle([52, 101, 140, 105], fill=(*mid, 255))
    return out


def avatar_fish():
    """金鱼剪影，橙色渐变—— XP 默认头像 fish"""
    im = grad_bg((248, 184, 104), (224, 104, 24))
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(lay)
    # 身体：前圆后窄的纺锤（多边形），右端接入尾部
    dl.polygon([
        (44, 102), (58, 86), (82, 78), (106, 82), (120, 96),
        (120, 108), (106, 122), (82, 126), (58, 118),
    ], fill=WHITE)
    dl.ellipse([40, 84, 100, 120], fill=WHITE)                      # 前半身加厚（圆钝头）
    dl.polygon([(116, 92), (168, 62), (154, 102), (168, 142), (116, 112)], fill=WHITE)  # 饱满双叉尾
    dl.polygon([(82, 80), (100, 52), (114, 84)], fill=WHITE)        # 背鳍（高耸）
    dl.polygon([(78, 124), (90, 148), (104, 122)], fill=WHITE)      # 腹鳍
    dl.polygon([(66, 106), (84, 118), (74, 122)], fill=WHITE)       # 胸鳍
    lay = shadow(lay)
    out = Image.alpha_composite(im, lay)
    # 眼睛：头部前端挖出大底色圆 + 白色瞳孔
    d = ImageDraw.Draw(out)
    eye = lerp((248, 184, 104), (224, 104, 24), (90 - 80) / (120 - 80))
    d.ellipse([58, 88, 76, 106], fill=(*eye, 255))
    d.ellipse([62, 92, 72, 102], fill=WHITE)
    return out


def avatar_plane():
    """飞机俯视剪影，天蓝渐变—— XP 默认头像 airplane"""
    im = grad_bg((184, 221, 248), (90, 154, 224))
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    dl = ImageDraw.Draw(lay)
    # 机身（纺锤，机鼻朝上）
    dl.polygon([
        (96, 22), (106, 34), (110, 92), (108, 148), (96, 172),
        (84, 148), (82, 92), (86, 34),
    ], fill=WHITE)
    # 主翼（后掠）
    dl.polygon([
        (84, 86), (10, 112), (10, 126), (86, 116), (98, 114),
        (182, 126), (182, 112), (98, 90),
    ], fill=WHITE)
    # 尾翼
    dl.polygon([
        (86, 138), (58, 158), (58, 168), (90, 160), (102, 160),
        (134, 168), (134, 158), (106, 138),
    ], fill=WHITE)
    lay = shadow(lay)
    return Image.alpha_composite(im, lay)


os.makedirs(OUT, exist_ok=True)
for name, fn in [
    ('avatar-admin', avatar_admin),
    ('avatar-chess', avatar_chess),
    ('avatar-guest', avatar_guest),
    ('avatar-fish', avatar_fish),
    ('avatar-plane', avatar_plane),
]:
    im = fn().resize((48, 48), Image.LANCZOS)
    path = os.path.join(OUT, f'{name}.png')
    im.save(path)
    print(f'{name}: {im.size} -> {path}')
print('done')
