'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { WinState } from '../store'
import { imeEnter } from '../ime-keys'
import { useXP } from '../store'
import { MenuBar, XPButton } from '../ui'
import { Bmp } from '../bmp'
import { playClick } from '../sounds'

const FONTS = ['宋体', '黑体', '楷体', '微软雅黑', 'Arial', 'Times New Roman', 'Courier New', 'Trebuchet MS']
const SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '36', '48', '72']

/* 字符偏移 → DOM Range（查找/替换用：TreeWalker 遍历文本节点） */
function rangeFromOffsets(root: HTMLElement, start: number, length: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let pos = 0
  let startNode: Text | null = null
  let startOff = 0
  let endNode: Text | null = null
  let endOff = 0
  let node: Node | null
  while ((node = walker.nextNode())) {
    const t = node as Text
    const len = t.length
    if (!startNode && pos + len > start) {
      startNode = t
      startOff = start - pos
    }
    if (pos + len >= start + length) {
      endNode = t
      endOff = start + length - pos
      break
    }
    pos += len
  }
  if (!startNode || !endNode) return null
  const r = document.createRange()
  r.setStart(startNode, Math.min(startOff, startNode.length))
  r.setEnd(endNode, Math.min(endOff, endNode.length))
  return r
}

function TB({ children, onClick, active, disabled, title }: { children: React.ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`w-[23px] h-[22px] flex items-center justify-center rounded-[3px] border text-[11px] ${active ? 'bg-gradient-to-b from-[#fbd5a0] to-[#f0b060] border-[#c88a30]' : 'border-transparent hover:bg-gradient-to-b hover:from-[#fdf3e0] hover:to-[#f5dcb0] hover:border-[#e0b878]'} ${disabled ? 'opacity-40' : ''}`}
    >
      {children}
    </button>
  )
}

export default function WordPad({ win }: { win: WinState }) {
  const openApp = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const showToast = useXP((s) => s.showToast)
  const sessionUser = useXP((s) => s.sessionUser)
  const fsWriteFile = useXP((s) => s.fsWriteFile)
  const fsTree = useXP((s) => s.fsTree)
  const [fileName, setFileName] = useState<string | null>((win.props.fileName as string) ?? null)
  const [dirty, setDirty] = useState(false)
  /* VFS 保存状态：已保存文件名 + 对话框 */
  const [savedAs, setSavedAs] = useState('')
  const [saveAsDlg, setSaveAsDlg] = useState(false)
  const [saveAsName, setSaveAsName] = useState('文档.rtf')
  const [openDlg, setOpenDlg] = useState(false)
  const [font, setFont] = useState('宋体')
  const [size, setSize] = useState('12')
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [underline, setUnderline] = useState(false)
  const [align, setAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left')
  const [bullets, setBullets] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  /* 字体对话框 + 查找/替换对话框（XP 写字板真实功能） */
  const [showFont, setShowFont] = useState(false)
  const [fontDraft, setFontDraft] = useState({ family: '宋体', style: '常规', size: '12' })
  const [showFind, setShowFind] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [findText, setFindText] = useState('')
  const [replText, setReplText] = useState('')

  const content = (win.props.content as string) ?? ''

  /* 初始内容只在挂载时注入一次：
   * React 19 对 dangerouslySetInnerHTML 在重渲染时会无条件重设 innerHTML
   * （新对象字面量引用必变），导致任何 state 更新（dirty/对话框开关）都会
   * 清空 contenteditable 的用户输入 —— 改为 React 不接管此 DOM */
  useEffect(() => {
    const ed = editorRef.current
    if (ed && content) ed.innerHTML = content
  }, [])

  useEffect(() => {
    setWindowTitle(win.id, `${dirty ? '*' : ''}${fileName ?? '文档'} - 写字板`)
  }, [fileName, dirty, setWindowTitle, win.id])

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    setDirty(true)
    playClick()
  }

  const onInput = () => setDirty(true)

  /* 从当前选区后向后查找（到尾回绕），命中则选中并滚动到可见 */
  const findNext = (v0?: string): boolean => {
    const el = editorRef.current
    const needle0 = v0 ?? findText
    if (!el || !needle0) return false
    const text = el.innerText
    const lower = text.toLowerCase()
    const q = needle0.toLowerCase()
    let start = 0
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0)
      const pre = document.createRange()
      pre.selectNodeContents(el)
      pre.setEnd(range.startContainer, range.startOffset)
      start = pre.toString().length + (range.collapsed ? 0 : 1)
    }
    let idx = lower.indexOf(q, start)
    if (idx < 0) idx = lower.indexOf(q) /* 回绕 */
    if (idx < 0) {
      showToast(`找不到 "${findText}"`)
      return false
    }
    const r = rangeFromOffsets(el, idx, q.length)
    if (!r) return false
    const s = window.getSelection()
    s?.removeAllRanges()
    s?.addRange(r)
    /* 滚动到可见 */
    const rect = r.getBoundingClientRect()
    const host = el.closest('.overflow-y-auto')
    if (host && rect.height > 0) {
      const hr = host.getBoundingClientRect()
      if (rect.bottom > hr.bottom || rect.top < hr.top) el.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
    return true
  }

  /* 替换当前命中并查找下一个 */
  const replaceOne = () => {
    const el = editorRef.current
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && sel.toString().toLowerCase() === findText.toLowerCase()) {
      const r = sel.getRangeAt(0)
      r.deleteContents()
      r.insertNode(document.createTextNode(replText))
      r.collapse(false)
      setDirty(true)
    }
    findNext()
  }

  /* 全部替换（循环替换直到无命中） */
  const replaceAll = () => {
    const el = editorRef.current
    if (!el || !findText) return
    let count = 0
    const s = window.getSelection()
    s?.removeAllRanges()
    if (s) {
      const r = document.createRange()
      r.selectNodeContents(el)
      r.collapse(true)
      s.addRange(r)
    }
    /* 迭代替换：每次从头选中首个命中 */
    for (let guard = 0; guard < 500; guard++) {
      const text = el.innerText.toLowerCase()
      const q = findText.toLowerCase()
      const idx = text.indexOf(q)
      if (idx < 0) break
      const r = rangeFromOffsets(el, idx, q.length)
      if (!r) break
      const s2 = window.getSelection()
      s2?.removeAllRanges()
      s2?.addRange(r)
      r.deleteContents()
      r.insertNode(document.createTextNode(replText))
      count++
      setDirty(true)
      if (guard > 200) break
    }
    s?.removeAllRanges()
    showToast(`写字板已完成搜索文档并替换了 ${count} 处`)
  }

  /* 字体对话框应用（选区或全文生效，与工具栏同步状态） */
  const applyFontDialog = (f: { family: string; style: string; size: string }) => {
    const sel = window.getSelection()
    const ed = editorRef.current
    if (!ed) return
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !ed.contains(sel.anchorNode)) {
      ed.focus()
      const r = document.createRange()
      r.selectNodeContents(ed)
      const s = window.getSelection()
      s?.removeAllRanges()
      s?.addRange(r)
    } else {
      ed.focus()
    }
    setFont(f.family)
    setSize(f.size)
    setBold(f.style === '粗体' || f.style === '粗斜体')
    setItalic(f.style === '斜体' || f.style === '粗斜体')
    exec('fontName', f.family)
    exec('fontSize', String(Math.max(1, Math.min(7, Math.round(Number(f.size) / 4)))))
    if (f.style === '粗体' || f.style === '粗斜体') exec('bold')
    if (f.style === '斜体' || f.style === '粗斜体') exec('italic')
    setShowFont(false)
  }

  const save = () => {
    if (savedAs) {
      doSaveVfs(savedAs)
    } else {
      setSaveAsName(fileName ?? '文档.rtf')
      setSaveAsDlg(true)
    }
  }

  const doSaveVfs = (name: string) => {
    const myDocs = ['本地磁盘 (C:)', 'Documents and Settings', sessionUser, 'My Documents']
    const finalName = /\.rtf$/i.test(name) ? name : `${name}.rtf`
    const html = editorRef.current?.innerHTML ?? ''
    const written = fsWriteFile(myDocs, finalName, html, { icon: 'doc', type: '写字板文档', appId: 'wordpad' })
    setSavedAs(written)
    setFileName(written)
    setDirty(false)
    playClick()
    showToast(`已保存到 我的文档\\${written}（虚拟文件系统）`)
  }

  const openFromVfs = (node: { name: string; content?: string }) => {
    const ed = editorRef.current
    if (!ed) return
    ed.innerHTML = node.content?.startsWith('<') ? node.content : `<div>${(node.content ?? '').replace(/\n/g, '<br>')}</div>`
    setSavedAs(node.name)
    setFileName(node.name)
    setDirty(false)
    setOpenDlg(false)
    showToast(`已打开 ${node.name}`)
  }

  /* 我的文档下的写字板/文本文档清单（打开对话框数据源） */
  const docsList = useMemo(() => {
    const out: Array<{ name: string; content?: string; icon?: string }> = []
    const walk = (n: typeof fsTree) => {
      for (const c of n.children ?? []) {
        if (c.kind === 'folder' && c.name !== 'Recycled') walk(c)
        else if (c.kind === 'file' && (c.icon === 'doc' || c.icon === 'text') && c.content) out.push({ name: c.name, content: c.content, icon: c.icon })
      }
    }
    walk(fsTree)
    return out
  }, [fsTree])

  const colorBtn = (c: string, cmd: string) => (
    <button type="button" title="颜色" className="w-[23px] h-[22px] flex items-center justify-center rounded-[3px] border border-transparent hover:border-[#e0b878] hover:bg-[#fdf3e0]" onClick={() => exec(cmd, c)}>
      <span className="w-[14px] h-[14px] border border-[#8a8a8a] rounded-[2px]" style={{ background: c }} />
    </button>
  )

  return (
    <div className="relative flex flex-col h-full bg-[#ece9d8] select-none">
      <MenuBar
        menus={[
          {
            label: '文件(F)',
            items: [
              { label: '新建(N)', accelerator: 'Ctrl+N', onClick: () => { if (editorRef.current) editorRef.current.innerHTML = ''; setFileName(null); setSavedAs(''); setDirty(false) } },
              { label: '打开(O)...', accelerator: 'Ctrl+O', onClick: () => setOpenDlg(true) },
              { label: '保存(S)', accelerator: 'Ctrl+S', onClick: save },
              { label: '另存为(A)...', onClick: () => { setSaveAsName(fileName ?? '文档.rtf'); setSaveAsDlg(true) } },
              { separator: true },
              { label: '打印(P)...', accelerator: 'Ctrl+P', onClick: () => openApp('print', { appName: win.title, pages: 2 }) },
              { separator: true },
              { label: '退出(X)', onClick: () => closeWindow(win.id) },
            ],
          },
          {
            label: '编辑(E)',
            items: [
              { label: '撤消(U)', accelerator: 'Ctrl+Z', onClick: () => exec('undo') },
              { separator: true },
              { label: '剪切(T)', accelerator: 'Ctrl+X', onClick: () => exec('cut') },
              { label: '复制(C)', accelerator: 'Ctrl+C', onClick: () => exec('copy') },
              { label: '粘贴(P)', accelerator: 'Ctrl+V', onClick: () => exec('paste') },
              { separator: true },
              { label: '全选(A)', accelerator: 'Ctrl+A', onClick: () => exec('selectAll') },
              { label: '查找(F)...', accelerator: 'Ctrl+F', onClick: () => { setShowFind(true); setShowReplace(false) } },
              { label: '替换(R)...', accelerator: 'Ctrl+H', onClick: () => { setShowReplace(true); setShowFind(false) } },
            ],
          },
          {
            label: '查看(V)',
            items: [
              { label: '工具栏', submenu: [{ label: '格式栏', checked: true }, { label: '标尺', checked: true }, { label: '状态栏', checked: true }] },
              { label: '选项(O)...', onClick: () => showToast('选项对话框在复刻版中省略') },
            ],
          },
          {
            label: '插入(I)',
            items: [
              { label: '日期和时间(D)...', onClick: () => exec('insertText', new Date().toLocaleString('zh-CN')) },
              { label: '对象(O)...', onClick: () => showToast('对象插入：复刻版未实现') },
            ],
          },
          {
            label: '格式(O)',
            items: [
              { label: '字体(F)...', onClick: () => { setFontDraft({ family: font, style: bold && italic ? '粗斜体' : bold ? '粗体' : italic ? '斜体' : '常规', size }); setShowFont(true) } },
              { label: '项目符号样式(B)', checked: bullets, onClick: () => { setBullets(!bullets); exec('insertUnorderedList') } },
            ],
          },
          { label: '帮助(H)', items: [{ label: '关于写字板(A)', onClick: () => openApp('dialog', { kind: 'info', title: '关于写字板', text: 'Windows 写字板 Web 复刻版\n\n一个简单好用的富文本编辑器，\n支持字体、颜色、对齐与项目符号。' }) }] },
        ]}
      />

      {/* 格式工具栏 */}
      <div className="flex items-center gap-1 px-1 py-[2px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8] flex-wrap">
        <select
          className="xp-sunken bg-white text-[11px] h-[20px] w-[110px] px-1"
          value={font}
          onChange={(e) => {
            setFont(e.target.value)
            exec('fontName', e.target.value)
          }}
        >
          {FONTS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select
          className="xp-sunken bg-white text-[11px] h-[20px] w-[46px] px-1"
          value={size}
          onChange={(e) => {
            setSize(e.target.value)
            exec('fontSize', String(Math.max(1, Math.min(7, Math.round(Number(e.target.value) / 4)))))
          }}
        >
          {SIZES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="w-[4px]" />
        <TB title="加粗" active={bold} onClick={() => { setBold(!bold); exec('bold') }}>
          <b className="font-serif">B</b>
        </TB>
        <TB title="倾斜" active={italic} onClick={() => { setItalic(!italic); exec('italic') }}>
          <i className="font-serif">I</i>
        </TB>
        <TB title="下划线" active={underline} onClick={() => { setUnderline(!underline); exec('underline') }}>
          <u className="font-serif">U</u>
        </TB>
        <TB title="颜色" onClick={() => exec('foreColor', '#c02020')}>A</TB>
        {colorBtn('#c02020', 'foreColor')}
        {colorBtn('#ffeb8c', 'hiliteColor')}
        <div className="w-[4px]" />
        <TB title="左对齐" active={align === 'left'} onClick={() => { setAlign('left'); exec('justifyLeft') }}>
          <svg width="15" height="13" viewBox="0 0 15 13"><path d="M1 2 h13 M1 5 h9 M1 8 h13 M1 11 h6" stroke="#333" strokeWidth="1.4" /></svg>
        </TB>
        <TB title="居中" active={align === 'center'} onClick={() => { setAlign('center'); exec('justifyCenter') }}>
          <svg width="15" height="13" viewBox="0 0 15 13"><path d="M1 2 h13 M3 5 h9 M1 8 h13 M4 11 h7" stroke="#333" strokeWidth="1.4" /></svg>
        </TB>
        <TB title="右对齐" active={align === 'right'} onClick={() => { setAlign('right'); exec('justifyRight') }}>
          <svg width="15" height="13" viewBox="0 0 15 13"><path d="M1 2 h13 M5 5 h9 M1 8 h13 M7 11 h6" stroke="#333" strokeWidth="1.4" /></svg>
        </TB>
        <TB title="项目符号" active={bullets} onClick={() => { setBullets(!bullets); exec('insertUnorderedList') }}>
          <svg width="15" height="13" viewBox="0 0 15 13"><circle cx="2.5" cy="3" r="1.5" fill="#333" /><circle cx="2.5" cy="7" r="1.5" fill="#333" /><circle cx="2.5" cy="11" r="1.5" fill="#333" /><path d="M6 2.5 h8 M6 6.5 h8 M6 10.5 h8" stroke="#333" strokeWidth="1.4" /></svg>
        </TB>
      </div>

      {/* 标尺 */}
      <div className="flex items-end gap-0 px-2 h-[18px] bg-gradient-to-b from-[#f6f4ea] to-[#e8e5d8] border-b border-[#d8d5c8] overflow-hidden">
        <div className="flex-1 h-[13px] border-b border-[#8a8a8a] relative">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="absolute bottom-0 bg-[#5a5a4a]" style={{ left: i * 10, width: 1, height: i % 5 === 0 ? 8 : 4 }} />
          ))}
        </div>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 bg-[#808080] p-[6px] min-h-0">
        <div className="h-full max-w-[816px] mx-auto bg-white shadow-[2px_2px_5px_rgba(0,0,0,0.4)] overflow-y-auto xp-thin-scroll">
          <div
            ref={editorRef}
            className="min-h-full p-6 text-[12px] leading-[20px] outline-none select-text"
            contentEditable
            suppressContentEditableWarning
            onInput={onInput}
            onKeyDown={(e) => {
              /* Ctrl+B/I/U 格式快捷键（contentEditable 原生支持，仅阻止全局干扰） */
              if (e.ctrlKey && !e.altKey) {
                const kl = e.key.toLowerCase()
                if (kl === 'b' || kl === 'i' || kl === 'u') e.stopPropagation()
                else if (kl === 's') { e.preventDefault(); e.stopPropagation(); void 0 /* 保存由菜单处理 */ }
              }
            }}
            onContextMenu={(e) => {
              /* XP 写字板编辑区右键：编辑菜单 */
              e.preventDefault()
              e.stopPropagation()
              const el = editorRef.current
              const sel = el && window.getSelection()
              const hasSel = !!sel && sel.toString().length > 0
              const doc = (cmd: string) => { try { document.execCommand(cmd) } catch { /* noop */ } }
              useXP.getState().openCtx(e.clientX, e.clientY, [
                { label: '撤消(U)', accelerator: 'Ctrl+Z', onClick: () => doc('undo') },
                { separator: true },
                { label: '剪切(T)', accelerator: 'Ctrl+X', disabled: !hasSel, onClick: () => doc('cut') },
                { label: '复制(C)', accelerator: 'Ctrl+C', disabled: !hasSel, onClick: () => doc('copy') },
                { label: '粘贴(P)', accelerator: 'Ctrl+V', onClick: () => doc('paste') },
                { separator: true },
                { label: '字体(F)...', submenu: [
                  { label: '加粗(B)', accelerator: 'Ctrl+B', onClick: () => doc('bold') },
                  { label: '斜体(I)', accelerator: 'Ctrl+I', onClick: () => doc('italic') },
                  { label: '下划线(U)', accelerator: 'Ctrl+U', onClick: () => doc('underline') },
                ] },
                { label: '段落格式', submenu: [
                  { label: '左对齐(L)', onClick: () => doc('justifyLeft') },
                  { label: '居中(C)', onClick: () => doc('justifyCenter') },
                  { label: '右对齐(R)', onClick: () => doc('justifyRight') },
                ] },
              ])
            }}
            style={{ fontFamily: '宋体' }}
          />
        </div>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center h-[20px] bg-[#ece9d8] border-t border-[#d8d5c8] text-[11px]">
        <div className="px-2 flex-1 border-r border-[#d8d5c8]">{dirty ? '已修改' : '就绪'}</div>
        <div className="px-2 border-r border-[#d8d5c8]">
          {fileName ? `文档: ${fileName}` : '新建文档'}
        </div>
        <div className="px-2">鼠标指针</div>
      </div>

      {/* ── 字体对话框（格式→字体，三栏 + 示例预览，选区生效） ── */}
      {showFont ? (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[420px] xp-dialog">
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">字体</div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-[1fr_92px_70px] gap-2">
                <div>
                  <div className="text-[11px] mb-[2px]">字体(F):</div>
                  <div className="xp-sunken bg-white h-[108px] overflow-y-auto xp-thin-scroll">
                    {FONTS.map((f) => (
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
                  <div className="xp-sunken bg-white h-[108px] overflow-y-auto xp-thin-scroll">
                    {['常规', '斜体', '粗体', '粗斜体'].map((st) => (
                      <div
                        key={st}
                        className={`px-2 py-[2px] text-[11px] cursor-default ${fontDraft.style === st ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8eef8]'}`}
                        onClick={() => setFontDraft((d) => ({ ...d, style: st }))}
                      >
                        {st}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] mb-[2px]">大小(S):</div>
                  <div className="xp-sunken bg-white h-[108px] overflow-y-auto xp-thin-scroll">
                    {SIZES.map((s) => (
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
              <div>
                <div className="text-[11px] mb-[2px]">示例</div>
                <div
                  className="xp-sunken bg-white h-[44px] flex items-center justify-center text-[20px]"
                  style={{
                    fontFamily: fontDraft.family,
                    fontWeight: fontDraft.style === '粗体' || fontDraft.style === '粗斜体' ? 'bold' : 'normal',
                    fontStyle: fontDraft.style === '斜体' || fontDraft.style === '粗斜体' ? 'italic' : 'normal',
                    fontSize: Math.min(28, Number(fontDraft.size)),
                  }}
                >
                  AaBbYyZz 中文
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <XPButton onClick={() => applyFontDialog(fontDraft)}>确定</XPButton>
                <XPButton onClick={() => setShowFont(false)}>取消</XPButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 查找对话框（编辑→查找，从光标处循环查找） ── */}
      {showFind ? (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[330px] xp-dialog">
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">查找</div>
            <div className="p-3 space-y-3">
              <label className="flex items-center gap-2 text-[11px]">
                <span className="w-[64px] text-right">查找内容(N):</span>
                <input
                  className="flex-1 h-[20px] xp-sunken text-[11px] px-1"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  onKeyDown={(e) => imeEnter(e, (v) => findNext(v))}
                  autoFocus
                />
              </label>
              <div className="flex justify-end gap-2">
                <XPButton onClick={() => findNext()}>查找下一个(F)</XPButton>
                <XPButton onClick={() => setShowFind(false)}>取消</XPButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 替换对话框（编辑→替换，替换单处/全部） ── */}
      {showReplace ? (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[330px] xp-dialog">
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">替换</div>
            <div className="p-3 space-y-3">
              <label className="flex items-center gap-2 text-[11px]">
                <span className="w-[64px] text-right">查找内容(N):</span>
                <input
                  className="flex-1 h-[20px] xp-sunken text-[11px] px-1"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-[11px]">
                <span className="w-[64px] text-right">替换为(P):</span>
                <input
                  className="flex-1 h-[20px] xp-sunken text-[11px] px-1"
                  value={replText}
                  onChange={(e) => setReplText(e.target.value)}
                />
              </label>
              <div className="flex justify-end gap-2">
                <XPButton onClick={() => replaceOne()}>替换(R)</XPButton>
                <XPButton onClick={() => replaceAll()}>全部替换(A)</XPButton>
                <XPButton onClick={() => setShowReplace(false)}>取消</XPButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 另存为对话框（保存到 我的文档） */}
      {saveAsDlg ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10">
          <div className="w-[340px] bg-[#ece9d8] border border-[#0a3c94] shadow-[4px_4px_14px_rgba(0,0,40,0.4)]">
            <div className="h-[24px] flex items-center px-2 bg-gradient-to-b from-[#2a72c8] to-[#1648a0] text-white text-[11px] font-bold">保存为</div>
            <div className="p-4 text-[11px] space-y-3">
              <div className="text-[#444]">保存位置: 我的文档</div>
              <div className="flex items-center gap-2">
                <span className="w-[52px] text-right">文件名(N):</span>
                <input
                  className="flex-1 h-[20px] px-[4px] bg-white border border-[#7f9db9] outline-none text-[11px]"
                  value={saveAsName}
                  autoFocus
                  onChange={(e) => setSaveAsName(e.target.value)}
                  onKeyDown={(e) => { imeEnter(e, (v) => { if (v.trim()) { doSaveVfs(v.trim()); setSaveAsDlg(false) } }) }}
                />
              </div>
              <div className="text-[#888]">保存类型: RTF 格式 (*.rtf)</div>
              <div className="flex justify-end gap-2">
                <button type="button" className="xp-btn px-4 h-[22px] text-[11px]" disabled={!saveAsName.trim()} onClick={() => { doSaveVfs(saveAsName.trim()); setSaveAsDlg(false) }}>保存(S)</button>
                <button type="button" className="xp-btn px-4 h-[22px] text-[11px]" onClick={() => setSaveAsDlg(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 打开对话框（我的文档内的写字板/文本文档） */}
      {openDlg ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10">
          <div className="w-[380px] bg-[#ece9d8] border border-[#0a3c94] shadow-[4px_4px_14px_rgba(0,0,40,0.4)]">
            <div className="h-[24px] flex items-center px-2 bg-gradient-to-b from-[#2a72c8] to-[#1648a0] text-white text-[11px] font-bold">打开</div>
            <div className="p-4 text-[11px]">
              <div className="xp-sunken bg-white h-[200px] overflow-y-auto xp-thin-scroll">
                {docsList.length === 0 ? (
                  <div className="text-[#888] text-center py-8">没有可打开的文档</div>
                ) : docsList.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    className="w-full flex items-center gap-2 px-2 py-[3px] text-left hover:bg-[#e8f0fb]"
                    onClick={() => openFromVfs(d)}
                  >
                    <Bmp name={d.icon === 'doc' ? 'docfile' : 'txtfile'} size={16} />
                    <span className="truncate">{d.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button type="button" className="xp-btn px-4 h-[22px] text-[11px]" onClick={() => setOpenDlg(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
