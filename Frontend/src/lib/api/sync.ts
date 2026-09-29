import { useXP } from '@/components/xp/store'
import { DEFAULT_SETTINGS, DEFAULT_VISUAL_FX, type PrintJob, type VisualFXOpts, type OeMail } from '@/components/xp/model'
import { ensureUserHomes } from '@/components/xp/fs'
import { markOffline, markOnline } from './client'
import {
  apiGetState, apiPatchSettings, apiPutRecentDocs, apiPutRunHistory, apiPutPrinters, apiPutPrintJobs,
  apiPutSchedTasks, apiPutDesktop, apiPutIE, apiPutNetDrives, apiPutAudio, apiPutOeMails,
} from './endpoints'

/* ─────────────────────────────────────────────────────────────
 * 双向同步引擎
 * ① hydrateFromApi：启动时拉取全量快照替换本地状态（服务端为数据权威）
 * ② initApiSync：订阅 store 变化 → 防抖 diff → 变化的资源整表/补丁推送
 *    - 文件树/回收站不参与 diff（由 store fs* 动作做操作级同步，见 fs-sync.ts）
 *    - hydrate 失败（脱机）时不建立基线，绝不把本地默认值推上去覆盖服务端
 * ───────────────────────────────────────────────────────────── */

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS)
const WATCH_KEYS = [
  ...SETTING_KEYS,
  'recentDocs', 'runHistory', 'printers', 'printJobs', 'schedTasks',
  'desktopPos', 'ieHistory', 'ieFavorites', 'ieHome', 'netDrives', 'audioBlobs', 'oeMails',
] as const

interface Snapshot {
  settings: Record<string, unknown>
  recentDocs: string[][]
  runHistory: string[]
  printers: Snapshot0
  printJobs: PrintJob[]
  schedTasks: Snapshot0
  desktopPos: Snapshot0
  netDrives: Snapshot0
  audioBlobs: Snapshot0
  ieHistory: Snapshot0
  ieFavorites: Snapshot0
  ieHome: string
  oeMails: Snapshot0
}
type Snapshot0 = unknown

function snap(): Snapshot {
  const s = useXP.getState() as unknown as Record<string, unknown>
  const settings: Record<string, unknown> = {}
  for (const k of SETTING_KEYS) settings[k] = s[k]
  return {
    settings,
    recentDocs: s.recentDocs as string[][],
    runHistory: s.runHistory as string[],
    printers: s.printers,
    printJobs: s.printJobs as PrintJob[],
    schedTasks: s.schedTasks,
    desktopPos: s.desktopPos,
    netDrives: s.netDrives,
    audioBlobs: s.audioBlobs,
    ieHistory: s.ieHistory,
    ieFavorites: s.ieFavorites,
    ieHome: s.ieHome as string,
    oeMails: s.oeMails,
  }
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function diffOps(prev: Snapshot, cur: Snapshot): Array<() => Promise<unknown>> {
  const ops: Array<() => Promise<unknown>> = []
  const settingsPatch: Record<string, unknown> = {}
  for (const k of SETTING_KEYS) {
    if (!eq(prev.settings[k], cur.settings[k])) settingsPatch[k] = cur.settings[k]
  }
  if (Object.keys(settingsPatch).length > 0) ops.push(() => apiPatchSettings(settingsPatch as never))
  if (!eq(prev.recentDocs, cur.recentDocs)) ops.push(() => apiPutRecentDocs(cur.recentDocs))
  if (!eq(prev.runHistory, cur.runHistory)) ops.push(() => apiPutRunHistory(cur.runHistory))
  if (!eq(prev.printers, cur.printers)) ops.push(() => apiPutPrinters(cur.printers as never))
  if (!eq(prev.printJobs, cur.printJobs)) ops.push(() => apiPutPrintJobs(cur.printJobs))
  if (!eq(prev.schedTasks, cur.schedTasks)) ops.push(() => apiPutSchedTasks(cur.schedTasks as never))
  if (!eq(prev.desktopPos, cur.desktopPos)) ops.push(() => apiPutDesktop(cur.desktopPos as never))
  if (!eq(prev.netDrives, cur.netDrives)) ops.push(() => apiPutNetDrives(cur.netDrives as never))
  if (!eq(prev.audioBlobs, cur.audioBlobs)) ops.push(() => apiPutAudio(cur.audioBlobs as never))
  const ie: { home?: string; favorites?: unknown; history?: unknown } = {}
  if (!eq(prev.ieHistory, cur.ieHistory)) ie.history = cur.ieHistory
  if (!eq(prev.ieFavorites, cur.ieFavorites)) ie.favorites = cur.ieFavorites
  if (prev.ieHome !== cur.ieHome) ie.home = cur.ieHome
  if (Object.keys(ie).length > 0) ops.push(() => apiPutIE(ie as never))
  if (!eq(prev.oeMails, cur.oeMails)) ops.push(() => apiPutOeMails(cur.oeMails as never))
  return ops
}

/* 打印作业计时器补挂：刷新后正在打印的作业重新计时完成（>8s 的直接出队） */
function rearmPrintTimers(jobs: PrintJob[]): void {
  for (const j of jobs) {
    if (j.status !== 'printing') continue
    const elapsed = Date.now() - (j.submitted ?? Date.now())
    const remain = 6500 - elapsed
    if (remain <= 0 || elapsed > 8000) {
      useXP.getState().cancelPrintJob(j.id)
    } else {
      window.setTimeout(() => {
        const cur = useXP.getState().printJobs.find((x) => x.id === j.id)
        if (cur && cur.status === 'printing') useXP.getState().cancelPrintJob(j.id)
      }, remain)
    }
  }
}

/* ── 启动 hydrate ── */
export async function hydrateFromApi(): Promise<boolean> {
  try {
    const dto = await apiGetState()
    if (!dto || !dto.fsTree || !dto.settings) throw new Error('快照结构不完整')
    /* 主目录对帐：旧后端/旧快照缺帐户主目录时客户端补齐（「我的文档」受帐户控制） */
    if (dto.accounts?.length) ensureUserHomes(dto.fsTree, dto.accounts.map((a) => a.name))
    useXP.setState((s) => ({
      fsTree: dto.fsTree,
      recycleBin: dto.recycleBin ?? [],
      ...(dto.settings as unknown as Record<string, unknown>),
      /* 旧服务端快照可能缺后加的嵌套设置——字段级兜底，防 undefined 崩溃 */
      visualFX: { ...DEFAULT_VISUAL_FX, ...((dto.settings as { visualFX?: Partial<VisualFXOpts> }).visualFX ?? {}) },
      /* 旧服务端快照缺纸牌选项时兜底（嵌套对象字段级合并） */
      solitaireOpts: { ...DEFAULT_SETTINGS.solitaireOpts, ...((dto.settings as { solitaireOpts?: Partial<typeof DEFAULT_SETTINGS.solitaireOpts> }).solitaireOpts ?? {}) },
      deskIcons: { ...((dto.settings as { deskIcons?: Record<string, boolean> }).deskIcons ?? {}) },
      deskIconOverrides: { ...((dto.settings as { deskIconOverrides?: Record<string, string> }).deskIconOverrides ?? {}) },
      recentDocs: dto.recentDocs ?? [],
      runHistory: dto.runHistory ?? [],
      printers: dto.printers ?? [],
      printJobs: dto.printJobs ?? [],
      schedTasks: dto.schedTasks ?? [],
      desktopPos: dto.desktopPos ?? {},
      ieHistory: dto.ie?.history ?? [],
      ieFavorites: dto.ie?.favorites ?? [],
      ieHome: dto.ie?.home ?? s.ieHome,
      netDrives: dto.netDrives ?? [],
      audioBlobs: dto.audioBlobs ?? {},
      oeMails: dto.oeMails ?? [],
      /* 帐户列表（欢迎屏多账号；DTO 已剥离密码，仅有 hasPassword 派生标记） */
      accounts: dto.accounts?.map((a) => ({ ...a, hint: a.hint ?? '', hasPassword: !!a.hasPassword })) ?? [],
    }))
    rearmPrintTimers(dto.printJobs ?? [])
    /* Outlook 邮件：注入模块仓库（仅一次；后续写入由模块仓库镜像回 store） */
    const { oeHydrate } = await import('@/components/xp/apps/Outlook')
    oeHydrate((dto.oeMails ?? []) as OeMail[])
    baseline = snap()
    markOnline()
    return true
  } catch (e) {
    markOffline(e)
    return false
  }
}

/* ── diff 订阅 ── */
let baseline: Snapshot | null = null
let started = false
let timer: ReturnType<typeof setTimeout> | null = null

async function flush(): Promise<void> {
  if (!baseline) return
  const cur = snap()
  const ops = diffOps(baseline, cur)
  if (ops.length === 0) return
  try {
    await Promise.all(ops.map((op) => op()))
    baseline = cur
  } catch {
    /* 脱机已在 client 层标记；保留基线，下次变更重试 */
  }
}

export function initApiSync(): void {
  if (started || typeof window === 'undefined') return
  started = true
  useXP.subscribe((s, prev) => {
    for (const k of WATCH_KEYS) {
      if ((s as unknown as Record<string, unknown>)[k] !== (prev as unknown as Record<string, unknown>)[k]) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          timer = null
          void flush()
        }, 400)
        return
      }
    }
  })
}
