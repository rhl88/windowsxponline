#!/usr/bin/env bash
# d28 复现 v2：正确选择器（.xp-start-btn / .xp-startmenu / 运行(R)...）
AB=agent-browser
URL=http://localhost:3000

$AB open "$URL" >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
$AB find text "Administrator" click >/dev/null 2>&1; sleep 0.6
$AB find first 'input[aria-label="密码"]' fill "2001" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
echo "logged in"; sleep 1

echo "== 1. 真实路径：.xp-start-btn → 运行(R)... =="
$AB eval "document.querySelector('.xp-start-btn').click()" >/dev/null 2>&1
sleep 0.8
echo "-- 菜单开: $($AB eval "window.__xp.getState().startOpen" 2>/dev/null)"
$AB eval "[...document.querySelectorAll('.xp-startmenu *')].filter(el=>el.childElementCount===0&&el.textContent.includes('运行')).pop()?.click()" >/dev/null 2>&1
sleep 0.8
echo "-- run 窗: $($AB eval "window.__xp.getState().windows.filter(w=>w.app==='run').length" 2>/dev/null)"
echo "-- 菜单开: $($AB eval "window.__xp.getState().startOpen" 2>/dev/null)"
echo "-- 焦点: $($AB eval "(()=>{const el=document.activeElement; return el?(el.tagName+'|'+String(el.value??el.textContent).slice(0,16)):'null'})()" 2>/dev/null)"

echo "== 2. 输入 notepad（原生 setter）→ Enter =="
$AB eval "(()=>{const i=document.querySelector('.xp-sunken input'); if(!i) return 'no-input'; const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(i,'notepad'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'typed'})()" >/dev/null 2>&1
sleep 0.3
echo "-- 焦点(输入后): $($AB eval "(()=>{const el=document.activeElement; return el?(el.tagName+'|'+String(el.value??'').slice(0,16)):'null'})()" 2>/dev/null)"
echo "-- input value: $($AB eval "document.querySelector('.xp-sunken input')?.value" 2>/dev/null)"
$AB press Enter >/dev/null 2>&1
sleep 1.2
echo "-- Enter 后: $($AB eval "JSON.stringify({run:window.__xp.getState().windows.filter(w=>w.app==='run').length,notepad:window.__xp.getState().windows.filter(w=>w.app==='notepad').length,hist:window.__xp.getState().runHistory.slice(0,3)})" 2>/dev/null)"
