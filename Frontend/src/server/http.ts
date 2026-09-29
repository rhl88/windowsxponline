import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from './mock-db'

/* ─────────────────────────────────────────────────────────────
 * /api/v1 统一响应封装
 * 成功：{ "ok": true,  "data": ... }
 * 失败：{ "ok": false, "error": { "code": number, "message": string } }
 * 真实后端对接时保持该信封结构即可无缝替换。
 * ───────────────────────────────────────────────────────────── */

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status })
}

export function fail(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ ok: false, error: { code: e.status, message: e.message } }, { status: e.status })
  }
  const msg = e instanceof Error ? e.message : String(e)
  return NextResponse.json({ ok: false, error: { code: 500, message: msg } }, { status: 500 })
}

/* 解析 JSON 请求体（空体返回 {}） */
export async function jsonBody<T extends Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    const text = await req.text()
    if (!text) return {} as T
    return JSON.parse(text) as T
  } catch {
    throw new ApiError(400, '请求体不是合法的 JSON')
  }
}

/* 必填字段校验 */
export function requireFields<T extends Record<string, unknown>>(body: T, fields: Array<keyof T>): void {
  for (const f of fields) {
    const v = body[f]
    if (v === undefined || v === null || (typeof v === 'string' && v === '')) {
      throw new ApiError(400, `缺少必填字段: ${String(f)}`)
    }
  }
}
