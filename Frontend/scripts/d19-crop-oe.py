#!/usr/bin/env python3
"""d19: oe6-2 关键区域裁剪供 VLM 精读"""
from PIL import Image

REF = '/home/z/my-project/.zscripts/ref'
im = Image.open(f'{REF}/oe6-2.jpg').convert('RGB')
W, H = im.size
print('size', im.size)
im.crop((0, 0, W, int(H*0.14))).save(f'{REF}/oe6-2-top.png')          # 菜单+工具栏
im.crop((0, 0, int(W*0.28), H)).save(f'{REF}/oe6-2-left.png')         # 文件夹树+联系人
im.crop((int(W*0.28), int(H*0.14), W, int(H*0.55))).save(f'{REF}/oe6-2-list.png')  # 邮件列表
im.crop((0, int(H*0.86), W, H)).save(f'{REF}/oe6-2-status.png')       # 状态栏
print('done')
