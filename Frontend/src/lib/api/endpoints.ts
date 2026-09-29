import { apiFetch } from './client'
import type { MockStateDTO, SettingsDTO, PrintJob, PrinterItem, SchedTask, RecycleItem, IEFavItem, IEHistItem, SessionEvent, AccountItem, OeMail } from '@/components/xp/model'
import type { FSNode } from '@/components/xp/fs'

/* ─────────────────────────────────────────────────────────────
 * 全部 /api/v1 端点的类型化封装
 * 真实后端对接时：实现同样的路由与信封结构即可，客户端零修改
 * ───────────────────────────────────────────────────────────── */

/* 系统与快照 */
/* /state 响应视角：accounts 已剥离密码（AccountItem[]，非服务端 AccountRecord[]） */
export type MockStateView = Omit<MockStateDTO, 'accounts'> & { accounts: AccountItem[] }
export const apiGetState = () => apiFetch<MockStateView>('/state')
export const apiGetSystem = () => apiFetch<{ product: string; edition: string; computer: string; user: string; time: string; mockServer: boolean }>('/system')
export const apiResetSystem = () => apiFetch<{ reset: boolean }>('/system', { method: 'POST', body: JSON.stringify({ action: 'reset' }) })
export const apiPostSession = (action: SessionEvent['action'], user?: string) =>
  apiFetch<SessionEvent>('/session', { method: 'POST', body: JSON.stringify({ action, user }) })

/* 用户帐户（欢迎屏多账号登录；操作级同步——不走 diff 整表，避免无密码客户端覆盖服务端） */
export const apiGetAccounts = () => apiFetch<AccountItem[]>('/accounts')
export const apiCreateAccount = (fields: { name: string; password?: string; hint?: string; type?: string; avatar?: string }) =>
  apiFetch<AccountItem>('/accounts', { method: 'POST', body: JSON.stringify(fields) })
export const apiPatchAccount = (name: string, patch: { newName?: string; password?: string; hint?: string; avatar?: string }) =>
  apiFetch<AccountItem>('/accounts', { method: 'PATCH', body: JSON.stringify({ name, ...patch }) })
export const apiDeleteAccount = (name: string) =>
  apiFetch<{ removed: string }>('/accounts', { method: 'DELETE', body: JSON.stringify({ name }) })
export const apiLoginAccount = (name: string, password: string) =>
  apiFetch<{ ok: boolean; reason?: 'no-user' | 'bad-password'; account?: AccountItem }>('/accounts/login', { method: 'POST', body: JSON.stringify({ name, password }) })

/* 文件系统 */
export const apiFsCreate = (parentPath: string[], node: FSNode) =>
  apiFetch<{ name: string }>('/fs', { method: 'POST', body: JSON.stringify({ parentPath, node }) })
export const apiFsWrite = (parentPath: string[], name: string, content: string) =>
  apiFetch<{ created: boolean; name: string }>('/fs/write', { method: 'POST', body: JSON.stringify({ parentPath, name, content }) })
export const apiFsRename = (path: string[], newName: string) =>
  apiFetch<{ name: string }>('/fs', { method: 'PATCH', body: JSON.stringify({ path, newName }) })
export const apiFsUpdate = (path: string[], patch: Partial<FSNode>) =>
  apiFetch<{ updated: boolean }>('/fs', { method: 'PATCH', body: JSON.stringify({ path, patch }) })
export const apiFsMove = (paths: string[][], destPath: string[]) =>
  apiFetch<{ moved: number }>('/fs/move', { method: 'POST', body: JSON.stringify({ paths, destPath }) })
export const apiFsCopy = (paths: string[][], destPath: string[]) =>
  apiFetch<{ copied: number }>('/fs/copy', { method: 'POST', body: JSON.stringify({ paths, destPath }) })
export const apiFsDelete = (paths: string[][], opts?: { permanent?: boolean; items?: RecycleItem[] }) =>
  apiFetch<{ deleted: number }>('/fs', { method: 'DELETE', body: JSON.stringify({ paths, permanent: opts?.permanent, items: opts?.items }) })

/* 回收站 */
export const apiRecycleRestore = (key?: string) => apiFetch<{ restored: number }>('/recycle', { method: 'POST', body: JSON.stringify({ key }) })
export const apiRecycleRemove = (key?: string) => apiFetch<{ removed: boolean }>('/recycle', { method: 'DELETE', body: JSON.stringify({ key }) })

/* 设置 */
export const apiPatchSettings = (patch: Partial<SettingsDTO>) =>
  apiFetch<{ applied: string[] }>('/settings', { method: 'PATCH', body: JSON.stringify(patch) })

/* 列表类资源（客户端采用整表替换同步） */
export const apiPutRecentDocs = (items: string[][]) => apiFetch<{ count: number }>('/recent-docs', { method: 'PUT', body: JSON.stringify({ items }) })
export const apiPutRunHistory = (items: string[]) => apiFetch<{ count: number }>('/run-history', { method: 'PUT', body: JSON.stringify({ items }) })
export const apiPutPrinters = (items: PrinterItem[]) => apiFetch<{ count: number }>('/printers', { method: 'PUT', body: JSON.stringify({ items }) })
export const apiPutPrintJobs = (jobs: PrintJob[]) => apiFetch<{ count: number }>('/print-jobs', { method: 'PUT', body: JSON.stringify({ jobs }) })
export const apiPutOeMails = (items: OeMail[]) => apiFetch<{ count: number }>('/oe-mails', { method: 'PUT', body: JSON.stringify({ items }) })
export const apiPutSchedTasks = (items: SchedTask[]) => apiFetch<{ count: number }>('/sched-tasks', { method: 'PUT', body: JSON.stringify({ items }) })
export const apiPutDesktop = (positions: Record<string, { x: number; y: number }>) =>
  apiFetch<{ count: number }>('/desktop', { method: 'PUT', body: JSON.stringify({ positions }) })
export const apiPutIE = (fields: { home?: string; favorites?: IEFavItem[]; history?: IEHistItem[] }) =>
  apiFetch<{ applied: string[] }>('/ie', { method: 'PUT', body: JSON.stringify(fields) })
export const apiPutNetDrives = (items: Array<{ letter: string; path: string }>) =>
  apiFetch<{ count: number }>('/net-drives', { method: 'PUT', body: JSON.stringify({ items }) })
export const apiPutAudio = (blobs: Record<string, string>) => apiFetch<{ count: number }>('/audio', { method: 'PUT', body: JSON.stringify({ blobs }) })
