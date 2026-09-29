import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'

/* ─────────────────────────────────────────────────────────────
 * 录音机音频 /api/v1/audio — 录音作品（path → data URL）
 * GET    — 全部音频映射
 * PUT    { blobs } — 整表替换（data URL 可能较大，建议仅在变更时提交）
 * DELETE { path }  — 删除单条
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).audioBlobs)
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ blobs?: Record<string, string> }>(req)
    await withState((st) => {
      st.audioBlobs = body.blobs ?? {}
    })
    return ok({ count: Object.keys(body.blobs ?? {}).length })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ path?: string }>(req)
    if (!body.path) return fail(new Error('缺少必填字段: path'))
    await withState((st) => {
      delete st.audioBlobs[body.path!]
    })
    return ok({ deleted: true })
  } catch (e) {
    return fail(e)
  }
}
