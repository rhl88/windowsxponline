#!/usr/bin/env python3
"""d22 API 冒烟：王小明下线 + Administrator 密码登录 + v1→v2 快照迁移"""
import json, urllib.request, urllib.error, sys

BASE = 'http://localhost:3000/api/v1'
PASS, FAIL = 0, 0

def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {}

def check(name, cond, detail=''):
    global PASS, FAIL
    if cond: PASS += 1; print(f'  PASS  {name}')
    else: FAIL += 1; print(f'  FAIL  {name}  {detail}')

# ── 1. GET /accounts：首次读取触发 v1→v2 迁移 ──
code, r = call('GET', '/accounts')
accs = r.get('data', [])
names = [a['name'] for a in accs]
admin = next((a for a in accs if a['name'] == 'Administrator'), None)
check('GET /accounts 200', code == 200, f'code={code}')
check('帐户列表=Administrator+Guest（王小明已移除）', names == ['Administrator', 'Guest'], f'names={names}')
check('Administrator hasPassword=true', bool(admin and admin.get('hasPassword')), f'admin={admin}')
check('Administrator 带密码提示', admin and admin.get('hint') == 'Windows XP 的发布年份', f'hint={admin and admin.get("hint")}')
check('响应无密码字段', all('password' not in a for a in accs))

# ── 2. 快照落盘核验（迁移立即持久化）──
st = json.load(open('/home/z/my-project/db/xp-state.json'))
dns = None
for c in st['fsTree']['children']:
    if c['name'] == '本地磁盘 (C:)':
        dns = next((d for d in c['children'] if d['name'] == 'Documents and Settings'), None)
homes = [c['name'] for c in dns['children']] if dns else []
check('快照 version=2', st.get('version') == 2, f"version={st.get('version')}")
check('快照无王小明帐户记录', all(a['name'] != '王小明' for a in st.get('accounts', [])))
check('王小明主目录已移除', '王小明' not in homes, f'homes={homes}')
admin_rec = next((a for a in st['accounts'] if a['name'] == 'Administrator'), None)
check('快照 Administrator 密码=2001', admin_rec and admin_rec.get('password') == '2001', f"pw={admin_rec and admin_rec.get('password')!r}")
check('Administrator 主目录保留', 'Administrator' in homes and 'Guest' in homes and 'All Users' in homes, f'homes={homes}')

# ── 3. 登录验证 ──
code, r = call('POST', '/accounts/login', {'name': 'Administrator', 'password': '0000'})
check('Administrator 错密码 → bad-password', r.get('data', {}).get('ok') is False and r['data'].get('reason') == 'bad-password', f'r={r}')
code, r = call('POST', '/accounts/login', {'name': 'Administrator', 'password': '2001'})
check('Administrator+2001 登录成功', r.get('data', {}).get('ok') is True and r['data']['account']['name'] == 'Administrator', f'r={r}')
code, r = call('POST', '/accounts/login', {'name': '王小明', 'password': '2001'})
check('王小明 → no-user', r.get('data', {}).get('reason') == 'no-user', f'r={r}')

# ── 4. /state 密码零泄漏（此时会话应为 Administrator——最后一次成功登录）──
code, r = call('GET', '/state')
data = json.dumps(r.get('data', {}), ensure_ascii=False)
check('GET /state 不含密码明文', '"password"' not in data)
check('GET /state 无王小明', '王小明' not in data)
check('会话用户=Administrator', r.get('data', {}).get('session', {}).get('user') == 'Administrator', f"session={r.get('data', {}).get('session', {}).get('user')}")

code, r = call('POST', '/accounts/login', {'name': 'Guest', 'password': ''})
check('Guest 空密码登录成功', r.get('data', {}).get('ok') is True, f'r={r}')
# 还原会话为 Administrator
_, _ = call('POST', '/accounts/login', {'name': 'Administrator', 'password': '2001'})

# ── 5. 迁移幂等：再读一次不反复改 ──
code, r = call('GET', '/accounts')
check('重复读取稳定（幂等）', [a['name'] for a in r['data']] == ['Administrator', 'Guest'])

print(f'\n== 冒烟结果: {PASS} pass / {FAIL} fail ==')
sys.exit(1 if FAIL else 0)
