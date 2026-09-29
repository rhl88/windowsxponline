import { NextRequest, NextResponse } from 'next/server'
import { readState } from '@/server/mock-db'
import { ok, fail, jsonBody, requireFields } from '@/server/http'
import { opFsCreate, opFsRename, opFsUpdate, opFsDelete } from '@/server/ops'
import { resolvePath } from '@/components/xp/fs'
import type { FSNode, RecycleItem } from '@/components/xp/model'

/* ─────────────────────────────────────────────────────────────
 * 文件系统资源 /api/v1/fs
 * GET    ?path=a/b          — 全树或按路径取节点
 * POST   { parentPath, node }            — 新建文件/文件夹（node 为完整节点，服务端去重命名）
 * PATCH  { path, newName }  | { path, patch } — 重命名（重算关联）| 属性补丁
 * DELETE { paths, permanent?, items? }   — 删除（默认进回收站）
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const st = await readState()
    const pathParam = req.nextUrl.searchParams.get('path')
    if (!pathParam) return ok({ name: st.fsTree.name, children: st.fsTree.children })
    const node = resolvePath(pathParam.split('/'), st.fsTree)
    if (!node) return NextResponse.json({ ok: false, error: { code: 404, message: `路径不存在: ${pathParam}` } }, { status: 404 })
    return ok(node)
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ parentPath?: string[]; node?: FSNode }>(req)
    requireFields(body, ['parentPath', 'node'])
    return ok(await opFsCreate(body.parentPath!, body.node!))
  } catch (e) {
    return fail(e)
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ path?: string[]; newName?: string; patch?: Partial<FSNode> }>(req)
    requireFields(body, ['path'])
    if (body.newName !== undefined) return ok(await opFsRename(body.path!, body.newName))
    if (body.patch !== undefined) {
      await opFsUpdate(body.path!, body.patch)
      return ok({ updated: true })
    }
    return fail(new Error('需要 newName 或 patch 字段'))
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ paths?: string[][]; permanent?: boolean; items?: RecycleItem[] }>(req)
    requireFields(body, ['paths'])
    return ok(await opFsDelete(body.paths!, { permanent: body.permanent, items: body.items }))
  } catch (e) {
    return fail(e)
  }
}
