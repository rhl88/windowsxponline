#!/usr/bin/env python3
"""b3 批 API 冒烟：密码哈希 + 帐户权限数据 + 回收站配额"""
import json, urllib.request, time

URL = 'http://localhost:3000/api/v1'
PASS = FAIL = 0

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(f'{URL}{path}', data=data, method=method, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {'_status': e.code, **json.loads(e.read() or b'{}')}

def ck(cond, name, extra=''):
    global PASS, FAIL
    if cond:
        PASS += 1; print(f'  PASS  {name}')
    else:
        FAIL += 1; print(f'  FAIL  {name} {extra}')

def read_state_file():
    with open('/home/z/my-project/db/xp-state.json') as f:
        return json.load(f)

print('== 1. 密码哈希迁移 ==')
# 触发一次登录（服务端 readState 迁移 + 登录验证哈希通路）
r = req('POST', '/accounts/login', {'name': 'Administrator', 'password': '2001'})
ck(r.get('data', {}).get('ok') is True, 'Administrator/2001 哈希格式验证通过')
st = read_state_file()
admin = next((a for a in st['accounts'] if a['name'] == 'Administrator'), None)
ck(admin and admin['password'].startswith('sha256$') and len(admin['password'].split('$')) == 3, 'db 中 Administrator 密码已哈希化（sha256$salt$hash）', f"got: {admin['password'][:20] if admin else 'None'}")
ck('2001' not in json.dumps(st.get('accounts', [])), '帐户记录中无明文密码')

r = req('POST', '/accounts/login', {'name': 'Administrator', 'password': '0000'})
ck(r.get('data', {}).get('reason') == 'bad-password', '错密码 → bad-password（哈希比较）')

print('== 2. 创建/改密均落哈希 ==')
req('DELETE', '/accounts', {'name': 'e2e受限'})
r = req('POST', '/accounts', {'name': 'e2e受限', 'password': 'abc123', 'type': 'user', 'avatar': 'avatar-fish'})
ck(r.get('_status') == 201 or r.get('data', {}).get('name') == 'e2e受限', 'POST 创建受限帐户')
st = read_state_file()
acc = next((a for a in st['accounts'] if a['name'] == 'e2e受限'), None)
ck(acc and acc['password'].startswith('sha256$'), '创建帐户密码落库即哈希')
r = req('POST', '/accounts/login', {'name': 'e2e受限', 'password': 'abc123'})
ck(r.get('data', {}).get('ok') is True, '受限帐户哈希密码验证通过')
r = req('PATCH', '/accounts', {'name': 'e2e受限', 'password': 'newpw456'})
ck(not r.get('_status'), 'PATCH 改密 200')
st = read_state_file()
acc = next((a for a in st['accounts'] if a['name'] == 'e2e受限'), None)
ck(acc and acc['password'].startswith('sha256$') and 'newpw456' not in acc['password'], '改密后仍为哈希（明文不落库）')
r = req('POST', '/accounts/login', {'name': 'e2e受限', 'password': 'newpw456'})
ck(r.get('data', {}).get('ok') is True, '新密码验证通过')

print('== 3. GET /state 零密码泄漏 ==')
r = req('GET', '/state')
raw = json.dumps(r)
ck('password' not in raw and 'sha256$' not in raw and 'abc123' not in raw and 'newpw456' not in raw, '/state 响应无密码/哈希泄漏')

print('== 4. 回收站配额（上限 20） ==')
# 在桌面建 24 个文件再全删
desk = ['本地磁盘 (C:)', 'Documents and Settings', 'Administrator', '桌面']
for i in range(24):
    node = {'name': f'配额测试{i:02d}.txt', 'kind': 'file', 'icon': 'text', 'content': f'x{i}', 'size': '1 KB', 'type': '文本文档'}
    r = req('POST', '/fs', {'parentPath': desk, 'node': node})
st = read_state_file()
def find(root, path):
    cur = root
    for seg in path:
        cur = next((c for c in (cur.get('children') or []) if c['name'] == seg), None)
        if not cur: return None
    return cur
desknode = find(st['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings', 'Administrator', '桌面'])
n_before = len([c for c in desknode['children'] if c['name'].startswith('配额测试')]) if desknode else 0
ck(n_before == 24, f'桌面预置 24 个测试文件（实际 {n_before}）')
paths = [[*desk, f'配额测试{i:02d}.txt'] for i in range(24)]
r = req('DELETE', '/fs', {'paths': paths})
st = read_state_file()
n_rec = len(st['recycleBin'])
ck(n_rec == 20, f'回收站裁剪到上限 20（实际 {n_rec}）')
ck(st['recycleBin'][0]['name'] == '配额测试04.txt', '最旧 4 条被挤出（首条=配额测试04）', f"got {st['recycleBin'][0]['name'] if st['recycleBin'] else 'None'}")
# 清空回收站恢复现场
req('POST', '/recycle', {'key': None})
st = read_state_file()
ck(len(st['recycleBin']) == 0, '清空回收站还原现场')

print('== 5. 收尾清理 ==')
r = req('POST', '/accounts/login', {'name': 'Administrator', 'password': '2001'})
ck(r.get('data', {}).get('ok') is True, '还原会话 Administrator')
r = req('DELETE', '/accounts', {'name': 'e2e受限'})
ck(not r.get('_status'), '删除测试帐户')
st = read_state_file()
ck(not any(a['name'] == 'e2e受限' for a in st['accounts']), '测试帐户已清理')

print(f'\nRESULT: {PASS} PASS / {FAIL} FAIL')
exit(0 if FAIL == 0 else 1)
