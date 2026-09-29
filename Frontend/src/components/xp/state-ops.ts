import {
  resolvePath, mutateAt, detachNode, insertNode, pathKey, assocOf, userDesktopPath,
  DNS_PATH, freshUserHome, ensureDatesInPlace, type FSNode,
} from '@/components/xp/fs'
import {
  DEFAULT_SETTINGS, DEFAULT_ACCOUNTS, ACCOUNT_AVATARS, stripAccount, freshMockState,
  type MockStateDTO, type RecycleItem, type AccountRecord, type AccountItem, type AccountType,
  type SettingsDTO, type IEFavItem, type IEHistItem, type SessionEvent,
} from '@/components/xp/model'
import { CLASSIC_SCHEMES } from '@/components/xp/classic-schemes'
import { hashPassword, verifyPassword, isHashed } from '@/server/passwords'

/* ─────────────────────────────────────────────────────────────
 * 领域逻辑共享层（环境无关：纯内存 mutator 集合）
 * - 消费方 ①：src/server/ops.ts（Node 服务端，withState 包装 → API 路由）
 * - 消费方 ②：src/lib/local/engine.ts（浏览器 Local 引擎，localStorage 持久化）
 * 语义与客户端 zustand store 的 fs* 动作一一镜像：
 *   唯一命名、改名重算关联、移动防环、回收站 key、还原回退桌面…
 * ⚠️ 本文件不得 import 任何 Node/Browser 专属 API（fs / crypto / localStorage）
 * ───────────────────────────────────────────────────────────── */

/* 统一业务错误（mock-db re-export 保持服务端既有 import 兼容） */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/* 回收站还原回退目标：当前会话用户的桌面（会话用户由 login 维护） */
const desktopFallback = (st: { session?: { user?: string } }): string[] => userDesktopPath(st.session?.user ?? 'Administrator')

/* ═══════════════════════════════════════════════════════════
 * 文件系统领域（镜像自 src/app/api/v1/fs*、recycle 路由语义）
 * ═══════════════════════════════════════════════════════════ */

export function fsCreate(st: MockStateDTO, parentPath: string[], node: FSNode): { name: string } {
  if (!resolvePath(parentPath, st.fsTree)) throw new ApiError(404, `目标文件夹不存在: ${parentPath.join('/')}`)
  const r = insertNode(st.fsTree, parentPath, node)
  st.fsTree = r.tree
  return { name: r.name }
}

export function fsWrite(st: MockStateDTO, parentPath: string[], name: string, content: string): { created: boolean; name: string } {
  const parent = resolvePath(parentPath, st.fsTree)
  if (!parent || !parent.children) throw new ApiError(404, `目标文件夹不存在: ${parentPath.join('/')}`)
  const existing = parent.children.find((c) => c.name === name)
  if (existing) {
    st.fsTree = mutateAt(st.fsTree, parentPath, (children) =>
      children.map((c) =>
        c.name === name
          ? { ...c, content, size: `${Math.max(1, Math.ceil(content.length / 1024))} KB`, modified: new Date().toISOString() }
          : c,
      ),
    )
    return { created: false, name }
  }
  const a = assocOf(name)
  const node: FSNode = {
    name,
    kind: 'file',
    icon: a?.icon ?? 'text',
    type: a?.type ?? '文本文档',
    content,
    size: `${Math.max(1, Math.ceil(content.length / 1024))} KB`,
    modified: new Date().toISOString(),
    created: new Date().toISOString(),
  }
  const r = insertNode(st.fsTree, parentPath, node)
  st.fsTree = r.tree
  return { created: true, name: r.name }
}

export function fsRename(st: MockStateDTO, path: string[], newName: string): { name: string } {
  const nm = newName.trim()
  if (!nm) throw new ApiError(400, '名称不能为空')
  const parentPath = path.slice(0, -1)
  const name = path[path.length - 1]
  const parent = resolvePath(parentPath, st.fsTree)
  if (!parent?.children) throw new ApiError(404, `路径不存在: ${path.join('/')}`)
  if (parent.children.find((c) => c.name === nm && c.name !== name)) throw new ApiError(409, `目标已存在同名的 "${nm}"`)
  st.fsTree = mutateAt(st.fsTree, parentPath, (children) =>
    children.map((c) => {
      if (c.name !== name) return c
      const next: FSNode = { ...c, name: nm, modified: new Date().toISOString() }
      /* 扩展名动态关联（XP 行为）：改名后按新扩展名重算图标/类型 */
      if (c.kind === 'file' && !c.appId) {
        const a = assocOf(nm)
        if (a) {
          next.icon = a.icon
          next.type = a.type
        }
      }
      return next
    }),
  )
  return { name: nm }
}

export function fsUpdate(st: MockStateDTO, path: string[], patch: Partial<FSNode>): void {
  const parentPath = path.slice(0, -1)
  const name = path[path.length - 1]
  if (parentPath.length === 0 && name === st.fsTree.name) {
    Object.assign(st.fsTree, patch)
    return
  }
  const parent = resolvePath(parentPath, st.fsTree)
  if (!parent?.children) throw new ApiError(404, `路径不存在: ${path.join('/')}`)
  st.fsTree = mutateAt(st.fsTree, parentPath, (children) => children.map((c) => (c.name === name ? { ...c, ...patch } : c)))
}

export function fsMove(st: MockStateDTO, paths: string[][], destPath: string[]): { moved: number } {
  let tree = st.fsTree
  let moved = 0
  const destKey = pathKey(destPath)
  for (const p of paths) {
    if (p.length === 0) continue
    const srcKey = pathKey(p)
    if (destKey === srcKey) continue
    if (destKey === pathKey(p.slice(0, -1))) continue
    if (destKey.startsWith(srcKey + '/')) continue /* 移到自己的子目录 */
    const { tree: t, node } = detachNode(tree, p)
    if (!node) continue
    tree = insertNode(t, destPath, node).tree
    moved++
  }
  if (moved) st.fsTree = tree
  return { moved }
}

export function fsCopy(st: MockStateDTO, paths: string[][], destPath: string[]): { copied: number } {
  let tree = st.fsTree
  let copied = 0
  for (const p of paths) {
    const node = resolvePath(p, tree)
    if (!node) continue
    tree = insertNode(tree, destPath, node).tree
    copied++
  }
  if (copied) st.fsTree = tree
  return { copied }
}

/* 删除（默认进回收站）。items 由客户端传入（key 客户端权威），缺省时复算 */
export function fsDelete(st: MockStateDTO, paths: string[][], opts?: { permanent?: boolean; items?: RecycleItem[] }): { deleted: number } {
  let tree = st.fsTree
  let deleted = 0
  const newItems: RecycleItem[] = []
  for (const p of paths) {
    if (p.length === 0) continue
    const { tree: t, node } = detachNode(tree, p)
    tree = t
    if (node) {
      deleted++
      if (!opts?.permanent) {
        newItems.push({
          key: `${pathKey(p)}#${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          name: node.name,
          origKey: pathKey(p.slice(0, -1)),
          node,
          deletedAt: Date.now(),
        })
      }
    }
  }
  st.fsTree = tree
  if (opts?.permanent) {
    /* 永久删除：同时从回收站移除对应项（客户端 items 带 key 时按 key，否则按 origKey+name） */
    st.recycleBin = opts.items ? st.recycleBin.filter((i) => !opts.items!.some((x) => x.key === i.key)) : st.recycleBin
  } else {
    /* 配额裁剪（与客户端同一上限）：回收站最多 20 条，超出挤掉最旧（真实 XP 磁盘配额语义） */
    const RECYCLE_MAX = 20
    st.recycleBin = [...st.recycleBin, ...(opts?.items ?? newItems)].slice(-RECYCLE_MAX)
  }
  return { deleted }
}

export function recycleRestore(st: MockStateDTO, key: string | null): { restored: number } {
  const items = key ? st.recycleBin.filter((i) => i.key === key) : st.recycleBin
  let tree = st.fsTree
  for (const it of items) {
    const parentPath = it.origKey ? it.origKey.split('/') : []
    const parent = parentPath.length ? resolvePath(parentPath, tree) : tree
    const target = parent && parent.kind !== 'file' ? parentPath : desktopFallback(st)
    tree = insertNode(tree, target, it.node).tree
  }
  st.fsTree = tree
  st.recycleBin = st.recycleBin.filter((i) => (key ? i.key !== key : false))
  return { restored: items.length }
}

export function recycleRemove(st: MockStateDTO, key: string | null): void {
  st.recycleBin = key ? st.recycleBin.filter((i) => i.key !== key) : []
}

/* ═══════════════════════════════════════════════════════════
 * 帐户领域（镜像自 src/app/api/v1/accounts* 路由语义）
 * 主目录（My Documents/桌面/快速启动…）完全受帐户资源控制：增/删/改名联动
 * ═══════════════════════════════════════════════════════════ */

const ACCOUNT_TYPES: AccountType[] = ['admin', 'user', 'guest']
const BUILTIN_ACCOUNTS = ['Administrator', 'Guest']

function findAccount(st: { accounts: AccountRecord[] }, name: string): AccountRecord | undefined {
  return st.accounts.find((a) => a.name === name)
}

function seedHome(st: { fsTree: FSNode }, name: string): void {
  st.fsTree = mutateAt(st.fsTree, DNS_PATH, (children) =>
    children.some((c) => c.name === name) ? children : [...children, freshUserHome(name)],
  )
  ensureDatesInPlace(st.fsTree)
}

function removeHome(st: { fsTree: FSNode }, name: string): void {
  st.fsTree = mutateAt(st.fsTree, DNS_PATH, (children) => children.filter((c) => c.name !== name))
}

function renameHome(st: { fsTree: FSNode }, oldName: string, newName: string): void {
  st.fsTree = mutateAt(st.fsTree, DNS_PATH, (children) =>
    children.map((c) => (c.name === oldName ? { ...c, name: newName, modified: new Date().toISOString() } : c)),
  )
}

export function listAccounts(st: MockStateDTO): AccountItem[] {
  return st.accounts.map(stripAccount)
}

export function createAccount(
  st: MockStateDTO,
  fields: { name: string; password?: string; hint?: string; type?: string; avatar?: string },
): AccountItem {
  const name = fields.name.trim()
  if (name.length < 1 || name.length > 20) throw new ApiError(400, '帐户名长度须在 1-20 个字符之间')
  const type = (ACCOUNT_TYPES.includes(fields.type as AccountType) ? fields.type : 'user') as AccountType
  const avatar = ACCOUNT_AVATARS.includes(fields.avatar ?? '') ? (fields.avatar as string) : 'avatar-admin'
  const rec: AccountRecord = {
    name,
    type,
    avatar,
    hint: (fields.hint ?? '').slice(0, 60),
    password: hashPassword(fields.password ?? ''),
  }
  if (findAccount(st, name)) throw new ApiError(409, `帐户「${name}」已存在`)
  st.accounts = [...st.accounts, rec]
  seedHome(st, name)
  return stripAccount(rec)
}

export function patchAccount(
  st: MockStateDTO,
  name: string,
  patch: { newName?: string; password?: string; hint?: string; avatar?: string },
): AccountItem {
  const rec = findAccount(st, name)
  if (!rec) throw new ApiError(404, `帐户「${name}」不存在`)
  if (patch.newName !== undefined) {
    const nn = patch.newName.trim()
    if (nn.length < 1 || nn.length > 20) throw new ApiError(400, '帐户名长度须在 1-20 个字符之间')
    if (BUILTIN_ACCOUNTS.includes(rec.name)) throw new ApiError(403, '内置帐户不可重命名')
    if (st.accounts.some((a) => a.name === nn)) throw new ApiError(409, `帐户「${nn}」已存在`)
    renameHome(st, rec.name, nn)
    rec.name = nn
  }
  if (patch.password !== undefined) rec.password = hashPassword(patch.password) /* 明文仅请求中存在，落库即哈希 */
  if (patch.hint !== undefined) rec.hint = patch.hint.slice(0, 60)
  if (patch.avatar !== undefined && ACCOUNT_AVATARS.includes(patch.avatar)) rec.avatar = patch.avatar
  return stripAccount(rec)
}

export function removeAccount(st: MockStateDTO, name: string): void {
  const rec = findAccount(st, name)
  if (!rec) throw new ApiError(404, `帐户「${name}」不存在`)
  if (BUILTIN_ACCOUNTS.includes(rec.name)) throw new ApiError(403, `内置帐户「${rec.name}」不可删除`)
  st.accounts = st.accounts.filter((a) => a.name !== name)
  removeHome(st, name)
}

/** 登录验证：{ ok, account } 或 { ok:false, reason }；旧明文验证成功后自动升级哈希 */
export function loginAccount(
  st: MockStateDTO,
  name: string,
  password: string,
): { ok: true; account: AccountItem } | { ok: false; reason: 'no-user' | 'bad-password' } {
  const rec = st.accounts.find((a) => a.name === name)
  if (!rec) return { ok: false, reason: 'no-user' }
  if (!verifyPassword(password, rec.password)) return { ok: false, reason: 'bad-password' }
  if (!isHashed(rec.password)) rec.password = hashPassword(password)
  /* 验证通过即更新会话用户（数据权威侧维护）；登录事件由客户端进入桌面时经 /session 统一记录 */
  st.session = { ...st.session, user: rec.name }
  return { ok: true, account: stripAccount(rec) }
}

/* ═══════════════════════════════════════════════════════════
 * 设置 / IE / 会话 / 系统（镜像自对应路由语义）
 * ═══════════════════════════════════════════════════════════ */

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof SettingsDTO>

export function patchSettings(st: MockStateDTO, body: Record<string, unknown>): string[] {
  const applied: string[] = []
  for (const k of SETTING_KEYS) {
    if (body[k] !== undefined) {
      ;(st.settings as unknown as Record<string, unknown>)[k] = body[k]
      applied.push(String(k))
    }
  }
  /* XP 主题应用语义（与客户端 setClassicScheme 一致）：
   * 切色彩方案 → 桌面背景色同步为方案 Desktop 色；高对比度 → 自动去除壁纸 */
  const scheme = body.classicScheme
  if (typeof scheme === 'string' && scheme in CLASSIC_SCHEMES) {
    st.settings.bgColor = CLASSIC_SCHEMES[scheme as keyof typeof CLASSIC_SCHEMES].desktop
    if (scheme.startsWith('hc')) st.settings.wallpaper = 'none-blue'
    for (const k of ['bgColor', 'wallpaper']) if (!applied.includes(k)) applied.push(k)
  }
  return applied
}

export function putIE(st: MockStateDTO, fields: { home?: string; favorites?: IEFavItem[]; history?: IEHistItem[] }): string[] {
  const applied: string[] = []
  if (fields.home !== undefined) {
    st.ie.home = fields.home
    applied.push('home')
  }
  if (fields.favorites !== undefined) {
    st.ie.favorites = fields.favorites
    applied.push('favorites')
  }
  if (fields.history !== undefined) {
    st.ie.history = fields.history.slice(0, 60)
    applied.push('history')
  }
  return applied
}

export function clearIEHistory(st: MockStateDTO): void {
  st.ie.history = []
}

const SESSION_ACTIONS: SessionEvent['action'][] = ['login', 'logoff', 'lock', 'unlock', 'shutdown', 'restart']

export function postSessionEvent(st: MockStateDTO, action: string, user?: string): SessionEvent {
  if (!SESSION_ACTIONS.includes(action as SessionEvent['action'])) throw new ApiError(400, `未知会话操作: ${action}`)
  const ev: SessionEvent = { action: action as SessionEvent['action'], at: Date.now(), user: user ?? 'Administrator' }
  st.session.events = [...st.session.events.slice(-99), ev]
  return ev
}

export function systemInfo(st: MockStateDTO): {
  product: string; edition: string; version: string; servicePack: string; apiVersion: string
  mockServer: boolean; computer: string; user: string; time: string
} {
  return {
    product: 'Windows XP WebOS',
    edition: 'Professional',
    version: '2002',
    servicePack: 'SP3',
    apiVersion: 'v1',
    mockServer: true,
    computer: 'XP-STATION',
    user: st.session?.user ?? 'Administrator',
    time: new Date().toISOString(),
  }
}

/** 重置为出厂状态（原地替换；持久化由消费方负责） */
export function resetSystem(st: MockStateDTO): { reset: boolean; version: number } {
  Object.assign(st, freshMockState())
  return { reset: true, version: st.version }
}

/* ═══════════════════════════════════════════════════════════
 * 整表替换资源（recentDocs / runHistory / printers / printJobs /
 * schedTasks / desktopPos / netDrives / audioBlobs / oeMails）
 * ═══════════════════════════════════════════════════════════ */

export type TableKey =
  | 'recentDocs' | 'runHistory' | 'printers' | 'printJobs' | 'schedTasks'
  | 'desktopPos' | 'netDrives' | 'audioBlobs' | 'oeMails'

export function putTable(st: MockStateDTO, key: TableKey, value: unknown): { count: number } {
  ;(st as unknown as Record<string, unknown>)[key] = value ?? {}
  const v = value as Array<unknown> | Record<string, unknown> | null | undefined
  const count = Array.isArray(v) ? v.length : Object.keys(v ?? {}).length
  return { count }
}

/** 删除单条音频（录音机「删除」） */
export function deleteAudio(st: MockStateDTO, path: string): void {
  delete st.audioBlobs[path]
}

/** GET /state 视图：全量快照 + 帐户密码剥离（仅派生 hasPassword，永不携带明文/哈希） */
export function stateView(st: MockStateDTO): Omit<MockStateDTO, 'accounts'> & { accounts: AccountItem[] } {
  const { accounts, ...rest } = st
  return { ...rest, accounts: accounts?.map(stripAccount) ?? [] }
}
