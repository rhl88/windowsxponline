#!/usr/bin/env bash
# d29 取证 v2：回拨 trayActivity 让 « 钮现身，截图折叠态 + 展开态
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
# 回拨 network/volume 活动时间 → 闲置折叠，« 钮现身
$AB eval "(()=>{const t=Date.now()-100000; window.__xp.setState({trayActivity:{network:t,volume:t}}); return 'ok'})()" >/dev/null 2>&1
sleep 0.8
echo -n "chevron in dom: "
$AB eval "!!document.querySelector('[data-tray-chevron]')" 2>/dev/null
echo -n "rect: "
$AB eval "(()=>{const r=document.querySelector('[data-tray-chevron]').getBoundingClientRect(); return Math.round(r.x)+' '+Math.round(r.y)+' '+Math.round(r.width)+' '+Math.round(r.height)})()" 2>/dev/null
$AB screenshot $SHOT/shot-d29-before.png >/dev/null 2>&1
# 展开态（» 方向 + flyout）
$AB eval "document.querySelector('[data-tray-chevron]').click()" >/dev/null 2>&1; sleep 0.6
$AB screenshot $SHOT/shot-d29-before-expanded.png >/dev/null 2>&1
echo "shots saved"
