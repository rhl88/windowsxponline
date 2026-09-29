import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'
import type { SchedTask } from '@/components/xp/model'

/* ─────────────────────────────────────────────────────────────
 * 任务计划 /api/v1/sched-tasks
 * GET    — 列表
 * PUT    { items } — 整表替换
 * POST   { task }  — 添加/覆盖同名的任务
 * DELETE { name }  — 删除
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).schedTasks)
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ items?: SchedTask[] }>(req)
    await withState((st) => {
      st.schedTasks = body.items ?? []
    })
    return ok({ count: (body.items ?? []).length })
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ task?: SchedTask }>(req)
    if (!body.task) return fail(new Error('缺少必填字段: task'))
    await withState((st) => {
      st.schedTasks = [...st.schedTasks.filter((t) => t.name !== body.task!.name), body.task!]
    })
    return ok({ added: true })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ name?: string }>(req)
    if (!body.name) return fail(new Error('缺少必填字段: name'))
    await withState((st) => {
      st.schedTasks = st.schedTasks.filter((t) => t.name !== body.name)
    })
    return ok({ removed: true })
  } catch (e) {
    return fail(e)
  }
}
