import type { FSNode } from '@/components/xp/fs'
import type { RecycleItem } from '@/components/xp/model'
import { withState } from './mock-db'
import * as ops from '@/components/xp/state-ops'

/* ─────────────────────────────────────────────────────────────
 * 文件系统 / 回收站 领域操作（服务端薄壳）
 * 领域逻辑本体在 @/components/xp/state-ops（环境无关，与浏览器
 * Local 引擎共用同一实现）；本文件仅做 withState 包装并保持
 * 既有导出签名 → API 路由零改动。
 * 客户端为唯一写入方（单用户），服务端以同一套纯函数复算，保证落盘一致。
 * ───────────────────────────────────────────────────────────── */

export async function opFsCreate(parentPath: string[], node: FSNode): Promise<{ name: string }> {
  return withState((st) => ops.fsCreate(st, parentPath, node))
}

export async function opFsWrite(parentPath: string[], name: string, content: string): Promise<{ created: boolean; name: string }> {
  return withState((st) => ops.fsWrite(st, parentPath, name, content))
}

export async function opFsRename(path: string[], newName: string): Promise<{ name: string }> {
  return withState((st) => ops.fsRename(st, path, newName))
}

export async function opFsUpdate(path: string[], patch: Partial<FSNode>): Promise<void> {
  await withState((st) => {
    ops.fsUpdate(st, path, patch)
  })
}

export async function opFsMove(paths: string[][], destPath: string[]): Promise<{ moved: number }> {
  return withState((st) => ops.fsMove(st, paths, destPath))
}

export async function opFsCopy(paths: string[][], destPath: string[]): Promise<{ copied: number }> {
  return withState((st) => ops.fsCopy(st, paths, destPath))
}

export async function opFsDelete(paths: string[][], opts?: { permanent?: boolean; items?: RecycleItem[] }): Promise<{ deleted: number }> {
  return withState((st) => ops.fsDelete(st, paths, opts))
}

export async function opRecycleRestore(key: string | null): Promise<{ restored: number }> {
  return withState((st) => ops.recycleRestore(st, key))
}

export async function opRecycleRemove(key: string | null): Promise<void> {
  await withState((st) => {
    ops.recycleRemove(st, key)
  })
}
