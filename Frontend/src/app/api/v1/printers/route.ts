import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'
import type { PrinterItem } from '@/components/xp/model'

/* ─────────────────────────────────────────────────────────────
 * 打印机 /api/v1/printers
 * GET    — 列表
 * PUT    { items } — 整表替换
 * POST   { name, model, def? } — 添加打印机
 * DELETE { name }  — 移除（同时移除其打印作业）
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).printers)
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ items?: PrinterItem[] }>(req)
    await withState((st) => {
      st.printers = body.items ?? []
    })
    return ok({ count: (body.items ?? []).length })
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<{ name?: string; model?: string; def?: boolean }>(req)
    if (!body.name) return fail(new Error('缺少必填字段: name'))
    await withState((st) => {
      if (body.def) st.printers = st.printers.map((p) => ({ ...p, def: false }))
      st.printers = [...st.printers, { name: body.name!, model: body.model ?? 'Generic / Text Only', def: body.def ?? st.printers.length === 0 }]
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
      st.printers = st.printers.filter((p) => p.name !== body.name)
      st.printJobs = st.printJobs.filter((j) => j.printer !== body.name)
    })
    return ok({ removed: true })
  } catch (e) {
    return fail(e)
  }
}
