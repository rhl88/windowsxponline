#!/usr/bin/env bash
# d30 e2e：静态发布形态全流程（Local 引擎）
# 验证：登录 hydrate / localStorage 持久化 / 刷新留存 / CMD ipconfig 伪造 / 控制台零错
AB=agent-browser
URL=${1:-http://localhost:8090}
PASS=0; FAIL=0
ck(){ if [ "$1" = "0" ]; then PASS=$((PASS+1)); echo "  PASS  $2"; else FAIL=$((FAIL+1)); echo "  FAIL  $2"; fi; }
# agent-browser eval 偶发 SyntaxError 竞态（CLI↔浏览器通信）：断言带 3 次重试
ev(){ local i out; for i in 1 2 3; do out=$($AB eval "$1" 2>&1 | tail -1); if echo "$out" | grep -q "true"; then return 0; fi; sleep 0.4; done; return 1; }

echo "== 1. 静态版开机 → Administrator/2001 登录 =="
$AB open "$URL" >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
ck $? "欢迎屏渲染（无 Node 后端）"
$AB find text "Administrator" click >/dev/null 2>&1; sleep 0.6
$AB find first 'input[aria-label="密码"]' fill "2001" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
ck $? "登录（Local 引擎 loginAccount 验证 2001）→ 桌面"
sleep 1

echo "== 2. Local 引擎状态验证 =="
ev "(()=>{const r=localStorage.getItem('xp.localState'); if(!r) return false; const s=JSON.parse(r); return s.version===2 && !!s.fsTree && !!s.settings})()"
ck $? "xp.localState 存在（version=2 + fsTree + settings）"
ev "(()=>{const s=JSON.parse(localStorage.getItem('xp.localState')); return s.accounts.length>=2 && s.accounts.some(a=>a.name==='Administrator')})()"
ck $? "种子帐户列表（Administrator + Guest）"
ev "(()=>{const s=window.__xp.getState(); return s.booted===true || !!s.fsTree || s.windows!==undefined})()"
ck $? "zustand store hydrate 完成"

echo "== 3. 文件创建 → localStorage 落盘 =="
$AB eval "window.__xp.getState().fsCreateFile(['本地磁盘 (C:)'], 'd30-static-test.txt', {content:'static export persistence test'})" >/dev/null 2>&1
sleep 1.5
ev "(()=>{const s=JSON.parse(localStorage.getItem('xp.localState')); const c=s.fsTree.children.find(x=>x.name==='本地磁盘 (C:)'); return !!c && c.children.some(x=>x.name==='d30-static-test.txt')})()"
ck $? "fsCreateFile → fs-sync → Local 引擎 POST /fs → localStorage"

echo "== 4. 刷新 → 数据留存（静态版核心卖点） =="
$AB open "$URL" >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
$AB find text "Administrator" click >/dev/null 2>&1; sleep 0.6
$AB find first 'input[aria-label="密码"]' fill "2001" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
sleep 1
ev "(()=>{const s=JSON.parse(localStorage.getItem('xp.localState')); const c=s.fsTree.children.find(x=>x.name==='本地磁盘 (C:)'); return !!c && c.children.some(x=>x.name==='d30-static-test.txt')})()"
ck $? "刷新重登后 d30-static-test.txt 仍在（localStorage 持久化）"

echo "== 5. CMD ipconfig（auxFetch → 本机伪造网卡） =="
$AB eval "window.__xp.getState().openApp('cmd', {})" >/dev/null 2>&1; sleep 1
$AB eval "(()=>{const i=document.querySelector('[data-cmd-input]') || [...document.querySelectorAll('input')].find(x=>x.className.includes('font-mono')); if(!i) return 'no-input'; i.focus(); const ev=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true}); const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(i,'ipconfig'); i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(ev); return 'cmd-run'})()" >/dev/null 2>&1
sleep 2
ev "(()=>{const t=document.body.innerText; return t.includes('192.168.0.10') && t.includes('Realtek')})()"
ck $? "ipconfig 输出伪造网卡（Realtek 192.168.0.10）"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.4

echo "== 6. IE 搜索（auxFetch → 内置示范结果） =="
$AB eval "window.__xp.getState().openApp('ie', {})" >/dev/null 2>&1; sleep 1.5
$AB eval "(()=>{const i=document.querySelector('input[aria-label=\"地址栏\"]') || [...document.querySelectorAll('input')].find(x=>x.placeholder&&x.placeholder.includes('地址')); if(!i) return 'no-input'; i.focus(); const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(i,'test'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'typed'})()" >/dev/null 2>&1
sleep 0.3
$AB press Enter >/dev/null 2>&1; sleep 2.5
ev "(()=>{const t=document.body.innerText; return t.includes('本机示范数据') || t.includes('MSN Search')})()"
ck $? "搜索页示范结果渲染"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.4

echo "== 7. 控制台零错误 =="
ERRS=$($AB errors 2>/dev/null | grep -c "error" || true)
if [ "$ERRS" = "0" ]; then PASS=$((PASS+1)); echo "  PASS  控制台零 error"; else FAIL=$((FAIL+1)); echo "  FAIL  控制台 $ERRS 条 error"; $AB errors 2>/dev/null | head -5; fi

echo ""
echo "结果: $PASS PASS / $FAIL FAIL"
exit $([ "$FAIL" = "0" ] && echo 0 || echo 1)
