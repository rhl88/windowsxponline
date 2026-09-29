#!/usr/bin/env bash
# d29 展开态取证：登录 → 回拨 → 点 « 展开 → 拿新 rect → 截图
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
$AB eval "(()=>{const t=Date.now()-100000; window.__xp.setState({trayActivity:{network:t,volume:t}}); return 'ok'})()" >/dev/null 2>&1
sleep 0.8
$AB eval "document.querySelector('[data-tray-chevron]').click()" >/dev/null 2>&1; sleep 0.8
echo -n "rect(expanded): "
$AB eval "(()=>{const r=document.querySelector('[data-tray-chevron]').getBoundingClientRect(); return Math.round(r.x)+' '+Math.round(r.y)+' '+Math.round(r.width)+' '+Math.round(r.height)})()" 2>/dev/null
$AB screenshot $SHOT/shot-d29-expanded.png >/dev/null 2>&1
echo "saved"
