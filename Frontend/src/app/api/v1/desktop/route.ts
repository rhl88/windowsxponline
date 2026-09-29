import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'

/* ─────────────────────────────────────────────────────────────
 * 桌面布局 /api/v1/desktop — 图标自由摆放位置（key → {x,y}）
 * GET — 位置表
 * PUT { positions } — 整表替换
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).desktopPos)
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ positions?: Record<string, { x: number; y: number }> }>(req)
    await withState((st) => {
      st.desktopPos = body.positions ?? {}
    })
    return ok({ count: Object.keys(body.positions ?? {}).length })
  } catch (e) {
    return fail(e)
  }
}
