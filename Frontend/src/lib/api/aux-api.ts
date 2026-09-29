import { getApiBase, LOCAL_BASE } from './client'

/* ─────────────────────────────────────────────────────────────
 * 辅助端点访问（/api/netinfo、/api/search、/api/browse）
 * 这些端点不属于 /api/v1 数据源体系（不走 BaseURL），但有服务端依赖：
 * - Local 引擎模式下由内置伪造应答（XP 风格示范数据，见 local/engine.ts）
 * - 服务器模式下原样转发同源请求（现状行为不变）
 * 返回值兼容 Response 接口（调用方 r.json() / r.text() / r.ok 习惯不变）
 *
 * 注：本文件原名 aux.ts，因 aux 属 Windows 保留设备名，
 *     在 Windows 上无法创建/检出，故重命名为 aux-api.ts。
 * ───────────────────────────────────────────────────────────── */

function jsonResponse(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
}

export async function auxFetch(pathAndQuery: string): Promise<Response> {
  if (getApiBase() !== LOCAL_BASE) return fetch(pathAndQuery)

  const q = pathAndQuery.split('?')[1] ?? ''
  const params = new URLSearchParams(q)
  const { auxIpconfig, auxPing, auxTime, auxSearch, auxBrowseRaw } = await import('@/lib/local/engine')

  if (pathAndQuery.startsWith('/api/netinfo')) {
    const kind = params.get('kind') ?? ''
    if (kind === 'ipconfig') return jsonResponse(auxIpconfig())
    if (kind === 'time') return jsonResponse(auxTime())
    if (kind === 'ping') {
      const host = (params.get('host') ?? '').trim()
      if (!host) return jsonResponse({ error: '缺少 host' }, 400)
      return jsonResponse(auxPing(host))
    }
    return jsonResponse({ error: 'unknown kind' }, 400)
  }

  if (pathAndQuery.startsWith('/api/search')) {
    const q2 = params.get('q') ?? ''
    if (!q2) return jsonResponse({ results: [], query: '' })
    return jsonResponse(auxSearch(q2))
  }

  if (pathAndQuery.startsWith('/api/browse')) {
    const url = params.get('url') ?? ''
    return new Response(auxBrowseRaw(url), { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }

  return jsonResponse({ error: `Local 引擎不支持该辅助端点: ${pathAndQuery}` }, 404)
}