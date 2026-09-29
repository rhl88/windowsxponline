import { NextRequest, NextResponse } from 'next/server'
import { readState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'
import { opRecycleRestore, opRecycleRemove } from '@/server/ops'

/* ─────────────────────────────────────────────────────────────
 * 回收站 /api/v1/recycle
 * GET    — 回收站列表
 * POST   { key? }  — 还原（缺 key = 全部还原；原位置失效回退桌面）
 * DELETE { key? }  — 彻底删除（缺 key = 清空回收站）
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).recycleBin)
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ key?: string }>(req)
    return ok(await opRecycleRestore(body.key ?? null))
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ key?: string }>(req)
    await opRecycleRemove(body.key ?? null)
    return ok({ removed: true })
  } catch (e) {
    return fail(e)
  }
}
