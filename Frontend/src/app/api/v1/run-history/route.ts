import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'

/* ─────────────────────────────────────────────────────────────
 * 运行对话框 MRU 历史 /api/v1/run-history（XP 上限 26 条）
 * GET    — 列表（最近在前）
 * PUT    { items } — 整表替换
 * POST   { item }  — 追加一条（去重置顶）
 * DELETE — 清空
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).runHistory)
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ items?: string[] }>(req)
    const items = (body.items ?? []).slice(0, 26)
    await withState((st) => {
      st.runHistory = items
    })
    return ok({ count: items.length })
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ item?: string }>(req)
    const c = (body.item ?? '').trim()
    if (!c) return fail(new Error('缺少必填字段: item'))
    await withState((st) => {
      st.runHistory = [c, ...st.runHistory.filter((x) => x.toLowerCase() !== c.toLowerCase())].slice(0, 26)
    })
    return ok({ added: true })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    await withState((st) => {
      st.runHistory = []
    })
    return ok({ cleared: true })
  } catch (e) {
    return fail(e)
  }
}
