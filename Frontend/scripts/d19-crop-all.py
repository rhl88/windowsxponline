#!/usr/bin/env python3
"""d19: 对全部 wmp9 候选裁剪顶部条，供 VLM 逐字转录鉴版本"""
from PIL import Image
import os, glob

REF = '/home/z/my-project/.zscripts/ref'
for p in sorted(glob.glob(f'{REF}/wmp9-*.jpg')) + sorted(glob.glob(f'{REF}/wmp9-*.png')):
    base = os.path.basename(p).rsplit('.', 1)[0]
    if base.count('-') > 1:  # 跳过已裁剪的
        continue
    im = Image.open(p).convert('RGB')
    W, H = im.size
    im.crop((0, 0, W, max(24, int(H*0.16)))).save(f'{REF}/{base}-top.png')
    im.crop((0, int(H*0.78), W, H)).save(f'{REF}/{base}-bottom.png')
    print(base, im.size)
