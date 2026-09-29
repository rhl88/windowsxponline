#!/usr/bin/env bash
# d28 复现：开始菜单→运行→输入→回车 是否无响应
AB=agent-browser
URL=http://localhost:3000

echo "== 登录桌面 =="
$AB open "$URL" >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
$AB find text "Administrator" click >/dev/null 2>&1; sleep 0.6
$AB find first 'input[aria-label="密码"]' fill "2001" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
echo "logged in"; sleep 1

echo "== 真实路径：开始菜单 → 运行 =="
$AB eval "document.querySelector('[data-start-btn]')?.click() ?? document.querySelector('.xp-start-btn')?.click() ?? [...document.querySelectorAll('button')].find(b=>b.textContent.includes('开始'))?.click()" >/dev/null 2>&1
sleep 0.8
# 点击开始菜单里的「运行...」
$AB eval "[...document.querySelectorAll('[data-startmenu] *, .xp-start-menu *')].filter(el=>el.textContent==='运行...' && el.children.length<=1).slice(-1)[0]?.click() ?? [...document.querySelectorAll('*')].filter(el=>el.childElementCount===0&&el.textContent==='运行...').pop()?.click()" >/dev/null 2>&1
sleep 0.8
echo "-- 运行窗是否打开:"
$AB eval "(()=>{const s=window.__xp.getState(); return JSON.stringify(s.windows.filter(w=>w.app==='run').map(w=>({id:w.id,app:w.app})))})()"
echo "-- 焦点元素:"
$AB eval "(()=>{const el=document.activeElement; return el ? (el.tagName + '|' + (el.className||'').slice(0,40) + '|' + String(el.value??'').slice(0,20)) : 'null'})()"

echo "== 输入 notepad 后按回车（模拟真实键入）=="
# 用原生 setter 逐字符输入（模拟打字，走 onChange）
$AB eval "(()=>{const i=document.querySelector('.xp-sunken input'); if(!i) return 'no-input'; const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(i,'notepad'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'typed:'+i.value})()"
sleep 0.3
echo "-- 输入后焦点:"
$AB eval "(()=>{const el=document.activeElement; return el ? el.tagName+'|'+String(el.value??'').slice(0,20) : 'null'})()"
echo "-- 按 Enter（agent-browser press）:"
$AB press Enter >/dev/null 2>&1
sleep 1.2
echo "-- 结果: run 窗状态 / notepad 窗:"
$AB eval "(()=>{const s=window.__xp.getState(); return JSON.stringify({run:s.windows.filter(w=>w.app==='run').length, notepad:s.windows.filter(w=>w.app==='notepad').length, runHistory:s.runHistory})})()"

echo "== 若失败：查 keydown 是否到达 input（埋探针再按一次）=="
$AB eval "(()=>{const s=window.__xp.getState(); const run=s.windows.find(w=>w.app==='run'); if(!run) return 'run-window-gone'; window.__probe=[]; const i=document.querySelector('.xp-sunken input'); if(!i) return 'no-input'; i.addEventListener('keydown',e=>window.__probe.push('input:'+e.key),true); window.addEventListener('keydown',e=>window.__probe.push('win:'+e.key),true); s.openApp('run',{}); return 'probe-set'})()"
sleep 0.6
$AB eval "(()=>{const i=document.querySelector('.xp-sunken input'); if(!i) return 'no-input'; const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(i,'calc'); i.dispatchEvent(new Event('input',{bubbles:true})); i.focus(); return 'typed+focused'})()"
sleep 0.2
$AB press Enter >/dev/null 2>&1
sleep 1.0
echo "-- 探针收到的事件:"
$AB eval "JSON.stringify(window.__probe)"
echo "-- 结果: run/calc 窗口:"
$AB eval "(()=>{const s=window.__xp.getState(); return JSON.stringify({run:s.windows.filter(w=>w.app==='run').length, calc:s.windows.filter(w=>w.app==='calculator').length, hist:s.runHistory})})()"
