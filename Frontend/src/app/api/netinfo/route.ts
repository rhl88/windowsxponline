import os from 'os'
import { NextRequest, NextResponse } from 'next/server'

/* 网络工具：ipconfig / ping / 服务器时间（供 CMD 与「Internet 时间」） */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h === '::1' || h === '0.0.0.0') return true
  if (/^127\./.test(h)) return true
  if (/^10\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  if (/^169\.254\./.test(h)) return true
  return false
}

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind') ?? ''

  /* ── ipconfig：真实网卡信息 + 公网 IP ── */
  if (kind === 'ipconfig') {
    let publicIp = ''
    let via = ''
    try {
      const r = await Promise.any([
        fetch('https://api.ip.sb/ip', { signal: AbortSignal.timeout(4000) }).then((x) => x.text()),
        fetch('https://ifconfig.me/ip', { signal: AbortSignal.timeout(4000) }).then((x) => x.text()),
      ])
      publicIp = r.trim()
      via = publicIp ? 'api.ip.sb / ifconfig.me' : ''
    } catch {
      publicIp = ''
    }
    const ifs = os.networkInterfaces()
    const adapters: Array<{ name: string; ipv4: string; mac: string; mask: string }> = []
    for (const [name, addrs] of Object.entries(ifs)) {
      const a = (addrs ?? []).find((x) => x.family === 'IPv4' && !x.internal)
      if (a) adapters.push({ name, ipv4: a.address, mac: a.mac.toUpperCase(), mask: a.netmask })
    }
    return NextResponse.json({ publicIp, via, adapters, hostname: os.hostname() })
  }

  /* ── ping：服务器侧真实 TCP/HTTP 探测计时 ── */
  if (kind === 'ping') {
    let host = (req.nextUrl.searchParams.get('host') ?? '').trim()
    if (!host) return NextResponse.json({ error: '缺少 host' }, { status: 400 })
    let url: URL
    try {
      url = new URL(/^https?:\/\//i.test(host) ? host : `http://${host}`)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad')
      if (isBlockedHost(url.hostname)) throw new Error('blocked')
    } catch {
      return NextResponse.json({ error: `Ping 请求找不到主机 ${host}。请检查该名称，然后重试。` })
    }
    const hostname = url.hostname
    const results: Array<{ seq: number; ms: number | null; err?: string }> = []
    let resolvedIp = ''
    for (let i = 0; i < 4; i++) {
      const t0 = performance.now()
      try {
        const r = await fetch(url.toString(), {
          method: 'HEAD',
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) ping' },
        })
        const ms = Math.max(1, Math.round(performance.now() - t0))
        resolvedIp = r.headers.get('x-server') ?? resolvedIp
        results.push({ seq: i, ms })
      } catch (e) {
        results.push({ seq: i, ms: null, err: e instanceof Error ? e.name : 'Request timed out' })
      }
      if (i < 3) await new Promise((r) => setTimeout(r, 500))
    }
    return NextResponse.json({ hostname, resolvedIp, results })
  }

  /* ── time：服务器当前时间（Internet 时间同步） ── */
  if (kind === 'time') {
    return NextResponse.json({ iso: new Date().toISOString(), ts: Date.now() })
  }

  return NextResponse.json({ error: 'unknown kind' }, { status: 400 })
}
