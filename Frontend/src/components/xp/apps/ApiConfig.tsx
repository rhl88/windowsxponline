'use client'

import React, { useEffect, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton, GroupBox, XPRadio } from '../ui'
import { playClick } from '../sounds'
import { Bmp } from '../bmp'
import {
  getApiBase, setApiBase, testConnection, subscribeApiStatus, getApiStatus,
  LOCAL_BASE, DEFAULT_BASE, type ApiStatus,
} from '@/lib/api/client'
import { apiResetSystem } from '@/lib/api/endpoints'

/* ═══════════ API 数据源设置（开发者工具：apicfg / 管理工具） ═══════════ */
/* 运行 `apicfg` 打开；配置数据后台 BaseURL、测试连接、重置出厂数据 */

type Mode = 'local' | 'server' | 'custom'

function currentMode(): Mode {
  const b = getApiBase()
  if (b === LOCAL_BASE) return 'local'
  if (b === DEFAULT_BASE) return 'server'
  return 'custom'
}

export function ApiConfig({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const openDialog = useXP((s) => s.openApp)
  const [mode, setMode] = useState<Mode>(currentMode())
  const [url, setUrl] = useState(currentMode() === 'custom' ? getApiBase() : '')
  const [status, setStatus] = useState<ApiStatus>(getApiStatus())
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => subscribeApiStatus(setStatus), [])

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      /* 自定义 URL 时先暂存再测试（测试连接针对输入框中的地址） */
      if (mode === 'custom' && url.trim()) setApiBase(url.trim())
      else if (mode === 'local') setApiBase(LOCAL_BASE)
      else setApiBase(DEFAULT_BASE)
      const info = await testConnection()
      setTestResult({ ok: true, text: `连接正常：${info.product} @ ${info.computer}` })
    } catch (e) {
      setTestResult({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setTesting(false)
    }
  }

  const doReset = () => {
    playClick()
    openDialog('dialog', {
      kind: 'confirm',
      title: 'API 数据源设置',
      text: '确实要将数据源重置为出厂状态吗？\n\n文件系统、设置、回收站等全部数据将恢复初始值（相当于重新安装后的首次启动）。',
      onYes: async () => {
        try {
          await apiResetSystem()
          showToast('数据源已重置，正在重新启动系统…')
          setTimeout(() => window.location.reload(), 800)
        } catch {
          showToast('重置失败：数据源不可达')
        }
      },
    })
  }

  const doApply = () => {
    playClick()
    if (mode === 'custom' && url.trim()) setApiBase(url.trim())
    else if (mode === 'local') setApiBase(LOCAL_BASE)
    else setApiBase(DEFAULT_BASE)
    showToast('数据源已保存，正在重新连接…')
    setTimeout(() => window.location.reload(), 600)
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px] p-3 overflow-y-auto xp-thin-scroll">
      <div className="flex items-start gap-3 mb-3">
        <Bmp name="adm-odbc" size={32} />
        <div className="pt-1">
          <div className="text-[12px] font-bold">API 数据源设置</div>
          <div className="text-[#4a4a3a]">配置 Windows XP WebOS 的后台数据服务地址。所有功能（文件、设置、打印等）均通过该 API 读写。</div>
        </div>
      </div>

      <GroupBox title="数据源位置" className="mb-3">
        <div className="p-2 space-y-2">
          <XPRadio checked={mode === 'local'} label="本机内置数据(静态)  —  localStorage 持久化，无需后台服务" onChange={() => setMode('local')} />
          <XPRadio checked={mode === 'server'} label="本机模拟服务  —  /api/v1（需服务器部署）" onChange={() => setMode('server')} />
          <XPRadio checked={mode === 'custom'} label="自定义 URL(R):（对接真实后端时填写）" onChange={() => setMode('custom')} />
          <div className="flex items-center gap-2 pl-5">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={mode !== 'custom'}
              spellCheck={false}
              placeholder="例如 http://192.168.1.10:8080/api/v1"
              className={`flex-1 h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px] font-mono ${mode === 'custom' ? '' : 'text-[#9a9a8a]'}`}
            />
          </div>
          <div className="flex items-center gap-2 pl-5">
            <XPButton onClick={runTest} disabled={testing}>{testing ? '正在测试…' : '测试连接(T)'}</XPButton>
            <span className={`flex-1 truncate ${testResult ? (testResult.ok ? 'text-[#0a6b2d]' : 'text-[#a02020]') : 'text-[#5a5a4a]'}`}>
              {testResult ? testResult.text : `当前状态：${mode === 'local' ? '本机内置数据（离线可用）' : status.online ? '在线（数据同步中）' : `脱机（${status.lastError ?? '无法连接'}，本地修改暂不同步）`}`}
            </span>
          </div>
        </div>
      </GroupBox>

      <GroupBox title="数据管理" className="mb-3">
        <div className="p-2 flex items-center gap-3">
          <XPButton onClick={doReset}>重置为出厂状态(R)</XPButton>
          <span className="text-[#4a4a3a] flex-1">清空服务端全部数据（文件系统/设置/回收站等），恢复初始状态。</span>
        </div>
      </GroupBox>

      <div className="text-[#5a5a4a] mb-3 leading-[15px]">
        接口说明：完整 API 文档见项目 <span className="font-mono">docs/API.md</span>（含全部端点、请求/响应示例与真实后端对接指引）。<br />
        环境变量 <span className="font-mono">NEXT_PUBLIC_API_BASE</span> 可设置构建期默认地址（静态发布构建时固定为 local）；本对话框的设置优先于环境变量。
      </div>

      <div className="flex-1" />
      <div className="flex justify-end gap-2">
        <XPButton onClick={doApply}>确定</XPButton>
        <XPButton onClick={() => { playClick(); closeWindow(win.id) }}>取消</XPButton>
      </div>
    </div>
  )
}
