import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'
import type { IEFavItem, IEHistItem } from '@/components/xp/model'

/* ─────────────────────────────────────────────────────────────
 * Internet Explorer 数据 /api/v1/ie
 * GET    — { home, favorites, history }
 * PUT    { home? , favorites? , history? } — 更新提供的字段
 * DELETE — 清空历史记录
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).ie)
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ home?: string; favorites?: IEFavItem[]; history?: IEHistItem[] }>(req)
    const applied: string[] = []
    await withState((st) => {
      if (body.home !== undefined) {
        st.ie.home = body.home
        applied.push('home')
      }
      if (body.favorites !== undefined) {
        st.ie.favorites = body.favorites
        applied.push('favorites')
      }
      if (body.history !== undefined) {
        st.ie.history = body.history.slice(0, 60)
        applied.push('history')
      }
    })
    return ok({ applied })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    await withState((st) => {
      st.ie.history = []
    })
    return ok({ cleared: true })
  } catch (e) {
    return fail(e)
  }
}
