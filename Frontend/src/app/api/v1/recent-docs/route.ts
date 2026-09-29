import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'

/* ─────────────────────────────────────────────────────────────
 * 我最近的文档 /api/v1/recent-docs（XP 上限 15 条）
 * GET    — 列表（string[][] 路径段数组，最近在前）
 * PUT    { items } — 整表替换（客户端实际使用的方式）
 * POST   { item }  — 追加一条（去重置顶）
 * DELETE — 清空
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).recentDocs)
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ items?: string[][] }>(req)
    const items = (body.items ?? []).slice(0, 15)
    await withState((st) => {
      st.recentDocs = items
    })
    return ok({ count: items.length })
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ item?: string[] }>(req)
    if (!body.item) return fail(new Error('缺少必填字段: item'))
    await withState((st) => {
      st.recentDocs = [body.item!, ...st.recentDocs.filter((x) => x.join('/') !== body.item!.join('/'))].slice(0, 15)
    })
    return ok({ added: true })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    await withState((st) => {
      st.recentDocs = []
    })
    return ok({ cleared: true })
  } catch (e) {
    return fail(e)
  }
}
