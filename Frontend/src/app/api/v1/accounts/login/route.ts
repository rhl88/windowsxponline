import { NextRequest, NextResponse } from 'next/server'
import { withState } from '@/server/mock-db'
import { ok, fail, jsonBody, requireFields } from '@/server/http'
import { stripAccount, type AccountRecord } from '@/components/xp/model'
import { verifyPassword, hashPassword, isHashed } from '@/server/passwords'

/* ─────────────────────────────────────────────────────────────
 * POST /api/v1/accounts/login — 欢迎屏/锁定屏登录验证
 *   { name, password } → { ok: true, account }（account 已剥离密码）
 *                     或 { ok: false, reason: 'no-user' | 'bad-password' }
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ name?: string; password?: string }>(req)
    requireFields(body as Record<string, unknown>, ['name'])
    const password = body.password ?? ''
    const res = await withState((st) => {
      const rec: AccountRecord | undefined = st.accounts.find((a) => a.name === body.name)
      if (!rec) return { ok: false as const, reason: 'no-user' as const }
      if (!verifyPassword(password, rec.password)) return { ok: false as const, reason: 'bad-password' as const }
      /* 旧明文密码在首次验证成功后自动升级为哈希落库（透明迁移） */
      if (!isHashed(rec.password)) rec.password = hashPassword(password)
      /* 验证通过即更新会话用户（服务端权威）；登录事件由客户端进入桌面时经 /session 统一记录，避免重复 */
      st.session = { ...st.session, user: rec.name }
      return { ok: true as const, account: stripAccount(rec) }
    })
    return ok(res)
  } catch (e) {
    return fail(e)
  }
}
