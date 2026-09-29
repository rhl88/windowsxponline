#!/usr/bin/env python3
"""d18: 三组参考图 → 网格接触表（每组一张，附标签）供 VLM 筛选"""
from PIL import Image, ImageDraw
import os

REF = '/home/z/my-project/.zscripts/ref'
groups = {'luna': 6, 'classic': 6, 'help': 6}
for g, n in groups.items():
    cell_w, cell_h, pad = 640, 400, 26
    cols = 2
    rows = (n + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell_w, rows * (cell_h + pad)), '#202020')
    dr = ImageDraw.Draw(sheet)
    for i in range(n):
        path = None
        for ext in ['.jpg', '.png', '.jpeg']:
            p = os.path.join(REF, f'{g}-{i}{ext}')
            if os.path.exists(p):
                path = p
                break
        if not path:
            continue
        im = Image.open(path).convert('RGB')
        im.thumbnail((cell_w - 8, cell_h - 8))
        col, row = i % cols, i // cols
        x0, y0 = col * cell_w, row * (cell_h + pad)
        sheet.paste(im, (x0 + (cell_w - im.width) // 2, y0 + pad + (cell_h - im.height) // 2))
        dr.text((x0 + 10, y0 + 6), f'{g.upper()} [{i}]  {os.path.basename(path)}', fill='#ffffff')
    out = os.path.join(REF, f'sheet-{g}.png')
    sheet.save(out)
    print(out, sheet.size)
