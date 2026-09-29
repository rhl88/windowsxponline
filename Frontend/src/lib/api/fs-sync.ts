import type { RecycleItem } from '@/components/xp/model'
import type { FSNode } from '@/components/xp/fs'
import {
  apiFsCreate, apiFsWrite, apiFsRename, apiFsUpdate, apiFsMove, apiFsCopy, apiFsDelete,
  apiRecycleRestore, apiRecycleRemove, apiPostSession,
} from './endpoints'
import type { SessionEvent } from '@/components/xp/model'

/* ─────────────────────────────────────────────────────────────
 * 文件系统操作级同步（store fs* 动作镜像调用；失败标记脱机不阻断 UI）
 * 注意：本模块不得 import store（避免循环依赖）——store 单向依赖本模块
 * 失败反馈：广播 xp-fs-sync-error 事件（XPSystem 监听后气泡提示，带节流防刷屏）
 * ───────────────────────────────────────────────────────────── */

const sw = (op: string, p: Promise<unknown>) =>
  void p.catch(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('xp-fs-sync-error', { detail: { op } }))
    }
  })

export const fsSync = {
  create: (parentPath: string[], node: FSNode) => sw('create', apiFsCreate(parentPath, node)),
  write: (parentPath: string[], name: string, content: string) => sw('write', apiFsWrite(parentPath, name, content)),
  rename: (path: string[], newName: string) => sw('rename', apiFsRename(path, newName)),
  update: (path: string[], patch: Partial<FSNode>) => sw('update', apiFsUpdate(path, patch)),
  move: (paths: string[][], destPath: string[]) => sw('move', apiFsMove(paths, destPath)),
  copy: (paths: string[][], destPath: string[]) => sw('copy', apiFsCopy(paths, destPath)),
  del: (paths: string[][], opts?: { permanent?: boolean; items?: RecycleItem[] }) => sw('del', apiFsDelete(paths, opts)),
  restore: (key?: string) => sw('restore', apiRecycleRestore(key)),
  recycleRemove: (key?: string) => sw('remove', apiRecycleRemove(key)),
  session: (action: SessionEvent['action'], user?: string) => sw('session', apiPostSession(action, user)),
}
