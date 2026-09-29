import { NextResponse } from 'next/server'
import { readState } from '@/server/mock-db'
import { ok, fail } from '@/server/http'
import { stripAccount } from '@/components/xp/model'

/* GET /api/v1/state — 全量快照（客户端启动 hydrate 用）
 * 帐户密码剥离：仅返回派生 hasPassword，永不携带明文 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    const st = await readState()
    const { accounts, ...rest } = st
    return ok({ ...rest, accounts: accounts?.map(stripAccount) ?? [] })
  } catch (e) {
    return fail(e)
  }
}
