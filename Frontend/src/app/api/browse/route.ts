import zlib from 'node:zlib'
import http2 from 'node:http2'
import { NextRequest, NextResponse } from 'next/server'

/* ─────────────────────────────────────────────────────────────
   IE 真实联网代理：服务器抓取网页 → 重写 HTML → 回给 iframe
   ?url= 目标地址（http/https）
   ?raw=1 直接返回原始 HTML 文本（查看源文件用）
   传输策略：HTTP/2 优先（维基百科等封禁 HTTP/1.1），失败回退 Node fetch
   ───────────────────────────────────────────────────────────── */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 12 * 1024 * 1024
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const REQ_HEADERS: Record<string, string> = {
  'user-agent': UA,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'accept-encoding': 'gzip, deflate, br',
}

/* 局域网 / 回环地址一律拒绝（防 SSRF） */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h === '::1' || h === '0.0.0.0') return true
  if (/^127\./.test(h)) return true
  if (/^10\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  if (/^169\.254\./.test(h)) return true
  if (h.endsWith('.local') || h.endsWith('.internal')) return true
  return false
}

function normalizeUrl(raw: string): URL | null {
  let u = raw.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`
  try {
    const url = new URL(u)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (isBlockedHost(url.hostname)) return null
    if (url.toString().length > 2000) return null
    return url
  } catch {
    return null
  }
}

/* 解压（http2 手动处理 content-encoding） */
function decompress(buf: Buffer, encoding?: string): Buffer {
  try {
    if (!encoding) return buf
    if (encoding.includes('br')) return zlib.brotliDecompressSync(buf)
    if (encoding.includes('gzip')) return zlib.gunzipSync(buf)
    if (encoding.includes('deflate')) {
      try {
        return zlib.inflateSync(buf)
      } catch {
        return zlib.inflateRawSync(buf)
      }
    }
  } catch {
    return buf
  }
  return buf
}

interface H2Result {
  status: number
  headers: Record<string, string>
  body: Buffer
}

/* 单次 HTTP/2 请求（不跟随重定向） */
function h2Request(urlStr: string): Promise<H2Result | null> {
  return new Promise((resolve) => {
    let url: URL
    try {
      url = new URL(urlStr)
      if (url.protocol !== 'https:') {
        resolve(null)
        return
      }
    } catch {
      resolve(null)
      return
    }
    const client = http2.connect(url.origin)
    const finish = (r: H2Result | null) => {
      try {
        client.close()
      } catch {}
      resolve(r)
    }
    client.setTimeout(25000, () => {
      client.destroy()
      resolve(null)
    })
    client.on('error', () => {
      try {
        client.close()
      } catch {}
      resolve(null)
    })
    let req: http2.ClientHttp2Stream
    try {
      req = client.request({
        ':method': 'GET',
        ':path': url.pathname + url.search,
        ...REQ_HEADERS,
      })
    } catch {
      resolve(null)
      return
    }
    const chunks: Buffer[] = []
    const headers: Record<string, string> = {}
    let status = 0
    let size = 0
    let oversized = false
    req.on('response', (res) => {
      status = res[':status'] ?? 0
      for (const [k, v] of Object.entries(res)) {
        if (!k.startsWith(':') && v !== undefined) headers[k.toLowerCase()] = String(v)
      }
    })
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BYTES) {
        oversized = true
        req.close()
        return
      }
      chunks.push(c)
    })
    req.on('error', () => finish(null))
    req.on('end', () => {
      if (oversized) {
        finish(null)
        return
      }
      const raw = Buffer.concat(chunks)
      let body: Buffer
      try {
        body = decompress(raw, headers['content-encoding'])
      } catch {
        body = raw
      }
      finish({ status, headers, body })
    })
    req.end()
  })
}

/* HTTP/2 请求 + 循环跟随重定向（结果带 x-proxy-final-url） */
async function h2Get(urlStr: string): Promise<H2Result | null> {
  let current = urlStr
  for (let hop = 0; hop < 6; hop++) {
    const r = await h2Request(current)
    if (!r) return null
    if (r.status >= 300 && r.status < 400 && r.headers.location) {
      try {
        const next = new URL(r.headers.location, current)
        if (next.protocol === 'https:' && !isBlockedHost(next.hostname)) {
          current = next.toString()
          continue
        }
      } catch {}
    }
    r.headers['x-proxy-final-url'] = current
    return r
  }
  return null
}

/* 常规 fetch（HTTP/1.1，可处理 http: 站点） */
async function plainFetch(urlStr: string): Promise<H2Result | null> {
  try {
    const res = await fetch(urlStr, {
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
      headers: REQ_HEADERS,
    })
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v
    })
    headers['x-proxy-final-url'] = res.url || urlStr
    const buf = Buffer.from(await res.arrayBuffer())
    return { status: res.status, headers, body: buf }
  } catch {
    return null
  }
}

/* 组合：HTTPS → h2 优先 + fetch 兜底；HTTP → 仅 fetch */
async function smartGet(urlStr: string): Promise<H2Result | null> {
  const isHttps = urlStr.startsWith('https:')
  if (isHttps) {
    const r = await h2Get(urlStr)
    if (r && r.status > 0 && r.status < 500 && r.status !== 403 && r.status !== 429) return r
    /* 403/429/5xx 或 h2 失败 → 尝试普通 fetch（可能反而通） */
    const r2 = await plainFetch(urlStr)
    if (r2 && r2.status < 400) return r2
    return r ?? r2
  }
  return plainFetch(urlStr)
}

/* 注入到被代理页面的脚本：拦截链接/表单 → postMessage 给父窗口 */
const PROXY_SCRIPT = `
<script data-xp-proxy>(function(){
  try {
    var send = function(msg){ try { parent.postMessage(Object.assign({__xp:1}, msg), '*'); } catch(e){} };
    var t = function(){ send({type:'title', title: document.title || ''}); };
    if (document.readyState !== 'loading') t(); else document.addEventListener('DOMContentLoaded', t);
    window.addEventListener('load', t);
    document.addEventListener('click', function(e){
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || href.toLowerCase().indexOf('javascript:') === 0) return;
      try {
        var abs = new URL(href, document.baseURI).toString();
        if (abs.indexOf('mailto:') === 0 || abs.indexOf('tel:') === 0) return;
        e.preventDefault(); e.stopPropagation();
        send({type:'navigate', url: abs});
      } catch(err){}
    }, true);
    document.addEventListener('submit', function(e){
      try {
        var f = e.target; if (!f || !f.tagName) return;
        var action = f.getAttribute('action') || location.href;
        var abs = new URL(action, document.baseURI);
        if ((f.getAttribute('method') || 'get').toLowerCase() === 'get') {
          var fd = new FormData(f);
          var kv = [];
          fd.forEach(function(v, k){ if (typeof v === 'string') kv.push([k, v]); });
          var qs = kv.map(function(p){ return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]); }).join('&');
          abs.search = qs;
        }
        e.preventDefault(); e.stopPropagation();
        send({type:'navigate', url: abs.toString()});
      } catch(err){}
    }, true);
    try { window.open = function(u){ if (u) { try { send({type:'navigate', url: new URL(u, document.baseURI).toString()}); } catch(e){} } return null; }; } catch(e){}
    document.addEventListener('mouseover', function(e){
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (a) { var h = a.getAttribute('href') || ''; if (h) { try { send({type:'status', text: new URL(h, document.baseURI).toString()}); } catch(e){} } }
    }, true);
    /* IE 式页面右键菜单：拦截原生菜单并上报坐标/链接/图片/选区 */
    document.addEventListener('contextmenu', function(e){
      try {
        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        var href = a ? (a.getAttribute('href') || '') : '';
        var abs = '';
        if (href) { try { abs = new URL(href, document.baseURI).toString(); } catch(err){} }
        var img = e.target && e.target.tagName === 'IMG' ? (e.target.currentSrc || e.target.getAttribute('src') || '') : '';
        var sel = window.getSelection ? String(window.getSelection()) : '';
        e.preventDefault(); e.stopPropagation();
        send({type:'ctx', x: e.clientX, y: e.clientY, url: abs, img: img, sel: sel.slice(0, 300)});
      } catch(err){}
    }, true);
  } catch(e){}
})();</script>`

function errorPage(url: string, detail: string): string {
  const safe = url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const d = detail.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${PROXY_SCRIPT}<title>无法显示网页</title></head>
<body style="font-family:Tahoma,'Noto Sans SC',sans-serif;background:#fff;margin:24px;color:#333;font-size:13px">
<div style="font-size:16px;font-weight:bold;margin-bottom:12px">无法显示网页</div>
<div style="line-height:20px;color:#444">
<p>您正在查找的页面当前不可用。网站可能遇到技术问题，或者您需要调整浏览器设置。</p>
<hr style="border:none;border-top:1px solid #ccc;margin:14px 0" />
<p style="font-weight:bold">请尝试以下操作:</p>
<ul style="padding-left:22px;line-height:22px">
<li>单击<b>刷新</b>按钮，或稍后重试。</li>
<li>如果您已经在地址栏中键入该网页的地址，请确认其拼写正确。</li>
<li>要检查您的网络连接，请单击<b>工具</b>菜单，然后单击<b>Internet 选项</b>。</li>
</ul>
</div>
<div style="margin-top:22px;font-size:11px;color:#888">
目标地址: ${safe}<br/>${d || '找不到服务器或发生 DNS 错误'}<br/>
Internet Explorer 6.0（Web 复刻版 · 真实联网代理）
</div>
</body></html>`
}

async function decodeBody(buf: Buffer, contentType: string): Promise<string> {
  let charset: string | undefined = /charset=([\w-]+)/i.exec(contentType)?.[1]?.toLowerCase()
  if (!charset) {
    const head = buf.subarray(0, 4096).toString('utf8')
    charset = /<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i.exec(head)?.[1]?.toLowerCase()
  }
  if (charset && charset !== 'utf-8' && charset !== 'utf8') {
    try {
      return new TextDecoder(charset).decode(buf)
    } catch {
      /* 不支持的编码 → utf-8 兜底 */
    }
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buf)
}

function rewriteHtml(html: string, finalUrl: string): string {
  /* 去掉 CSP / XFO / refresh 的 meta 声明（响应头本来就不转发） */
  let out = html.replace(
    /<meta[^>]+http-equiv\s*=\s*["']?(content-security-policy|x-frame-options|refresh)["']?[^>]*>/gi,
    '',
  )
  const baseTag = `<base href="${finalUrl.replace(/"/g, '&quot;')}">`
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
  else out = `${baseTag}${out}`
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${PROXY_SCRIPT}</body>`)
  else out += PROXY_SCRIPT
  return out
}

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url') ?? ''
  const wantRaw = req.nextUrl.searchParams.get('raw') === '1'
  const url = normalizeUrl(rawUrl)

  if (!url) {
    return new NextResponse(errorPage(rawUrl, '地址无效或被安全策略拦截'), { status: 200, headers: HTML_HEADERS })
  }

  const res = await smartGet(url.toString())

  if (!res) {
    return new NextResponse(errorPage(url.toString(), '连接失败（超时或目标不可达）'), { status: 200, headers: HTML_HEADERS })
  }

  const { status, headers, body } = res
  /* 跟随重定向后的最终地址（h2 手动跟随时无法取到，退回请求地址） */
  const finalUrl = headers['x-proxy-final-url'] ?? url.toString()
  const contentType = headers['content-type'] ?? 'application/octet-stream'

  if (body.byteLength > MAX_BYTES) {
    return new NextResponse(errorPage(finalUrl, '内容过大（超过 12MB），已中止传输'), { status: 200, headers: HTML_HEADERS })
  }

  if (status >= 400) {
    return new NextResponse(
      errorPage(finalUrl, `HTTP ${status} ${headers['server'] ? `(${headers['server']})` : ''} —— 目标服务器拒绝访问`),
      { status: 200, headers: HTML_HEADERS },
    )
  }

  const isHtml = /text\/html|application\/xhtml/i.test(contentType)
  if (!isHtml) {
    if (wantRaw) {
      return new NextResponse(new TextDecoder('utf-8', { fatal: false }).decode(body), {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      })
    }
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=600',
        'X-Final-Url': finalUrl,
      },
    })
  }

  const html = await decodeBody(body, contentType)
  if (wantRaw) {
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  }
  const rewritten = rewriteHtml(html, finalUrl)
  return new NextResponse(rewritten, {
    status: 200,
    headers: { ...HTML_HEADERS, 'X-Final-Url': finalUrl },
  })
}
