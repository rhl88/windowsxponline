import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, jsonBody, requireFields } from '@/server/http'
import { opFsWrite } from '@/server/ops'

/* POST /api/v1/fs/write { parentPath, name, content } — 写文件内容（存在则更新，不存在则创建） */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ parentPath?: string[]; name?: string; content?: string }>(req)
    requireFields(body, ['parentPath', 'name'])
    return ok(await opFsWrite(body.parentPath!, body.name!, body.content ?? ''))
  } catch (e) {
    return fail(e)
  }
}
