import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'

/* ─────────────────────────────────────────────────────────────
 * 映射网络驱动器 /api/v1/net-drives
 * GET    — 列表 [{ letter, path }]
 * PUT    { items } — 整表替换
 * POST   { letter, path } — 添加映射
 * DELETE { letter } — 断开
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).netDrives)
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ items?: Array<{ letter: string; path: string }> }>(req)
    await withState((st) => {
      st.netDrives = body.items ?? []
    })
    return ok({ count: (body.items ?? []).length })
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ letter?: string; path?: string }>(req)
    if (!body.letter || !body.path) return fail(new Error('缺少必填字段: letter, path'))
    await withState((st) => {
      st.netDrives = [...st.netDrives.filter((d) => d.letter !== body.letter), { letter: body.letter!, path: body.path! }]
    })
    return ok({ mapped: true })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ letter?: string }>(req)
    if (!body.letter) return fail(new Error('缺少必填字段: letter'))
    await withState((st) => {
      st.netDrives = st.netDrives.filter((d) => d.letter !== body.letter)
    })
    return ok({ unmapped: true })
  } catch (e) {
    return fail(e)
  }
}
