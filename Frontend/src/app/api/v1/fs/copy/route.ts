import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, jsonBody, requireFields } from '@/server/http'
import { opFsCopy } from '@/server/ops'

/* POST /api/v1/fs/copy { paths, destPath } — 复制（服务端去重命名） */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ paths?: string[][]; destPath?: string[] }>(req)
    requireFields(body, ['paths', 'destPath'])
    return ok(await opFsCopy(body.paths!, body.destPath!))
  } catch (e) {
    return fail(e)
  }
}
