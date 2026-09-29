#!/usr/bin/env bash
AB=agent-browser
URL=http://localhost:3000
$AB open "$URL" >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
$AB find text "Administrator" click >/dev/null 2>&1; sleep 0.6
$AB find first 'input[aria-label="密码"]' fill "2001" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
echo "logged"; sleep 1

$AB eval "window.__xp.getState().openApp('solitaire', {})" >/dev/null 2>&1; sleep 0.8
echo "A: $($AB eval "(()=>{const g=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('游戏')); if(!g) return 'no-menu'; g.click(); return 'ok'})()" 2>/dev/null)"
sleep 0.5
echo "B: $($AB eval "(()=>{const it=[...document.querySelectorAll('.xp-menu *')].filter(el=>el.childElementCount===0&&el.textContent.includes('选项')); if(!it.length) return 'no-item'; it[it.length-1].click(); return 'opts-open:'+it.length})()" 2>/dev/null)"
sleep 0.6
echo "C: $($AB eval "(()=>{return document.body.textContent.includes('一次翻三张牌(D)') && document.body.textContent.includes('维加斯(V)')})()" 2>/dev/null)"
echo "D: $($AB eval "(()=>{const r=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('一次翻三张')); const v=[...document.querySelectorAll('button')].find(b=>b.textContent==='维加斯(V)'); const t=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('计时游戏')); if(r) r.click(); if(v) v.click(); if(t) t.click(); return 'found:'+!!r+!!v+!!t})()" 2>/dev/null)"
sleep 0.3
echo "E: $($AB eval "(()=>{const oks=[...document.querySelectorAll('button')].filter(b=>b.textContent==='确定'); const ok=oks[oks.length-1]; if(!ok) return 'no-ok:'+oks.length; ok.click(); return 'applied:'+oks.length})()" 2>/dev/null)"
sleep 1
echo "F: $($AB eval "JSON.stringify(window.__xp.getState().solitaireOpts)" 2>/dev/null)"
echo "G: $($AB eval "document.body.textContent.includes('翻牌: 一次三张')" 2>/dev/null)"
