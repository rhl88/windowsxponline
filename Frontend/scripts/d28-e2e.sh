#!/usr/bin/env bash
# d28 e2e：IME 安全回车（运行框/CMD）+ 扫雷自定义 + 纸牌选项 + fs-sync 错误提示
AB=agent-browser
URL=http://localhost:3000
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

echo "== 2. 运行框：干净回车（回归）=="
$AB eval "window.__xp.getState().openApp('run', {})" >/dev/null 2>&1; sleep 0.6
$AB eval "(()=>{const i=document.querySelector('.xp-sunken input'); if(!i) return 'no-input'; const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(i,'notepad'); i.dispatchEvent(new Event('input',{bubbles:true})); i.focus(); return 'typed'})()" >/dev/null 2>&1
sleep 0.2
$AB press Enter >/dev/null 2>&1; sleep 1
ev "(()=>{const s=window.__xp.getState(); return s.windows.filter(w=>w.app==='run').length===0 && s.windows.filter(w=>w.app==='notepad').length===1})()"
ck $? "干净回车 → notepad 打开 + run 窗关闭"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.4

echo "== 3. 运行框：IME 组态回车（Chrome 模式 key='Process'/keyCode 229）=="
$AB eval "window.__xp.getState().openApp('run', {})" >/dev/null 2>&1; sleep 0.6
$AB eval "(()=>{const i=document.querySelector('.xp-sunken input'); if(!i) return 'no-input'; i.focus(); const ev=new KeyboardEvent('keydown',{key:'Process',code:'Enter',keyCode:229,isComposing:true,bubbles:true,cancelable:true}); i.dispatchEvent(ev); const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(i,'calc'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'ime-commit-sim'})()" >/dev/null 2>&1
sleep 1.2
ev "(()=>{const s=window.__xp.getState(); return s.windows.filter(w=>w.app==='run').length===0 && s.windows.filter(w=>w.app==='calculator').length===1})()"
ck $? "组态回车（Chrome 模式）→ 上屏后 calc 执行（原 bug：无任何响应）"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.4

echo "== 4. 运行框：IME 组态回车（Firefox 模式 key='Enter'+isComposing）=="
$AB eval "window.__xp.getState().openApp('run', {})" >/dev/null 2>&1; sleep 0.6
$AB eval "(()=>{const i=document.querySelector('.xp-sunken input'); if(!i) return 'no-input'; i.focus(); const ev=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:229,isComposing:true,bubbles:true,cancelable:true}); i.dispatchEvent(ev); const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(i,'winmine'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'ime-ff-sim'})()" >/dev/null 2>&1
sleep 1.2
ev "(()=>{const s=window.__xp.getState(); return s.windows.filter(w=>w.app==='run').length===0 && s.windows.filter(w=>w.app==='minesweeper').length===1})()"
ck $? "组态回车（Firefox 模式）→ 上屏后 winmine 执行"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.4

echo "== 5. CMD：IME 组态回车执行命令 =="
$AB eval "window.__xp.getState().openApp('cmd', {})" >/dev/null 2>&1; sleep 1
$AB eval "(()=>{const i=document.querySelector('[data-cmd-input]') || [...document.querySelectorAll('input')].find(x=>x.className.includes('font-mono')); if(!i) return 'no-input'; i.focus(); const ev=new KeyboardEvent('keydown',{key:'Process',code:'Enter',keyCode:229,isComposing:true,bubbles:true,cancelable:true}); i.dispatchEvent(ev); const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(i,'echo 你好'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'cmd-ime-sim'})()" >/dev/null 2>&1
sleep 1.2
ev "(()=>{const w=[...document.querySelectorAll('div')].some(d=>d.textContent.includes('你好')); return w})()"
ck $? "CMD 组态回车 → echo 你好 执行并输出"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.4

echo "== 6. 扫雷自定义棋盘 =="
$AB eval "window.__xp.getState().openApp('minesweeper', {})" >/dev/null 2>&1; sleep 0.8
# 打开游戏菜单 → 自定义
$AB eval "(()=>{const s=window.__xp.getState(); const w=s.windows.find(x=>x.app==='minesweeper'); const comp=document.querySelectorAll('[data-winid=\"'+w.id+'\"] .xp-menubar-btn, [data-winid=\"'+w.id+'\"] button'); const g=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('游戏')); if(!g) return 'no-menu'; g.click(); return 'menu-open'})()" >/dev/null 2>&1
sleep 0.5
$AB eval "(()=>{const it=[...document.querySelectorAll('.xp-menu *')].filter(el=>el.childElementCount===0&&el.textContent.includes('自定义')); if(!it.length) return 'no-item'; it[it.length-1].click(); return 'dlg-open'})()" >/dev/null 2>&1
sleep 0.5
ev "!!document.querySelector('.xp-minesweeper input')"
ck $? "自定义棋盘对话框打开（三输入框）"
# 填 24 / 30 / 700（超限，应钳位 667）
$AB eval "(()=>{const ins=[...document.querySelectorAll('.xp-minesweeper input')]; if(ins.length<3) return 'few'; const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); const set=(i,v)=>{d.set.call(ins[i],v); ins[i].dispatchEvent(new Event('input',{bubbles:true}))}; set(0,'40'); set(1,'40'); set(2,'700'); return 'filled'})()" >/dev/null 2>&1
sleep 0.3
$AB eval "(()=>{const ok=[...document.querySelectorAll('.xp-minesweeper button')].find(b=>b.textContent==='确定'); if(!ok) return 'no-ok'; ok.click(); return 'applied'})()" >/dev/null 2>&1
sleep 0.8
ev "(()=>{const s=window.__xp.getState(); return !!s.windows.find(w=>w.app==='minesweeper') && s.windows.find(w=>w.app==='minesweeper').w >= 30*16+24-1})()"
ck $? "自定义 40/40/700 → 钳位 30 宽（窗口自适应放大）"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.4

echo "== 7. 纸牌选项：翻三张 + 维加斯 + 计时 =="
$AB eval "window.__xp.getState().openApp('solitaire', {})" >/dev/null 2>&1; sleep 0.8
$AB eval "(()=>{const g=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('游戏')); if(!g) return 'no-menu'; g.click(); return 'ok'})()" >/dev/null 2>&1
sleep 0.5
$AB eval "(()=>{const it=[...document.querySelectorAll('.xp-menu *')].filter(el=>el.childElementCount===0&&el.textContent.includes('选项')); if(!it.length) return 'no-item'; it[it.length-1].click(); return 'opts-open'})()" >/dev/null 2>&1
sleep 0.6
ev "(()=>{return document.body.textContent.includes('一次翻三张牌(D)') && document.body.textContent.includes('维加斯(V)') && document.body.textContent.includes('计时游戏(T)')})()"
ck $? "选项对话框打开（翻牌方式/得分/计时三组）"
$AB eval "(()=>{const r=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('一次翻三张')); if(r) r.click(); return 'r:'+!!r})()" >/dev/null 2>&1
sleep 0.35
$AB eval "(()=>{const v=[...document.querySelectorAll('button')].find(b=>b.textContent==='维加斯(V)'); if(v) v.click(); return 'v:'+!!v})()" >/dev/null 2>&1
sleep 0.35
$AB eval "(()=>{const t=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('计时游戏')); if(t) t.click(); return 't:'+!!t})()" >/dev/null 2>&1
sleep 0.35
$AB eval "(()=>{const ok=[...document.querySelectorAll('button')].find(b=>b.textContent==='确定'); if(!ok) return 'no-ok'; ok.click(); return 'applied'})()" >/dev/null 2>&1
sleep 1
ev "(()=>{const o=window.__xp.getState().solitaireOpts; return o.draw===3 && o.scoring==='vegas' && o.timed===true})()"
ck $? "store solitaireOpts = {draw:3, scoring:vegas, timed:true}"
sleep 1.5
R=$(curl -s "$URL/api/v1/settings" | python3 -c "
import sys,json
d=json.load(sys.stdin)
t=d.get('data',d)
o=t.get('solitaireOpts',{})
print('yes' if o.get('draw')==3 and o.get('scoring')=='vegas' and o.get('timed') is True else 'no')" 2>/dev/null || echo "parse-err")
[ "$R" = "yes" ] && ck 0 "solitaireOpts 经 settings PATCH 落库" || { echo "  got: $R"; ck 1 "solitaireOpts 落库"; }
# 点翻牌堆 → waste 3 张（翻三张生效：状态栏 + 扇形）
$AB eval "(()=>{const st=document.querySelector('[data-sol-stock]'); if(!st) return 'no-stock'; st.click(); return 'clicked'})()" >/dev/null 2>&1
sleep 0.6
ev "(()=>{return document.body.textContent.includes('翻牌: 一次三张')})()"
ck $? "状态栏显示「翻牌: 一次三张」"
$AB eval "window.__xp.getState().closeAll()" >/dev/null 2>&1; sleep 0.4
# 还原默认（不污染后续体验）
$AB eval "window.__xp.getState().setSolitaireOpts({draw:1,scoring:'std',timed:false})" >/dev/null 2>&1
sleep 1.2

echo "== 8. fs-sync 失败事件 → 气泡提示 =="
$AB eval "window.dispatchEvent(new CustomEvent('xp-fs-sync-error',{detail:{op:'write'}}))" >/dev/null 2>&1
sleep 0.6
ev "(()=>{const t=window.__xp.getState().toast; return !!t && String(t.title ?? t).includes('未能保存到服务器')})()"
ck $? "xp-fs-sync-error 事件 → 气泡「未能保存到服务器」"
$AB eval "window.__xp.getState().showToast(null)" >/dev/null 2>&1

echo "== 9. 控制台零 error =="
E=$($AB errors 2>/dev/null | grep -c '"level":60\|error' || true)
[ "$E" = "0" ] && ck 0 "控制台零 error" || { echo "  errors: $E"; $AB errors 2>/dev/null | head -5; ck 1 "控制台零 error"; }

echo ""
echo "RESULT: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ]
