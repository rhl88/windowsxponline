/* ─────────────────────────────────────────────────────────────
 * API 客户端基座
 * - BaseURL 三级配置：localStorage 运行时覆盖 → NEXT_PUBLIC_API_BASE 环境变量 → 默认同源 /api/v1
 * - 静态发布形态：构建时 NEXT_PUBLIC_API_BASE=local → 走内置 Local 引擎（localStorage 持久化）
 *   用户后期自建后端时，在「API 数据源设置」填入地址即可切回 HTTP，客户端代码零修改
 * - 统一信封解析：{ ok, data } / { ok, error }
 * - 串行队列：保证变更按发起顺序到达服务端
 * - 在线状态跟踪：供「API 数据源设置」对话框展示
 * ───────────────────────────────────────────────────────────── */

export const DEFAULT_BASE = '/api/v1'
/** Local 引擎哨兵：静态发布形态的默认数据源（localStorage 持久化，无需后台） */
export const LOCAL_BASE = 'local'
const LS_KEY = 'xp.apiBase'

export class ApiClientError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const v = window.localStorage.getItem(LS_KEY)
    if (v && v.trim()) return v.trim().replace(/\/$/, '')
  }
  const env = process.env.NEXT_PUBLIC_API_BASE
  if (env && env.trim()) return env.trim().replace(/\/$/, '')
  return DEFAULT_BASE
}

export function setApiBase(url: string | null): void {
  if (typeof window === 'undefined') return
  if (url && url.trim() && url.trim() !== DEFAULT_BASE) window.localStorage.setItem(LS_KEY, url.trim().replace(/\/$/, ''))
  else window.localStorage.removeItem(LS_KEY)
}

export function isDefaultBase(): boolean {
  return getApiBase() === DEFAULT_BASE
}

/** 当前是否处于 Local 引擎模式（静态发布默认 / 用户显式选择） */
export function isLocalMode(): boolean {
  return getApiBase() === LOCAL_BASE
}

/* ── 在线状态（模块级，避免无谓的全局重渲染） ── */
export interface ApiStatus {
  online: boolean
  lastError: string | null
  lastSuccessAt: number | null
  base: string
}

let status: ApiStatus = { online: true, lastError: null, lastSuccessAt: null, base: DEFAULT_BASE }
const listeners = new Set<(s: ApiStatus) => void>()

export function getApiStatus(): ApiStatus {
  return { ...status, base: getApiBase() }
}

export function subscribeApiStatus(fn: (s: ApiStatus) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function publish(patch: Partial<ApiStatus>): void {
  status = { ...status, ...patch }
  listeners.forEach((fn) => fn(getApiStatus()))
}

export function markOnline(): void {
  if (!status.online || !status.lastSuccessAt) publish({ online: true, lastError: null, lastSuccessAt: Date.now() })
  else publish({ online: true, lastError: null })
}

export function markOffline(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err)
  if (status.online || status.lastError !== msg) publish({ online: false, lastError: msg })
}

/* ── 串行队列（变更按序到达；读取不走队列） ── */
let queue: Promise<unknown> = Promise.resolve()

export function enqueue<T>(op: () => Promise<T>): Promise<T> {
  const run = queue.then(op).then(
    (r) => {
      markOnline()
      return r
    },
    (e) => {
      markOffline(e)
      throw e
    },
  )
  queue = run.catch(() => undefined)
  return run
}

/* ── 请求核心 ── */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase()
  const method = (init?.method ?? 'GET').toUpperCase()
  let body: Record<string, unknown> | undefined
  if (typeof init?.body === 'string') {
    try { body = JSON.parse(init.body) as Record<string, unknown> } catch { body = undefined }
  }

  /* Local 引擎分支：静态发布形态（或用户显式选择本机数据源） */
  if (base === LOCAL_BASE) {
    const doLocal = async (): Promise<T> => {
      const { localRequest } = await import('@/lib/local/engine')
      const env = localRequest<T>(method, path, body)
      if (env.ok === false) throw new ApiClientError(env.error.code, env.error.message)
      return env.data
    }
    return enqueue(doLocal)
  }

  const url = `${base}${path}`
  const doFetch = async (): Promise<T> => {
    let res: Response
    try {
      res = await fetch(url, {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
        cache: 'no-store',
      })
    } catch {
      throw new ApiClientError(0, `无法连接数据源 ${base}`)
    }
    let body: { ok?: boolean; data?: T; error?: { code: number; message: string } }
    try {
      body = await res.json()
    } catch {
      throw new ApiClientError(res.status, `响应不是合法 JSON（HTTP ${res.status}）`)
    }
    if (!res.ok || body.ok === false) {
      throw new ApiClientError(body.error?.code ?? res.status, body.error?.message ?? `HTTP ${res.status}`)
    }
    return body.data as T
  }
  return enqueue(doFetch)
}

/* 连接测试（不走队列，直接探测） */
export async function testConnection(): Promise<{ product: string; computer: string; time: string }> {
  const base = getApiBase()
  /* Local 引擎：无网络可探测，直接应答内置系统信息 */
  if (base === LOCAL_BASE) {
    const { localRequest } = await import('@/lib/local/engine')
    const env = localRequest<{ product: string; computer: string; time: string }>('GET', '/system', undefined)
    if (env.ok === false) throw new ApiClientError(env.error.code, env.error.message)
    markOnline()
    return env.data
  }
  try {
    const res = await fetch(`${base}/system`, { cache: 'no-store' })
    const body = await res.json()
    if (!res.ok || body.ok === false) throw new Error(body.error?.message ?? `HTTP ${res.status}`)
    markOnline()
    return body.data
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    markOffline(msg)
    throw new ApiClientError(0, msg)
  }
}
