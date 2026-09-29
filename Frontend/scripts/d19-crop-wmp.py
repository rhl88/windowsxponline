#!/usr/bin/env python3
"""d19: wmp9-2 关键区域裁剪（顶部条/左侧条/底部条）供 VLM 精读"""
from PIL import Image
import os

REF = '/home/z/my-project/.zscripts/ref'
im = Image.open(f'{REF}/wmp9-2.jpg').convert('RGB')
W, H = im.size
print('size', im.size)

# 顶部 18%（菜单/标签区）
im.crop((0, 0, W, int(H*0.18))).save(f'{REF}/wmp9-2-top.png')
# 左侧 22%（任务导航条）
im.crop((0, 0, int(W*0.22), H)).save(f'{REF}/wmp9-2-left.png')
# 底部 20%（传输控制条）
im.crop((0, int(H*0.80), W, H)).save(f'{REF}/wmp9-2-bottom.png')
print('done')
