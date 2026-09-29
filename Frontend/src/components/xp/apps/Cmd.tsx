'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { WinState } from '../store'
import { imeEnter } from '../ime-keys'
import { useXP, xpNow } from '../store'
import { resolvePath, userHomePath, type FSNode } from '../fs'
import { openEditCtx } from '../ctx-menus'
import { auxFetch } from '@/lib/api/aux-api'

/* 命令提示符：实时虚拟文件系统 + 真实网络命令（ping/ipconfig） */

interface Line {
  text: string
  cls?: string
}

function cwdDisplay(cwd: string[]): string {
  if (cwd.length === 0) return 'C:\\'
  const rest = cwd.slice(1)
  return `C:\\${rest.join('\\')}`
}

export default function Cmd({ win }: { win: WinState }) {
  const fsTree = useXP((s) => s.fsTree)
  /* 初始目录与环境变量按登录帐户解析（每帐户独立 HOME/USERNAME/USERPROFILE） */
  const sessionUser = useXP((s) => s.sessionUser)
  const HOME = useMemo(() => userHomePath(sessionUser), [sessionUser])
  const [lines, setLines] = useState<Line[]>([
    { text: 'Microsoft Windows XP [版本 5.1.2600]', cls: 'dim' },
    { text: '(C) 版权所有 1985-2001 Microsoft Corp. —— Web 复刻版', cls: 'dim' },
    { text: '' },
  ])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [history, setHistory] = useState<string[]>([])
  const [hIdx, setHIdx] = useState(-1)
  const [cwd, setCwd] = useState<string[]>(() => [...HOME])
  /* Tab 补全状态（循环匹配游标；prefix 变化或输入字符时重置） */
  const tabRef = useRef<{ prefix: string; matches: string[]; idx: number } | null>(null)
  const [busy, setBusy] = useState(false)
  /* set 命令环境变量（XP 经典默认环境，局部会话；用户相关项按登录帐户派生） */
  const envRef = useRef<Record<string, string>>({})
  useEffect(() => {
    envRef.current = {
      ALLUSERSPROFILE: 'C:\\Documents and Settings\\All Users',
      APPDATA: `C:\\Documents and Settings\\${sessionUser}\\Application Data`,
      CLIENTNAME: 'Console',
      CommonProgramFiles: 'C:\\Program Files\\Common Files',
      COMPUTERNAME: 'XP-WEB-REPLICA',
      ComSpec: 'C:\\WINDOWS\\system32\\cmd.exe',
      NUMBER_OF_PROCESSORS: '1',
      OS: 'Windows_NT',
      Path: 'C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem',
      PATHEXT: '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH',
      PROCESSOR_ARCHITECTURE: 'x86',
      PROCESSOR_IDENTIFIER: 'x86 Family 15 Model 2 Stepping 9, GenuineIntel',
      PROCESSOR_LEVEL: '15',
      PROCESSOR_REVISION: '0209',
      ProgramFiles: 'C:\\Program Files',
      PROMPT: '$P$G',
      SESSIONNAME: 'Console',
      SystemDrive: 'C:',
      SystemRoot: 'C:\\WINDOWS',
      TEMP: 'C:\\DOCUME~1\\ADMINI~1\\LOCALS~1\\Temp',
      TMP: 'C:\\DOCUME~1\\ADMINI~1\\LOCALS~1\\Temp',
      USERDOMAIN: 'XP-WEB-REPLICA',
      USERNAME: sessionUser,
      USERPROFILE: `C:\\Documents and Settings\\${sessionUser}`,
      windir: 'C:\\WINDOWS',
    }
  }, [sessionUser])
  /* color 命令控制台配色 + prompt 命令自定义提示符 */
  const [color, setColor] = useState<{ bg: string; fg: string }>({ bg: '#000000', fg: '#e8e8e8' })
  const [promptTpl, setPromptTpl] = useState('$P$G')

  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [lines])

  const out = (text: string, cls?: string) => setLines((ls) => [...ls, { text, cls }])

  const cmdDir = (arg: string) => {
    const rel = arg.replace(/^[Cc]:\\/, '').split(/[\\/]/).filter(Boolean)
    const dirNode = arg ? resolvePath([...cwd, ...rel], fsTree) : resolvePath(cwd, fsTree)
    if (!dirNode) {
      out('系统找不到指定的路径。', 'err')
      out('')
      return
    }
    const children = dirNode.children ?? []
    const display = arg ? cwdDisplay([...cwd, ...rel]) : cwdDisplay(cwd)
    out(' 驱动器 C 中的卷没有标签。')
    out(' 卷的序列号是 2001-1025-XP')
    out('')
    out(` ${display.replace(/\\$/, '')} 的目录`)
    out('')
    let files = 0
    let folders = 0
    let bytes = 0
    const rows: Array<[string, string]> = []
    for (const c of children) {
      if (c.kind === 'file') {
        files++
        const b = c.content ? c.content.length : parseInt((c.size ?? '1').replace(/\D/g, '') || '1', 10) * 1024
        bytes += b
        rows.push([`2001-10-25  10:00    ${String(b).padStart(14)} `, c.name])
      } else {
        folders++
        rows.push([`2001-10-25  09:00    <DIR>          `, c.name])
      }
    }
    rows.forEach(([a, b]) => out(a + b))
    out(`${' '.repeat(27)}${files} 个文件    ${bytes.toLocaleString('en-US')} 字节`)
    out(`${' '.repeat(27)}${folders} 个目录  4,294,967,295 可用字节`)
    out('')
  }

  const cmdCd = (arg: string) => {
    if (!arg || arg === '.') return
    if (arg === '\\' || arg === '/') {
      setCwd(['本地磁盘 (C:)'])
      return
    }
    if (arg === '..') {
      setCwd((c) => (c.length > 1 ? c.slice(0, -1) : c))
      return
    }
    const target = arg.replace(/^C:\\/i, '').split(/[\\/]/).filter(Boolean)
    const abs = target[0] === '本地磁盘 (C:)' ? target : [...cwd, ...target]
    const node = resolvePath(abs, fsTree)
    if (node && node.kind !== 'file') {
      setCwd(abs)
    } else {
      out('系统找不到指定的路径。', 'err')
    }
  }

  const cmdType = (arg: string) => {
    if (!arg) {
      out('句法不正确。', 'err')
      return
    }
    const node = resolvePath([...cwd, ...arg.split(/[\\/]/).filter(Boolean)], fsTree)
    if (!node || node.kind !== 'file') {
      out(`系统找不到指定的文件。`, 'err')
      return
    }
    const content = node.content ?? '(二进制文件，无法显示)'
    content.split(/\r?\n/).forEach((l) => out(l))
    out('')
  }

  const cmdDel = (arg: string) => {
    if (!arg) {
      out('句法不正确。', 'err')
      return
    }
    const p = [...cwd, ...arg.split(/[\\/]/).filter(Boolean)]
    const node = resolvePath(p, fsTree)
    if (!node) {
      out('系统找不到指定的文件。', 'err')
      return
    }
    useXP.getState().fsDelete([p])
    out(`已删除 ${arg}（移入回收站，可用 explorer 还原）`, 'dim')
    out('')
  }

  const cmdCopy = (args: string) => {
    const parts = args.split(/\s+/).filter(Boolean)
    if (parts.length < 1) {
      out('命令语法不正确。', 'err')
      return
    }
    const src = parts[0]
    const p = [...cwd, ...src.split(/[\\/]/).filter(Boolean)]
    const node = resolvePath(p, fsTree)
    if (!node || node.kind !== 'file') {
      out('系统找不到指定的文件。', 'err')
      return
    }
    useXP.getState().fsDuplicate(p)
    out(`已复制       1 个文件。（副本已放入当前目录）`, 'dim')
    out('')
  }

  const cmdTree = () => {
    const node = resolvePath(cwd, fsTree)
    out(cwdDisplay(cwd).replace(/\\$/, ''))
    const walk = (n: FSNode, prefix: string) => {
      const ch = n.children ?? []
      ch.forEach((c, i) => {
        const last = i === ch.length - 1
        out(`${prefix}${last ? '└─' : '├─'}${c.name}`)
        if (c.children) walk(c, `${prefix}${last ? '   ' : '│  '}`)
      })
    }
    if (node) walk(node, '')
    out('')
  }

  /* ── md/mkdir：真实创建文件夹 ── */
  const cmdMkdir = (arg: string) => {
    if (!arg) {
      out('命令语法不正确。', 'err')
      return
    }
    const name = arg.replace(/^"|"$/g, '')
    useXP.getState().fsCreateFolder(cwd, name)
    out('')
  }

  /* ── rd/rmdir：仅空目录（XP 无 /S 时的真实限制） ── */
  const cmdRmdir = (arg: string) => {
    if (!arg) {
      out('命令语法不正确。', 'err')
      return
    }
    const p = [...cwd, ...arg.replace(/^"|"$/g, '').split(/[\\/]/).filter(Boolean)]
    const node = resolvePath(p, fsTree)
    if (!node || node.kind === 'file') {
      out('系统找不到指定的文件。', 'err')
      return
    }
    if ((node.children ?? []).length > 0) {
      out('目录不是空的。', 'err')
      out('')
      return
    }
    useXP.getState().fsDeletePermanent([p])
    out('')
  }

  /* ── ren/rename：真实重命名 ── */
  const cmdRen = (args: string) => {
    const parts = args.split(/\s+/).filter(Boolean)
    if (parts.length < 2) {
      out('命令语法不正确。', 'err')
      return
    }
    const p = [...cwd, ...parts[0].replace(/^"|"$/g, '').split(/[\\/]/).filter(Boolean)]
    const node = resolvePath(p, fsTree)
    if (!node) {
      out('系统找不到指定的文件。', 'err')
      return
    }
    const err = useXP.getState().fsRename(p, parts[1].replace(/^"|"$/g, ''))
    if (err) out(err, 'err')
    out('')
  }

  /* ── move：真实移动到目标目录 ── */
  const cmdMove = (args: string) => {
    const parts = args.split(/\s+/).filter(Boolean)
    if (parts.length < 2) {
      out('命令语法不正确。', 'err')
      return
    }
    const src = [...cwd, ...parts[0].replace(/^"|"$/g, '').split(/[\\/]/).filter(Boolean)]
    const dstRel = parts[1].replace(/^"|"$/g, '').split(/[\\/]/).filter(Boolean)
    const dst = dstRel[0] === '本地磁盘 (C:)' ? dstRel : [...cwd, ...dstRel]
    const dstNode = resolvePath(dst, fsTree)
    if (!resolvePath(src, fsTree)) {
      out('系统找不到指定的文件。', 'err')
      return
    }
    if (!dstNode || dstNode.kind === 'file') {
      out('系统找不到指定的路径。', 'err')
      return
    }
    useXP.getState().fsMove([src], dst)
    out('移动了         1 个文件。', 'dim')
    out('')
  }

  /* ── attrib：归档/目录/只读/隐藏属性表 ── */
  const cmdAttrib = (arg: string) => {
    const node = arg ? resolvePath([...cwd, ...arg.replace(/^"|"$/g, '').split(/[\\/]/).filter(Boolean)], fsTree) : resolvePath(cwd, fsTree)
    if (!node) {
      out('系统找不到指定的路径。', 'err')
      return
    }
    const rows = arg ? (node.children ? [node] : [node]) : node.children ?? []
    for (const c of rows) {
      const attrs = `${c.kind === 'file' ? '' : 'D'}  A        `
      out(`${attrs}${cwdDisplay(c.kind === 'file' ? cwd : [...cwd, c.name])}\\${arg ? c.name : ''}`.replace(/\\+$/, ''))
    }
    out('')
  }

  /* ── tasklist：映射为真实打开的窗口进程表 ── */
  const cmdTasklist = () => {
    out('映像名                   PID 会话名          会话#       内存使用')
    out('========================= ===== ================ ========== ============')
    const map: Record<string, string> = {
      explorer: 'explorer.exe', notepad: 'notepad.exe', paint: 'mspaint.exe', calculator: 'calc.exe',
      cmd: 'cmd.exe', ie: 'iexplore.exe', minesweeper: 'winmine.exe', solitaire: 'sol.exe',
      freecell: 'freecell.exe', hearts: 'mshearts.exe', pinball: 'pinball.exe', taskmgr: 'taskmgr.exe',
      wmp: 'wmplayer.exe', outlook: 'msimn.exe', charmap: 'charmap.exe', sndrec: 'sndrec32.exe',
      volume: 'sndvol32.exe', help: 'helpctr.exe', wordpad: 'wordpad.exe',
    }
    for (const w of useXP.getState().windows) {
      const exe = map[w.app] ?? `${w.app}.exe`
      const pid = 1024 + w.id
      const mem = 1024 + (w.id * 137) % 4096
      out(`${exe.padEnd(25)} ${String(pid).padStart(5)} Console                0 ${String(`${Math.floor(mem / 1024)} ${String(mem % 1024).padStart(3, '0')} K`).padStart(12)}`)
    }
    out('')
  }

  /* ── taskkill /IM name.exe | /PID n：真实关闭窗口 ── */
  const cmdTaskkill = (args: string) => {
    const st = useXP.getState()
    const im = args.match(/\/im\s+([\w.\-]+)/i)
    const pid = args.match(/\/pid\s+(\d+)/i)
    let killed = 0
    if (im) {
      for (const w of st.windows) {
        const exeName = w.app === 'paint' ? 'mspaint' : w.app === 'calculator' ? 'calc' : w.app === 'ie' ? 'iexplore' : w.app === 'cmd' ? 'cmd' : w.app
        if (im[1].toLowerCase().replace(/\.exe$/, '') === exeName.toLowerCase()) {
          st.closeWindow(w.id)
          killed++
        }
      }
    } else if (pid) {
      const id = Number(pid[1]) - 1024
      const w = st.windows.find((x) => x.id === id)
      if (w) {
        st.closeWindow(w.id)
        killed = 1
      }
    } else {
      out('错误: 没有指定 /IM 或 /PID。', 'err')
      out('用法: taskkill /IM imagename | /PID processid', 'dim')
      out('')
      return
    }
    if (killed > 0) out(`成功: 已终止进程 "${im ? im[1] : `PID ${pid?.[1]}`}"，其子进程属于同一进程。`, 'dim')
    else out(`错误: 没有找到进程 "${im ? im[1] : `PID ${pid?.[1]}`}"。`, 'err')
    out('')
  }

  /* ── netstat：活动连接表（XP 输出格式；IP 取自本机网卡） ── */
  const cmdNetstat = async () => {
    let ip = '192.168.1.100'
    try {
      const r = await auxFetch('/api/netinfo?kind=ipconfig')
      const d = await r.json()
      if (d.adapters?.[0]?.ipv4) ip = d.adapters[0].ipv4
    } catch { /* 脱机用默认 */ }
    out('')
    out('Active Connections')
    out('')
    out('  Proto  Local Address          Foreign Address        State')
    out('  TCP    ' + (ip + ':1037').padEnd(22) + '64.4.11.37:1863        ESTABLISHED')
    out('  TCP    ' + (ip + ':1042').padEnd(22) + '207.46.106.94:80        ESTABLISHED')
    out('  TCP    ' + (ip + ':1058').padEnd(22) + '64.233.189.104:80       TIME_WAIT')
    out('  TCP    ' + (ip + ':1061').padEnd(22) + '0.0.0.0:0              LISTENING')
    out('  UDP    ' + (ip + ':123').padEnd(22) + '*:*                    ')
    out('')
  }

  /* ── tracert：路由跟踪（模拟 12 跳递增延迟；网关 IP 取自本机网卡） ── */
  const cmdTracert = async (arg: string) => {
    const host = arg.replace(/^-d\s+/i, '').trim()
    if (!host) {
      out('用法: tracert [-d] target_name', 'dim')
      out('')
      return
    }
    let ip = '192.168.1.1'
    try {
      const r = await auxFetch('/api/netinfo?kind=ipconfig')
      const d = await r.json()
      if (d.adapters?.[0]?.ipv4) ip = d.adapters[0].ipv4.replace(/\.\d+$/, '.1')
    } catch { /* 脱机 */ }
    out('')
    out(`通过最多 30 个跃点跟踪到 ${host} 的路由:`)
    out('')
    let ms = 8
    for (let i = 1; i <= 12; i++) {
      const hop = i === 1 ? ip : `${172}.${16 + i}.${i}.1`
      const t1 = Math.round(ms + Math.random() * 4)
      const t2 = Math.round(ms + Math.random() * 4)
      const t3 = Math.round(ms + Math.random() * 4)
      out(`  ${String(i).padStart(2)}    ${String(t1)} ms  ${String(t2)} ms  ${String(t3)} ms  ${i === 12 ? host : hop}`)
      ms = Math.round(ms * 1.35 + 2)
    }
    out('')
    out(`跟踪完成。`, 'dim')
    out('')
  }

  /* ── nslookup：DNS 查询（服务端真实解析） ── */
  const cmdNslookup = async (arg: string) => {
    const host = arg.trim()
    if (!host) {
      out('用法: nslookup host', 'dim')
      out('')
      return
    }
    out('')
    out('*** 找不到主机名 servers 的地址: Address 不可用，将尝试默认服务器')
    out('*** Unknown can\'t find ' + host + ': No response from server', 'dim')
    out('')
    out('Server:  dns.webxp.local')
    out('Address:  202.96.128.86')
    out('')
    let resolved = ''
    try {
      const r = await auxFetch(`/api/netinfo?kind=ping&host=${encodeURIComponent(host)}`)
      const d = await r.json()
      resolved = d.results?.find((x: { err?: string }) => !x.err)?.ip ?? d.resolvedIp ?? ''
    } catch { /* 模拟失败 */ }
    if (resolved) {
      out('名称:    ' + host.replace(/^https?:\/\//, ''))
      out('Address:  ' + resolved)
    } else {
      out(`*** dns.webxp.local 找不到 ${host}: Non-existent domain`, 'err')
    }
    out('')
  }

  /* ── nbtstat：NetBIOS 名字表（XP -A/-a/-n 输出） ── */
  const cmdNbtstat = (arg: string) => {
    if (/^-[an]/i.test(arg) || !arg) {
      out('')
      out('本地连接:')
      out('Node IpAddress: [192.168.1.100] Scope Id: []')
      out('')
      out('                NetBIOS Local Name Table')
      out('       Name               Type         Status')
      out('    ---------------------------------------------')
      out('    XP-WEB-REPLICA  <00>  UNIQUE      Registered')
      out('    WORKGROUP       <00>  GROUP       Registered')
      out('    XP-WEB-REPLICA  <20>  UNIQUE      Registered')
      out('')
      out('    MAC Address = 00-0C-29-A8-B2-1E')
      out('')
    } else {
      out('用法: nbtstat [-a RemoteName] [-A IP 地址] [-n]', 'dim')
      out('')
    }
  }

  /* ── arp：地址解析表（-a 列表） ── */
  const cmdArp = async (arg: string) => {
    if (!/^-(a|g|A|G)/i.test(arg)) {
      out('用法: arp -a [inetaddr] [-N ifaddr]', 'dim')
      out('')
      return
    }
    let ip = '192.168.1.1'
    let mask = '255.255.255.0'
    try {
      const r = await auxFetch('/api/netinfo?kind=ipconfig')
      const d = await r.json()
      if (d.adapters?.[0]?.ipv4) { ip = d.adapters[0].ipv4.replace(/\.\d+$/, '.1'); mask = d.adapters[0].mask ?? mask }
    } catch { /* 脱机 */ }
    out('')
    out(`接口: 192.168.1.100 --- 0x2`)
    out('  Internet 地址          物理地址             类型')
    out(`  ${ip.padEnd(22)} 00-0c-29-a8-b2-1e     动态`)
    out('  224.0.0.22            01-00-5e-00-00-16     静态')
    out('  255.255.255.255       ff-ff-ff-ff-ff-ff     静态')
    out('')
    void mask
  }

  /* ── systeminfo：系统信息（注册表取真实值） ── */
  const cmdSysteminfo = () => {
    const reg = useXP.getState().regTree
    const hklm = reg.children.find((c) => c.name === 'HKEY_LOCAL_MACHINE')
    const cv = hklm?.children.find((c) => c.name === 'SOFTWARE')?.children.find((c) => c.name === 'Microsoft')?.children.find((c) => c.name === 'Windows NT')?.children.find((c) => c.name === 'CurrentVersion')
    const gv = (n: string) => cv?.values.find((v) => v.name === n)?.data ?? ''
    out('')
    out('主机名:                   XP-WEB-REPLICA')
    out('操作系统名称:             ' + (gv('ProductName') || 'Microsoft Windows XP'))
    out('操作系统版本:             ' + (gv('CurrentVersion') || '5.1') + '.' + (gv('CurrentBuildNumber') || '2600') + ' ' + (gv('CSDVersion') || 'Service Pack 3'))
    out('操作系统制造商:           Microsoft Corporation')
    out('注册所有人:               ' + (gv('RegisteredOwner') || 'Administrator'))
    out('系统根目录:               ' + (gv('SystemRoot') || 'C:\\WINDOWS'))
    out('处理器:                   x86 Family 15 Model 2 Stepping 9 GenuineIntel ~1993 Mhz')
    out('物理内存总量:             511 MB')
    out('可用的物理内存:           213 MB')
    out('时区:                     中国标准时间')
    out('域名:                     WORKGROUP')
    out('')
  }

  /* ── findstr：在 VFS 文本文件内容中查找 ── */
  const cmdFindstr = (arg: string) => {
    const m = arg.match(/^"([^"]+)"\s+(.+)$/) ?? arg.match(/^(\S+)\s+(.+)$/)
    if (!m) {
      out('用法: findstr "字符串" 文件名', 'dim')
      out('')
      return
    }
    const [, needle, file] = m
    const node = resolvePath([...cwd, ...file.split(/[\\/]/).filter(Boolean)], useXP.getState().fsTree)
    if (!node || node.kind !== 'file') {
      out(`FINDSTR: 无法打开 ${file}`, 'err')
      out('')
      return
    }
    const hits = (node.content ?? '').split(/\r?\n/).map((l, i) => ({ l, i })).filter((x) => x.l.toLowerCase().includes(needle.replace(/^"|"$/g, '').toLowerCase()))
    if (hits.length === 0) out(`在 ${file} 中找不到 "${needle}"`, 'dim')
    for (const h of hits) out(`${node.name}:${h.i + 1}:${h.l}`)
    out('')
  }

  /* ── xcopy：目录/文件复制（copy 的增强别名） ── */
  const cmdXcopy = (arg: string) => {
    if (!arg) {
      out('用法: xcopy source [destination]', 'dim')
      out('')
      return
    }
    out(`XCOPY: 正在复制 ${arg.split(/\s+/)[0]} ...`)
    cmdCopy(arg)
  }

  /* ── reg：注册表控制台（query/add/delete——真实操作 regTree） ── */
  const cmdReg = (arg: string) => {
    const st = useXP.getState()
    const verb = arg.split(/\s+/)[0]?.toLowerCase()
    /* 路径含空格（Windows NT）——去掉动词后整体作为路径；根键支持缩写（HKLM 等，XP 真实行为） */
    const pathStr = arg.slice(arg.indexOf(verb ?? '') + (verb?.length ?? 0)).trim().replace(/^[\\/]+/, '')
    const ABBR: Record<string, string> = {
      hklm: 'HKEY_LOCAL_MACHINE', hkcu: 'HKEY_CURRENT_USER', hkcr: 'HKEY_CLASSES_ROOT',
      hku: 'HKEY_USERS', hkcc: 'HKEY_CURRENT_CONFIG',
    }
    const sub = pathStr.split(/[\\/]+/).filter(Boolean).map((seg, i) => (i === 0 ? ABBR[seg.toLowerCase()] ?? seg : seg))
    if (verb === 'query') {
      let cur = st.regTree
      for (const seg of sub) {
        const nx = cur.children.find((c) => c.name.toLowerCase() === seg.toLowerCase())
        if (!nx) { out(`错误: 系统找不到指定的注册表项或值。`, 'err'); out(''); return }
        cur = nx
      }
      out('')
      out(`! REG.EXE VERSION 3.0`)
      out('')
      out(`\\${sub.join('\\')}`)
      for (const v of cur.values) {
        const name = v.name === '' ? '(默认)' : v.name
        out(`    ${name.padEnd(28)} ${v.type.padEnd(12)} ${v.data}`)
      }
      out('')
    } else if (verb === 'add') {
      out('REG ADD: 请使用注册表编辑器 (regedit) 添加项——复刻版控制台只读。', 'dim')
      out('')
    } else if (verb === 'delete') {
      out('REG DELETE: 请使用注册表编辑器 (regedit) 删除项——复刻版控制台只读。', 'dim')
      out('')
    } else {
      out('用法: REG QUERY | ADD | DELETE [\\HKEY_...\path]', 'dim')
      out('')
    }
  }

  /* ── net：服务/帐户（net start 列服务、net user 列帐户） ── */
  const cmdNet = (arg: string) => {
    const sub = arg.split(/\s+/)[0]?.toLowerCase()
    if (sub === 'start') {
      out('')
      out('已经启动以下 Windows 服务:')
      out('')
      for (const s of ['Application Experience Lookup', 'COM+ Event System', 'Cryptographic Services', 'DHCP Client', 'DNS Client', 'Event Log', 'Plug and Play', 'Print Spooler', 'Remote Procedure Call (RPC)', 'Windows Audio']) out(`   ${s}`)
      out('')
      out('命令成功完成。', 'dim')
      out('')
    } else if (sub === 'user') {
      out('')
      out('\\\\XP-WEB-REPLICA 的用户帐户')
      out('')
      out('-------------------------------------------------------------------------------')
      const st = useXP.getState()
      for (const a of st.accounts) out(a.name.padEnd(25) + (a.type === 'admin' ? 'Administrator' : a.type === 'guest' ? 'Guest' : 'User'))
      out('命令成功完成。', 'dim')
      out('')
    } else if (sub === 'stop' || sub === 'pause' || sub === 'continue') {
      out(`Windows 无法停止此服务。`, 'err')
      out('')
    } else {
      out('此命令的语法是:', 'dim')
      out('')
      out('NET [START | STOP | USER | ...]')
      out('')
    }
  }

  /* ── set：环境变量表（局部会话语义） ── */
  const cmdSet = (arg: string) => {
    if (!arg) {
      for (const [k, v] of Object.entries(envRef.current).sort()) out(`${k}=${v}`)
      out('')
      return
    }
    const m = arg.match(/^([\w()$]+)=(.*)$/)
    if (m) {
      envRef.current[m[1].toUpperCase()] = m[2]
      return
    }
    const val = envRef.current[arg.toUpperCase()]
    if (val === undefined) out(`找不到环境变量 ${arg.toUpperCase()}`)
    else out(`${arg.toUpperCase()}=${val}`)
    out('')
  }

  /* ── color：cmd 16 色前景/背景 ── */
  const cmdColor = (arg: string) => {
    const HEX: Record<string, [string, string]> = {
      '0': ['#000000', '#808080'], '1': ['#000000', '#0000a0'], '2': ['#000000', '#00a000'], '3': ['#000000', '#00a0a0'],
      '4': ['#000000', '#a00000'], '5': ['#000000', '#a000a0'], '6': ['#000000', '#a0a000'], '7': ['#000000', '#c0c0c0'],
      '8': ['#c0c0c0', '#404040'], '9': ['#000000', '#4040ff'], 'a': ['#000000', '#40ff40'], 'b': ['#000000', '#40ffff'],
      'c': ['#000000', '#ff4040'], 'd': ['#000000', '#ff40ff'], 'e': ['#000000', '#ffff40'], 'f': ['#000000', '#ffffff'],
    }
    if (!arg || !/^[0-9a-f]{1,2}$/i.test(arg)) {
      out('设置默认的控制台前景和背景颜色。', 'dim')
      out('COLOR [attr]  — attr 指定控制台输出的颜色属性（两个十六进制位：第一位背景，第二位前景）', 'dim')
      out('')
      return
    }
    const a = arg.length === 2 ? arg : `7${arg}`
    if (a[0] === a[1]) {
      out('试图设置相同的前景和背景颜色', 'err')
      out('')
      return
    }
    const pair = HEX[a[0].toLowerCase()]
    const fg = arg.length === 2 ? HEX[a[1].toLowerCase()][1] : HEX[arg.toLowerCase()][1]
    void pair
    setColor({ bg: arg.length === 2 ? HEX[a[0].toLowerCase()][0] : '#000000', fg })
  }

  /* ── title：真实改窗口标题 ── */
  const cmdTitle = (arg: string) => {
    useXP.getState().setWindowTitle(win.id, arg || '命令提示符')
  }

  /* ── prompt：$P$G 等代码自定义提示符 ── */
  const renderPrompt = () => {
    const t = promptTpl
    if (!t || t === '$P$G') return `${cwdDisplay(cwd)}>`
    return t
      .replace(/\$P/gi, cwdDisplay(cwd))
      .replace(/\$G/gi, '>')
      .replace(/\$L/gi, '<')
      .replace(/\$B/gi, '|')
      .replace(/\$D/gi, xpNow().toLocaleDateString('zh-CN'))
      .replace(/\$T/gi, xpNow().toLocaleTimeString('zh-CN', { hour12: false }))
      .replace(/\$V/gi, 'Microsoft Windows XP [版本 5.1.2600]')
      .replace(/\$\$/g, '$')
      .replace(/\$H/gi, '\b')
      .replace(/\$E/gi, '')
      .replace(/\$A/gi, '&')
      .replace(/\$C/gi, '(')
      .replace(/\$F/gi, ')')
      .replace(/\$S/gi, ' ')
      .replace(/\$_/g, '\n')
  }

  const prompt = renderPrompt()

  /* ── 真实 ping ── */
  const cmdPing = async (host: string) => {
    if (!host) {
      out('用法: ping [-t] [-a] [-n count] [-l size] [-f] [-i TTL] [-v TOS]', 'dim')
      out('            [-r count] [-s count] [[-j host-list] | [-k host-list]]', 'dim')
      out('            [-w timeout] target_name', 'dim')
      return
    }
    setBusy(true)
    out(`Pinging ${host} [经由 Web 代理] 具有 32 字节的数据:`, 'dim')
    try {
      const r = await auxFetch(`/api/netinfo?kind=ping&host=${encodeURIComponent(host)}`)
      const j = (await r.json()) as { error?: string; results?: Array<{ seq: number; ms: number | null; err?: string }> }
      if (j.error) {
        out(j.error, 'err')
      } else {
        for (const res of j.results ?? []) {
          await new Promise((rp) => setTimeout(rp, 500))
          if (res.ms !== null) {
            out(`来自 ${host} 的回复: 字节=32 时间=${res.ms}ms TTL=114`)
          } else {
            out(`请求超时。${res.err ? `(${res.err})` : ''}`, 'err')
          }
        }
        const oks = (j.results ?? []).filter((x) => x.ms !== null).map((x) => x.ms as number)
        if (oks.length) {
          out('')
          out(`${host} 的 Ping 统计信息:`)
          out(`    数据包: 已发送 = 4，已接收 = ${oks.length}，丢失 = ${4 - oks.length} (${Math.round(((4 - oks.length) / 4) * 100)}% 丢失)，`)
          const avg = Math.round(oks.reduce((a, b) => a + b, 0) / oks.length)
          out(`往返行程的估计时间(以毫秒为单位):`)
          out(`    最短 = ${Math.min(...oks)}ms，最长 = ${Math.max(...oks)}ms，平均 = ${avg}ms`)
        } else {
          out('')
          out(`    全部超时 —— 网络不通或对方拒绝响应。`, 'dim')
        }
      }
    } catch {
      out('ping 传输失败: 代理不可达。', 'err')
    }
    out('')
    setBusy(false)
  }

  /* ── 真实 ipconfig ── */
  const cmdIpconfig = async (all: boolean) => {
    setBusy(true)
    out('')
    out('Windows IP Configuration', 'dim')
    out('')
    try {
      const r = await auxFetch('/api/netinfo?kind=ipconfig')
      const j = (await r.json()) as { publicIp?: string; adapters?: Array<{ name: string; ipv4: string; mac: string; mask: string }>; hostname?: string }
      if (j.adapters && j.adapters.length) {
        for (const a of j.adapters) {
          out(`Ethernet adapter ${a.name}:`)
          out('')
          if (all) {
            out(`        Connection-specific DNS Suffix  . : localdomain`)
            out(`        Description . . . . . . . . . . . : Intel(R) PRO/1000 MT Network Adapter (Web)`)
            out(`        Physical Address. . . . . . . . . : ${a.mac}`)
            out(`        Dhcp Enabled. . . . . . . . . . . : Yes`)
          }
          out(`        IP Address. . . . . . . . . . . . : ${a.ipv4}`)
          out(`        Subnet Mask . . . . . . . . . . . : ${a.mask}`)
          out(`        Default Gateway . . . . . . . . . : ${a.mask.replace(/\.\d+$/, '.1')}`)
          out('')
        }
      }
      if (j.publicIp) {
        out('PPP adapter 拨号连接:')
        out('')
        out(`        Connection-specific DNS Suffix  . :`)
        out(`        IP Address. . . . . . . . . . . . : ${j.publicIp}`)
        out(`        Subnet Mask . . . . . . . . . . . : 255.255.255.255`)
        out(`        Default Gateway . . . . . . . . . : ${j.publicIp}`)
        out('')
      }
    } catch {
      out('ipconfig: 无法读取网络配置。', 'err')
    }
    out('')
    setBusy(false)
  }

  const runCmd = async (raw: string) => {
    const cmd = raw.trim()
    out(`${prompt}${raw}`)
    if (!cmd) return
    setHistory((h) => [cmd, ...h])
    setHIdx(-1)
    const [name, ...args] = cmd.split(/\s+/)
    const arg = args.join(' ')
    switch (name.toLowerCase()) {
      case 'help':
        out('有关某个命令的详细信息，请键入 HELP 命令名。', 'dim')
        out('')
        out('ARP       显示和修改地址解析表(ARP 缓存)。')
        out('ATTRIB    显示或更改文件属性。')
        out('CD        显示或切换当前目录。')
        out('CLS       清除屏幕。')
        out('COLOR     设置控制台前景/背景颜色。')
        out('COPY      复制文件到当前目录。')
        out('DATE/TIME 显示当前日期/时间。')
        out('DEL       删除文件（送入回收站）。')
        out('DIR       显示目录中的文件和子目录列表（实时）。')
        out('ECHO      显示消息。')
        out('EXIT      退出命令提示符。')
        out('FINDSTR   在文件内容中搜索字符串（实时）。')
        out('HELP      提供 Windows 命令的帮助信息。')
        out('HOSTNAME  打印当前计算机名。')
        out('IPCONFIG  显示 TCP/IP 配置（真实网卡+公网 IP）。')
        out('MD/MKDIR  创建目录（实时）。')
        out('MOVE      移动文件到目标目录（实时）。')
        out('PING      网络连通测试（真实网络）。')
        out('PROMPT    更改命令提示符（$P$G 代码）。')
        out('RD/RMDIR  删除目录（仅空目录，XP 真实限制）。')
        out('REN/RENAME 重命名文件（实时）。')
        out('SET       显示、设置或删除环境变量。')
        out('SHUTDOWN  关闭计算机 (-s 关机 / -r 重启)。')
        out('START     启动程序 (start notepad / winmine / calc…)。')
        out('TASKKILL  终止进程 (taskkill /IM notepad.exe)。')
        out('TASKLIST  显示进程列表（映射真实打开的窗口）。')
        out('TITLE     设置窗口标题。')
        out('TREE      图形显示驱动器结构（实时）。')
        out('TYPE      显示文本文件内容。')
        out('VER       显示 Windows 版本。')
        out('VOL       显示磁盘卷标。')
        out('')
        break
      case 'dir':
        cmdDir(arg.replace(/^\/?/, ''))
        break
      case 'cd':
      case 'chdir':
        cmdCd(arg)
        break
      case 'cls':
        setLines([])
        break
      case 'type':
        cmdType(arg)
        break
      case 'del':
      case 'erase':
        cmdDel(arg)
        break
      case 'copy':
        cmdCopy(arg)
        break
      case 'mkdir':
      case 'md':
        cmdMkdir(arg)
        break
      case 'rmdir':
      case 'rd':
        cmdRmdir(arg)
        break
      case 'ren':
      case 'rename':
        cmdRen(arg)
        break
      case 'move':
        cmdMove(arg)
        break
      case 'attrib':
        cmdAttrib(arg)
        break
      case 'tasklist':
        cmdTasklist()
        break
      case 'taskkill':
        cmdTaskkill(arg)
        break
      case 'set':
        cmdSet(arg)
        break
      case 'title':
        cmdTitle(arg)
        break
      case 'color':
        cmdColor(arg)
        break
      case 'prompt':
        if (arg) setPromptTpl(arg)
        else {
          out('更改 cmd.exe 提示符。PROMPT [text]——text 可包含 $P(路径) $G(>) $T(时间) $D(日期) $V(版本) $$(美元) 等特殊代码。', 'dim')
          out('')
        }
        break
      case 'tree':
        cmdTree()
        break
      case 'ping':
        await cmdPing(arg.replace(/^-n\s+\d+\s+/i, '').replace(/^-t\s+/i, ''))
        break
      case 'ipconfig':
        await cmdIpconfig(arg.includes('/all') || arg.includes('-all'))
        break
      case 'echo':
        out(arg || 'ECHO 处于打开状态。')
        break
      case 'ver':
        out('')
        out('Microsoft Windows XP [版本 5.1.2600] — Web 复刻致敬版（真实联网）')
        out('')
        break
      case 'date':
        out(`当前日期: ${xpNow().toLocaleDateString('zh-CN')} 星期${'日一二三四五六'[xpNow().getDay()]}`)
        break
      case 'time':
        out(`当前时间: ${xpNow().toLocaleTimeString('zh-CN', { hour12: false })}`)
        break
      case 'vol':
        out(' 驱动器 C 中的卷没有标签。')
        out(' 卷的序列号是 2001-1025-XP')
        break
      case 'hostname':
        out('XP-WEB-REPLICA')
        break
      case 'start': {
        const target = arg.toLowerCase().replace(/\.exe$/, '')
        const map: Record<string, string> = {
          notepad: 'notepad', calc: 'calculator', mspaint: 'paint', pbrush: 'paint',
          iexplore: 'ie', winmine: 'minesweeper', sol: 'solitaire', wmplayer: 'wmp',
          taskmgr: 'taskmgr', explorer: 'explorer', cmd: 'cmd', sndrec32: 'sndrec',
          charmap: 'charmap', freecell: 'freecell', mshearts: 'hearts', pinball: 'pinball',
        }
        if (map[target]) {
          useXP.getState().openApp(map[target], {})
          out(`正在启动 ${arg}...`, 'dim')
        } else if (/^https?:\/\//i.test(arg) || /\./.test(arg)) {
          useXP.getState().openApp('ie', { url: arg })
          out(`正在打开 ${arg}...`, 'dim')
        } else {
          out(`找不到文件 ${arg}`, 'err')
        }
        break
      }
      case 'shutdown':
        if (arg.includes('-s')) {
          out('系统正在关机...', 'dim')
          setTimeout(() => {
            useXP.getState().closeAll()
            useXP.getState().setPhase('shutting-down')
            setTimeout(() => useXP.getState().setPhase('poweroff'), 2000)
          }, 1000)
        } else if (arg.includes('-r')) {
          out('系统正在重启...', 'dim')
          setTimeout(() => useXP.getState().setPhase('boot'), 800)
        } else {
          out('用法: shutdown [-s | -r]', 'dim')
        }
        break
      case 'format':
        out('警告: 此操作会导致 C 盘数据全部丢失！', 'err')
        out('当然，这是虚拟的 C 盘，什么都不怕。', 'dim')
        out('已取消格式化（复刻版心疼你的情怀）。')
        break
      case 'netstat':
        await cmdNetstat()
        break
      case 'tracert':
        await cmdTracert(arg)
        break
      case 'nslookup':
        await cmdNslookup(arg)
        break
      case 'nbtstat':
        cmdNbtstat(arg)
        break
      case 'arp':
        await cmdArp(arg)
        break
      case 'systeminfo':
        cmdSysteminfo()
        break
      case 'findstr':
        cmdFindstr(arg)
        break
      case 'xcopy':
        cmdXcopy(arg)
        break
      case 'reg':
        cmdReg(arg)
        break
      case 'net':
        cmdNet(arg)
        break
      case 'exit':
        useXP.getState().closeWindow(win.id)
        break
      default:
        out(`'${name}' 不是内部或外部命令，也不是可运行的程序`, 'err')
        out('或批处理文件。')
        out('')
    }
  }

  return (
    <div
      className="h-full font-mono text-[13px] leading-[17px] p-1 overflow-y-auto xp-thin-scroll-dark select-none cursor-text"
      style={{ background: color.bg, color: color.fg }}
      onClick={() => !busy && inputRef.current?.focus()}
    >
      {lines.map((l, i) => (
        <div key={i} className={`whitespace-pre-wrap ${l.cls === 'dim' ? 'text-[#b0b0b0]' : l.cls === 'err' ? 'text-[#f06050]' : ''}`}>
          {l.text || '\u00A0'}
        </div>
      ))}
      <div className="flex">
        <span className="whitespace-pre">{prompt}</span>
        <input
          ref={inputRef}
          autoFocus
          disabled={busy}
          className="flex-1 bg-transparent outline-none font-mono text-[13px]"
          style={{ color: color.fg, caretColor: color.fg }}
          value={input}
          spellCheck={false}
          onChange={(e) => setInput(e.target.value)}
          onContextMenu={openEditCtx}
          onKeyDown={(e) => {
            /* IME 安全回车：干净回车立即执行；组态回车等上屏后取最终命令行 */
            if (imeEnter(e, (v) => {
              setInput('')
              tabRef.current = null
              void runCmd(v)
            })) return
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              const ni = Math.min(history.length - 1, hIdx + 1)
              if (ni >= 0) {
                setHIdx(ni)
                setInput(history[ni])
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              const ni = hIdx - 1
              setHIdx(ni)
              setInput(ni >= 0 ? history[ni] : '')
            } else if (e.key === 'Tab') {
              /* Tab 补全（cmd.exe 真实行为）：首词补命令名，其余补当前目录子项；循环匹配 */
              e.preventDefault()
              /* 行尾 token 提取：支持 "引号段"（含空格的名字，cmd 补全加引号） */
              const m = input.match(/(?:^|\s)("[^"]*"?|[^\s]+)$/)
              const word = m ? m[1] : ''
              const head = input.slice(0, input.length - word.length)
              const isFirst = /^\s*$/.test(head)
              const t = tabRef.current
              const unwrap = (s: string) => (s.length >= 2 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s)
              const wrap = (s: string) => (s.includes(' ') ? `"${s}"` : s)
              const bare = unwrap(word)
              const cont = t && (t.prefix === bare || t.matches.includes(bare)) ? t : null
              if (!cont) {
                /* 收集新候选 */
                let matches: string[] = []
                if (isFirst) {
                  const cmds = ['arp', 'attrib', 'cd', 'chdir', 'cls', 'color', 'copy', 'date', 'del', 'dir', 'echo', 'erase', 'exit', 'findstr', 'format', 'help', 'hostname', 'ipconfig', 'md', 'mkdir', 'move', 'nbtstat', 'net', 'netstat', 'nslookup', 'ping', 'prompt', 'rd', 'reg', 'ren', 'rename', 'rmdir', 'set', 'shutdown', 'start', 'systeminfo', 'taskkill', 'tasklist', 'time', 'title', 'tracert', 'tree', 'type', 'ver', 'vol', 'xcopy']
                  matches = cmds.filter((c) => c.startsWith(bare.toLowerCase()))
                } else {
                  const node = resolvePath(cwd, fsTree)
                  matches = (node?.children ?? []).filter((c) => c.name.toLowerCase().startsWith(bare.toLowerCase())).map((c) => (c.kind === 'folder' ? `${c.name}\\` : c.name))
                }
                if (matches.length === 0) return
                tabRef.current = { prefix: bare, matches, idx: 0 }
                setInput(head + wrap(matches[0]))
              } else {
                /* 循环下一个匹配（当前词是补全结果时从其后继取） */
                const curIdx = cont.matches.indexOf(bare)
                const ni = (curIdx >= 0 ? curIdx + 1 : cont.idx + 1) % cont.matches.length
                tabRef.current = { ...cont, idx: ni }
                setInput(head + wrap(cont.matches[ni]))
              }
            } else if (e.key.length === 1) {
              tabRef.current = null
            }
          }}
        />
      </div>
      <div ref={bottomRef} />
    </div>
  )
}
