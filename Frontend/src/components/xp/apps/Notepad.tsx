'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { WinState } from '../store'
import { imeEnter } from '../ime-keys'
import { useXP } from '../store'
import { MenuBar, XPButton } from '../ui'
import { playError, playClick, playShutdown, playLogoff, playCritical, playExclamation, playDing } from '../sounds'
import { ErrorIcon, InfoIcon, WarnIcon, QuestionIcon } from '../app-icons'
import { PowerIcon } from '../icons'
import { Bmp } from '../bmp'
import { resolvePath, myDocsPath, userDesktopPath } from '../fs'

/* 保存对话框默认位置（登录帐户的我的文档/桌面——每帐户独立，调用时解析） */
const myDocsNow = () => myDocsPath(useXP.getState().sessionUser)
const desktopNow = () => userDesktopPath(useXP.getState().sessionUser)

/* 收集全树文本文件（打开对话框用） */
function collectTextFiles(tree: ReturnType<typeof useXP.getState>['fsTree']) {
  const out: Array<{ name: string; path: string[] }> = []
  const walk = (n: typeof tree, cur: string[]) => {
    for (const c of n.children ?? []) {
      if (c.icon === 'text' && c.kind === 'file') out.push({ name: c.name, path: [...cur, c.name] })
      else if (c.kind === 'folder' || c.kind === 'drive') walk(c, [...cur, c.name])
    }
  }
  walk(tree, [])
  return out
}

export default function Notepad({ win }: { win: WinState }) {
  const [text, setText] = useState<string>((win.props.content as string) ?? '')
  const [fileName, setFileName] = useState<string>((win.props.fileName as string) ?? '无标题')
  const [parentPath, setParentPath] = useState<string[]>((win.props.parentPath as string[]) ?? null as unknown as string[])
  const [wordWrap, setWordWrap] = useState(true)
  const [savedContent, setSavedContent] = useState<string>((win.props.content as string) ?? '')
  const [showFind, setShowFind] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [showOpen, setShowOpen] = useState(false)
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [showGoto, setShowGoto] = useState(false)
  const [gotoLine, setGotoLine] = useState('')
  const [showStatus, setShowStatus] = useState(true)
  const [showFont, setShowFont] = useState(false)
  const [font, setFont] = useState<{ family: string; size: number; bold: boolean; italic: boolean }>({ family: 'Lucida Console', size: 12, bold: false, italic: false })
  const [fontDraft, setFontDraft] = useState(font)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [findMsg, setFindMsg] = useState('')
  const [saveAsName, setSaveAsName] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const openApp = useXP((s) => s.openApp)
  const fsWriteFile = useXP((s) => s.fsWriteFile)
  const fsTree = useXP((s) => s.fsTree)
  const closeWindow = useXP((s) => s.closeWindow)

  const dirty = text !== savedContent

  useEffect(() => {
    setWindowTitle(win.id, `${dirty ? '*' : ''}${fileName} - 记事本`)
  }, [dirty, fileName, setWindowTitle, win.id])

  const insertTime = () => {
    const d = new Date()
    const stamp = `${d.toLocaleTimeString('zh-CN', { hour12: false })} ${d.toLocaleDateString('zh-CN')}`
    const ta = taRef.current
    if (!ta) {
      setText((t) => t + stamp)
      return
    }
    const pos = ta.selectionStart
    setText(text.slice(0, pos) + stamp + text.slice(pos))
  }

  /* ── 保存 ── */
  const doSave = (dir?: string[], name?: string) => {
    const targetDir = dir ?? parentPath ?? myDocsNow()
    const targetName = (name ?? fileName).endsWith('.txt') ? (name ?? fileName) : `${name ?? fileName}.txt`
    const finalName = fsWriteFile(targetDir, targetName, text)
    setParentPath(targetDir)
    setFileName(finalName)
    setSavedContent(text)
    playClick()
    useXP.getState().showToast(`已保存 "${finalName}"（虚拟文件系统）`)
  }

  const askClose = () => {
    if (!dirty) {
      closeWindow(win.id)
      return
    }
    openApp('dialog', {
      kind: 'confirm',
      title: '记事本',
      text: `${fileName} 的文字已经改变。\n\n想保存文件吗？`,
      yesLabel: '是(Y)',
      noLabel: '否(N)',
      onYes: () => {
        doSave()
        closeWindow(win.id)
      },
      onNo: () => closeWindow(win.id),
    })
  }

  /* ── 查找 ── */
  const findNext = (fromFindDialog = false, v0?: string) => {
    const q = v0 ?? findText
    if (!q) {
      if (fromFindDialog) setFindMsg('请输入查找内容')
      return false
    }
    const ta = taRef.current
    const hay = matchCase ? text : text.toLowerCase()
    const needle = matchCase ? q : q.toLowerCase()
    const start = ta ? ta.selectionEnd : 0
    let idx = hay.indexOf(needle, start)
    if (idx === -1) idx = hay.indexOf(needle, 0)
    if (idx === -1) {
      setFindMsg('找不到 "' + q + '"')
      return false
    }
    setFindMsg('')
    if (ta) {
      ta.focus()
      ta.setSelectionRange(idx, idx + q.length)
      /* 滚动到可见 */
      const before = text.slice(0, idx)
      const lines = before.split('\n').length - 1
      ta.scrollTop = Math.max(0, (lines - 4) * 17)
    }
    return true
  }

  const doReplace = (all = false) => {
    if (!findText) return
    if (all) {
      const cnt = matchCase ? text.split(findText).length - 1 : text.toLowerCase().split(findText.toLowerCase()).length - 1
      if (cnt === 0) {
        setFindMsg('找不到 "' + findText + '"')
        return
      }
      const re = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi')
      setText((t) => t.replace(re, replaceText))
      setFindMsg(`已替换 ${cnt} 处`)
      playClick()
      return
    }
    const ta = taRef.current
    const sel = ta ? text.slice(ta.selectionStart, ta.selectionEnd) : ''
    if (sel && (matchCase ? sel === findText : sel.toLowerCase() === findText.toLowerCase())) {
      const s = ta!.selectionStart
      setText(text.slice(0, s) + replaceText + text.slice(ta!.selectionEnd))
      if (ta) ta.setSelectionRange(s + replaceText.length, s + replaceText.length)
      setFindMsg(`已替换 1 处`)
    } else {
      if (findNext(true)) {
        /* 先选中，再一次替换 */
        const ta2 = taRef.current
        if (ta2) {
          const s = ta2.selectionStart
          setText(text.slice(0, s) + replaceText + text.slice(ta2.selectionEnd))
          setFindMsg(`已替换 1 处`)
        }
      }
    }
  }

  /* 键盘快捷键（XP 记事本完整键位） */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const ctrl = e.ctrlKey && !e.altKey && !e.metaKey
    const kl = e.key.toLowerCase()
    if (ctrl && kl === 's') {
      e.preventDefault()
      doSave()
    } else if (ctrl && kl === 'f') {
      e.preventDefault()
      setShowFind(true)
      setShowReplace(false)
    } else if (ctrl && kl === 'h') {
      e.preventDefault()
      setShowReplace(true)
      setShowFind(false)
    } else if (ctrl && kl === 'n') {
      e.preventDefault()
      openApp('notepad', {})
    } else if (ctrl && kl === 'o') {
      e.preventDefault()
      setShowOpen(true)
    } else if (ctrl && kl === 'p') {
      e.preventDefault()
      openApp('print', { appName: win.title, pages: 1 })
    } else if (ctrl && kl === 'g') {
      e.preventDefault()
      setShowGoto(true)
    } else if (e.key === 'F3') {
      e.preventDefault()
      if (!findText) setShowFind(true)
      else findNext()
    } else if (e.key === 'F5') {
      /* 记事本内 F5 = 插入时间/日期（优先于全局刷新，全局层有输入守卫） */
      e.preventDefault()
      insertTime()
    } else if (e.key === 'Escape') {
      if (showFind || showReplace || showOpen || showSaveAs || showGoto || showFont) {
        e.preventDefault()
        setShowFind(false)
        setShowReplace(false)
        setShowOpen(false)
        setShowSaveAs(false)
        setShowGoto(false)
      }
    }
  }

  const textFiles = showOpen ? collectTextFiles(fsTree) : []

  return (
    <div className="flex flex-col h-full select-none relative" onKeyDown={onKeyDown}>
      <MenuBar
        menus={[
          {
            label: '文件(F)',
            items: [
              { label: '新建(N)', accelerator: 'Ctrl+N', onClick: () => openApp('notepad', {}) },
              { label: '打开(O)...', accelerator: 'Ctrl+O', onClick: () => setShowOpen(true) },
              { label: '保存(S)', accelerator: 'Ctrl+S', onClick: () => doSave() },
              { label: '另存为(A)...', onClick: () => { setSaveAsName(fileName === '无标题' ? '' : fileName); setShowSaveAs(true) } },
              { separator: true },
              { label: '页面设置(U)...', disabled: true },
              { label: '打印(P)...', accelerator: 'Ctrl+P', onClick: () => openApp('print', { appName: win.title, pages: 1 }) },
              { separator: true },
              { label: '退出(X)', onClick: askClose },
            ],
          },
          {
            label: '编辑(E)',
            items: [
              { label: '撤销(U)', accelerator: 'Ctrl+Z', onClick: () => document.execCommand('undo') },
              { separator: true },
              { label: '剪切(T)', accelerator: 'Ctrl+X', onClick: () => document.execCommand('cut') },
              { label: '复制(C)', accelerator: 'Ctrl+C', onClick: () => document.execCommand('copy') },
              { label: '粘贴(P)', accelerator: 'Ctrl+V', onClick: () => document.execCommand('paste') },
              { label: '删除(L)', accelerator: 'Del', onClick: () => setText('') },
              { separator: true },
              { label: '查找(F)...', accelerator: 'Ctrl+F', onClick: () => { setShowFind(true); setShowReplace(false) } },
              { label: '查找下一个(N)', accelerator: 'F3', onClick: () => findNext() },
              { label: '替换(R)...', accelerator: 'Ctrl+H', onClick: () => { setShowReplace(true); setShowFind(false) } },
              { label: '转到(G)...', accelerator: 'Ctrl+G', onClick: () => { setGotoLine(''); setShowGoto(true) } },
              { separator: true },
              { label: '全选(A)', accelerator: 'Ctrl+A', onClick: () => taRef.current?.select() },
              { separator: true },
              { label: '时间/日期(D)', accelerator: 'F5', onClick: insertTime },
            ],
          },
          {
            label: '格式(O)',
            items: [
              { label: '自动换行(W)', checked: wordWrap, onClick: () => setWordWrap((v) => !v) },
              { label: '字体(F)...', onClick: () => { setFontDraft(font); setShowFont(true) } },
            ],
          },
          {
            label: '查看(V)',
            items: [{ label: '状态栏(S)', checked: showStatus, onClick: () => setShowStatus((v) => !v) }],
          },
          {
            label: '帮助(H)',
            items: [
              { label: '帮助主题(H)', onClick: () => openApp('helpcenter', {}) },
              {
                label: '关于记事本(A)',
                onClick: () =>
                  useXP.getState().openApp('about', {
                    title: '关于“记事本”',
                    text: '记事本（Web 复刻版）\n版本 5.1 (Build 2600.xpclient.010817-1148)\n\n支持打开、编辑、保存（真实写入虚拟文件系统）、\n查找/替换、时间/日期插入。',
                  }),
              },
            ],
          },
        ]}
      />
      <textarea
        ref={taRef}
        style={{ fontFamily: font.family, fontSize: font.size, fontWeight: font.bold ? 'bold' : 'normal', fontStyle: font.italic ? 'italic' : 'normal' }}
        className="flex-1 resize-none outline-none bg-white text-black p-[2px] leading-[1.4] xp-notepad-ta border-t border-[#d8d5c8] border-l border-[#d8d5c8]"
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
        wrap={wordWrap ? 'soft' : 'off'}
        onContextMenu={(e) => {
          /* XP 记事本文本区右键菜单（编辑菜单 + 右到左阅读顺序 + 全选） */
          e.preventDefault()
          e.stopPropagation()
          const ta = taRef.current
          const sel = ta && ta.selectionEnd > (ta?.selectionStart ?? 0)
          useXP.getState().openCtx(e.clientX, e.clientY, [
            { label: '撤消(U)', accelerator: 'Ctrl+Z', disabled: false, onClick: () => document.execCommand('undo') },
            { separator: true },
            { label: '剪切(T)', accelerator: 'Ctrl+X', disabled: !sel, onClick: () => document.execCommand('cut') },
            { label: '复制(C)', accelerator: 'Ctrl+C', disabled: !sel, onClick: () => document.execCommand('copy') },
            { label: '粘贴(P)', accelerator: 'Ctrl+V', onClick: () => document.execCommand('paste') },
            { label: '删除(D)', accelerator: 'Del', disabled: !sel, onClick: () => document.execCommand('delete') },
            { separator: true },
            { label: '全选(A)', accelerator: 'Ctrl+A', onClick: () => taRef.current?.select() },
            { separator: true },
            { label: '从右到左的阅读顺序(R)', checked: false, onClick: () => useXP.getState().showToast('从右到左阅读：阿拉伯语/希伯来语环境支持') },
            { label: '显示 Unicode 控制字符(C)', disabled: true },
            { separator: true },
            { label: '时间/日期(D)', accelerator: 'F5', onClick: insertTime },
          ])
        }}
      />
      {showStatus ? (
        <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] text-[11px] px-2">
          Ln {text.split('\n').length}, Col {(text.split('\n').pop() ?? '').length + 1}
          <span className="ml-4 text-[#8a8a8a]">{fileName}</span>
          {dirty ? <span className="ml-2 text-[#b06000]">未保存</span> : null}
        </div>
      ) : null}

      {/* ── 打开对话框 ── */}
      {showOpen ? (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40" onClick={() => setShowOpen(false)}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[380px] xp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">打开</div>
            <div className="p-3">
              <div className="text-[11px] mb-1">文本文件（虚拟文件系统）:</div>
              <div className="xp-sunken bg-white h-[150px] overflow-y-auto xp-thin-scroll">
                {textFiles.length === 0 ? (
                  <div className="text-[11px] text-[#8a8a8a] p-3">没有找到文本文件</div>
                ) : (
                  textFiles.map((f) => (
                    <button
                      key={f.path.join('/')}
                      type="button"
                      className="w-full text-left px-2 py-[3px] text-[11px] hover:bg-[#cfe0f5]"
                      onClick={() => {
                        const node = resolvePath(f.path, fsTree)
                        useXP.getState().pushRecentDoc(f.path)
                        setFileName(f.name)
                        setParentPath(f.path.slice(0, -1))
                        setText(node?.content ?? '')
                        setSavedContent(node?.content ?? '')
                        setShowOpen(false)
                      }}
                    >
                      {f.path.slice(1, -1).join(' \\ ') || 'C:\\'}{f.path.length > 1 ? ' \\ ' : ''}{f.name}
                    </button>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <XPButton onClick={() => setShowOpen(false)}>取消</XPButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 另存为对话框 ── */}
      {showSaveAs ? (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40" onClick={() => setShowSaveAs(false)}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[340px] xp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">另存为</div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] w-[50px]">保存在(I):</span>
                <div className="xp-sunken bg-white flex-1 h-[20px] flex items-center px-1">
                  <select className="flex-1 text-[11px] outline-none bg-transparent h-[18px]" value={parentPath?.join('/') ?? myDocsNow().join('/')} onChange={(e) => setParentPath(e.target.value.split('/'))}>
                    <option value={myDocsNow().join('/')}>我的文档</option>
                    <option value={desktopNow().join('/')}>桌面</option>
                    <option value={['本地磁盘 (C:)'].join('/')}>本地磁盘 (C:)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] w-[50px]">文件名(N):</span>
                <div className="xp-sunken bg-white flex-1 h-[20px] flex items-center px-1">
                  <input className="flex-1 text-[11px] outline-none" autoFocus value={saveAsName} onChange={(e) => setSaveAsName(e.target.value)} spellCheck={false} />
                </div>
              </div>
              <div className="text-[10px] text-[#8a8a8a]">保存类型: 文本文档 (*.txt)</div>
              <div className="flex justify-end gap-2 pt-1">
                <XPButton primary onClick={() => { if (saveAsName.trim()) { doSave(parentPath, saveAsName.trim()); setShowSaveAs(false) } }}>保存(S)</XPButton>
                <XPButton onClick={() => setShowSaveAs(false)}>取消</XPButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 字体对话框（格式→字体，XP 经典三栏 + 示例预览） ── */}
      {showFont ? (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40" onClick={() => setShowFont(false)}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[420px] xp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">字体</div>
            <div className="p-3 space-y-2">
              <div className="text-[11px] text-[#00309c]">为非选定的文本更改字体:</div>
              <div className="grid grid-cols-[1fr_92px_70px] gap-2">
                <div>
                  <div className="text-[11px] mb-[2px]">字体(F):</div>
                  <div className="xp-sunken bg-white h-[110px] overflow-y-auto xp-thin-scroll">
                    {['Lucida Console', 'Courier New', '宋体 SimSun', '黑体 SimHei', '楷体 KaiTi', 'Tahoma', 'Times New Roman', 'Arial', 'Consolas', '微软雅黑'].map((f) => (
                      <div
                        key={f}
                        className={`px-2 py-[2px] text-[11px] cursor-default ${fontDraft.family === f ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8eef8]'}`}
                        onClick={() => setFontDraft((d) => ({ ...d, family: f }))}
                      >
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] mb-[2px]">字形(Y):</div>
                  <div className="xp-sunken bg-white h-[110px] overflow-y-auto xp-thin-scroll">
                    {[{ k: '常规', b: false, i: false }, { k: '斜体', b: false, i: true }, { k: '粗体', b: true, i: false }, { k: '粗斜体', b: true, i: true }].map((s) => (
                      <div
                        key={s.k}
                        className={`px-2 py-[2px] text-[11px] cursor-default ${fontDraft.bold === s.b && fontDraft.italic === s.i ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8eef8]'}`}
                        onClick={() => setFontDraft((d) => ({ ...d, bold: s.b, italic: s.i }))}
                      >
                        {s.k}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] mb-[2px]">大小(S):</div>
                  <div className="xp-sunken bg-white h-[110px] overflow-y-auto xp-thin-scroll">
                    {[9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48].map((s) => (
                      <div
                        key={s}
                        className={`px-2 py-[2px] text-[11px] cursor-default ${fontDraft.size === s ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8eef8]'}`}
                        onClick={() => setFontDraft((d) => ({ ...d, size: s }))}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* 示例预览 */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] w-[40px]">示例</span>
                <div className="xp-sunken bg-white flex-1 h-[52px] flex items-center justify-center overflow-hidden">
                  <span style={{ fontFamily: fontDraft.family, fontSize: Math.min(fontDraft.size, 22), fontWeight: fontDraft.bold ? 'bold' : 'normal', fontStyle: fontDraft.italic ? 'italic' : 'normal' }} className="text-black">
                    AaBbYy 京东 Ctrl
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="xp-btn w-[73px] h-[22px] text-[11px]" onClick={() => { setFont(fontDraft); setShowFont(false) }}>确定</button>
                <button type="button" className="xp-btn w-[73px] h-[22px] text-[11px]" onClick={() => setShowFont(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 转到行对话框（Ctrl+G） ── */}
      {showGoto ? (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40" onClick={() => setShowGoto(false)}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[280px] xp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">转到下列行</div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px]">行号(L):</span>
                <div className="xp-sunken bg-white flex-1 h-[20px] flex items-center px-1">
                  <input
                    className="flex-1 text-[11px] outline-none"
                    autoFocus
                    value={gotoLine}
                    onChange={(e) => setGotoLine(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowGoto(false)
                        return
                      }
                      /* IME 安全回车：行号输入（纯数字）组态回车同样生效 */
                      imeEnter(e, (v) => {
                        const ln = Math.max(1, Math.min(text.split('\n').length, parseInt(v || '1', 10)))
                        const ta = taRef.current
                        if (ta) {
                          let pos = 0
                          for (let i = 0; i < ln - 1; i++) pos += (text.split('\n')[i] ?? '').length + 1
                          ta.focus()
                          ta.setSelectionRange(pos, pos)
                          ta.scrollTop = Math.max(0, (ln - 4) * 17)
                        }
                        setShowGoto(false)
                      })
                    }}
                    spellCheck={false}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <XPButton primary onClick={() => {
                  const ln = Math.max(1, Math.min(text.split('\n').length, parseInt(gotoLine || '1', 10)))
                  const ta = taRef.current
                  if (ta) {
                    let pos = 0
                    for (let i = 0; i < ln - 1; i++) pos += (text.split('\n')[i] ?? '').length + 1
                    ta.focus()
                    ta.setSelectionRange(pos, pos)
                    ta.scrollTop = Math.max(0, (ln - 4) * 17)
                  }
                  setShowGoto(false)
                }}>转到</XPButton>
                <XPButton onClick={() => setShowGoto(false)}>取消</XPButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 查找对话框 ── */}
      {showFind || showReplace ? (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40" onClick={() => { setShowFind(false); setShowReplace(false) }}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[300px] xp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">{showReplace ? '替换' : '查找'}</div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] w-[54px]">查找内容(N):</span>
                <div className="xp-sunken bg-white flex-1 h-[20px] flex items-center px-1">
                  <input className="flex-1 text-[11px] outline-none" autoFocus value={findText} onChange={(e) => setFindText(e.target.value)} onKeyDown={(e) => imeEnter(e, (v) => findNext(true, v))} spellCheck={false} />
                </div>
              </div>
              {showReplace ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] w-[54px]">替换为(P):</span>
                  <div className="xp-sunken bg-white flex-1 h-[20px] flex items-center px-1">
                    <input className="flex-1 text-[11px] outline-none" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} spellCheck={false} />
                  </div>
                </div>
              ) : null}
              <button type="button" className="flex items-center gap-[6px] text-[11px]" onClick={() => setMatchCase((v) => !v)}>
                <span className="xp-checkbox" aria-checked={matchCase}>
                  {matchCase ? (
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <path d="M2 6.5 L4.8 9.5 L10 3" stroke="#111" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                    </svg>
                  ) : null}
                </span>
                区分大小写(C)
              </button>
              <div className="h-[14px] text-[10px] text-[#b03030]">{findMsg}</div>
              <div className="flex justify-end gap-2">
                {showReplace ? (
                  <>
                    <XPButton onClick={() => doReplace(false)}>替换(R)</XPButton>
                    <XPButton onClick={() => doReplace(true)}>全部替换(A)</XPButton>
                  </>
                ) : null}
                <XPButton primary onClick={() => findNext(true)}>查找下一个(F)</XPButton>
                <XPButton onClick={() => { setShowFind(false); setShowReplace(false) }}>取消</XPButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* ─────────── 通用对话框（错误 / 信息 / 关机 / 确认） ─────────── */
export function DialogBox({ win }: { win: WinState }) {
  const kind = (win.props.kind as string) ?? 'info'
  const text = (win.props.text as string) ?? ''
  const setPhase = useXP((s) => s.setPhase)
  const closeWindow = useXP((s) => s.closeWindow)
  const closeAll = useXP((s) => s.closeAll)
  const setRect = useXP((s) => s.setRect)

  /* Esc = 取消（XP 对话框默认行为：仅关闭对话框、不触发任何按钮动作），Enter = 默认按钮由 autoFocus 触发 */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        playClick()
        closeWindow(win.id)
      }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [closeWindow, win.id, kind])

  useEffect(() => {
    /* XP 真实语义：SystemHand=严重停止 / SystemExclamation=感叹 / SystemAsterisk·Question=叮声 */
    if (kind === 'error') playCritical()
    else if (kind === 'warn') playExclamation()
    else if (kind === 'confirm' || kind === 'info') playDing()
  }, [kind])

  useEffect(() => {
    /* 自动设置窗口尺寸（XP MessageBox 行为：宽度随文字自适应、工作区居中略偏上）
     * 用 canvas 按真实字号逐字符测宽模拟换行 → 任何文字下按钮都不会溢出窗口底边 */
    if (kind === 'shutdown' || kind === 'logoff') {
      const w = kind === 'shutdown' ? 400 : 340
      const h = kind === 'shutdown' ? 210 : 186
      const vw = window.innerWidth
      const vh = window.innerHeight
      setRect(win.id, { x: Math.round((vw - w) / 2), y: Math.round((vh - 30 - h) / 2), w, h })
      return
    }
    const segs = text.split('\n')
    const FONT = '11px Tahoma, "Microsoft YaHei", "Noto Sans SC", sans-serif'
    let longest = 0
    let lines = segs.length
    try {
      const ctx = document.createElement('canvas').getContext('2d')
      if (ctx) {
        ctx.font = FONT
        for (const seg of segs) longest = Math.max(longest, ctx.measureText(seg).width)
        /* 宽度 = 最长行 + 窗口 chrome（边框 6 + p-4×2 + 图标 32 + gap 16）+ 余量 */
        const w = Math.round(Math.max(340, Math.min(500, longest + 120)))
        /* 在该宽度下逐字符累计模拟浏览器换行，得真实显示行数 */
        const textW = w - 86
        lines = 0
        for (const seg of segs) {
          if (!seg) { lines++; continue }
          let cnt = 1
          let cur = 0
          for (const ch of seg) {
            const cw = ctx.measureText(ch).width || 6
            if (cur + cw > textW && cur > 0) { cnt++; cur = cw } else cur += cw
          }
          lines += cnt
        }
        /* 高度 = 标题栏 25 + p-4×2 + max(文字, 图标32) + 按钮 23 + pb-4 16 + 余量 */
        const h = 25 + 32 + Math.max(lines * 16, 32) + 23 + 16 + 6
        const vw = window.innerWidth
        const vh = window.innerHeight
        setRect(win.id, {
          x: Math.round((vw - w) / 2),
          y: Math.max(4, Math.round((vh - 30 - h) / 2) - 20),
          w,
          h,
        })
      }
    } catch {
      /* canvas 不可用时回退固定尺寸 */
      setRect(win.id, { w: 380, h: 190 })
    }
  }, [kind, setRect, text, win.id])

  if (kind === 'logoff') {
    /* XP「注销 Windows」对话框：蓝渐变横幅 + 切换用户/注销双大按钮（图标左、文字右） */
    const opt = (
      icon: React.ReactNode,
      label: string,
      accel: string,
      onClick: () => void,
    ) => (
      <button
        type="button"
        className="flex items-center gap-3 px-4 py-3 rounded-[4px] hover:bg-white/30 active:bg-white/20 focus-visible:outline-2 outline-white/70"
        onClick={() => {
          playClick()
          onClick()
        }}
      >
        <span className="shrink-0">{icon}</span>
        <span className="text-white text-[12px] font-bold text-left leading-[15px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
          {label}
          <span className="block text-[10px] font-normal opacity-80">{accel}</span>
        </span>
      </button>
    )
    return (
      <div className="flex flex-col h-full xp-shutdown-dlg select-none">
        {/* 横幅 */}
        <div className="h-[42px] flex items-center justify-center gap-3">
          <Bmp name="logoffkey" size={26} />
          <span className="text-white text-[15px] font-bold drop-shadow">注销 Windows</span>
        </div>
        <div className="h-[2px] bg-[linear-gradient(45deg,#466dcd,#c7ddff,#b0c9f7,#5a7edc)]" />
        {/* 双按钮 */}
        <div className="flex-1 flex items-center justify-center gap-4 bg-gradient-to-b from-[#5b96e8] via-[#4a86dd] to-[#3a72cf]">
          {opt(<Bmp name="switchuser" size={32} />, '切换用户', '(S)', () => {
            playLogoff()
            closeWindow(win.id)
            /* FUS：保留会话回欢迎屏（磁贴显示「已登录」，可点击直接返回原桌面） */
            useXP.getState().setSwitchFrom(useXP.getState().sessionUser)
            setPhase('welcome')
          })}
          {opt(<Bmp name="logoffkey" size={32} />, '注销', '(L)', () => {
            playLogoff()
            closeAll()
            useXP.getState().setSwitchFrom(null)
            setPhase('logging-off')
          })}
        </div>
        {/* 底部取消 */}
        <div className="h-[38px] flex items-center justify-end px-3 bg-gradient-to-b from-[#3a72cf] to-[#2a5cb8]">
          <XPButton
            onClick={() => {
              playClick()
              closeWindow(win.id)
            }}
          >
            取消
          </XPButton>
        </div>
      </div>
    )
  }

  if (kind === 'shutdown') {
    return (
      <div className="flex flex-col h-full xp-shutdown-dlg select-none">
        <div className="h-[42px] flex items-center justify-center gap-3">
          <svg width="30" height="30" viewBox="0 0 30 30">
            <path d="M15 2 L27 7 V15 c0 8 -5.5 13 -12 15 C8.5 28 3 23 3 15 V7 Z" fill="url(#sdg)" stroke="#fff" strokeWidth="1.6" />
            <defs>
              <linearGradient id="sdg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f0604a" />
                <stop offset="1" stopColor="#a01808" />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-white text-[15px] font-bold drop-shadow">关闭计算机</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#4a89e0] via-[#3a6fd0] to-[#2a5fc0]">
          <div className="flex gap-7">
            <button type="button" className="flex flex-col items-center gap-2 group" onClick={() => {
              playClick()
              closeAll()
              setPhase('standby')
            }}>
              <PowerIcon kind="standby" size={54} />
              <span className="text-white text-[12px] group-hover:underline">待机 (S)</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-2 group" onClick={() => {
              playShutdown()
              closeAll()
              setPhase('shutting-down')
              setTimeout(() => setPhase('poweroff'), 2000)
            }}>
              <PowerIcon kind="off" size={54} />
              <span className="text-white text-[12px] group-hover:underline">关闭 (U)</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-2 group" onClick={() => {
              playClick()
              closeAll()
              setPhase('restarting')
              setTimeout(() => setPhase('boot'), 1500)
            }}>
              <PowerIcon kind="restart" size={54} />
              <span className="text-white text-[12px] group-hover:underline">重新启动 (R)</span>
            </button>
          </div>
        </div>
        <div className="h-[40px] flex items-center justify-end px-3 bg-gradient-to-b from-[#3a6fd0] to-[#2a55b0]">
          <XPButton
            onClick={() => {
              playClick()
              closeWindow(win.id)
            }}
          >
            取消
          </XPButton>
        </div>
      </div>
    )
  }

  if (kind === 'confirm') {
    const onYes = win.props.onYes as (() => void) | undefined
    const onNo = win.props.onNo as (() => void) | undefined
    return (
      <div className="flex flex-col h-full bg-[#ece9d8] select-none" onContextMenu={(e) => e.preventDefault()}>
        <div className="flex-1 flex items-start gap-4 p-4">
          <QuestionIcon size={32} />
          <div className="text-[11px] leading-[16px] whitespace-pre-wrap flex-1">{text}</div>
        </div>
        <div className="flex justify-center gap-3 pb-4">
          <XPButton
            primary
            autoFocus
            onClick={() => {
              playClick()
              closeWindow(win.id)
              onYes?.()
            }}
          >
            {((win.props.yesLabel as string) ?? '是(Y)')}
          </XPButton>
          <XPButton
            onClick={() => {
              playClick()
              closeWindow(win.id)
              onNo?.()
            }}
          >
            {((win.props.noLabel as string) ?? '否(N)')}
          </XPButton>
        </div>
      </div>
    )
  }

  if (kind === 'sticky') {
    /* 粘滞键提示（连按 5 次 Shift）：确定=启用 / 取消 / 设置=辅助功能选项 */
    return (
      <div className="flex flex-col h-full bg-[#ece9d8] select-none" onContextMenu={(e) => e.preventDefault()}>
        <div className="flex-1 flex items-start gap-4 p-4">
          <InfoIcon size={32} />
          <div className="text-[11px] leading-[16px] whitespace-pre-wrap flex-1">
            {text || '您已连续按了五次 Shift 键。要启用粘滞键吗？\n\n粘滞键是键盘的一种特性，使您可一次只按一个键来使用 Shift、Ctrl 或 Alt 键。'}
          </div>
        </div>
        <div className="flex justify-center gap-3 pb-4">
          <XPButton
            primary
            autoFocus
            onClick={() => {
              playClick()
              useXP.getState().setStickyKeys(true)
              useXP.getState().showToast('粘滞键已启用：现在可以一次只按一个修饰键了')
              closeWindow(win.id)
            }}
          >
            确定
          </XPButton>
          <XPButton
            onClick={() => {
              playClick()
              closeWindow(win.id)
            }}
          >
            取消
          </XPButton>
          <XPButton
            onClick={() => {
              playClick()
              closeWindow(win.id)
              useXP.getState().openApp('accessprops', {})
            }}
          >
            设置(S)...
          </XPButton>
        </div>
      </div>
    )
  }

  const icons: Record<string, React.ReactNode> = {
    error: <ErrorIcon size={32} />,
    warn: <WarnIcon size={32} />,
    info: <InfoIcon size={32} />,
    question: <QuestionIcon size={32} />,
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex-1 flex items-start gap-4 p-4">
        {icons[kind] ?? icons.info}
        <div className="text-[11px] leading-[16px] whitespace-pre-wrap flex-1">{text}</div>
      </div>
      <div className="flex justify-center pb-4">
        <XPButton
          primary
          autoFocus
          onClick={() => {
            playClick()
            closeWindow(win.id)
          }}
        >
          确定
        </XPButton>
      </div>
    </div>
  )
}

/* ─────────── 关于对话框 ─────────── */
export function AboutBox({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const setRect = useXP((s) => s.setRect)
  const text = (win.props.text as string) ?? ''
  const title = (win.props.title as string) ?? '关于 Windows'

  useEffect(() => {
    setRect(win.id, { w: 420, h: 330 })
  }, [setRect, win.id])

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none">
      <div className="px-5 pt-4 flex items-center gap-3">
        <svg width="42" height="42" viewBox="0 0 48 48">
          <path d="M6 12 Q14 7 22 7 L22 22 Q14 22 6 26 Z" fill="#e04a3a" />
          <path d="M25 7 Q33 7 41 11 L41 24 Q33 21 25 22 Z" fill="#7ac843" />
          <path d="M6 29 Q14 25 22 25 L22 40 Q14 40 6 43 Z" fill="#46a4ee" />
          <path d="M25 25 Q33 24 41 27 L41 41 Q33 38 25 40 Z" fill="#f5d43a" />
        </svg>
        <div className="text-[11px] leading-[16px] whitespace-pre-wrap flex-1">{text}</div>
      </div>
      <div className="flex-1" />
      <div className="flex justify-center pb-4">
        <XPButton primary autoFocus onClick={() => closeWindow(win.id)}>
          确定
        </XPButton>
      </div>
      <div className="text-[10px] text-[#8a8a8a] text-center pb-2">{title}</div>
    </div>
  )
}
