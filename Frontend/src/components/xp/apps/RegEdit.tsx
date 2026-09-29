'use client'

/**
 * 注册表编辑器 — XP regedit.exe
 *  · 左树（五大根键 + +/- 展折）+ 右值列表（名称/类型/数据；(默认) 恒在首行）
 *  · 右键：新建 项/字符串值/二进制值/DWORD 值；修改/重命名/删除；查找
 *  · 编辑对话框：字符串 / DWORD（十六进制·十进制）/ 二进制（十六进制字节）
 *  · 状态栏：当前键路径；数据存 settings.regTree 整树落库（API 持久化）
 */

import React, { useEffect, useMemo, useState } from 'react'
import type { WinState } from '../store'
import { imeEnter } from '../ime-keys'
import { useXP, type CtxItem } from '../store'
import type { RegKey, RegType, RegValue } from '../regseed'
import { MenuBar, XPButton, XPRadio } from '../ui'
import { playClick, playError } from '../sounds'

/* ── 路径工具：根键(虚拟) + 展开路径 ── */
type Sel = string[] /* 从根键名开始的路径段 */

const TYPE_LABEL: Record<RegType, string> = {
  REG_SZ: 'REG_SZ',
  REG_BINARY: 'REG_BINARY',
  REG_DWORD: 'REG_DWORD',
}

const fmtDword = (n: number) => `0x${(n >>> 0).toString(16).padStart(8, '0').toUpperCase()} (${n >>> 0})`

/* 树中按路径找键 */
function findKey(root: RegKey, path: string[]): RegKey | null {
  let cur: RegKey | undefined = root
  for (const seg of path) {
    cur = cur?.children.find((c) => c.name === seg)
    if (!cur) return null
  }
  return cur ?? null
}

/* ── 编辑值对话框 ── */
function ValueDialog({
  title, value, isNew, onCancel, onSave,
}: {
  title: string
  value: RegValue | null /* null = 新建（类型可选） */
  isNew: boolean
  onCancel: () => void
  onSave: (v: RegValue) => void
}) {
  const [name, setName] = useState(value?.name ?? '')
  const [type, setType] = useState<RegType>(value?.type ?? 'REG_SZ')
  const initData = value?.data ?? ''
  const [str, setStr] = useState(value?.type === 'REG_SZ' ? initData : '')
  const [dword, setDword] = useState(value?.type === 'REG_DWORD' ? (parseInt(initData) || 0).toString(16).toUpperCase() : '0')
  const [dwordRadix, setDwordRadix] = useState<'hex' | 'dec'>('hex')
  const [bytes, setBytes] = useState(value?.type === 'REG_BINARY' ? initData : '')
  const [err, setErr] = useState('')

  const save = () => {
    let data = ''
    if (type === 'REG_SZ') {
      data = str
    } else if (type === 'REG_DWORD') {
      const n = dwordRadix === 'hex' ? parseInt(dword || '0', 16) : parseInt(dword || '0', 10)
      if (!isFinite(n) || n < 0 || n > 0xffffffff) { setErr('输入的数值无效') ; playError(); return }
      data = fmtDword(n)
    } else {
      const clean = bytes.replace(/[^0-9a-fA-F]/g, '')
      if (clean.length % 2 !== 0) { setErr('二进制数据必须是偶数个十六进制位') ; playError(); return }
      data = (clean.match(/../g) ?? []).map((b) => b.toUpperCase()).join(' ')
    }
    onSave({ name, type, data })
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/15">
      <div className="w-[340px] bg-[#ece9d8] border border-[#0a3c94] shadow-[4px_4px_14px_rgba(0,0,40,0.4)] select-none">
        <div className="h-[24px] flex items-center px-2 bg-gradient-to-b from-[#2a72c8] to-[#1648a0] text-white text-[11px] font-bold">{title}</div>
        <div className="p-4 text-[11px] space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-[62px] text-right">数值名称(N):</span>
            <input
              className="flex-1 h-[20px] px-[4px] bg-white border border-[#7f9db9] outline-none text-[11px]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          {isNew ? (
            <div className="flex items-center gap-2">
              <span className="w-[62px] text-right">数值类型(T):</span>
              <select
                className="h-[20px] px-[2px] bg-white border border-[#7f9db9] text-[11px] outline-none"
                value={type}
                onChange={(e) => setType(e.target.value as RegType)}
              >
                <option value="REG_SZ">REG_SZ</option>
                <option value="REG_BINARY">REG_BINARY</option>
                <option value="REG_DWORD">REG_DWORD</option>
              </select>
            </div>
          ) : null}
          {type === 'REG_SZ' ? (
            <div className="flex items-center gap-2">
              <span className="w-[62px] text-right">数值数据(D):</span>
              <input
                className="flex-1 h-[20px] px-[4px] bg-white border border-[#7f9db9] outline-none text-[11px]"
                value={str}
                onChange={(e) => setStr(e.target.value)}
              />
            </div>
          ) : null}
          {type === 'REG_DWORD' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-[62px] text-right">数值数据(D):</span>
                <input
                  className="flex-1 h-[20px] px-[4px] bg-white border border-[#7f9db9] outline-none text-[11px] font-mono"
                  value={dword}
                  onChange={(e) => setDword(e.target.value)}
                />
              </div>
              <div className="flex gap-4 pl-[74px]">
                <XPRadio checked={dwordRadix === 'hex'} label="十六进制(H)" onChange={() => {
                  const n = parseInt(dword || '0', dwordRadix === 'hex' ? 16 : 10)
                  setDwordRadix('hex'); setDword(isFinite(n) ? (n >>> 0).toString(16).toUpperCase() : '0')
                }} />
                <XPRadio checked={dwordRadix === 'dec'} label="十进制(D)" onChange={() => {
                  const n = parseInt(dword || '0', dwordRadix === 'hex' ? 16 : 10)
                  setDwordRadix('dec'); setDword(isFinite(n) ? String(n >>> 0) : '0')
                }} />
              </div>
            </>
          ) : null}
          {type === 'REG_BINARY' ? (
            <div className="flex items-start gap-2">
              <span className="w-[62px] text-right pt-[2px]">数值数据(D):</span>
              <textarea
                className="flex-1 h-[44px] px-[4px] py-[2px] bg-white border border-[#7f9db9] outline-none text-[11px] font-mono resize-none"
                value={bytes}
                placeholder="例如: 03 00 00 00"
                onChange={(e) => setBytes(e.target.value)}
              />
            </div>
          ) : null}
          {err ? <div className="text-[#a03030] pl-[74px]">{err}</div> : null}
          <div className="flex justify-end gap-2 pt-1">
            <XPButton onClick={save}>确定</XPButton>
            <XPButton onClick={onCancel}>取消</XPButton>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 项重命名对话框 ── */
function RenameDialog({ old, onCancel, onSave }: { old: string; onCancel: () => void; onSave: (n: string) => void }) {
  const [name, setName] = useState(old)
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/15">
      <div className="w-[300px] bg-[#ece9d8] border border-[#0a3c94] shadow-[4px_4px_14px_rgba(0,0,40,0.4)] select-none">
        <div className="h-[24px] flex items-center px-2 bg-gradient-to-b from-[#2a72c8] to-[#1648a0] text-white text-[11px] font-bold">重命名</div>
        <div className="p-4 text-[11px] space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-[42px] text-right">新名称:</span>
            <input
              className="flex-1 h-[20px] px-[4px] bg-white border border-[#7f9db9] outline-none text-[11px]"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { imeEnter(e, (v) => { if (v.trim()) onSave(v.trim()) }) }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <XPButton disabled={!name.trim()} onClick={() => onSave(name.trim())}>确定</XPButton>
            <XPButton onClick={onCancel}>取消</XPButton>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 查找对话框（键/值/数据；仅名称级匹配，逐项跳转） ── */
function FindDialog({ onCancel, onFound }: { onCancel: () => void; onFound: (keyPath: string[], valueName?: string) => void }) {
  const regTree = useXP((s) => s.regTree)
  const [q, setQ] = useState('')
  const [where, setWhere] = useState<'all' | 'keys' | 'vals'>('all')
  const [msg, setMsg] = useState('')

  const find = (v0?: string) => {
    const src = v0 ?? q
    if (!src.trim()) return
    const needle = src.trim().toLowerCase()
    const box = { hit: null as { keyPath: string[]; valueName?: string } | null }
    const walk = (node: RegKey, path: string[]) => {
      if (box.hit) return
      if ((where !== 'vals') && node.name.toLowerCase().includes(needle) && path.length > 0) box.hit = { keyPath: path }
      if (!box.hit && where !== 'keys') {
        for (const v of node.values) {
          if (v.name.toLowerCase().includes(needle) || v.data.toLowerCase().includes(needle)) { box.hit = { keyPath: path, valueName: v.name }; break }
        }
      }
      for (const c of node.children) walk(c, [...path, c.name])
    }
    walk(regTree, [])
    if (box.hit) { onFound(box.hit.keyPath, box.hit.valueName); onCancel() }
    else setMsg(`Windows 找不到 "${q}"。`)
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/15">
      <div className="w-[330px] bg-[#ece9d8] border border-[#0a3c94] shadow-[4px_4px_14px_rgba(0,0,40,0.4)] select-none">
        <div className="h-[24px] flex items-center px-2 bg-gradient-to-b from-[#2a72c8] to-[#1648a0] text-white text-[11px] font-bold">查找</div>
        <div className="p-4 text-[11px] space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-[62px] text-right">查找目标(N):</span>
            <input
              className="flex-1 h-[20px] px-[4px] bg-white border border-[#7f9db9] outline-none text-[11px]"
              value={q}
              autoFocus
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { imeEnter(e, find) }}
            />
          </div>
          <div className="flex gap-4 pl-[74px]">
            <XPRadio checked={where === 'all'} label="全部(A)" onChange={() => setWhere('all')} />
            <XPRadio checked={where === 'keys'} label="项(K)" onChange={() => setWhere('keys')} />
            <XPRadio checked={where === 'vals'} label="值(V)" onChange={() => setWhere('vals')} />
          </div>
          {msg ? <div className="text-[#a03030] pl-[74px]">{msg}</div> : null}
          <div className="flex justify-end gap-2">
            <XPButton onClick={find}>查找下一个(F)</XPButton>
            <XPButton onClick={onCancel}>取消</XPButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegEdit({ win }: { win: WinState }) {
  const regTree = useXP((s) => s.regTree)
  const setRegTree = useXP((s) => s.setRegTree)
  const showToast = useXP((s) => s.showToast)
  const openCtx = useXP((s) => s.openCtx)
  const closeWindow = useXP((s) => s.closeWindow)
  const setRect = useXP((s) => s.setRect)

  const [sel, setSel] = useState<Sel>(['HKEY_LOCAL_MACHINE', 'SOFTWARE', 'Microsoft', 'Windows NT', 'CurrentVersion'])
  const [expanded, setExpanded] = useState<Set<string>>(new Set([
    'HKEY_LOCAL_MACHINE', 'HKEY_LOCAL_MACHINE/SOFTWARE', 'HKEY_LOCAL_MACHINE/SOFTWARE/Microsoft',
    'HKEY_CURRENT_USER',
  ]))
  const [selValue, setSelValue] = useState<string | null>(null)
  /* 弹层状态 */
  const [dlg, setDlg] = useState<
    | { kind: 'edit'; value: RegValue | null; isNew: boolean }
    | { kind: 'newkey' }
    | { kind: 'rename-key'; path: string[] }
    | { kind: 'rename-value'; name: string }
    | { kind: 'find' }
    | null
  >(null)

  useEffect(() => {
    const w = 640, h = 470
    setRect(win.id, { x: Math.max(6, Math.round((window.innerWidth - w) / 2 - 60)), y: Math.max(4, Math.round((window.innerHeight - 30 - h) / 2)), w, h })
  }, [setRect, win.id])

  const selKey = useMemo(() => findKey(regTree, sel), [regTree, sel])
  const pathStr = `我的电脑\\${sel.join('\\')}`

  /* ── 树操作（不可变更新：整树深拷贝后改路径，setRegTree 落库） ── */
  const mutate = (fn: (root: RegKey) => void) => {
    const next = structuredClone(regTree)
    fn(next)
    setRegTree(next)
  }

  const newSubkey = () => { setDlg({ kind: 'newkey' }) }
  const newValue = (type: RegType) => { setDlg({ kind: 'edit', value: { name: '', type, data: type === 'REG_DWORD' ? fmtDword(0) : '' }, isNew: true }) }

  const doNewKey = (name: string) => {
    mutate((root) => {
      const key = findKey(root, sel)
      if (key) key.children.push({ name, children: [], values: [] })
    })
    setExpanded((e) => new Set([...e, sel.join('/')]))
    playClick()
  }

  const doSaveValue = (v: RegValue, old: RegValue | null) => {
    mutate((root) => {
      const key = findKey(root, sel)
      if (!key) return
      if (old) {
        const i = key.values.indexOf(old)
        if (i >= 0) key.values[i] = v
      } else {
        key.values.push(v)
      }
    })
    playClick()
  }

  const deleteKey = (path: string[]) => {
    const parentPath = path.slice(0, -1)
    const name = path[path.length - 1]
    mutate((root) => {
      const parent = findKey(root, parentPath)
      if (parent) parent.children = parent.children.filter((c) => c.name !== name)
    })
    if (sel.join('/') === path.join('/')) setSel(parentPath.length ? parentPath : [])
    playClick()
  }

  const deleteValue = (name: string) => {
    mutate((root) => {
      const key = findKey(root, sel)
      if (key) key.values = key.values.filter((v) => v.name !== name)
    })
    setSelValue(null)
    playClick()
  }

  const doRenameKey = (path: string[], newName: string) => {
    mutate((root) => {
      const key = findKey(root, path)
      if (key) key.name = newName
    })
    if (sel.join('/') === path.join('/')) setSel([...path.slice(0, -1), newName])
    playClick()
  }

  const doRenameValue = (oldName: string, newName: string) => {
    mutate((root) => {
      const key = findKey(root, sel)
      if (key) {
        const v = key.values.find((x) => x.name === oldName)
        if (v) v.name = newName
      }
    })
    if (selValue === oldName) setSelValue(newName)
    playClick()
  }

  /* ── 树节点递归渲染 ── */
  const renderNode = (node: RegKey, path: string[], depth: number): React.ReactNode => {
    const p = [...path, node.name]
    const key = p.join('/')
    const isOpen = expanded.has(key)
    const hasKids = node.children.length > 0
    const isSel = sel.join('/') === key
    return (
      <div key={key}>
        <div
          className={`flex items-center gap-[3px] h-[18px] pr-2 cursor-pointer text-[11px] ${isSel ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8f0fb]'}`}
          onClick={() => { setSel(p); setSelValue(null); if (hasKids) setExpanded((e) => new Set([...e, key])) }}
          onContextMenu={(e) => {
            e.preventDefault()
            setSel(p)
            const items: CtxItem[] = [
              { label: hasKids ? (isOpen ? '折叠(A)' : '展开(E)') : '展开(E)', disabled: !hasKids, onClick: () => setExpanded((e2) => { const n = new Set(e2); if (isOpen) { n.delete(key) } else { n.add(key) } ; return n }) },
              { separator: true },
              { label: '新建(N)', submenu: [{ label: '项(K)', onClick: newSubkey }, { separator: true }, { label: '字符串值(S)', onClick: () => newValue('REG_SZ') }, { label: '二进制值(B)', onClick: () => newValue('REG_BINARY') }, { label: 'DWORD 值(D)', onClick: () => newValue('REG_DWORD') }] },
              { separator: true },
              { label: '查找(F)...', onClick: () => setDlg({ kind: 'find' }) },
              { label: '重命名(M)', onClick: () => setDlg({ kind: 'rename-key', path: p }) },
              { label: '删除(D)', onClick: () => deleteKey(p) },
              { separator: true },
              { label: '复制项名称(C)', onClick: () => navigator.clipboard?.writeText(`我的电脑\\${p.join('\\')}`).catch(() => {}) },
            ]
            openCtx(e.clientX, e.clientY, items)
          }}
        >
          <button
            type="button"
            className="w-[13px] h-[13px] shrink-0 flex items-center justify-center bg-white border border-[#8c8c8c] text-[8px] leading-none text-[#1a1a1a] hover:border-[#316ac5]"
            onClick={(e) => { e.stopPropagation(); setExpanded((s) => { const n = new Set(s); if (isOpen) { n.delete(key) } else { n.add(key) } ; return n }) }}
          >
            {isOpen ? '−' : '+'}
          </button>
          {/* 文件夹图标（打开/闭合） */}
          <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
            {isOpen ? (
              <>
                <path d="M1.5 4.5 L5 4.5 L6 3 L10 3 L10.5 4.5 L14.5 4.5 L14.5 12.5 L1.5 12.5 Z" fill="#f7d16f" stroke="#a8863a" strokeWidth="0.8" />
                <path d="M1.5 6.5 L14.5 6.5" stroke="#a8863a" strokeWidth="0.6" />
              </>
            ) : (
              <path d="M1.5 4.5 L5 4.5 L6 3 L10 3 L10.5 4.5 L14.5 4.5 L14.5 12.5 L1.5 12.5 Z" fill="#f7d16f" stroke="#a8863a" strokeWidth="0.8" />
            )}
          </svg>
          <span className="truncate">{node.name}</span>
        </div>
        {isOpen ? node.children.map((c) => renderNode(c, p, depth + 1)) : null}
      </div>
    )
  }

  const values = selKey?.values ?? []

  /* 键右键（右值列表空白处） */
  const paneCtx = (e: React.MouseEvent) => {
    e.preventDefault()
    openCtx(e.clientX, e.clientY, [
      { label: '新建(N)', submenu: [{ label: '项(K)', onClick: newSubkey }, { separator: true }, { label: '字符串值(S)', onClick: () => newValue('REG_SZ') }, { label: '二进制值(B)', onClick: () => newValue('REG_BINARY') }, { label: 'DWORD 值(D)', onClick: () => newValue('REG_DWORD') }] },
    ])
  }

  const valueCtx = (e: React.MouseEvent, v: RegValue) => {
    e.preventDefault()
    setSelValue(v.name)
    const items: CtxItem[] = [
      { label: '修改(M)', bold: true, onClick: () => setDlg({ kind: 'edit', value: v, isNew: false }) },
    ]
    if (v.name) {
      items.push({ label: '重命名(P)', onClick: () => setDlg({ kind: 'rename-value', name: v.name }) })
      items.push({ label: '删除(D)', onClick: () => deleteValue(v.name) })
    }
    openCtx(e.clientX, e.clientY, items)
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px] relative">
      <MenuBar
        menus={[
          {
            label: '文件(F)',
            items: [
              { label: '导出(E)...', onClick: () => showToast(`已导出 ${pathStr}.reg（复刻版说明）`) },
              { separator: true },
              { label: '退出(X)', onClick: () => closeWindow(win.id) },
            ],
          },
          {
            label: '编辑(E)',
            items: [
              { label: '新建项(K)', onClick: newSubkey },
              { label: '新建字符串值(S)', onClick: () => newValue('REG_SZ') },
              { label: '新建 DWORD 值(D)', onClick: () => newValue('REG_DWORD') },
              { separator: true },
              { label: '修改(M)', accelerator: 'Enter', disabled: selValue === null && values.length === 0, onClick: () => {
                const v = values.find((x) => x.name === selValue) ?? values.find((x) => x.name === '')
                if (v) setDlg({ kind: 'edit', value: v, isNew: false })
              } },
              { label: '重命名(R)', disabled: !selValue, onClick: () => selValue && setDlg({ kind: 'rename-value', name: selValue }) },
              { label: '删除(L)', disabled: !selValue, onClick: () => selValue && deleteValue(selValue) },
            ],
          },
          {
            label: '查看(V)',
            items: [
              { label: '状态栏(B)', checked: true, onClick: () => {} },
            ],
          },
          {
            label: '收藏(A)',
            items: [
              { label: '添加到收藏夹(A)...', onClick: () => showToast(`已将 ${sel[sel.length - 1] ?? '我的电脑'} 添加到收藏夹（复刻版说明）`) },
              { label: '删除收藏夹(D)...', disabled: true },
            ],
          },
          {
            label: '帮助(H)',
            items: [
              { label: '帮助主题(H)', onClick: () => useXP.getState().openApp('helpcenter', {}) },
              { separator: true },
              { label: '关于注册表编辑器(A)', onClick: () => useXP.getState().openApp('about', { title: '关于"注册表编辑器"', text: '注册表编辑器（Web 复刻版）\n版本 5.1 (Build 2600)\n\n五大根键 + 值编辑 + 查找 + 持久化。\n请在虚拟机里 irresponsible editing——哦不，\n这里改坏了刷新就能重置数据库。' }) },
            ],
          },
        ]}
      />

      {/* 主体：左树 + 右值 */}
      <div className="flex-1 min-h-0 flex gap-[2px] p-[2px]">
        <div className="w-[240px] shrink-0 xp-sunken bg-white overflow-auto xp-thin-scroll" data-regtree="1">
          {/* 虚拟根「我的电脑」 */}
          <div
            className={`flex items-center gap-[3px] h-[18px] pr-2 cursor-pointer ${sel.length === 0 ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8f0fb]'}`}
            onClick={() => { setSel([]); setSelValue(null); setExpanded((e) => new Set([...e, '__root__'])) }}
          >
            <span className="w-[13px] shrink-0" />
            <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
              <rect x="1.5" y="4" width="13" height="8" rx="1" fill="#c8c8c8" stroke="#666" strokeWidth="0.8" />
              <rect x="1.5" y="2.5" width="13" height="3" rx="1" fill="#e8e8e8" stroke="#666" strokeWidth="0.8" />
              <circle cx="12.5" cy="8" r="0.7" fill="#2a8a2a" />
            </svg>
            <span>我的电脑</span>
          </div>
          {regTree.children.map((c) => renderNode(c, [], 1))}
        </div>
        <div className="w-[4px] bg-[#ece9d8] cursor-ew-resize" />
        <div className="flex-1 min-w-0 xp-sunken bg-white overflow-auto xp-thin-scroll" onContextMenu={paneCtx} data-regvals="1">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#ece9d8] sticky top-0">
                <th className="text-left font-normal border-b border-[#d8d5c8] px-2 py-[3px]">名称</th>
                <th className="text-left font-normal border-b border-[#d8d5c8] px-2 py-[3px] w-[86px]">类型</th>
                <th className="text-left font-normal border-b border-[#d8d5c8] px-2 py-[3px]">数据</th>
              </tr>
            </thead>
            <tbody>
              {selKey ? values.map((v) => {
                const name = v.name === '' ? '(默认)' : v.name
                const isSel = selValue === v.name && v.name !== ''
                const isDefault = v.name === ''
                return (
                  <tr
                    key={v.name}
                    className={`${isSel ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8f0fb]'} ${isDefault ? 'text-[#444]' : ''}`}
                    onClick={() => { setSelValue(v.name === '' ? null : v.name); playClick() }}
                    onDoubleClick={() => setDlg({ kind: 'edit', value: v, isNew: false })}
                    onContextMenu={(e) => valueCtx(e, v)}
                  >
                    <td className="px-2 py-[2px] border-b border-[#f0ede4] flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
                        {v.type === 'REG_SZ' ? (
                          <path d="M1 3 h6 l2 2 v4 h-8 z" fill="#fff" stroke="#8a8aa0" strokeWidth="0.8" />
                        ) : v.type === 'REG_DWORD' ? (
                          <rect x="1.5" y="2" width="9" height="8" rx="1" fill="#e8e8f8" stroke="#5a5aa0" strokeWidth="0.8" />
                        ) : (
                          <rect x="1.5" y="2" width="9" height="8" rx="1" fill="#e8f8e8" stroke="#3a8a3a" strokeWidth="0.8" />
                        )}
                      </svg>
                      <span className="truncate">{name}</span>
                    </td>
                    <td className="px-2 py-[2px] border-b border-[#f0ede4]">{TYPE_LABEL[v.type]}</td>
                    <td className="px-2 py-[2px] border-b border-[#f0ede4] font-mono truncate">{v.data || '(数值未设置)'}</td>
                  </tr>
                )
              }) : (
                <tr><td className="px-2 py-4 text-[#888] text-center" colSpan={3}>我的电脑（无法编辑虚拟根；请选择一个根键）</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 状态栏 */}
      <div className="h-[20px] flex items-center px-2 border-t border-[#a8a498] bg-[#ece9d8] text-[11px] truncate">
        {pathStr}
      </div>

      {/* 弹层 */}
      {dlg?.kind === 'edit' ? (
        <ValueDialog
          title={dlg.isNew ? `新建${dlg.value?.type === 'REG_DWORD' ? ' DWORD 值' : dlg.value?.type === 'REG_BINARY' ? '二进制值' : '字符串值'}` : `编辑${dlg.value?.type === 'REG_DWORD' ? ' DWORD' : dlg.value?.type === 'REG_BINARY' ? '二进制' : '字符串'}`}
          value={dlg.value}
          isNew={dlg.isNew}
          onCancel={() => setDlg(null)}
          onSave={(v) => { doSaveValue(v, dlg.isNew ? null : dlg.value); setDlg(null) }}
        />
      ) : null}
      {dlg?.kind === 'newkey' ? (
        <RenameDialog old="新项 #1" onCancel={() => setDlg(null)} onSave={(n) => { doNewKey(n); setDlg(null) }} />
      ) : null}
      {dlg?.kind === 'rename-key' ? (
        <RenameDialog old={dlg.path[dlg.path.length - 1]} onCancel={() => setDlg(null)} onSave={(n) => { doRenameKey(dlg.path, n); setDlg(null) }} />
      ) : null}
      {dlg?.kind === 'rename-value' ? (
        <RenameDialog old={dlg.name} onCancel={() => setDlg(null)} onSave={(n) => { doRenameValue(dlg.name, n); setDlg(null) }} />
      ) : null}
      {dlg?.kind === 'find' ? (
        <FindDialog
          onCancel={() => setDlg(null)}
          onFound={(keyPath, valueName) => {
            /* 展开路径上全部祖先 */
            setExpanded((e) => {
              const n = new Set(e)
              for (let i = 1; i <= keyPath.length; i++) n.add(keyPath.slice(0, i).join('/'))
              return n
            })
            setSel(keyPath)
            setSelValue(valueName ?? null)
          }}
        />
      ) : null}
    </div>
  )
}
