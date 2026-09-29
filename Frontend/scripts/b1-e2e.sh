#!/usr/bin/env bash
# b1 批 e2e：regedit + 语言栏 + 欢迎屏关机面板 + 任务管理器 + 计算器进制
# 注：agent-browser find text 对 MenuBar/含SVG按钮可达名称匹配不到 → 统一 eval 点击
AB=agent-browser
URL=http://localhost:3000
SHOT=/home/z/my-project/.zscripts
PASS=0; FAIL=0
ck(){ if [ "$1" = "0" ]; then PASS=$((PASS+1)); echo "  PASS  $2"; else FAIL=$((FAIL+1)); echo "  FAIL  $2"; fi; }
ev(){ $AB eval "$1" 2>/dev/null | grep -q "true"; return $?; }

echo "== 1. 登录桌面 =="
$AB open "$URL" >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
$AB find text "Administrator" click >/dev/null 2>&1; sleep 0.6
$AB find first 'input[aria-label="密码"]' fill "2001" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
ck $? "Administrator+2001 → 桌面"
sleep 1

echo "== 2. regedit：打开与结构 =="
$AB eval "window.__xp.getState().openApp('regedit', {})" >/dev/null 2>&1; sleep 1
ev "[...document.querySelectorAll('[data-regtree] span')].some(s=>s.textContent==='我的电脑')"
ck $? "虚拟根「我的电脑」在位"
ev "['HKEY_CLASSES_ROOT','HKEY_CURRENT_USER','HKEY_LOCAL_MACHINE','HKEY_USERS','HKEY_CURRENT_CONFIG'].every(k=>[...document.querySelectorAll('[data-regtree] span')].some(s=>s.textContent===k))"
ck $? "五大根键齐全"
ev "[...document.querySelectorAll('[data-regvals] td')].some(td=>td.textContent==='ProductName')"
ck $? "默认选中 HKLM CurrentVersion → ProductName 值在位"
ev "[...document.querySelectorAll('[data-regvals] td')].some(td=>td.textContent.includes('Microsoft Windows XP'))"
ck $? "ProductName 数据 = Microsoft Windows XP"

echo "== 3. regedit：新建字符串值 + API 落库 =="
# 通过 store 模拟 RegEdit 的 mutate 通路（同一 API 链路）
$AB eval "(()=>{const s=window.__xp.getState(); const t=structuredClone(s.regTree); const hcu=t.children.find(c=>c.name==='HKEY_CURRENT_USER'); hcu.values.push({name:'b1测试值',type:'REG_SZ',data:'e2e-ok'}); s.setRegTree(t); return 'set'})()" >/dev/null 2>&1
sleep 1.5
R=$(curl -s "$URL/api/v1/settings" | python3 -c "
import sys,json
d=json.load(sys.stdin)
t=d.get('data',d)
hcu=[c for c in t.get('regTree',{}).get('children',[]) if c.get('name')=='HKEY_CURRENT_USER']
print('yes' if hcu and any(v.get('name')=='b1测试值' for v in hcu[0].get('values',[])) else 'no')" 2>/dev/null || echo "parse-err")
[ "$R" = "yes" ] && ck 0 "regTree 修改经 settings PATCH 落库（b1测试值在服务端）" || { echo "  got: $R"; ck 1 "regTree 修改经 settings PATCH 落库"; }
# 清理测试值
$AB eval "(()=>{const s=window.__xp.getState(); const t=structuredClone(s.regTree); const hcu=t.children.find(c=>c.name==='HKEY_CURRENT_USER'); hcu.values=hcu.values.filter(v=>v.name!=='b1测试值'); s.setRegTree(t); return 'clean'})()" >/dev/null 2>&1
sleep 1
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.5

echo "== 4. 语言栏 CH 指示器 =="
ev "(()=>{const b=document.querySelector('[data-tray-lang]'); return !!b && b.textContent.trim()==='CH'})()"
ck $? "托盘 CH 指示器在位"
$AB eval "document.querySelector('[data-tray-lang]').click()" >/dev/null 2>&1; sleep 0.4
ev "(()=>{const b=document.querySelector('[data-tray-lang]'); return !!b && b.textContent.trim()==='EN'})()"
ck $? "单击切换 → EN"
ev "(()=>{const s=window.__xp.getState(); return s.inputLang==='en'})()"
ck $? "store inputLang=en"
$AB eval "(()=>{const s=window.__xp.getState(); s.setInputLang('ch'); return 'ch'})()" >/dev/null 2>&1
ck 0 "还原 CH"

echo "== 5. 欢迎屏关机三圆钮面板 =="
$AB eval "(()=>{const s=window.__xp.getState(); s.setSwitchFrom(s.sessionUser); s.setPhase('welcome'); return 'ok'})()" >/dev/null 2>&1
sleep 1
$AB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('关闭计算机')); if(!b) return 'no-btn'; b.click(); return 'clicked'})()" >/dev/null 2>&1; sleep 0.5
ev "!!document.querySelector('[data-shutdown-panel]')"
ck $? "欢迎屏「关闭计算机」→ 三圆钮面板弹出"
ev "[...document.querySelectorAll('[data-shutdown-panel] button')].filter(b=>b.textContent.includes('待机')).length===1"
ck $? "待机圆钮在位"
ev "[...document.querySelectorAll('[data-shutdown-panel] button')].filter(b=>b.textContent.includes('重新启动')).length===1"
ck $? "重新启动圆钮在位"
$AB screenshot $SHOT/shot-b1-sdpanel.png >/dev/null 2>&1
$AB eval "(()=>{const b=[...document.querySelectorAll('[data-shutdown-panel] button')].find(x=>x.textContent.includes('取消')); if(!b) return 'no-cancel'; b.click(); return 'ok'})()" >/dev/null 2>&1; sleep 0.4
ev "!document.querySelector('[data-shutdown-panel]')"
ck $? "取消 → 面板关闭"
# FUS 磁贴返回桌面（finishLogin 有 1.6s 转场，用 wait --fn）
$AB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Administrator')); if(!b) return 'no-tile'; b.click(); return 'back'})()" >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 8000 >/dev/null 2>&1
ck $? "FUS 磁贴返回桌面（会话保留）"

echo "== 6. 任务管理器：结束进程 =="
$AB eval "window.__xp.getState().openApp('notepad', {})" >/dev/null 2>&1; sleep 0.8
$AB eval "window.__xp.getState().openApp('taskmgr', {})" >/dev/null 2>&1; sleep 0.8
$AB eval "(()=>{const tabs=[...document.querySelectorAll('button')]; tabs.find(b=>b.textContent==='进程')?.click(); return 'tab'})()" >/dev/null 2>&1; sleep 0.4
$AB eval "(()=>{const rows=[...document.querySelectorAll('table tbody tr')]; const r=rows.find(x=>x.textContent.includes('notepad.exe')); if(!r) return 'no-row'; r.click(); return 'sel'})()" >/dev/null 2>&1
ev "(()=>{const s=window.__xp.getState(); return s.windows.some(w=>w.app==='notepad')})()"
ck $? "notepad 窗口在位（待终止）"
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='结束进程')?.click(); return 'kill'})()" >/dev/null 2>&1; sleep 0.6
ev "(()=>{const s=window.__xp.getState(); return !s.windows.some(w=>w.app==='notepad')})()"
ck $? "结束进程 → notepad 窗口关闭（真实生效）"

echo "== 7. 任务管理器：切换至 =="
$AB eval "window.__xp.getState().openApp('calculator', {})" >/dev/null 2>&1; sleep 0.6
$AB eval "(()=>{const s=window.__xp.getState(); const c=s.windows.find(w=>w.app==='calculator'); s.minimizeWindow(c.id); return 'min'})()" >/dev/null 2>&1; sleep 0.4
$AB eval "(()=>{const tabs=[...document.querySelectorAll('button')]; tabs.find(b=>b.textContent==='应用程序')?.click(); return 'tab'})()" >/dev/null 2>&1; sleep 0.4
$AB eval "(()=>{const rows=[...document.querySelectorAll('table tbody tr')]; const r=rows.find(x=>x.textContent.includes('计算器')); if(!r) return 'no-row'; r.click(); return 'sel'})()" >/dev/null 2>&1
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='切换至')?.click(); return 'sw'})()" >/dev/null 2>&1; sleep 0.6
ev "(()=>{const s=window.__xp.getState(); const c=s.windows.find(w=>w.app==='calculator'); return !!c && !c.minimized && c.z===s.zTop})()"
ck $? "切换至 → 计算器还原并置顶（不再误开关机框）"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.4

echo "== 8. 计算器：科学型进制真实化 =="
$AB eval "window.__xp.getState().openApp('calculator', {})" >/dev/null 2>&1; sleep 0.6
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='查看(V)')?.click(); return 'm'})()" >/dev/null 2>&1; sleep 0.3
$AB eval "(()=>{const spans=[...document.querySelectorAll('span')]; spans.find(s=>s.textContent==='科学型(S)')?.click(); return 'sci'})()" >/dev/null 2>&1; sleep 0.6
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='十六进制')?.click(); return 'hex'})()" >/dev/null 2>&1; sleep 0.3
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='1')?.click(); return '1'})()" >/dev/null 2>&1
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='A')?.click(); return 'A'})()" >/dev/null 2>&1; sleep 0.3
ev "(()=>{const scr=document.querySelector('.xp-calc-screen'); return !!scr && scr.textContent.includes('1A')})()"
ck $? "十六进制输入 1A 显示"
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='十进制')?.click(); return 'dec'})()" >/dev/null 2>&1; sleep 0.3
ev "(()=>{const scr=document.querySelector('.xp-calc-screen'); return !!scr && scr.textContent.includes('26')})()"
ck $? "切十进制 → 自动换算 26（XP 真实行为）"
ev "(()=>{const btns=[...document.querySelectorAll('button')]; const f=btns.find(b=>b.textContent==='F'); return !!f && f.disabled})()"
ck $? "十进制下 A-F 键置灰"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1

echo "== 9. 运行框 regedit 直达 + 控制台 =="
$AB eval "window.__xp.getState().openApp('run', {})" >/dev/null 2>&1; sleep 0.5
$AB find first 'input' fill "regedit" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1; sleep 1
ev "!!document.querySelector('[data-regtree]')"
ck $? "运行框 regedit → 注册表编辑器打开"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1

E=$($AB errors 2>/dev/null | grep -c "\[error\]")
if [ "$E" = "0" ]; then ck 0 "控制台零 error"; else ck 1 "控制台 $E 个 error"; fi
$AB screenshot $SHOT/shot-b1-final.png >/dev/null 2>&1
echo ""
echo "RESULT: $PASS PASS / $FAIL FAIL"
exit $([ $FAIL = 0 ] && echo 0 || echo 1)
