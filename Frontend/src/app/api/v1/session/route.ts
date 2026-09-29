import { NextRequest, NextResponse } from 'next/server'
import { withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'
import type { SessionEvent } from '@/components/xp/model'

/* GET  /api/v1/session — 当前会话信息
 * POST /api/v1/session { action: 'login'|'logoff'|'lock'|'unlock'|'shutdown'|'restart' } */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIONS: SessionEvent['action'][] = ['login', 'logoff', 'lock', 'unlock', 'shutdown', 'restart']

export async function GET(): Promise<NextResponse> {
  try {
    const session = await withState((st) => st.session)
    return ok(session)
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ action?: string; user?: string }>(req)
    const action = body.action as SessionEvent['action']
    if (!ACTIONS.includes(action)) return fail(new Error(`未知会话操作: ${body.action}`))
    const ev: SessionEvent = { action, at: Date.now(), user: body.user ?? 'Administrator' }
    await withState((st) => {
      st.session.events = [...st.session.events.slice(-99), ev]
    })
    return ok(ev)
  } catch (e) {
    return fail(e)
  }
}
