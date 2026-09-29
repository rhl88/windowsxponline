import { NextRequest, NextResponse } from 'next/server'
import { readState, withState } from '@/server/mock-db'
import { ok, fail, jsonBody } from '@/server/http'
import { DEFAULT_SETTINGS, type SettingsDTO } from '@/components/xp/model'
import { CLASSIC_SCHEMES } from '@/components/xp/classic-schemes'

/* ─────────────────────────────────────────────────────────────
 * 系统设置 /api/v1/settings（字段集见 SettingsDTO）
 * GET   — 全量设置
 * PATCH — 部分合并更新（未知字段忽略；仅接受已知设置键）
 * ───────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof SettingsDTO>

export async function GET(): Promise<NextResponse> {
  try {
    return ok((await readState()).settings)
  } catch (e) {
    return fail(e)
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await jsonBody<Record<string, unknown>>(req)
    const applied: string[] = []
    await withState((st) => {
      for (const k of SETTING_KEYS) {
        if (body[k] !== undefined) {
          ;(st.settings as unknown as Record<string, unknown>)[k] = body[k]
          applied.push(String(k))
        }
      }
      /* XP 主题应用语义（与客户端 setClassicScheme 一致）：
       * 切色彩方案 → 桌面背景色同步为方案 Desktop 色；高对比度 → 自动去除壁纸 */
      const scheme = body.classicScheme
      if (typeof scheme === 'string' && scheme in CLASSIC_SCHEMES) {
        st.settings.bgColor = CLASSIC_SCHEMES[scheme].desktop
        if (scheme.startsWith('hc')) st.settings.wallpaper = 'none-blue'
        for (const k of ['bgColor', 'wallpaper']) if (!applied.includes(k)) applied.push(k)
      }
    })
    return ok({ applied })
  } catch (e) {
    return fail(e)
  }
}
