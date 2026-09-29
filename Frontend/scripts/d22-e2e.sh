#!/usr/bin/env bash
# d22 e2e：欢迎屏 2 磁贴（王小明下线）+ Administrator 密码登录 + 表单通路 + Guest 单击
AB=agent-browser
URL=http://localhost:3000
PASS=0; FAIL=0
ck(){ if [ "$1" = "0" ]; then PASS=$((PASS+1)); echo "  PASS  $2"; else FAIL=$((FAIL+1)); echo "  FAIL  $2"; fi; }
# eval 断言：参数=JS 表达式（应返回 true）
ev(){ $AB eval "$1" 2>/dev/null | grep -q "true"; return $?; }
SHOT=/home/z/my-project/.zscripts

echo "== 1. 启动到欢迎屏 =="
$AB open "$URL" >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
ck $? "boot → 欢迎屏"

echo "== 2. 磁贴断言（王小明已移除）=="
ev "[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Administrator'))"
ck $? "Administrator 磁贴在位"
ev "[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Guest'))"
ck $? "Guest 磁贴在位"
ev "![...document.querySelectorAll('button')].some(b=>b.textContent.includes('王小明'))"
ck $? "王小明磁贴不存在"
ev "document.querySelectorAll('input[aria-label=\"帐户名\"]').length===1"
ck $? "底部登录表单（帐户名输入框）在位"
$AB screenshot $SHOT/shot-d22-welcome.png >/dev/null 2>&1

echo "== 3. Administrator 密码态 =="
$AB find text "Administrator" click >/dev/null 2>&1; sleep 0.6
ev "![...document.querySelectorAll('button')].some(b=>b.textContent.includes('Administrator'))"
ck $? "单击后进入密码态（磁贴变为输入行，未自动登录）"
ev "!!document.querySelector('input[aria-label=\"密码\"]')"
ck $? "密码输入框出现"
ev "!!document.querySelector('[data-tray-vol]')"
if [ $? = 0 ]; then ck 1 "…"; else ck 0 "仍在欢迎屏（未直接进桌面）"; fi

echo "== 4. 密码提示 =="
$AB find text "?" click >/dev/null 2>&1; sleep 0.4
$AB wait --text "密码提示: Windows XP 的发布年份" --timeout 5000 >/dev/null 2>&1
ck $? "「?」显示密码提示"
$AB screenshot $SHOT/shot-d22-pwdtile.png >/dev/null 2>&1

echo "== 5. 错密码 =="
$AB find first 'input[aria-label="密码"]' fill "0000" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --text "您键入的密码不正确" --timeout 8000 >/dev/null 2>&1
ck $? "错密码 → 错误文案"
ev "!!document.querySelector('[data-tray-vol]')"
if [ $? = 0 ]; then ck 1 "…"; else ck 0 "错误后仍停留欢迎屏"; fi

echo "== 6. 对密码登录（2001）=="
$AB find first 'input[aria-label="密码"]' fill "2001" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
ck $? "Administrator+2001 → 进入桌面"
$AB wait --text "开始" --timeout 8000 >/dev/null 2>&1
ck $? "任务栏开始按钮在位"

echo "== 7. Guest 单击直接登录 =="
$AB reload >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
ck $? "重载回欢迎屏（重启语义）"
$AB find text "Guest" click >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
ck $? "Guest 单击即登录（无密码）"

echo "== 8. 表单通路（帐户名+密码直接登录）=="
$AB reload >/dev/null 2>&1
$AB wait --text "要开始，请单击您的用户名" --timeout 45000 >/dev/null 2>&1
$AB find first 'input[aria-label="帐户名"]' fill "Administrator" >/dev/null 2>&1
$AB find first 'input[aria-label="密码"]' fill "0000" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --text "您键入的密码不正确" --timeout 8000 >/dev/null 2>&1
ck $? "表单错密码 → 错误文案"
$AB find first 'input[aria-label="密码"]' fill "2001" >/dev/null 2>&1
$AB press Enter >/dev/null 2>&1
$AB wait --fn "!!document.querySelector('[data-tray-vol]')" --timeout 20000 >/dev/null 2>&1
ck $? "表单 Administrator+2001 → 进入桌面"

echo "== 9. 控制台错误 =="
ERRS=$($AB errors 2>/dev/null | grep -v "^$" | wc -l)
if [ "$ERRS" = "0" ]; then ck 0 "页面零错误"; else ck 1 "页面错误 ${ERRS} 条：$($AB errors 2>/dev/null | head -3)"; fi

echo
echo "== e2e 结果: $PASS pass / $FAIL fail =="
exit $([ "$FAIL" = "0" ] && echo 0 || echo 1)
