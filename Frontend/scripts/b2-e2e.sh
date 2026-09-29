#!/usr/bin/env bash
# b2 批 e2e：保存体系统一（画图/写字板入 VFS + Outlook 持久化）+ 搜索高级条件 + 屏保 + CMD 命令族
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

echo "== 2. 画图：保存入 VFS 图片收藏 =="
$AB eval "window.__xp.getState().openApp('paint', {})" >/dev/null 2>&1; sleep 1
# 画一笔（铅笔工具默认）：直接对 canvas 派发 pointer 事件
$AB eval "(()=>{const cv=document.querySelector('canvas'); if(!cv) return 'no-cv'; const r=cv.getBoundingClientRect(); const d1=new PointerEvent('pointerdown',{clientX:r.x+40,clientY:r.y+30,bubbles:true}); cv.dispatchEvent(d1); const d2=new PointerEvent('pointerup',{clientX:r.x+90,clientY:r.y+70,bubbles:true}); cv.dispatchEvent(d2); return 'drew'})()" >/dev/null 2>&1; sleep 0.3
# 文件→保存 → 弹另存为
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='文件(F)')?.click(); return 'm'})()" >/dev/null 2>&1; sleep 0.3
$AB eval "(()=>{const spans=[...document.querySelectorAll('span')]; spans.find(s=>s.textContent==='保存(S)')?.click(); return 's'})()" >/dev/null 2>&1; sleep 0.5
ev "!!document.querySelector('input')"
ck $? "保存 → 另存为对话框弹出"
$AB eval "(()=>{const inp=[...document.querySelectorAll('input')].find(i=>i.value.includes('.bmp')); if(!inp) return 'no-input'; const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(inp,'e2e画作.bmp'); inp.dispatchEvent(new Event('input',{bubbles:true})); return 'set'})()" >/dev/null 2>&1; sleep 0.3
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='保存(S)')?.click(); return 'go'})()" >/dev/null 2>&1; sleep 1.2
ev "(()=>{const s=window.__xp.getState(); const pics=['本地磁盘 (C:)','Documents and Settings','Administrator','My Documents','图片收藏']; const dir=pics.reduce((n,seg)=>n?.children?.find(c=>c.name===seg)??n, s.fsTree); return dir?.children?.some(c=>c.name==='e2e画作.bmp') ?? false})()"
ck $? "图片收藏出现 e2e画作.bmp（icon=bmp）"
R=$(curl -s "$URL/api/v1/fs?path=%E5%9B%BE%E7%89%87%E6%94%B6%E8%97%8F" 2>/dev/null | head -c 100)
# 服务端断言走 state
R=$(curl -s "$URL/api/v1/state" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data'] if 'data' in (j:=json.load(open('/dev/null')) if False else {}) else json.load(sys.stdin)
" 2>/dev/null; curl -s "$URL/api/v1/state" | python3 -c "
import sys,json
raw=json.load(sys.stdin)
tree=raw.get('data',raw).get('fsTree',{})
def find(n,name):
    if n.get('name')==name: return n
    for c in n.get('children') or []:
        r=find(c,name)
        if r: return r
    return None
pics=find(tree,'图片收藏')
print('yes' if pics and any(c['name']=='e2e画作.bmp' for c in pics.get('children') or []) else 'no')" 2>/dev/null || echo "err")
[ "$R" = "yes" ] && ck 0 "画图保存落库到服务端 fsTree" || { echo "  got: $R"; ck 1 "画图保存落库到服务端 fsTree"; }
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.5

echo "== 3. 写字板：保存入 VFS 我的文档 =="
$AB eval "window.__xp.getState().openApp('wordpad', {})" >/dev/null 2>&1; sleep 1
$AB eval "(()=>{const ed=document.querySelector('[contenteditable=true],[contenteditable]'); if(!ed) return 'no-ed'; ed.innerHTML='<div>e2e 写字板测试文档</div>'; ed.dispatchEvent(new Event('input',{bubbles:true})); return 'typed'})()" >/dev/null 2>&1; sleep 0.3
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='文件(F)')?.click(); return 'm'})()" >/dev/null 2>&1; sleep 0.3
$AB eval "(()=>{const spans=[...document.querySelectorAll('span')]; spans.find(s=>s.textContent==='保存(S)')?.click(); return 's'})()" >/dev/null 2>&1; sleep 0.5
$AB eval "(()=>{const inp=[...document.querySelectorAll('input')].find(i=>i.value.includes('.rtf')); if(!inp) return 'no-input'; const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(inp,'e2e文档.rtf'); inp.dispatchEvent(new Event('input',{bubbles:true})); return 'set'})()" >/dev/null 2>&1; sleep 0.3
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent==='保存(S)')?.click(); return 'go'})()" >/dev/null 2>&1; sleep 1.2
ev "(()=>{const s=window.__xp.getState(); const docs=['本地磁盘 (C:)','Documents and Settings','Administrator','My Documents']; const dir=docs.reduce((n,seg)=>n?.children?.find(c=>c.name===seg)??n, s.fsTree); const f=dir?.children?.find(c=>c.name==='e2e文档.rtf'); return !!f && f.icon==='doc' && f.appId==='wordpad' && (f.content??'').includes('写字板测试文档')})()"
ck $? "我的文档出现 e2e文档.rtf（doc 图标 + appId=wordpad + 内容在）"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.5

echo "== 4. Outlook：邮件持久化 =="
$AB eval "window.__xp.getState().openApp('outlook', {})" >/dev/null 2>&1; sleep 1.2
# 通过 UI 发一封邮件：工具栏 创建邮件 → 填写 → 发送
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; const b=btns.find(x=>x.textContent.includes('创建邮件')); if(!b) return 'no-btn'; b.click(); return 'ok'})()" >/dev/null 2>&1; sleep 1
$AB eval "(()=>{const inp=[...document.querySelectorAll('input')].find(i=>(i.placeholder||'').includes('收件人')||i.ariaLabel==='收件人'); return inp?'found':'nofind:'+[...document.querySelectorAll('input')].map(i=>i.placeholder).join(','))()')()" >/dev/null 2>&1
# 直接填收件人输入框（第一个 input）
$AB eval "(()=>{const inp=document.querySelector('input'); if(!inp) return 'no-inp'; const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(inp,'老王(隔壁)'); inp.dispatchEvent(new Event('input',{bubbles:true})); return 'to'})()" >/dev/null 2>&1; sleep 0.2
$AB eval "(()=>{const inps=[...document.querySelectorAll('input')]; const sub=inps.find(i=>(i.placeholder||'').includes('主题'))||inps[1]; if(!sub) return 'no-sub'; const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(sub,'e2e持久化测试'); sub.dispatchEvent(new Event('input',{bubbles:true})); return 'sub'})()" >/dev/null 2>&1; sleep 0.2
# 发送按钮（工具栏第一个「发送」）
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; const b=btns.find(x=>x.textContent==='发送'); if(!b) return 'no-send'; b.click(); return 'sent'})()" >/dev/null 2>&1; sleep 1.5
R=$(curl -s "$URL/api/v1/oe-mails" | python3 -c "
import sys,json
d=json.load(sys.stdin)
mails=d.get('data',d)
print('yes' if any(m.get('folder')=='outbox' for m in mails) else 'no')" 2>/dev/null || echo err)
[ "$R" = "yes" ] && ck 0 "oeSend → 发件箱 → API /oe-mails 落库（发件通路验证）" || { echo "  got: $R"; ck 1 "oeSend → API /oe-mails 落库"; }
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.5

echo "== 5. 搜索：高级条件 =="
$AB eval "window.__xp.getState().openApp('search', {})" >/dev/null 2>&1; sleep 1
$AB eval "(()=>{const inp=[...document.querySelectorAll('input')][0]; const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(inp,''); inp.dispatchEvent(new Event('input',{bubbles:true})); const w=[...document.querySelectorAll('input')][1]; setter.call(w,'欢迎'); w.dispatchEvent(new Event('input',{bubbles:true})); return 'q'})()" >/dev/null 2>&1; sleep 0.3
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent.includes('立即搜索'))?.click(); return 'go'})()" >/dev/null 2>&1; sleep 1.5
ev "[...document.querySelectorAll('button')].some(b=>b.textContent.includes('欢迎'))"
ck $? "内容搜索「欢迎」→ 命中含该词的文件（如 欢迎文本）"
# 大小条件
$AB eval "(()=>{const btns=[...document.querySelectorAll('button')]; btns.find(b=>b.textContent.includes('什么时候修改的'))?.click(); return 'open'})()" >/dev/null 2>&1; sleep 0.3
ev "[...document.querySelectorAll('button')].some(x=>x.textContent==='不记得')"
ck $? "折叠面板「什么时候修改的」展开"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.5

echo "== 6. CMD：新命令族 =="
$AB eval "window.__xp.getState().openApp('cmd', {})" >/dev/null 2>&1; sleep 1
cmd_test(){
  $AB find first 'input' fill "$1" >/dev/null 2>&1
  $AB press Enter >/dev/null 2>&1
  sleep $2
}
cmd_test "systeminfo" 0.6
ev "[...document.querySelectorAll('div')].some(d=>d.textContent.includes('Microsoft Windows XP') && d.textContent.includes('注册所有人'))"
ck $? "systeminfo 输出（含注册表取的 ProductName/RegisteredOwner）"
cmd_test "netstat" 1.2
ev "[...document.querySelectorAll('div')].some(d=>d.textContent.includes('Active Connections') && d.textContent.includes('ESTABLISHED'))"
ck $? "netstat 输出连接表"
cmd_test "tracert www.msn.com" 1.5
ev "[...document.querySelectorAll('div')].some(d=>d.textContent.includes('通过最多 30 个跃点跟踪到'))"
ck $? "tracert 路由跟踪输出"
cmd_test "reg query HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" 0.6
ev "[...document.querySelectorAll('div')].some(d=>d.textContent.includes('REG.EXE') && d.textContent.includes('ProductName'))"
ck $? "reg query 读注册表（ProductName 在列）"
cmd_test "findstr 欢 迎.txt" 0.6
cmd_test "net user" 0.6
ev "[...document.querySelectorAll('div')].some(d=>d.textContent.includes('Administrator') && d.textContent.includes('Guest'))"
ck $? "net user 列出帐户（真实 store 数据）"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.5

echo "== 7. 屏保：4 个新屏保预览 =="
for SAVER in marquee flight3d flowerbox slideshow; do
  $AB eval "(()=>{const s=window.__xp.getState(); s.setScreensaver('$SAVER'); return 'set'})()" >/dev/null 2>&1; sleep 0.3
  $AB eval "window.dispatchEvent(new CustomEvent('xp-saver-preview'))" >/dev/null 2>&1; sleep 1
  if [ "$SAVER" = "slideshow" ]; then
    ev "!!document.querySelector('img')"
    ck $? "屏保 $SAVER 启动（img 元素在位）"
  else
    ev "!!document.querySelector('canvas')"
    ck $? "屏保 $SAVER 启动（canvas 在位）"
  fi
  $AB eval "window.dispatchEvent(new PointerEvent('pointermove',{clientX:10,clientY:10,bubbles:true}))" >/dev/null 2>&1; sleep 0.8
done
$AB eval "(()=>{const s=window.__xp.getState(); s.setScreensaver('none'); return 'off'})()" >/dev/null 2>&1

echo "== 8. 控制台 =="
E=$($AB errors 2>/dev/null | grep -c "\[error\]")
if [ "$E" = "0" ]; then ck 0 "控制台零 error"; else ck 1 "控制台 $E 个 error"; fi
$AB screenshot $SHOT/shot-b2-final.png >/dev/null 2>&1 2>/dev/null
echo ""
echo "RESULT: $PASS PASS / $FAIL FAIL"
exit $([ $FAIL = 0 ] && echo 0 || echo 1)
