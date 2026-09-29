#!/usr/bin/env bash
# d29 经典主题取证：切 classic → 回拨 → 截折叠/展开
AB=agent-browser
URL=http://localhost:3000
SHOT=/home/z/my-project/.zscripts
$AB open "$URL" >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
$AB find text "Administrator" click >/dev/null 2>&1; sleep 0.6
$AB find first 'input[aria-label="密码"]' fill "2001" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
sleep 1
$AB eval "(()=>{window.__xp.getState().setTheme('classic'); const t=Date.now()-100000; window.__xp.setState({trayActivity:{network:t,volume:t}}); return 'ok'})()" >/dev/null 2>&1
sleep 0.8
echo -n "rect(classic): "
$AB eval "(()=>{const r=document.querySelector('[data-tray-chevron]').getBoundingClientRect(); return Math.round(r.x)+' '+Math.round(r.y)+' '+Math.round(r.width)+' '+Math.round(r.height)})()" 2>/dev/null
$AB screenshot $SHOT/shot-d29-classic.png >/dev/null 2>&1
$AB eval "document.querySelector('[data-tray-chevron]').click()" >/dev/null 2>&1; sleep 0.6
echo -n "rect(classic,exp): "
$AB eval "(()=>{const r=document.querySelector('[data-tray-chevron]').getBoundingClientRect(); return Math.round(r.x)+' '+Math.round(r.y)+' '+Math.round(r.width)+' '+Math.round(r.height)})()" 2>/dev/null
$AB screenshot $SHOT/shot-d29-classic-exp.png >/dev/null 2>&1
# 还原 luna 主题
$AB eval "window.__xp.getState().setTheme('luna')" >/dev/null 2>&1
echo "done"
