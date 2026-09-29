import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, jsonBody, requireFields } from '@/server/http'
import { opFsMove } from '@/server/ops'

/* POST /api/v1/fs/move { paths, destPath } — 移动（防「移到自身/子目录」，服务端去重命名） */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ paths?: string[][]; destPath?: string[] }>(req)
    requireFields(body, ['paths', 'destPath'])
    return ok(await opFsMove(body.paths!, body.destPath!))
  } catch (e) {
    return fail(e)
  }
}
