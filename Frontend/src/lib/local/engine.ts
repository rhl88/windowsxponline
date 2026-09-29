import { freshMockState, MOCK_STATE_VERSION, type MockStateDTO } from '@/components/xp/model'
import { resolvePath } from '@/components/xp/fs'
import * as ops from '@/components/xp/state-ops'
import { ApiError } from '@/components/xp/state-ops'

/* ─────────────────────────────────────────────────────────────
 * 浏览器 Local 数据引擎（静态发布形态的数据层）
 * - 持久化：localStorage['xp.localState']（出厂种子 = freshMockState 示范数据）
 * - 路由分发：复刻 /api/v1/* 全部端点语义（与 endpoints.ts 一一对应）
 * - 领域逻辑：直接复用 state-ops（与服务端同一实现，语义永不漂移）
 * - 辅助端点：netinfo / search / browse 的本机伪造（无后台时的 XP 风格输出）
 * 切换回真实后台：localStorage 设置 apiBase → client.ts 自动走 HTTP
 * ───────────────────────────────────────────────────────────── */

const LS_KEY = 'xp.localState'

/* ── 状态存取 ── */
let cache: MockStateDTO | null = null

function loadState(): MockStateDTO {
  if (cache) return cache
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (raw) {
      const st = JSON.parse(raw) as MockStateDTO
      /* 只认当前版本（本地存储无历史包袱，版本不符直接重置出厂） */
      if (st && st.version === MOCK_STATE_VERSION && st.fsTree && st.settings) {
        cache = st
        return st
      }
    }
  } catch { /* 损坏 → 重置 */ }
  cache = freshMockState()
  persist()
  return cache
}

function persist(): void {
  if (!cache) return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(cache))
  } catch {
    /* QuotaExceeded（录音 blobs 撑爆 5MB 等） */
    throw new ApiError(507, '本机存储空间不足：数据未能保存（可清理录音或改用服务器数据源）')
  }
}

/* ── 信封 ── */
export interface Envelope<T> { ok: true; data: T }
export interface EnvelopeErr { ok: false; error: { code: number; message: string } }

/** 统一入口：method + path + body → 信封（复刻 /api/v1 路由层） */
export function localRequest<T>(method: string, path: string, body: Record<string, unknown> | undefined): Envelope<T> | EnvelopeErr {
  try {
    const st = loadState()
    const data = route<T>(st, method.toUpperCase(), path, body ?? {})
    if (method.toUpperCase() !== 'GET') persist() /* 变更落盘（幂等） */
    return { ok: true, data }
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: { code: e.status, message: e.message } }
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: { code: 500, message: msg } }
  }
}

function route<T>(st: MockStateDTO, method: string, path: string, b: Record<string, unknown>): T {
  const GET = method === 'GET'
  const PUT = method === 'PUT'

  /* ── 系统 / 快照 / 会话 ── */
  if (path === '/state') {
    if (GET) return ops.stateView(st) as T
    throw new ApiError(405, `不支持的方法: ${method}`)
  }
  if (path === '/system') {
    if (GET) return ops.systemInfo(st) as T
    if (method === 'POST') {
      if (b.action !== 'reset') throw new ApiError(400, `未知操作: ${b.action}`)
      return ops.resetSystem(st) as T
    }
    throw new ApiError(405, `不支持的方法: ${method}`)
  }
  if (path === '/session') {
    if (GET) return st.session as T
    if (method === 'POST') return ops.postSessionEvent(st, String(b.action ?? ''), b.user ? String(b.user) : undefined) as T
    throw new ApiError(405, `不支持的方法: ${method}`)
  }

  /* ── 帐户 ── */
  if (path === '/accounts') {
    if (GET) return ops.listAccounts(st) as T
    if (method === 'POST') return ops.createAccount(st, b as never) as T
    if (method === 'PATCH') {
      if (!b.name) throw new ApiError(400, '缺少必填字段: name')
      return ops.patchAccount(st, String(b.name), b as never) as T
    }
    if (method === 'DELETE') {
      if (!b.name) throw new ApiError(400, '缺少必填字段: name')
      ops.removeAccount(st, String(b.name))
      return { removed: String(b.name) } as T
    }
    throw new ApiError(405, `不支持的方法: ${method}`)
  }
  if (path === '/accounts/login') {
    if (method !== 'POST') throw new ApiError(405, `不支持的方法: ${method}`)
    if (!b.name) throw new ApiError(400, '缺少必填字段: name')
    return ops.loginAccount(st, String(b.name), b.password ? String(b.password) : '') as T
  }

  /* ── 文件系统 ── */
  if (path === '/fs') {
    if (GET) {
      const p = typeof b.path === 'string' ? b.path : undefined
      if (!p) return { name: st.fsTree.name, children: st.fsTree.children } as T
      const node = resolvePath(p.split('/'), st.fsTree)
      if (!node) throw new ApiError(404, `路径不存在: ${p}`)
      return node as T
    }
    if (method === 'POST') {
      if (!b.parentPath || !b.node) throw new ApiError(400, '缺少必填字段: parentPath, node')
      return ops.fsCreate(st, b.parentPath as string[], b.node as never) as T
    }
    if (method === 'PATCH') {
      if (!b.path) throw new ApiError(400, '缺少必填字段: path')
      if (b.newName !== undefined) return ops.fsRename(st, b.path as string[], String(b.newName)) as T
      if (b.patch !== undefined) {
        ops.fsUpdate(st, b.path as string[], b.patch as never)
        return { updated: true } as T
      }
      throw new ApiError(400, '需要 newName 或 patch 字段')
    }
    if (method === 'DELETE') {
      if (!b.paths) throw new ApiError(400, '缺少必填字段: paths')
      return ops.fsDelete(st, b.paths as string[][], { permanent: b.permanent === true, items: b.items as never }) as T
    }
    throw new ApiError(405, `不支持的方法: ${method}`)
  }
  if (path === '/fs/write') {
    if (!b.parentPath || b.name === undefined) throw new ApiError(400, '缺少必填字段: parentPath, name')
    return ops.fsWrite(st, b.parentPath as string[], String(b.name), String(b.content ?? '')) as T
  }
  if (path === '/fs/move') {
    if (!b.paths || !b.destPath) throw new ApiError(400, '缺少必填字段: paths, destPath')
    return ops.fsMove(st, b.paths as string[][], b.destPath as string[]) as T
  }
  if (path === '/fs/copy') {
    if (!b.paths || !b.destPath) throw new ApiError(400, '缺少必填字段: paths, destPath')
    return ops.fsCopy(st, b.paths as string[][], b.destPath as string[]) as T
  }

  /* ── 回收站 ── */
  if (path === '/recycle') {
    if (GET) return st.recycleBin as T
    if (method === 'POST') return ops.recycleRestore(st, b.key ? String(b.key) : null) as T
    if (method === 'DELETE') {
      ops.recycleRemove(st, b.key ? String(b.key) : null)
      return { removed: true } as T
    }
    throw new ApiError(405, `不支持的方法: ${method}`)
  }

  /* ── 设置 ── */
  if (path === '/settings') {
    if (GET) return st.settings as T
    if (method === 'PATCH') return { applied: ops.patchSettings(st, b) } as T
    throw new ApiError(405, `不支持的方法: ${method}`)
  }

  /* ── IE ── */
  if (path === '/ie') {
    if (GET) return st.ie as T
    if (PUT) return { applied: ops.putIE(st, b as never) } as T
    if (method === 'DELETE') {
      ops.clearIEHistory(st)
      return { cleared: true } as T
    }
    throw new ApiError(405, `不支持的方法: ${method}`)
  }

  /* ── 整表替换资源 ── */
  const TABLES: Record<string, ops.TableKey> = {
    '/recent-docs': 'recentDocs',
    '/run-history': 'runHistory',
    '/printers': 'printers',
    '/print-jobs': 'printJobs',
    '/sched-tasks': 'schedTasks',
    '/oe-mails': 'oeMails',
    '/net-drives': 'netDrives',
  }
  const tableKey = TABLES[path]
  if (tableKey) {
    if (GET) return (st as unknown as Record<string, unknown>)[tableKey] as T
    if (PUT) return ops.putTable(st, tableKey, (b.items ?? b.jobs) ?? b) as T
    throw new ApiError(405, `不支持的方法: ${method}`)
  }
  if (path === '/desktop') {
    if (GET) return st.desktopPos as T
    if (PUT) return ops.putTable(st, 'desktopPos', b.positions ?? {}) as T
    throw new ApiError(405, `不支持的方法: ${method}`)
  }
  if (path === '/audio') {
    if (GET) return st.audioBlobs as T
    if (PUT) return ops.putTable(st, 'audioBlobs', b.blobs ?? {}) as T
    if (method === 'DELETE') {
      if (!b.path) throw new ApiError(400, '缺少必填字段: path')
      ops.deleteAudio(st, String(b.path))
      return { deleted: true } as T
    }
    throw new ApiError(405, `不支持的方法: ${method}`)
  }

  throw new ApiError(404, `Local 引擎未实现端点: ${method} ${path}`)
}

/* ═══════════════════════════════════════════════════════════
 * 辅助端点伪造（/api/netinfo、/api/search、/api/browse）
 * 静态形态无后台可查询 → 输出 XP 2001 时代风格的本机示范数据
 * ═══════════════════════════════════════════════════════════ */

const LOCAL_ADAPTER = {
  name: 'Realtek RTL8139 Family PCI Fast Ethernet NIC',
  ipv4: '192.168.0.10',
  mac: '52:54:00:A1:B2:C3',
  mask: '255.255.255.0',
}

/** kind=ipconfig：伪造本机网卡（XP 虚拟机经典配置） */
export function auxIpconfig(): { publicIp: string; via: string; adapters: typeof LOCAL_ADAPTER[]; hostname: string } {
  return { publicIp: '', via: '', adapters: [LOCAL_ADAPTER], hostname: 'XP-STATION' }
}

/** kind=ping：4 次稳定递增延迟（本机环回风格，永不出错） */
export function auxPing(host: string): { hostname: string; resolvedIp: string; results: Array<{ seq: number; ms: number | null }> } {
  const results = [1, 2, 3, 4].map((seq) => ({ seq, ms: 18 + seq * 3 + Math.floor(Math.random() * 4) }))
  return { hostname: host, resolvedIp: '207.46.19.30', results }
}

/** kind=time：本机时间 */
export function auxTime(): { iso: string; ts: number } {
  return { iso: new Date().toISOString(), ts: Date.now() }
}

/** /api/search：MSN Search 风格示范结果（按查询词生成，保证相关感） */
export function auxSearch(q: string): {
  query: string
  results: Array<{ rank: number; url: string; title: string; snippet: string; host: string; date: string }>
} {
  const hosts = [
    ['www.microsoft.com', 'Microsoft Corporation'],
    ['support.microsoft.com', 'Microsoft 帮助和支持'],
    ['www.msn.com', 'MSN.com'],
    ['zh.wikipedia.org', 'Wikipedia'],
    ['www.baidu.com', '百度'],
    ['www.w3.org', 'W3C'],
  ]
  const results = hosts.map(([host, site], i) => ({
    rank: i + 1,
    url: `https://${host}/search?q=${encodeURIComponent(q)}`,
    title: `${q} - ${site}`,
    snippet: `${site}上关于「${q}」的页面。包含相关资料、下载与链接。（本机示范数据：静态模式下搜索结果为内置演示）`,
    host,
    date: '2001-10-25',
  }))
  return { query: q, results }
}

/** /api/browse?raw=1：静态模式无法服务端抓取 → 返回说明文本（IE 查看源文件场景） */
export function auxBrowseRaw(url: string): string {
  return [
    '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">',
    '<html>',
    '<head>',
    `  <title>源文件 - ${url}</title>`,
    '  <!-- 静态演示模式 -->',
    '</head>',
    '<body>',
    `  <!-- 本页源代码不可用：静态发布形态下无服务器代理可抓取 ${url} -->`,
    '  <!-- 切换到服务器数据源后，「查看源文件」将返回真实 HTML -->',
    '</body>',
    '</html>',
    '',
  ].join('\n')
}
