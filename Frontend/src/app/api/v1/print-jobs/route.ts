import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'
import type { PrintJob } from '@/components/xp/model'

/* ─────────────────────────────────────────────────────────────
 * 打印队列 /api/v1/print-jobs
 * GET    — 队列列表
 * PUT    { jobs } — 整表替换（客户端同步用）
 * POST   { printer, doc, pages, size? } — 入队（id 由服务端分配）
 * PATCH  { id, status } — 暂停 'paused' / 恢复 'printing'
 * DELETE { id? , printer? } — 取消单个（id）或整台打印机的全部作业
 * 注：作业完成出队由客户端计时器驱动（mock 语义，真实后端可改为服务端推进）
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).printJobs)
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ jobs?: PrintJob[] }>(req)
    await withState((st) => {
      st.printJobs = body.jobs ?? []
    })
    return ok({ count: (body.jobs ?? []).length })
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ printer?: string; doc?: string; pages?: number; size?: string }>(req)
    if (!body.printer || !body.doc) return fail(new Error('缺少必填字段: printer, doc'))
    const job = await withState((st) => {
      const id = Math.max(0, ...st.printJobs.map((j) => j.id)) + 1
      const j: PrintJob = {
        id,
        printer: body.printer!,
        doc: body.doc!,
        pages: body.pages ?? 1,
        size: body.size ?? '32.5 KB',
        owner: st.session?.user ?? 'Administrator',
        submitted: Date.now(),
        status: 'printing',
      }
      st.printJobs = [...st.printJobs, j]
      return j
    })
    return ok(job)
  } catch (e) {
    return fail(e)
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ id?: number; status?: 'printing' | 'paused' }>(req)
    if (body.id === undefined || !body.status) return fail(new Error('缺少必填字段: id, status'))
    await withState((st) => {
      st.printJobs = st.printJobs.map((j) => (j.id === body.id ? { ...j, status: body.status! } : j))
    })
    return ok({ updated: true })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ id?: number; printer?: string }>(req)
    if (body.id === undefined && !body.printer) return fail(new Error('需要 id 或 printer 字段'))
    await withState((st) => {
      st.printJobs = st.printJobs.filter((j) => (body.id !== undefined ? j.id !== body.id : j.printer !== body.printer))
    })
    return ok({ cancelled: true })
  } catch (e) {
    return fail(e)
  }
}
