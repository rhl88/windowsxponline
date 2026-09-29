import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

/* MSN Search 风格的真实网络搜索（z-ai web_search） */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const num = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get('num') ?? 10) || 10))
  if (!q) return NextResponse.json({ results: [], query: '' })

  try {
    const zai = await ZAI.create()
    const res = await zai.functions.invoke('web_search', { query: q, num })
    const results = Array.isArray(res)
      ? res.map((r: { url?: string; name?: string; snippet?: string; host_name?: string; date?: string; favicon?: string }, i: number) => ({
          rank: i + 1,
          url: r.url ?? '',
          title: r.name ?? '(无标题)',
          snippet: r.snippet ?? '',
          host: r.host_name ?? '',
          date: r.date ?? '',
        }))
      : []
    return NextResponse.json({ query: q, results })
  } catch (e) {
    return NextResponse.json(
      { query: q, results: [], error: e instanceof Error ? e.message : String(e) },
      { status: 200 },
    )
  }
}
