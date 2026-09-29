import { NextRequest, NextResponse } from 'next/server'
import { withState, ApiError } from '@/server/mock-db'
import { ok, fail, jsonBody, requireFields } from '@/server/http'
import { stripAccount, ACCOUNT_AVATARS, type AccountRecord, type AccountType } from '@/components/xp/model'
import { hashPassword } from '@/server/passwords'
import { DNS_PATH, freshUserHome, mutateAt, ensureDatesInPlace, type FSNode } from '@/components/xp/fs'

/* ─────────────────────────────────────────────────────────────
 * /api/v1/accounts — 用户帐户资源（欢迎屏多账号登录体系）
 *   GET    → 帐户列表（密码剥离，派生 hasPassword）
 *   POST   → 创建帐户 { name, password?, hint?, type?, avatar? }（同步种子主目录）
 *   PATCH  → 更改密码/提示/头像/名称 { name, newName?, password?, hint?, avatar? }（改名同步改主目录）
 *   DELETE → 删除帐户 { name }（内置 Administrator/Guest 不可删；同步移除主目录）
 * 登录验证见子路由 /api/v1/accounts/login
 * 主目录（My Documents/桌面/快速启动…）完全受帐户资源控制：增/删/改名联动
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPES: AccountType[] = ['admin', 'user', 'guest']
const BUILTIN = ['Administrator', 'Guest']

function findAccount(st: { accounts: AccountRecord[] }, name: string): AccountRecord | undefined {
  return st.accounts.find((a) => a.name === name)
}

/* 主目录生命周期（服务端权威；客户端 ControlPanel 镜像同样语义） */
function seedHome(st: { fsTree: FSNode }, name: string): void {
  st.fsTree = mutateAt(st.fsTree, DNS_PATH, (children) =>
    children.some((c) => c.name === name) ? children : [...children, freshUserHome(name)],
  )
  ensureDatesInPlace(st.fsTree)
}

function removeHome(st: { fsTree: FSNode }, name: string): void {
  st.fsTree = mutateAt(st.fsTree, DNS_PATH, (children) => children.filter((c) => c.name !== name))
}

function renameHome(st: { fsTree: FSNode }, oldName: string, newName: string): void {
  st.fsTree = mutateAt(st.fsTree, DNS_PATH, (children) =>
    children.map((c) => (c.name === oldName ? { ...c, name: newName, modified: new Date().toISOString() } : c)),
  )
}

export async function GET(): Promise<NextResponse> {
  try {
    const list = await withState((st) => st.accounts.map(stripAccount))
    return ok(list)
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ name?: string; password?: string; hint?: string; type?: string; avatar?: string }>(req)
    requireFields(body as Record<string, unknown>, ['name'])
    const name = (body.name ?? '').trim()
    if (name.length < 1 || name.length > 20) throw new ApiError(400, '帐户名长度须在 1-20 个字符之间')
    const type = (TYPES.includes(body.type as AccountType) ? body.type : 'user') as AccountType
    const avatar = ACCOUNT_AVATARS.includes(body.avatar ?? '') ? (body.avatar as string) : 'avatar-admin'
    const rec: AccountRecord = {
      name,
      type,
      avatar,
      hint: (body.hint ?? '').slice(0, 60),
      password: hashPassword(body.password ?? ''),
    }
    const created = await withState((st) => {
      if (findAccount(st, name)) throw new ApiError(409, `帐户「${name}」已存在`)
      st.accounts = [...st.accounts, rec]
      seedHome(st, name)
      return stripAccount(rec)
    })
    return ok(created, 201)
  } catch (e) {
    return fail(e)
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ name?: string; newName?: string; password?: string; hint?: string; avatar?: string }>(req)
    requireFields(body as Record<string, unknown>, ['name'])
    const updated = await withState((st) => {
      const rec = findAccount(st, body.name as string)
      if (!rec) throw new ApiError(404, `帐户「${body.name}」不存在`)
      if (body.newName !== undefined) {
        const nn = body.newName.trim()
        if (nn.length < 1 || nn.length > 20) throw new ApiError(400, '帐户名长度须在 1-20 个字符之间')
        if (BUILTIN.includes(rec.name)) throw new ApiError(403, '内置帐户不可重命名')
        if (st.accounts.some((a) => a.name === nn)) throw new ApiError(409, `帐户「${nn}」已存在`)
        renameHome(st, rec.name, nn)
        rec.name = nn
      }
      if (body.password !== undefined) rec.password = hashPassword(body.password) /* 明文仅请求中存在，落库即哈希 */
      if (body.hint !== undefined) rec.hint = body.hint.slice(0, 60)
      if (body.avatar !== undefined && ACCOUNT_AVATARS.includes(body.avatar)) rec.avatar = body.avatar
      return stripAccount(rec)
    })
    return ok(updated)
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ name?: string }>(req)
    requireFields(body as Record<string, unknown>, ['name'])
    await withState((st) => {
      const rec = findAccount(st, body.name as string)
      if (!rec) throw new ApiError(404, `帐户「${body.name}」不存在`)
      if (BUILTIN.includes(rec.name)) throw new ApiError(403, `内置帐户「${rec.name}」不可删除`)
      st.accounts = st.accounts.filter((a) => a.name !== rec.name)
      removeHome(st, rec.name)
      return true
    })
    return ok({ removed: body.name })
  } catch (e) {
    return fail(e)
  }
}
