import { NextRequest, NextResponse } from 'next/server'
import { resetState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'

/* GET  /api/v1/system — 系统信息（连接测试/关于；user 为当前服务端会话用户）
 * POST /api/v1/system { action: 'reset' } — 重置为出厂状态 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    /* user 从会话状态读取（登录验证 /accounts/login 会更新 st.session.user） */
    const user = await withState((st) => st.session?.user ?? 'Administrator')
    return ok({
      product: 'Windows XP WebOS',
      edition: 'Professional',
      version: '2002',
      servicePack: 'SP3',
      apiVersion: 'v1',
      mockServer: true,
      computer: 'XP-STATION',
      user,
      time: new Date().toISOString(),
    })
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ action?: string }>(req)
    if (body.action !== 'reset') return fail(new Error(`未知操作: ${body.action}`))
    const seed = await resetState()
    return ok({ reset: true, version: seed.version })
  } catch (e) {
    return fail(e)
  }
}
