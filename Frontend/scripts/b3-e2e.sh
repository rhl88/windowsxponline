#!/usr/bin/env bash
# b3 浏览器 e2e：受限帐户权限门禁（UI 弹权限错误框；Administrator 不受限）
AB=agent-browser
URL=http://localhost:3000
PASS=0; FAIL=0
ck(){ if [ "$1" = "0" ]; then PASS=$((PASS+1)); echo "  PASS  $2"; else FAIL=$((FAIL+1)); echo "  FAIL  $2"; fi; }
ev(){ $AB eval "$1" 2>/dev/null | grep -q "true"; return $?; }

echo "== 1. 创建受限帐户并切换登录 =="
curl -s -X POST "$URL/api/v1/accounts" -H 'Content-Type: application/json' -d '{"name":"e2e门禁","password":"1234","type":"user","avatar":"avatar-chess"}' >/dev/null
$AB open "$URL" >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
# FUS 切换到受限帐户（磁贴）
$AB eval "(()=>{const s=window.__xp.getState(); s.setSwitchFrom(s.sessionUser); s.setPhase('welcome'); return 'w'})()" >/dev/null 2>&1; sleep 1
$AB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('e2e门禁')); if(!b) return 'no-tile'; b.click(); return 'k'})()" >/dev/null 2>&1
sleep 0.6
$AB eval "(()=>{const inp=document.querySelector('input[aria-label=\"密码\"]'); if(!inp) return 'no-inp'; const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(inp,'1234'); inp.dispatchEvent(new Event('input',{bubbles:true})); return 'p'})()" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
ck $? "受限帐户 e2e门禁 登录进桌面"
ev "(()=>{const s=window.__xp.getState(); return s.sessionUser==='e2e门禁'})()"
ck $? "sessionUser = e2e门禁"

echo "== 2. 权限门禁：管理工具被拦 =="
R=$($AB eval "window.__xp.getState().openApp('compmgmt', {})" 2>/dev/null)
ev "$R" | grep -q "true" 2>/dev/null
[ "$R" = "-1" ] && ck 0 "openApp(compmgmt) 返回 -1（拦截）" || ck 1 "openApp(compmgmt) 应返回 -1，got: $R"
sleep 0.5
ev "[...document.querySelectorAll('div')].some(d=>d.textContent.includes('您没有执行此操作的适当权限'))"
ck $? "弹出 XP 风格权限错误对话框"
ev "!(()=>{const s=window.__xp.getState(); return s.windows.some(w=>w.app==='compmgmt')})()"
ck $? "计算机管理窗口未打开"
# 清理错误框
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.3
R=$($AB eval "window.__xp.getState().openApp('defrag', {})" 2>/dev/null)
[ "$R" = "-1" ] && ck 0 "openApp(defrag) 也被拦（磁盘碎片整理需管理员）" || ck 1 "defrag 拦截失败"

echo "== 3. 受限帐户普通应用不受限 =="
R=$($AB eval "window.__xp.getState().openApp('notepad', {})" 2>/dev/null)
ev "(()=>{const s=window.__xp.getState(); return s.windows.some(w=>w.app==='notepad')})()"
ck $? "记事本正常打开（普通应用不拦）"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.3

echo "== 4. Administrator 不受限 =="
$AB eval "(()=>{const s=window.__xp.getState(); s.setSwitchFrom('e2e门禁'); s.setPhase('welcome'); return 'w'})()" >/dev/null 2>&1; sleep 1
$AB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Administrator')); if(!b) return 'no-tile'; b.click(); return 'k'})()" >/dev/null 2>&1; sleep 0.6
$AB eval "(()=>{const inp=document.querySelector('input[aria-label=\"密码\"]'); if(!inp) return 'no-inp'; const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(inp,'2001'); inp.dispatchEvent(new Event('input',{bubbles:true})); return 'p'})()" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
ck $? "Administrator 回到桌面（会话保留）"
R=$($AB eval "window.__xp.getState().openApp('compmgmt', {})" 2>/dev/null)
ev "(()=>{const s=window.__xp.getState(); return s.windows.some(w=>w.app==='compmgmt')})()"
ck $? "Administrator 打开计算机管理不受限"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1

echo "== 5. 清理 =="
curl -s -X DELETE "$URL/api/v1/accounts" -H 'Content-Type: application/json' -d '{"name":"e2e门禁"}' >/dev/null
C=$(curl -s "$URL/api/v1/accounts" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']))")
[ "$C" = "2" ] && ck 0 "测试帐户已清理（回到 2 帐户）" || ck 1 "清理失败：$C 帐户"

E=$($AB errors 2>/dev/null | grep -c "\[error\]")
if [ "$E" = "0" ]; then ck 0 "控制台零 error"; else ck 1 "控制台 $E 个 error"; fi
echo ""
echo "RESULT: $PASS PASS / $FAIL FAIL"
exit $([ $FAIL = 0 ] && echo 0 || echo 1)
