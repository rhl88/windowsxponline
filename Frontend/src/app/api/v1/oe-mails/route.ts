import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'
import type { OeMail } from '@/components/xp/model'

/* ─────────────────────────────────────────────────────────────
 * Outlook Express 邮件 /api/v1/oe-mails
 * GET  — 整表（全部文件夹）
 * PUT  { items } — 整表替换（发件/已读/删除等全部邮件操作落库）
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).oeMails ?? [])
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ items?: OeMail[] }>(req)
    await withState((st) => {
      st.oeMails = body.items ?? []
    })
    return ok({ count: (body.items ?? []).length })
  } catch (e) {
    return fail(e)
  }
}
