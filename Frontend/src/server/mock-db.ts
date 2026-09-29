import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { freshMockState, MOCK_STATE_VERSION, DEFAULT_SETTINGS, DEFAULT_ACCOUNTS, DEFAULT_OE_MAILS, type MockStateDTO } from '@/components/xp/model'
import { hashPassword, isHashed } from '@/server/passwords'
import { ensureDatesInPlace, ensureUserHomes, resolvePath, DNS_PATH } from '@/components/xp/fs'
/* ApiError 定义已提炼至环境无关的 state-ops（浏览器 Local 引擎共用）；此处 re-export 保持服务端既有 import 兼容 */
export { ApiError } from '@/components/xp/state-ops'

/* 兼容的历史快照版本（读取时逐级迁移到当前版本，保留用户数据不重置） */
const LEGACY_STATE_VERSIONS = [1]

/* ─────────────────────────────────────────────────────────────
 * 本地 JSON 模拟数据库
 * - 持久化文件：db/xp-state.json（首次访问自动从 freshMockState 播种）
 * - 读写互斥：进程内 promise 链串行化，避免并发写坏 JSON
 * - 供 /api/v1/* 全部路由使用；将来替换真实后端时仅改此层
 * ───────────────────────────────────────────────────────────── */

/* XP_STATE_FILE 可覆盖状态文件位置（standalone 产物会 chdir 到自身目录，需要显式指定；
 * 未设置时按 cwd 解析——dev 与本地 npm run dev 场景均为项目根） */
const STATE_FILE = process.env.XP_STATE_FILE
  ? path.resolve(process.env.XP_STATE_FILE)
  : path.join(process.cwd(), 'db', 'xp-state.json')

let chain: Promise<unknown> = Promise.resolve()

async function writeStateFile(st: MockStateDTO): Promise<void> {
  const tmp = `${STATE_FILE}.tmp`
  await fsp.mkdir(path.dirname(STATE_FILE), { recursive: true })
  await fsp.writeFile(tmp, JSON.stringify(st), 'utf-8')
  await fsp.rename(tmp, STATE_FILE)
}

export async function readState(): Promise<MockStateDTO> {
  try {
    const raw = await fsp.readFile(STATE_FILE, 'utf-8')
    const st = JSON.parse(raw) as MockStateDTO
    const known = st.version === MOCK_STATE_VERSION || LEGACY_STATE_VERSIONS.includes(st.version)
    if (st && known && st.fsTree && st.settings) {
      if (st.version !== MOCK_STATE_VERSION) {
        migrateLegacyState(st)
        await writeStateFile(st) /* 迁移立即落盘，避免仅在内存（重启后丢失） */
      }
      /* 字段级兜底：旧快照缺少后加的嵌套设置时补默认值（不破坏既有数据） */
      if (!st.settings.visualFX) st.settings.visualFX = { ...DEFAULT_SETTINGS.visualFX }
      if (!st.settings.deskIcons) st.settings.deskIcons = { ...DEFAULT_SETTINGS.deskIcons }
      if (!st.settings.deskIconOverrides) st.settings.deskIconOverrides = { ...DEFAULT_SETTINGS.deskIconOverrides }
      if (!st.settings.wallpaperPos) st.settings.wallpaperPos = DEFAULT_SETTINGS.wallpaperPos
      if (!st.settings.bgColor) st.settings.bgColor = DEFAULT_SETTINGS.bgColor
      if (st.settings.customWallpaper === undefined) { st.settings.customWallpaper = null; st.settings.customWallpaperName = '' }
      if (st.settings.desktopSort === undefined) st.settings.desktopSort = DEFAULT_SETTINGS.desktopSort
      if (st.settings.solitaireBack === undefined) st.settings.solitaireBack = DEFAULT_SETTINGS.solitaireBack
      if (!st.settings.solitaireOpts) st.settings.solitaireOpts = { ...DEFAULT_SETTINGS.solitaireOpts }
      if (st.settings.classicScheme === undefined) st.settings.classicScheme = DEFAULT_SETTINGS.classicScheme
      if (st.settings.alignGrid === undefined) st.settings.alignGrid = DEFAULT_SETTINGS.alignGrid
      if (!st.settings.tbTitles) st.settings.tbTitles = { ...DEFAULT_SETTINGS.tbTitles }
      /* 注册表树/输入法（b1 批新增）：旧快照补种子（用户已编辑过的树不动） */
      if (!st.settings.regTree) st.settings.regTree = structuredClone(DEFAULT_SETTINGS.regTree)
      if (st.settings.inputLang === undefined) st.settings.inputLang = DEFAULT_SETTINGS.inputLang
      if (st.settings.langBarOn === undefined) st.settings.langBarOn = DEFAULT_SETTINGS.langBarOn
      /* 旧快照无帐户体系时补种子帐户（Administrator 密码登录/来宾） */
      if (!st.accounts) st.accounts = structuredClone(DEFAULT_ACCOUNTS)
      /* OE 邮件（b2 批新增）：旧快照补种子（用户已持久化的邮件不动） */
      if (!st.oeMails) st.oeMails = structuredClone(DEFAULT_OE_MAILS)
      /* 密码哈希迁移（b3 批）：存储层不落明文——所有非哈希密码统一转 SHA-256 加盐
       * （含种子 Administrator/2001；登录验证兼容双格式，用户无感知） */
      let pwMigrated = false
      for (const a of st.accounts) {
        if (a.password && !isHashed(a.password)) { a.password = hashPassword(a.password); pwMigrated = true }
      }
      if (pwMigrated) await writeStateFile(st) /* 哈希化立即落盘（幂等：已哈希则不再触发） */
      /* 主目录对帐：为每个帐户种子缺失主目录（旧快照迁移——只有 Administrator
       * 主目录的快照会自动补出其余帐户的「我的文档」；幂等，已有主目录不动） */
      ensureUserHomes(st.fsTree, st.accounts.map((a) => a.name))
      /* 旧快照静态树补时间戳（与客户端种子同一确定性函数，幂等） */
      ensureDatesInPlace(st.fsTree)
      return st
    }
    throw new Error('state file incompatible')
  } catch {
    /* 不存在或损坏 → 播种初始状态 */
    const seed = freshMockState()
    await writeStateFile(seed)
    return seed
  }
}

/* 历史快照迁移（原地修改；幂等）
 * v1→v2（d22）：① 下线演示帐户王小明——移除帐户记录与主目录；
 *   ② Administrator 改为密码登录：仅旧「空密码」记录补默认密码+提示
 *   （用户后来主动设置/清除过的密码不动，避免覆盖用户意愿）；
 *   ③ 迁移时会话若在被删帐户上，回落 Administrator */
function migrateLegacyState(st: MockStateDTO): void {
  const REMOVED_SEED = '王小明'
  const had = st.accounts?.some((a) => a.name === REMOVED_SEED) ?? false
  if (had) {
    st.accounts = st.accounts.filter((a) => a.name !== REMOVED_SEED)
    const dns = resolvePath(DNS_PATH, st.fsTree)
    if (dns?.children) dns.children = dns.children.filter((c) => c.name !== REMOVED_SEED)
  }
  const seedAdmin = DEFAULT_ACCOUNTS.find((a) => a.name === 'Administrator')
  const admin = st.accounts?.find((a) => a.name === 'Administrator')
  if (seedAdmin && admin && admin.password === '') {
    admin.password = seedAdmin.password
    admin.hint = seedAdmin.hint
  }
  if (st.session?.user === REMOVED_SEED) {
    st.session = { ...st.session, user: 'Administrator' }
  }
  st.version = MOCK_STATE_VERSION
}

/* 串行化「读-改-写」：同一时刻仅一个变更在途 */
export function withState<T>(mutator: (st: MockStateDTO) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const st = await readState()
    const result = await mutator(st)
    await writeStateFile(st)
    return result
  })
  chain = run.catch(() => undefined)
  return run
}

/* 重置为出厂状态（「API 数据源设置」对话框 / POST /api/v1/system {action:"reset"}）
 * 领域逻辑见 state-ops.resetSystem；此处负责落盘 */
export async function resetState(): Promise<MockStateDTO> {
  const seed = freshMockState()
  await withState((st) => {
    Object.assign(st, seed)
  })
  return seed
}

/* ⚠️ 注意：mock-db 不再定义 ApiError（历史定义已移至 state-ops 并由上方 re-export） */
