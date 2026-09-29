# 工作日志

---
Task ID: 1
Agent: 主 Agent (Super Z)
Task: 1:1 复刻 Windows XP WebOS（Type 3 交互式网页开发）

Work Log:
- 初始化 fullstack 开发环境（Next.js 16 + Tailwind 4 + TypeScript）
- 通过 image-search 搜索 Bliss 壁纸，均不纯净；改用 z-ai image 生成 Bliss/Azul/Autumn 三张壁纸（VLM 验证通过），PIL 转 JPEG 优化（207KB/68KB/220KB）
- 手绘 SVG 图标系统 30+ 个（icons.tsx + app-icons.tsx）：XP 旗帜、我的电脑、回收站、IE、驱动器、电源按钮、笑脸、七段数码管等
- WebAudio 合成音效（sounds.ts）：启动音、关机音、错误叮声、点击、嗖声
- 虚拟文件系统（fs.ts）：C 盘完整中文目录树
- Zustand 状态管理（store.ts）：窗口管理、阶段机（boot→welcome→desktop→shutdown）、级联定位
- 窗口管理器（XPWindow.tsx）：拖拽/8 向缩放/最大化/焦点/最小化，Luna 渐变标题栏
- 启动序列（screens.tsx）：BIOS 自检 → XP logo 跑马灯 → 欢迎屏（登录）→ 桌面
- 桌面系统（Desktop.tsx）：图标网格、框选、右键菜单（新建/查看/属性）
- 任务栏（Taskbar.tsx）：绿色开始按钮、快速启动、任务按钮、托盘（音量/安全中心/时钟）、右键平铺/层叠
- 开始菜单（StartMenu.tsx）：双栏布局、所有程序级联、注销/关机
- 10 个应用全部完成：资源管理器、记事本（可保存）、扫雷（完整游戏逻辑+首点安全）、画图（11 工具+洪水填充+反色）、计算器（键盘支持）、IE（MSN 门户/搜索/经典错误页）、纸牌（Klondike 拖拽+胜利飞牌动画）、WMP（WebAudio 音序器 3 曲+实时可视化）、任务管理器（CPU 图表+结束任务）、CMD（10+ 命令）
- 显示属性（换壁纸）、运行对话框（notepad/calc/winmine 等命令映射）
- globals.css：完整 Luna 主题 CSS（任务栏渐变、开始按钮、标题栏、菜单、按钮、扫雷 3D 格、纸牌牌背等）
- ESLint 修复 3 轮：组件提升到模块级（react-hooks/static-components）、ref 渲染期访问、导入路径错误
- Agent Browser 端到端验证全部通过

Stage Summary:
- 交付物：完整可运行的 Windows XP WebOS（单页应用）
- 端到端验证项：启动/登录/桌面/开始菜单/8 个应用交互/窗口拖拽/最小化还原/关机-重启-断电全循环/气球提示，控制台无错误
- VLM 视觉评估："整体保真度极高，无明显视觉缺陷"
- 关键决策：素材不可靠搜索结果 → AI 生成壁纸 + 手绘 SVG 图标，保证 100% 自包含

---
Task ID: 2
Agent: 主 Agent (Super Z)
Task: 端到端验证 + lint 修复 + 最终交付

Work Log:
- Agent Browser 完整测试：BIOS/开机logo/欢迎屏/登录、桌面图标、开始菜单双栏+级联、8 个应用全部交互（扫雷翻格+插旗、计算器运算、纸牌发牌、画图绘制、IE 导航+错误页、CMD dir 命令、运行对话框）、窗口拖拽/最小化/任务栏还原、关机→断电→重启完整循环
- 修复 lint：Solitaire effect 内同步 setState → 改为事件处理器内生成飞牌动画数据
- 最终 lint 通过、页面 HTTP 200、控制台 0 错误、纸牌重构后回归验证通过

Stage Summary:
- 所有功能端到端验证通过，交付就绪

---
Task ID: 3
Agent: 主 Agent (Super Z)
Task: 功能完整复刻补全（消除全部 unimpl 占位 + 系统级交互）

Work Log:
- 新增 15 个应用/组件全部完成并注册：
  · 空当接龙 FreeCell（完整规则：超级移动、双击自动回堆、安全自动收、游戏编号、死局检测）
  · 红心大战 Hearts（4人对局、传牌四方向轮转、AI 策略出牌、Q♠13分、全收反转、100 分终局）
  · 写字板 WordPad（contentEditable 富文本：字体/字号/粗斜下划/颜色/四对齐/项目符号/标尺）
  · Outlook Express（三栏布局、4 封预置邮件、附件显示、写邮件+发送到已发送）
  · Windows Messenger（联系人列表+状态、聊天窗口、机器人延迟回复）
  · 三维弹球 Pinball（canvas 物理引擎：蓄力发射、双挡板、bumper/目标灯、3 球计分）
  · 磁盘清理（三阶段：选驱动器→扫描进度→勾选清理→完成）
  · 磁盘碎片整理（分析/整理、真实块图动画 22×10、图例）
  · 系统信息（系统树+摘要/显示/网络数据）
  · 控制面板（8 分类视图+任务链接+经典视图切换+蓝色侧栏）
  · 系统属性（4 选项卡：常规/计算机名/硬件/高级，Win+Pause 可达）
  · 用户账户（账户列表+账户详情导航）
  · 音量控制（5 通道竖直滑块+平衡+静音，主音量真实联动 WebAudio master gain）
  · 搜索（搜索伙伴窗格+全盘文件搜索+结果双击打开）
  · 帮助和支持中心（6 大主题完整内容、后退/主页导航）
- 系统级功能：
  · Alt+Tab 任务切换器（XP 深蓝面板、图标网格、松开 Alt 切换）
  · Win 快捷键：D/E/R/F/L/Pause 全部实现
  · Ctrl+Alt+Del(End) → Windows 安全对话框（6 按钮全部可用）
  · 屏幕保护：星空 starfield + 变幻线 mystify（canvas）、空闲 1-60 分钟自动触发、任意输入退出
  · 三种 Luna 主题（蓝/橄榄绿/银）CSS 变量系统：任务栏/标题栏/托盘/开始菜单/侧栏/按钮全面联动，显示属性实时切换
  · 托盘音量：单击弹出 XP 经典竖直滑块（静音勾选），双击打开音量控制面板
  · 开始菜单：常用程序按使用频率动态排序；所有程序菜单无占位（含写字板/空当接龙/红心大战/三维弹球/Outlook/Messenger/磁盘工具）
  · Explorer 四种查看模式（平铺/图标/列表/详细信息）真实生效
  · Run 命令映射扩充至 33 条（write/freecell/mshearts/pinball/msimn/msmsgs/cleanmgr/dfrg/msinfo32/sndvol32/sysdm.cpl/nusrmgr.cpl/helpctr/winver…）
  · WebAudio master gain 节点（音量滑块全系统联动）
  · fs.ts：flattenFS 搜索支持 + 15 个新 exe 条目
- lint 4 轮修复：字符串转义×3（AC'97、nusrmgr.cpl 键名）、渲染期 ref 赋值（Hearts gRef→useEffect）、渲染期 setState（Pinball/SysInfo）、内嵌组件提升（ThemePreview）
- Hearts doPass 调度 bug 修复（闭包旧 turn 导致 AI 不出牌 → 直接使用 startPlaying 返回的新 turn）
- 端到端验证（agent-browser）：
  · 15 应用全部启动 ✓；FreeCell 拖牌移动数 +1 ✓；Hearts 传牌→AI 出牌→完整墩 ✓
  · Messenger 聊天+机器人回复 ✓；音量 flyout/静音 ✓；Alt+Tab 面板+切换 ✓
  · Ctrl+Alt+Del → 安全对话框 → 任务管理器 ✓；三主题实时切换（data-theme+任务栏渐变实测）✓
  · 屏保 1 分钟真实自动触发 + 鼠标退出 ✓；控制面板分类→任务→显示属性全链路 ✓
  · 关机→断电→重启→登录完整循环 ✓；弹球空格发射（canvas 像素活跃）✓
  · 控制台 0 错误；bun run lint 通过；bun run build 生产构建成功
- VLM 视觉审查 12 张截图：全部评为高还原度、无重大视觉缺陷

Stage Summary:
- 交付物：功能完整版 Windows XP WebOS（31 个应用/系统组件）
- 原有 10 应用 + 新增 15 应用/组件 + 6 项系统级交互全部可玩/可用
- 关键架构：zustand store 扩展（theme/screensaver/volume/altTab/security/programUse）、CSS 变量主题系统、WebAudio master gain

---
Task ID: 4
Agent: 主 Agent (Super Z)
Task: IE 真实联网 + 全功能 1:1 补全（回收站/剪贴板/拖放/属性/新应用）

Work Log:
- 服务器端真实联网代理 /api/browse：
  · node:http2 优先 + HTTP/1.1 fetch 兜底 + gzip/deflate/br 解压
  · 关键修复：维基百科等站封禁 HTTP/1.1（403）→ HTTP/2 通道打通（wikipedia/sina 实测 200）
  · HTML 重写：注入 <base>、剥离 CSP/XFO/refresh meta、注入拦截脚本（链接点击/GET 表单/window.open → postMessage 导航、标题/悬停状态上报）
  · charset 智能解码（GBK/GB2312 等传统编码）；SSRF 防护（局域网/回环封禁）；12MB 上限；?raw=1 查看源文件
- /api/search：z-ai-web-dev-sdk web_search 真实搜索（MSN Search 风格结果页）
- /api/netinfo：真实 ipconfig（os.networkInterfaces + 公网 IP）、真实 ping（服务器计时 4 次探测）、服务器时间（Internet 时间同步）
- IE 6 完全重写：真实网页 iframe 渲染（sandbox 隔离）、前进/后退/停止/刷新/主页、地址栏（URL/关键词智能分流 + 历史下拉）、收藏夹/历史侧栏（全局 store）、MSN 门户（频道→新浪真实频道、新闻→维基真实词条）、真实搜索结果页（点击→代理浏览）、状态栏（悬停 URL+进度条+Internet 区域）、查看源文件（raw 拉取→记事本）、Internet 选项（7 选项卡、主页可改、清历史真实生效）
- 可变文件系统（store）：structuredClone(FS) 实时树 + mutateAt/detachNode/insertNode 不可变更新
  · 新建文件夹/文本文档/位图、写入、重命名（F2/行内输入）、删除→回收站、还原（单个/全部）、清空、复制/剪切/粘贴（Ctrl+C/X/V）、移动（拖放）、副本生成
  · 回收站：真实对象列表、原位置列、还原/清空任务窗格、桌面图标满/空联动
- Explorer 重写：实时树渲染、4 种视图、回收站/网上邻居特殊视图、右键菜单全套、地址栏可编辑（C:\ 路径解析）、Delete/F2/Ctrl 快捷键、HTML5 拖放（文件→文件夹、文件→列表背景）、属性对话框、文本→记事本/图片→查看器/EXE→应用
- Desktop 重写：系统图标+真实文件混合、绝对定位+网格吸附拖动重排、框选、桌面文件右键（打开/剪切/复制/删除/重命名/属性）、新建落盘、粘贴、接受 Explorer 拖放、回收站图标联动
- 新应用 6 个：
  · Windows 图片和传真查看器（真实图片、翻页/最佳适应/实际大小/缩放/旋转、像素信息、键盘方向键）
  · 录音机（真实 getUserMedia+MediaRecorder、实时波形 canvas、播放/停止/倒带、加速/减速/反转/音量效果、保存到 My Music、无麦克风→XP 错误框）
  · 字符映射表（6 字体、2895 字符网格、U+ 码点提示、点选复制到剪贴板）
  · 日期和时间 属性（模拟时钟表盘、可改时间→真实偏移托盘时钟、11 时区、Internet 时间真实同步）
  · 文件/文件夹属性（常规页：类型/位置/大小/统计/三个时间戳/只读隐藏）
  · Internet 选项（7 选项卡全交互）
- 记事本升级：查找/查找下一个/替换/全部替换（大小写开关）、打开对话框（实时树文本文件）、另存为对话框（位置选择）、Ctrl+S 真实落盘、退出未保存确认
- CMD 重写：实时 dir/cd/type/del(→回收站)/copy(副本)/tree、真实 ping（延迟统计）、真实 ipconfig /all、start 支持 URL
- 托盘时钟：双击→日期时间属性、3 秒刷新、xpNow 偏移
- 开始菜单：附件→娱乐（录音机/WMP/音量）、附件→系统工具→字符映射表
- Run：sndrec32/charmap/shimgvw/timedate.cpl/inetcpl.cpl/main.cpl + URL 直开
- 修复：SearchApp 语法损坏行与 fsOverrides 残留引用、DateTimeProps live 变量误删崩溃、Explorer fsMove 自环守卫、IE SearchPage setState-in-effect
- e2e 验证（agent-browser + VLM 视觉审查）：
  · IE：维基百科正文/信息框完整渲染（VLM 确认排版正常）、站内链接点击→代理导航、真实搜索（Reddit/CSDN 结果）、MSN 频道真实跳转、标题/状态栏 postMessage、后退、Reddit 403→经典 IE 错误页
  · 文件系统：新建文本文档→编辑→Ctrl+S→重开内容持久化；删除→回收站(1 对象)→还原所有→桌面恢复；复制→粘贴→「欢迎 (2).txt」；拖放→文件移入图片收藏
  · CMD：dir 实时列表、ping baidu（18ms 平均，0% 丢失）、ipconfig /all（真实网卡+公网 IP）
  · 新应用：图片查看器（Bliss 1344×768、翻页 2/3、旋转）、字符映射表（选中啷啼喁）、录音机（无麦克风→XP 错误框）、日期时间（指针精确）、Internet 时间同步成功
  · 开始菜单级联（hover 展开）、时钟双击、生产构建成功（5 路由）
- dev.log 捕获到真实用户使用痕迹：用户在 IE 里用百度搜索「浏览器信息查询」并点进结果页 —— 真实浏览链路被实际使用

Stage Summary:
- IE 达到真实联网能力（HTTP/2 代理绕过反爬、真实搜索、真实 ping/ipconfig/时间同步）
- 文件系统从静态变为全功能可变（回收站/剪贴板/拖放/新建/重命名/属性完整闭环）
- 新增 6 应用 + 记事本/CMD/Explorer/Desktop 全面升级，共 37 应用/组件
- bun run lint 0 错误 0 警告；生产构建成功；VLM 终评 95/100

---
Task ID: 5
Agent: 主 Agent (Super Z)
Task: 右键菜单 + 键盘快捷键 1:1 补全（用户反馈：连右键菜单都没有、快捷键无法使用）

Work Log:
- 诊断：代码已有部分右键接线（桌面/Explorer/任务栏整条），但最常用表面缺失——记事本文本区 preventDefault 后无替代菜单（右键完全无响应）、窗口标题栏/任务按钮/托盘图标冒泡到错误菜单、iframe 页面内右键无法拦截
- 新建 src/components/xp/ctx-menus.ts 共享菜单层：
  · editCtxItems/openEditCtx：标准 XP 编辑菜单（撤消/剪切/复制/粘贴/删除/全选，按选区状态禁用）
  · windowSysMenu：窗口系统菜单（还原/移动/大小/最小化/最大化/关闭 + Alt 快捷键提示）
- XPWindow：标题栏右键→系统菜单；新增键盘移动/大小模式（系统菜单触发，方向键调整 Shift 加速，Enter 确认 Esc 还原，虚线框+提示条视觉）
- XPSystem 全局快捷键大升级：
  · Win 单键（keydown 记录/keyup 判定，误触作废）→ 开始菜单
  · Ctrl+Esc → 开始菜单、Alt+F4 → 关闭窗口（无窗口弹关机对话框）
  · Alt+Space → 窗口系统菜单（左上角定位）、Alt+Esc → z 序底窗口切换
  · Win+M/Win+Shift+M（最小化/撤销）、Win+U（辅助工具管理器）、Win+B
  · F5 → 桌面刷新（CustomEvent 转发到聚焦的 Explorer/IE）+ 桌面闪烁动画
  · PrintScreen 提示、输入上下文守卫（焦点在输入框时不触发单键快捷键）
- Taskbar 右键全家桶：任务按钮→窗口系统菜单、时钟→调整日期/时间+Internet 时间同步、音量→音量控制/静音、盾牌→安全中心、Messenger→状态子菜单、开始按钮→打开所有用户/资源管理器/搜索/运行
- Notepad：文本区 XP 右键编辑菜单（含从右到左阅读顺序/Unicode 控制字符/时间日期）、全套快捷键 Ctrl+N/O/S/P/F/H/G、F5 插入时间、转到行对话框（真实跳转）、状态栏可切换、Esc 关闭所有子对话框
- DialogBox：Esc=取消（不触发按钮动作）、Enter=默认按钮
- IE 6：
  · 代理脚本注入 contextmenu 拦截（preventDefault + postMessage 上报坐标/链接/图片/选区）
  · 页面内右键→IE6 菜单（选区复制/链接打开/新窗口/图片另存为/搜索选中文字/收藏/源文件/属性，按上下文动态拼装）
  · 快捷键：F5 刷新、Esc 停止、Alt+←/→、Alt+Home、Alt+D、Ctrl+D/H/I/E/N/O/L/P、F11 全屏（窗口最大化）
  · 地址栏右键编辑菜单 + Ctrl+Enter 自动补全 www.xxx.com、侧栏搜索框右键
- Explorer：Ctrl+A 全选、Ctrl+D 删除、Alt+Enter 属性、Shift+Delete 永久删除确认（新增 fsDeletePermanent 真永久删除不污染回收站）、Menu 键/Shift+F10、方向键网格导航（Ctrl/Shift 多选）、Enter 打开、地址栏右键、F5 响应
- Desktop：方向键网格导航、F2 重命名、Enter 打开、Menu 键/Shift+F10（定位到图标右缘）、Ctrl+A/C/X、F5 刷新动画
- Paint：右键=背景色绘制（XP 核心行为，铅笔/刷子/填充/喷枪/形状全部支持）、右键取色器设背景色、redo 栈、Ctrl+Z/Y/S/N/P/I/G 快捷键、画布右键屏蔽
- 扫雷/纸牌 F2 新游戏/发牌接线（菜单此前只显示不生效）、WordPad contentEditable 右键编辑菜单+格式子菜单（B/I/U/对齐）、Cmd 输入右键、RunDialog 输入右键
- e2e 验证（agent-browser，全部 PASS，零控制台错误）：
  · 桌面菜单/新建子菜单→创建文本文档→图标出现→F2 重命名→Enter 打开
  · 记事本文本区右键（完整 XP 编辑菜单）、标题栏右键、任务按钮右键（系统菜单）
  · Ctrl+Esc/Win 单键开始菜单、Alt+Space/Alt+F4、Win+D/Win+Shift+M
  · 任务栏/时钟/音量/开始按钮右键各自正确菜单
  · Explorer Ctrl+A（4 驱动器全高亮）、桌面方向键+Menu 键
  · IE：维基百科真实加载、页面右键菜单（链接+选区上下文）、Ctrl+Enter 补全导航 example.com、Alt+←后退、Alt+→前进、Ctrl+D 收藏
  · F5 桌面刷新动画、DialogBox Esc
- bun run lint 0 错误；生产构建成功（5 路由）

Stage Summary:
- 右键菜单从「部分表面缺失」补全为全表面覆盖：桌面/图标/任务栏/任务按钮/托盘 4 图标/开始按钮/窗口标题栏/记事本/写字板/画布/IE 页面内（代理脚本拦截）/地址栏/搜索框/运行框/Cmd
- 键盘从「几乎无快捷键」补全为 XP 键位：全局层 15+ 组合键（Win/Ctrl+Esc/Alt+F4/Alt+Space/Alt+Esc/Win+M/U/B/F5 等），应用层（记事本 10 键、IE 12 键、Explorer 10 键、桌面 9 键、画图 7 键、扫雷/纸牌 F2、计算器原有键盘支持）
- IE 页面内右键是本session技术亮点：sandbox iframe 跨域右键拦截（代理脚本 contextmenu→postMessage→父页 IE6 菜单，坐标换算+上下文拼装）

---
Task ID: 6
Agent: 主 Agent (Super Z)
Task: 全交互 1:1 补全（用户反馈：所有交互都要达到，例如桌面拖动图标）

Work Log:
- 诊断：桌面图标「拖动」实为松手瞬移（拖动过程图标纹丝不动、松到别的图标上还会移动错误的图标、无多选拖动、无拖入文件夹/回收站、无 Esc 取消）；Explorer 后退/前进按钮 setSelected(null) 类型崩溃 bug；任务栏「锁定」是摆设；最大化窗口不能拖标题栏还原
- Desktop.tsx 拖拽系统整体重写（HTML5 DnD 统一架构）：
  · 图标 draggable + DND_MIME/DESK_MIME 双通道数据，dragstart 带全部选中项（多选拖动）
  · XP 拖拽鬼影：克隆图标 SVG 生成 65% 透明离屏 ghost 并 setDragImage（多选并排显示）
  · 落点吸附：findFreeCell 按曼哈顿距离找最近空闲网格（图标永不重叠，XP 行为）
  · dropTargetOf：拖到文件夹/我的文档图标上高亮（xp-desk-drop）→ fsMove 移入；拖到回收站图标 → 确认删除对话框 → fsDelete
  · Ctrl+拖 = 复制（fsDuplicate 生成副本）、桌面↔Explorer 窗口双向拖放（DES_K_MIME 区分来源，来自 Explorer 的文件落在鼠标位置）
  · 落点格预览（虚线框）、dragend/leave 清理、autoArrange（排列图标→自动排列勾选项）
  · 网格参数适配任务栏位置（getWorkArea）+ 窗口 resize 监听
- Explorer.tsx：
  · 修复崩溃：back()/forward() setSelected(null) → setSelected([])（此前点后退直接白屏级 TypeError）
  · 后退/前进补窗口标题同步 + setRename 清理
  · 文件列表框选（marquee 橡皮筋 + [data-item] 命中检测 + 虚线矩形）
  · 详细信息视图：列排序（名称/大小/类型/修改日期，点击表头升降序切换、▲▼ 箭头、驱动器/文件夹恒前置）+ 列宽拖动（表头右缘 5px 手柄，pointer capture）
- XPWindow.tsx：
  · XP 核心行为：拖动最大化窗口标题栏 → 自动还原 prevRect 尺寸并跟随光标继续拖动
  · 最大化区域/拖动边界改用 getWorkArea()（适配任务栏四边停靠与任意高度）
- Taskbar.tsx 重写：
  · 「锁定任务栏」真实状态化：解锁后出现 grip 拖动手柄 + 边缘调高手柄
  · 拖动 grip → 任务栏实时停靠到最近屏幕边（左/右侧为垂直布局：竖排开始按钮/快速启动/任务按钮/托盘，时钟 HH/mm 两行，宽度≥56 时任务按钮显示竖排标题）
  · 边缘手柄拖动调整高度/宽度（26-120px），所有布局 CSS（xp-start-btn-vert/xp-taskbtn-vert）
  · 「工具栏→快速启动」开关真实生效；平铺窗口适配任务栏位置；音量 flyout 位置随任务栏边变化
- StartMenu.tsx：
  · 位置随任务栏停靠边自适应（贴开始按钮）
  · 固定项真实化：HTML5 拖动重排（reorderStartPinned）、右键「从「开始」菜单脱离」、常用程序右键「附到「开始」菜单」
- store.ts：taskbarLocked/taskbarPos/taskbarH/showQuickLaunch/autoArrange/startPinned + actions；getWorkArea() 工作区计算；fsCreateFile 支持 size
- 顺手修复 7 处既有类型错误（保证生产构建）：ScreenSaver trail 双层数组、XPCheck checked 可选、Hearts handResult 空值、IE SearchPage query、Solitaire tableRect、SoundRecorder window.setInterval、fsCreateFile size
- 防御性修复：全部 setPointerCapture 加 try-catch（合成事件/自动化测试无活动指针时不抛错）
- e2e 验证（agent-browser + 合成 DragEvent/PointerEvent，全部 PASS）：
  · 桌面图标拖动重排：102,16 → 606,384（空闲格吸附）✓
  · 拖文件到回收站图标 → 确认对话框 → 桌面消失 → 还原所有项目恢复 ✓
  · 拖文件到新建文件夹图标 → 文件夹内验证存在 ✓
  · 多选拖动（2 图标一起移动、同列网格吸附）✓；Ctrl+拖复制「新建文本文档 (2).txt」✓
  · Explorer→桌面拖放（欢迎.txt 落在鼠标位置）✓；桌面→Explorer 拖回 ✓
  · Explorer 后退/前进无崩溃、标题同步；详细信息名称列升/降序翻转 ✓；框选「1 个对象被选定」✓
  · 任务栏：解锁 → 拖到左侧（垂直布局 30×577 + 垂直开始按钮）→ 调宽 66px → 拖回底部 ✓；最大化高度=100vh-66 适配 ✓
  · 拖动最大化窗口标题栏 → 还原 660×480 跟随光标 ✓
  · 开始菜单：记事本附到固定区 → 拖动重排到第一位 → 脱离 ✓
  · 控制台 0 错误（3 条 NotFoundError 均为修复前历史记录，新操作零新增）；刷新后默认状态回归 ✓
- bun run lint 0 错误 0 警告；tsc 0 错误；生产构建成功（5 路由）

Stage Summary:
- 用户点名的「桌面拖动图标」从瞬移假拖动升级为 XP 真实拖动全链路：实时鬼影、多选拖、拖入文件夹/回收站/我的文档、Ctrl 复制、跨窗口双向、空闲格吸附、Esc 取消（浏览器原生）
- 系统级交互补全：任务栏解锁/四边停靠/高度调整（垂直布局完整实现）、拖最大化窗口还原、Explorer 框选/列排序/列宽、开始菜单固定项拖排/附到/脱离
- 修复 1 个崩溃级 bug（Explorer 后退按钮）+ 7 个类型错误 + setPointerCapture 防御
- 桌面/任务栏/开始菜单/窗口管理四层交互均达到可拖、可放、可调、可取消的 XP 手感

---
Task ID: 7
Agent: 主 Agent (Super Z)
Task: 用户五点反馈修复（IE 直接 iframe / 右键菜单跑位 / 菜单 hover / 开始菜单 hover / 子菜单越界）

Work Log:
- 诊断根因（4 个）：
  · MenuList hover 只绑定在 openSub===i（仅带子菜单的项），普通菜单项（右键菜单/所有程序列表的绝大多数）鼠标滑过无任何高亮
  · ContextMenuHost 用猜测值钳位（innerWidth-200/innerHeight-300）：长菜单被瞬移到离点击点 200~400px 处（"跑位"主因），菜单越高跑得越远
  · .xp-menu-shadow 使用 filter: drop-shadow —— filter 会成为 fixed 后代元素的 containing block，级联子菜单的 fixed 定位全部失效（相对主菜单定位=偏移整整一个主菜单位置）——这是「子菜单跑位/出屏」的 CSS 根因
  · SubMenu wrapper 误加 onMouseEnter stopPropagation —— React 的合成 mouseenter 由 mouseover 委托按"由浅入深"派生，浅层 wrapper 的 stopPropagation 直接截断 enter 链，导致子菜单内所有项的 hover 与二级级联永远无法打开
- ui.tsx 菜单系统重构：
  · MenuList：hover state 全项生效（disabled 除外），mouseenter/mousedown 双通道高亮（XP track menu 按住滑动），checked/箭头/快捷键文字随高亮变白
  · 新增 SubMenu（fixed 两阶段：先隐藏测量 offsetWidth/Height → useLayoutEffect 直接写 DOM style，React 官方 measure-and-mutate 模式，零级联渲染）：右缘越界→左翻、底缘越界→向上展开、永不露屏
  · 新增 AnchoredMenu（MenuBar 下拉复用，align left/right）
  · MenuBar 下拉改为 fixed 锚定 + 视口钳位（长菜单不再出屏）
- XPSystem ContextMenuHost：两阶段真实尺寸测量 + XP 翻转规则（右缘→x-w、底缘→y-h）+ 极端兜底（菜单比视口高→贴边）；彻底删除猜测值
- 跑位修复三处硬编码：Explorer 菜单键 openCtx(120,160)→选中项 DOM 右缘、无选中→列表区背景菜单；Desktop 无选中 openCtx(200,200)→(16,16)
- CSS 修复：.xp-menu-shadow 的 filter:drop-shadow → box-shadow（视觉相同、不破坏 fixed）；.xp-noclip 的 will-change:transform → backface-visibility（同类隐患）；新增 .xp-desk-icon:hover 热点追踪（淡蓝标签）、.xp-hot-item
- InternetExplorer 直接 iframe 改造（用户明确要求不走代理）：
  · iframe src 直接加载真实 URL（去掉 /api/browse 与 sandbox），跨域页面由宿主浏览器原生渲染（完整交互、无功能阉割）
  · 删除代理 postMessage 协议（navigate/title/status/ctx 拦截），页内右键回归宿主浏览器原生菜单
  · 15s 加载超时 → IE6「无法显示网页」覆盖层（XP 错误页视觉 + 立即刷新 + 「在系统浏览器中打开此页」外链，X-Frame-Options 拒绝嵌入的站点有出口）
  · goWeb/refresh 重置 netError；帮助页/关于页/菜单文案同步更新
- UX 补充：桌面图标 hover 热点追踪（label 半透明蓝+去阴影）、托盘图标 hover 高亮（音量/盾牌/Messenger 双布局都加）
- e2e 验证（agent-browser + VLM 终审）：
  · 右下角(900,650)右键 → 菜单精确向上翻转（底缘贴点击点，旧逻辑会瞬移到 277 处）✓
  · 菜单 hover 类出现（xp-menu-item-hover 蓝底白字）✓；「排列图标」子菜单 fixed 定位 (1084,464) 视口内 ✓
  · 开始菜单「所有程序」子菜单 (182,423)-(357,575) 完全在视口内（视口仅 577 高，贴底向上展开）✓
  · 二级级联「附件」hover 高亮 + 展开 ✓（stopPropagation 修复前 100% 失败）；三级「系统工具→磁盘清理…」(520,404)-(695,515) 视口内 ✓
  · 开始菜单右栏「我的文档」hover 蓝渐变白字 ✓；记事本「文件」下拉 (193,54) 左对齐按钮视口内 + 项 hover ✓
  · 桌面图标「网上冲浪指南.txt」hover → label rgba(10,94,200,0.4) ✓
  · IE：地址栏输入 zh.wikipedia.org → iframe src 直接为 http://zh.wikipedia.org（无代理）✓；VLM 确认渲染真实维基首页（标志/155万条目/搜索栏/繁简转换弹窗）✓；Alt+← 后退回 MSN ✓；MSN 搜索真实结果 17 处提及 ✓
  · 控制台 0 错误；bun run lint 0 错误 0 警告；tsc 0 错误；生产构建成功（5 路由）

Stage Summary:
- 「跑位」的两大隐藏根因均属高级 CSS/React 陷阱：filter 破坏 fixed containing block + React enter 链的 stopPropagation 截断——已根治并写入代码注释防止回归
- 菜单系统现在完整具备 XP 手感：全项 hover 高亮、按住滑动高亮、多级级联（验证到 3 级）、右缘/底缘自动翻转、菜单永不出屏、真实尺寸测量定位
- IE 按用户要求改为直接 iframe 原生加载：真实渲染无阉割，超时有 IE6 错误页兜底；/api/browse 仅保留 ?raw=1 供「查看源文件」
- 交互反馈补全：桌面图标热点追踪、托盘图标 hover、菜单键定位到真实选中项

---
Task ID: 8
Agent: 主 Agent (Super Z)
Task: 多维度自检（是否完成 1:1 复刻）+ 修复自检发现的问题

Work Log:
- 自检①代码质量：eslint 0 错误 0 警告；tsc --noEmit 对 src/ 零错误（examples/skills 为脚手架残留与项目无关）；生产构建成功（主页 + browse/search/netinfo 3 API 共 5 路由）
- 自检②视觉还原（VLM 评分）：启动画面 95/100、欢迎登录屏 95/100、桌面 85/100；VLM 指出 IE 图标 label 硬断词（break-all 截断成「Internet Explor/er」）→ 修复为 overflow-wrap:anywhere（DOM 验证「Internet/Explorer」两行自然换行）；任务栏高度实测 30px 为 XP 真实值（开始按钮 36px 凸起正确）
- 自检③菜单系统（5 项 e2e 全过）：
  · T1 右下角 (990,720) 右键 → 菜单 (800,547) 底缘 720 恰贴点击点（XP 向上翻转钳位生效）
  · T2 菜单项 hover → xp-menu-item-hover 类 + Luna 蓝渐变 (#4b8ee8→#2a6fd4) + 白字
  · T3 级联子菜单 (631,569) 右缘越界自动左翻，全部在视口内
  · T4 所有程序子菜单 (182,614) 从底部向上展开（152 高不出屏）
  · T5 三级级联（游戏子菜单 351,636）视口内
  · T6 开始菜单右栏 hover 蓝渐变白字（.xp-sm-right）
- 自检④交互完整性（e2e）：桌面图标拖动吸附空闲格 (522,384)；Alt+Tab 切换器 9 窗口缩略居中；Alt+F4 逐个关 9 窗口；Win 键/Ctrl+Esc 开开始菜单；F2 重命名（行内编辑全选）；Delete 删除（确认对话框→回收站→还原完整链路 6→5→6 图标）
- 自检⑤应用功能（e2e）：
  · IE：地址栏输入 example.com → iframe src 直为 http://example.com/ 且无 sandbox 属性（纯原生加载，无代理）
  · Explorer：C 盘右键→新建→文本文档.txt 创建成功（含子菜单左翻定位）
  · Cmd：dir C:\ 输出 XP 完美格式（卷序列号 2001-1025-XP/<DIR> 标记/统计行/可用字节）
  · 任务管理器：17 进程实时列出全部打开应用
  · 运行框烟测：notepad/mspaint/calc/cmd/taskmgr/charmap/sndrec32/iexplore 全部启动成功
- 发现并修复 2 个真实 bug：
  · Bug②（条件写反）：任务窗格「新建文件夹」原逻辑 path.length===0（我的电脑根）才新建、else toast「只能在具体文件夹内新建」——与文案意图完全颠倒，且根级新建的文件夹因 deleteSelected 的 path 守卫变成「能建不能删」。修复：根视图/网上邻居禁用按钮（真实 XP 我的电脑根无新建任务），具体文件夹内新建并直接进入重命名
  · 视觉：Desktop/Explorer 图标 label break-all → overflow-wrap:anywhere（按词换行）
- 排除 1 个假警报：HMR 模块撕裂（dev 热更新导致新旧 store 实例并存，旧组件订阅旧 store 看不到新 action 写入）→ 刷新页面后一切正常；生产构建无此问题，判定为 dev-only 现象非产品 bug
- 最终验证：修复后 lint 0 错误、tsc 0 错误、生产构建成功（5 路由）、HMR 回归测试任务窗格新建→Enter 重命名→创建成功

Stage Summary:
- 六维度自检全绿：代码质量 / 视觉还原（VLM 三屏 85-95 分）/ 菜单系统（6 项 e2e）/ 交互完整性（8 项 e2e）/ 应用功能（12+ 项 e2e）/ XP 特性对照
- 1:1 复刻达成度结论：核心交互链路（菜单/拖放/快捷键/文件操作/IE 直开/Cmd）全部达到 XP 真实行为；视觉还原 VLM 均 85+ 分，细节级瑕疵（图标阴影深浅、字体渲染时代感）属 Web 渲染器固有差异
- 本轮修复 2 个真实 bug（任务窗格条件反、label 断词），排除 1 个 dev-only 假警报（HMR 撕裂）

---
Task ID: 9
Agent: 主 Agent (Super Z)
Task: 1:1 差距自检清单修复 + 经典 QQ 复刻（AI 真实聊天/资料卡/全套功能）

Work Log:
- 自检清单（VLM 像素级走查 + 代码层占位扫描）：视觉类（我的文档图标偏白/label 断词）；功能类（创建快捷方式 toast 摆设、计算器科学型缺失、记事本字体缺失、画图选择工具缺失）
- 修复①创建快捷方式（全链路）：
  · FSNode 增 shortcutTo + icon 'shortcut'；store 增 fsCreateShortcut（自动「xxx - 快捷方式」命名）
  · XP 经典角标 ShortcutBadge（白底黑箭头小方块叠加目标图标右下角）
  · Desktop/Explorer 双击解析 shortcutTo → 按目标类型打开（文件夹/记事本/图片/appId），目标被删弹 XP「无法找到快捷方式」错误框
  · 接线：桌面文件右键「创建快捷方式(S)」、系统图标右键（映射 appId）、桌面背景新建菜单「快捷方式(S)」、Explorer 文件右键
- 修复②计算器科学型：查看菜单标准/科学切换（checked）+ setWinSize 窗口自适应（272→470）；进制显示行（十六/十/八/二）、角度/弧度单选、sin/cos/tan/Inv 三角/ln/log/n!/x²/x³/x^y/10^x/e^x/π/e/Mod 全实现；e2e：sin(30°)=0.5、5!=120
- 修复③记事本字体：XP 经典三栏字体对话框（字体列表 10 款/字形 4 种/大小 12 档 + AaBbYy 实时预览），应用到 textarea（family/size/weight/style）；e2e：楷体 KaiTi 24px 生效
- 修复④画图选择工具：框选蚂蚁线（[4,3] 虚线常驻）→ 选区内拖动移动（半透明跟随预览）→ 松手提交（move 填背景色/copy 保留）→ Del 清除选区/Esc 取消；e2e 像素级验证：拖动后 ink 194 采样点全部位于新区域、原选区清零
- 修复⑤视觉：我的文档图标暖金色调（#ffd75e→#e09a26 渐变+暖白纸）；桌面/Explorer label break-all → overflow-wrap:anywhere（按词换行）
- 经典 QQ 2003 复刻（src/components/xp/qq/ 新目录 4 文件 + store qq 数据层 + /api/qq/chat 后端）：
  · 数据层：QQFriend/QQMsg/QQMe/QQState 类型 + 8 位预设好友（各有 2003 年人设：传奇玩家/周杰伦粉/IT 宅/打工表哥/卖点卡商人…）+ 10 个 actions（登录/登出/改资料/收发消息/未读/输入中）
  · QQLogin：QQ2003 蓝色网格 banner + 企鹅 logo、号码/密码/隐身登录/记住密码、登录进度动画（连接服务器→验证密码→获取好友列表）+ 上线「咳嗽」音
  · QQMain：244×520 窄长主面板；头像+昵称+状态下拉+签名；四分组折叠树（我的好友/同学/家人/陌生人）带在线统计 [2/4]；好友行（头像+状态色昵称+签名+未读红点角标）；QQ菜单/查找/系统消息三按钮；右键好友（发消息/查看资料/删除/拉黑）；菜单栏 QQ 菜单（个人设置/系统参数/好友管理器/注销/退出）
  · QQChat：470×400；对方信息条（头像+状态徽章+查看资料按钮）；QQ2003 行式消息（自己蓝名/对方绿名+时间戳）；AI 回复链路（发送→「正在输入…」600-1500ms→fetch /api/qq/chat→人设回复+滴滴消息音）；10 个经典黄脸表情（微笑/大笑/害羞/哭/生气/惊讶/酷/汗/偷笑/睡觉，/eN 文本内嵌渲染）；聊天记录浮层+清空；Ctrl+Enter 发送
  · QQProfile：资料卡（基本/详细双 tab：昵称/性别/年龄/城市/签名/QQ等级⭐太阳/注册时间/AI 人设备注）；个人设置模式（全部可编辑+10 头像选择面板）；e2e：改昵称「武汉小刚」保存生效
  · QQIcon 企鹅 SVG + 10 个经典头像 SVG（企鹅/酷女孩/战士/眼镜男/文艺女/IT男/安全帽哥/白领女/商人/小狗）
  · 音效：playQQMsg（920Hz 方波 6 连响滴滴滴）/playQQOnline（双音咳嗽）/playQQSystem（叮）
  · 托盘：登录后企鹅图标、未读时 xp-qq-blink 闪烁动画+「N 条新消息」tooltip、点击跳转未读聊天并清除、右键（上线/离开/隐身/退出）
  · 接入：桌面「腾讯QQ - 快捷方式」（shortcutTo 指向 C:\Program Files\Tencent\QQ\QQ.exe，QQIcon 底图+角标）、开始菜单所有程序、运行框 qq/qq2003 命令、registry 3 窗口注册
- AI 聊天后端 /api/qq/chat：z-ai LLM + 好友人设 system prompt（口语化短回复/颜文字/88 cu 等年代用语/主动聊 2003 话题：网吧/传奇/CS/周杰伦/非典/彩铃），temperature 0.8
- lint 修复过程：Taskbar useXP 条件调用（提取顶层 hook）、QQ placeholder 跨行、QQProfile Row 内联组件（提为模块级 + props 传递）+ setState-in-effect、registry import 语法
- e2e 验证（agent-browser 全链路）：QQ 登录→主面板（分组/5好友/菜单）→双击聊天→「在吗？最近怎么样」→AI 回复「在呀~我挺好的！最近天天听周杰伦新歌，超带感的！( ^ω^ )」→表情发送渲染→连续对话→资料卡双 tab→个人设置改昵称生效→托盘闪烁（2 条新消息）→点击跳转清除未读；快捷方式创建+双击跳转记事本；科学型计算 sin30/n!；记事本楷体 24px；画图选择移动（像素级统计）
- 最终：bun run lint 0 错误；tsc 0 错误；生产构建成功（6 路由含 /api/qq/chat）；控制台 0 错误

Stage Summary:
- 1:1 差距清单 5 项全部修复：快捷方式（真实创建/跳转/XP 错误框）、科学型计算器、记事本字体、画图选择工具（移动/复制/清除）、图标视觉
- 经典 QQ 2003 完整落地：登录动画 → 主面板分组树 → AI 真实聊天（人设+年代话题）→ 表情 → 资料卡/个人设置 → 托盘闪烁提醒 → 系统级集成（桌面/开始菜单/运行框）
- QQ 视觉 VLM 评分 85/100，功能全部 e2e 通过
---
Task ID: 10
Agent: 主 Agent (Super Z)
Task: 用户反馈修复：QQ/MSN 1:1 深化（像素头像/贴边收起）+ 托盘退出/重复开窗 bug

Work Log:
- 用户反馈定位：QQ 头像不像 2003（现代扁平 SVG）；QQ/MSN 主面板贴屏幕边缘无自动收起；托盘 MSN「退出」只弹 toast 图标常驻；托盘单击/双击会开多个重复窗口
- 修复① QQ 头像 1:1：qq-faces.tsx 全部重绘为 16×16 像素位图（10 款：企鹅/酷女孩/绿军帽/眼镜男/齐帘女/耳机男/安全帽/金发女/西装商/小狗），逐像素 rect + shapeRendering="crispEdges" 最近邻缩放（锯齿=年代感）；模块级静态 JSX 缓存零重复渲染成本；白底位图背景。VLM 审查头像还原度 95%
- 修复② 贴边自动收起（新增 useEdgeDock.tsx 通用 hook）：拖面板到屏幕左/右/上缘松手 → 滑出屏幕留 2px 边条；碰边条热区 → 滑回展开；鼠标离开 → 350ms 再收起（全局 mousemove + getBoundingClientRect 命中检测——纯 React mouseleave 有盲区：碰下边条就跑开时面板从未 enter 过永不 leave）；展开态拖标题栏离开边缘 → 解除停靠自由窗口。实现核心：win.x/y 变化 + 280ms 防抖 = 「松手后判定」且拖动中不被吞走；工作区基准避开任务栏。QQ/MSN 双面板接入
- 修复③ 托盘退出真生效：store 新增 msn 块（running/status/contacts/chats/unread/typing + 7 actions）；msnExit = running:false + 关闭全部 messenger/msnchat 窗口（XP 真实行为）；MsnTrayButton 渲染条件 running||有窗口（从开始菜单打开主窗口图标必然恢复）
- 修复④ 托盘重复开窗：openApp 内建单例复用规则——qq/messenger 主窗口单例、qqchat/msnchat 按 friendId 复用、qqprofile 按 friendId+me 复用；命中 → 还原+置前（绝不新建）。QQ 托盘退出同样关全部 QQ 窗口
- MSN 1:1 重写（Messenger.tsx 全新）：MSN Messenger 5.0 风格——绿色渐变横幅+MSN 小人、我的信息区（44px 显示图片+状态徽章+状态下拉）、联机/脱机折叠分组（16px 像素状态小人：绿衣人/红衣人/黄闹钟/灰人）、菜单栏（文件/联系人/操作/工具/帮助，「文件→退出并显示为脱机」真退出）、底部绿条（添加联系人+未读统计）、贴边收起、未读闪烁
- MsnChat.tsx 新窗口（独立对话）：对方信息条（显示图片+状态小人）、「XX 说:」行式消息、MSN 文字表情 :) :D :( ;) :O :P 自动转像素笑脸、正在输入提示、AI 真实回复（/api/qq/chat + MSN 人设强化 prompt）、绿色发送按钮、Enter 发送、未读清零
- QQ 主面板 1:1 深化：好友列表改经典单行 24px + 16px 小头像模式（去掉签名行——2003 列表不显示）；未读好友红名加粗+头像 xp-qq-blink 闪烁+行尾未读徽章；离开/忙碌头像右下角彩色状态圆点（黄/红）
- QQ 资料卡：新增「联系方式」tab（QQ号@qq.com 邮箱+「该用户未公开」隐私字段+安全设置项，2003 味）；头像选择改内嵌网格（原 absolute 浮层会出界）
- 输入区质感：QQChat/MsnChat 输入框容器加 xp-sunken 凹陷边框（VLM 建议）
- e2e 验证 13 项全过（agent-browser）：
  · T1 MSN 托盘单击×3 → 仅 1 窗口 ✓；T2 拖右缘 → left=1022 收起 ✓；T3 碰边条 → right=1024 展开 ✓；T4 鼠标离开 → 再收起 ✓（全局跟踪版）
  · T5 展开态拖标题栏离缘 → 解除停靠自由停留（鼠标离开不再收）✓
  · T6 托盘右键退出 → 图标消失 + messenger/msnchat 窗口全关 ✓；T7 开始菜单重开 MSN → 托盘图标恢复 ✓
  · T8 MSN 双击小王 → 独立 msnchat 窗口 + AI 回复「在在！刚打完本，组我！晚上老地方见，我带水，你带烟~ cu！」（魔兽人设）✓
  · T9 QQ 登录 → 8 像素头像渲染 + 托盘企鹅 ✓；T10 QQ 拖左缘收起 left=-242 → 碰边条展开 left=0 ✓
  · T11 双击同一好友×2 → 1 个聊天窗（单例）✓；T12 QQ 托盘连点×2 → 不新增窗口 ✓ + AI 回复（高中女生人设+颜文字）
  · T13 MSN 顶部贴边：top=-418 收起 → 展开 top=0 → 离开再收起 ✓；QQ 主面板亦自动收起（左缘）
  · 资料卡联系方式 tab：@qq.com + 未公开 + 安全设置 ✓；控制台 0 错误
- VLM 视觉终审：QQ 主面板 96/100（头像 95/布局 98/年代感 90）；MSN 综合 ~94/100（横幅 95/状态小人 90/对话窗 92/年代感 98）
- 最终：bun run lint 0 错误；tsc src 零错误；生产构建成功（6 路由）

Stage Summary:
- 用户报告 4 项问题全部根治：像素头像（VLM 95 分）、贴边自动收起（三方向+全生命周期 13 项 e2e）、托盘退出真生效（图标消失+窗口全关+重开恢复）、托盘/双击不再重复开窗（openApp 单例复用规则）
- MSN 升级为完整 1:1：5.0 风格主面板+像素状态小人+独立 AI 对话窗口+文字表情
- 贴边 hook 的两个关键设计已写入注释：280ms 防抖=松手判定；全局 mousemove 命中检测规避 React mouseleave 盲区

---
Task ID: 11
Agent: 主 Agent (Super Z)
Task: Windows XP 全部图标 1:1 位图化复原（用户需求：将 XP 中的所有图标 1:1 复原）

Work Log:
- 方案决策：放弃原手绘 SVG（扁平感强），改用 PIL 4x 超采样(192px)逐像素绘制 XP 风格位图（alpha 渐变/左上光源高光/右下柔和投影/深色描边=XP 官方图标规范），LANCZOS 导出 48/32/16 三尺寸 PNG 到 public/icons/
- 绘制库 scripts/xpicons/lib.py：IC 类（多边形/圆角矩形/椭圆渐变填充、pieslice、文字渐变、shear 斜切、MaxFilter 描边膨胀、柔和投影、三尺寸导出）+ hexa 颜色工具
- 批次1 桌面系统 9 个：mycomputer(CRT+机箱+Bliss绿丘屏)/mydocs(黄夹+白纸蓝线)/mynetplaces(地球+双小显示器)/recycle-empty/full(网筐+皱纸团)/ie(FreeSansBold 54px e+斜切+渐变+白高光+膨胀描边+前后金环立体)/oe(双信封+蓝圆白e角标)/winflag(四色波旗+白缝)/useravatar
- 批次2 文件系统 12 个：folder-plain/pictures/music、folder-open、txtfile(折角白纸)、imagefile(风景缩略)、exefile(窗口+齿轮)、harddrive(45°透视)、cddrive(银盘+灰盒)、floppydrive、shortcut(角标)、printer
- 批次3 应用 21 个：notepad/paint/calculator(白色立体按钮+橙等号)/cmd(加高蓝标题栏+最小化关闭钮)/taskmgr(绿波形)/run(亮绿弯曲箭头)/search(放大镜+文件夹)/help(蓝圆问号+黄火花)/controlpanel(滑块面板)/wmp(上蓝下橙半球+白环三角)/wordpad/charmap(彩色字符格)/sndrec/sndvol/useraccount/diskclean/defrag/sysinfo/clock/key/displayprops
- 批次4 游戏 9 个：mine(八刺雷+红旗)、minesmiley-4态(normal/press/win墨镜/lose X眼)、solitaire/freecell(标准红心黑桃花形)、hearts、pinball(深蓝星空台+银珠+橙杆)
- 批次5 托盘+电源+对话框+品牌 18 个：tray-volume/network/qq/msn/shield×3/mail(16px 高对比粗轮廓)、power-off/restart/standby、logoff、dlg-error/warn/info/question、qq(经典黑企鹅红围巾)/msn(蓝绿蝴蝶)
- VLM 审查迭代 2 轮修正：IE e 加大加粗+金环立体(前后亮暗)/OE 角标改白e字/WMP 改清晰半球/CMD 标题栏加高+双按钮/计算器白立体按钮/画笔细长+金属箍/纸牌标准花色/弹球重画星空台/回收站网纹稀疏+皱纸团/旗帜白缝/我的文档亮黄调
- React 接入（零破坏）：新建 bmp.tsx Bmp 组件（48/32/16 尺寸桶选择+img 渲染）；icons.tsx 15 组件+app-icons.tsx 42 组件全部改为位图包装——导出名/签名/参数(full/variant/tone/kind/state)完全不变，30+ 使用文件零改动；ArrowRight 保留 SVG(UI部件)
- QQ 登录横幅两处 QQFace(16px像素画放大42/48px 马赛克)→QQIcon 位图企鹅；Taskbar QQTrayButton→tray-qq 16px 专用；桌面 label 阴影纯黑→1px 1px 2px rgba(0,0,0,0.55) 柔和
- e2e 全链路验证（agent-browser）：桌面/开始菜单/所有程序子菜单/我的电脑Explorer/QQ登录→主面板/MSN主窗口/删除确认对话框/Alt+Tab 切换器——全部图标渲染正常无裂图；控制台零错误
- VLM 评分：桌面 78→90、所有程序菜单 95、MSN 主窗口 95/98、删除确认问号 90、QQ 主面板 85、QQ 登录企鹅 45→75、Explorer 驱动器 75；放大自查 6 图标全部清晰可辨
- 质量门：bun run lint 0 错误 0 警告；tsc src 零错误；生产构建成功(6 路由)
- 故障处理：rm -rf .next 导致运行中 dev 损坏假死(端口占用)→kill 残留 next-server 进程→dev 恢复 200

Stage Summary:
- 69 个 XP 图标全部完成位图化 1:1 复原（9+12+21+9+18），覆盖桌面系统/文件系统/全部应用/游戏/托盘16px专用/电源/对话框/品牌(QQ企鹅/MSN蝴蝶)
- 组件层零破坏：icons.tsx + app-icons.tsx 接口完全兼容，全部使用方（Desktop/Taskbar/StartMenu/Explorer/registry/screens/QQ/MSN 等 30+ 文件）无需改动
- 三层验证全绿：VLM 多界面 75-98 分（桌面终审 90）、e2e 全链路无裂图、lint/tsc/build 零错误
- 图标资产可迭代：scripts/xpicons/ 5 个批次脚本保留，后续微调只需改脚本重跑（秒级再生成）

---
Task ID: 12
Agent: 主 Agent (Super Z)
Task: 修复用户报告的 3 个 BUG：①Explorer 点击空白区域出现幽灵滚动条（图1点击/图2未点击布局不同）②桌面右键→属性 显示属性对话框空白（未默认显示桌面选项卡）③Explorer「其他位置」图标和文字不在同一行

Work Log:
- BUG1 根因定位（浏览器实测复现）：文件列表框选矩形(marquee)把视口坐标 clientX/clientY 直接当作容器本地偏移渲染——列表容器位于视口 (407,183)，点击下半区域时 0×0 矩形落在 left=700/top=450 等容器外位置，撑大 scrollWidth/scrollHeight → overflow-y:auto 容器出现幽灵滚动条(15px) → 瓦片重排 3 列→2 列（与用户图1完全吻合）；且矩形实际渲染位置也偏移 (407,183)，从未被肉眼所见
- BUG1 修复（Explorer.tsx）：①marquee 渲染换算容器本地坐标(减 rect.left/top 加 scrollLeft/Top)并钳制在 clientWidth/Height 内——彻底杜绝幽灵滚动条 ②onPointerDown 增加 setPointerCapture（拖出列表松开也能回落清理，根治框选卡死）③启动条件从 target===currentTarget 改为 closest('[data-item],[data-nomarq]')（空白间隙也能框选，条目/表头不参与）④suppressClickRef 抑制松开后的补发 click 清空刚框选结果 ⑤list/icons/tiles 三个视图补 data-item 属性（原来只有 details 有——框选命中在平铺/图标/列表视图全部失效的连带修复）
- BUG2 根因：Desktop.tsx 右键属性传 { tab: 'desktop' }（英文），DisplayProperties 只认中文 tab 名（'桌面'等），'desktop' 不匹配任何选项卡且 ?? '桌面' 不生效（非 nullish）→ 内容区全 null 空白
- BUG2 修复：DisplayProperties 增加 tab 参数白名单校验回退 '桌面'；Desktop.tsx 两处 'desktop'→'桌面'
- BUG3 根因：globals.css 无层类 .xp-taskpane-link{display:block} 压过 Tailwind v4 层内工具类 flex（无层样式恒胜层内样式）+ Preflight 把 img 设为 display:block → 图标独占一行文字掉下一行；浏览器实测 button 计算值 display:block、img y=313 文字 y=330 确认
- BUG3 修复：.xp-taskpane-link 改 display:flex + align-items:center + gap:6px（XP 原版间距），删除 Explorer 4 个按钮冗余 flex/gap-2 工具类；全库扫描确认无其他同类 display 冲突
- 附带加固：Desktop.tsx onBgPointerDown 增加 setPointerCapture（拖过窗口/任务栏上方松开仍能收到 pointerup）
- 验证（agent-browser 全程实测）：①按住/拖动空白区域 scrollH==clientH 无滚动条、marquee 精确跟随鼠标(460,260→850,500)、松开即清除、命中判定正确(框选 2 对象) ②桌面右键→属性默认激活「桌面」选项卡、内容 61 字符(背景列表+监视器预览)非空白 ③其他位置 display:flex、gap:6px、sameLine:true×3 ④桌面框选回归正常(矩形精确+松开清除) ⑤VLM 终审：图标文字同行/无异常滚动条/布局规范全通过 ⑥tsc src 零错误
- 踩坑记录：Next.js dev 的 CSS chunk 同名缓存(91e4631d.css 内容已变)导致浏览器持旧样式——touch 触发重编译后强刷页面即恢复；agent-browser 双按下序列会重置 marquee 状态（真实用户无此路径）

Stage Summary:
- 3 个 BUG 全部根治并浏览器实测验证：幽灵滚动条（含布局重排连带）/显示属性空白页/图标文字错行
- 框选子系统整体升级：本地坐标+钳制+指针捕获+click 抑制+全视图 data-item——XP 橡皮筋选择完整可用
- 修改文件：apps/Explorer.tsx、apps/DisplayProperties.tsx、Desktop.tsx、app/globals.css（4 处，均为外科手术式小改）

---
Task ID: 13
Agent: 主 Agent (Super Z)
Task: 修复用户反馈：右下角托盘图标未 1:1 复原（不如旧截图 e2e-10-qq-contact.png 的效果）

Work Log:
- 根因定位（VLM 新旧 8x 放大对比 + 代码链路走查）：
  · b5 批次托盘图标用 192px 超采样 LANCZOS 缩到 16px —— 0.5~1.1px 细线（声波弧/描边）全部混叠成半透明灰像素 → "蒙雾感、颜色发灰、声波糊成一团"
  · QQ 托盘 16px PNG 显示为 15px CSS 尺寸 → 浏览器双线性二次重采样再糊一次
  · QQ 托盘常态 opacity-90 半透明（非真实 XP 行为）
- 修复①（核心）：新建 scripts/xpicons/b6_tray_px.py —— PX 引擎直接在 16×16 画布整数坐标硬边栅格化（零超采样零缩放），与真实 XP 托盘图标（设计师手调 16px 位图）同工艺：
  · tray-volume：白喇叭+深灰描边+下缘阴影+双声波弧（端点内收=弯曲感）
  · tray-network：后屏浅描边低对比（远景）+前屏深描边主体+屏面上下明暗渐变+底座
  · tray-qq：16×16 字符网格企鹅（瞳孔外移灵动/橙嘴/红围巾/白肚/圆脚）
  · tray-shield-quad/red/green：宽体钝底尖盾形（顶平/侧竖/底斜收 2px 钝尖）+白描边+纯色版左上高光
  · tray-mail：10px 高白信封+浅描边+中线 V 折线
- 修复②渲染层：bmp.tsx 16 桶 imageRendering 'pixelated'（48/32 平滑桶保持 auto）—— 16px PNG 显示 16px 时 1:1 无损，dpr>1 时最近邻保锐利
- 修复③ Taskbar.tsx：QQ 托盘 size 15→16、删除 opacity-90（XP 托盘图标不透明）、MsnMan 15→16
- VLM 迭代 3 轮调优（盾牌底尖 2 轮缩短+信封比例+声波弧+瞳孔位置），单图预览终评：喇叭 95/网络 98/QQ 92/盾 85-88/信封 90
- e2e 验证（agent-browser 全流程）：刷新→登录→QQ 登录→MSN 启动→托盘满员截图；8x 放大与旧版 e2e-10-qq-contact.png 并排 VLM 终审 —— 新版综合 95.25/100：QQ 企鹅 98（"神形兼备远超旧版"）、喇叭 95、盾牌 92、时钟 96，结论"已全面达到并部分超过旧版"
- 修复过程中 MultiEdit 引入语法错误（多余 `}`）→ Next.js dev 错误覆盖层 → 立即修复并重走全流程
- 回归：音量 flyout 点击正常、页面零错误
- 质量门：bun run lint 0 错误 0 警告；tsc src 零错误（examples/skills 脚手架残留与项目无关）；生产构建成功（6 路由）
- 交付物：download/tray-icon-fix-compare.png（新旧 8x 对比图）

Stage Summary:
- 托盘图标从"超采样缩糊"升级为"真 16×16 像素画"：VLM 终审 95.25 分全面达到/超越旧版 SVG 基准（用户指定的 e2e-10-qq-contact.png 效果）
- 渲染层三处外科手术式修复：16 桶 pixelated / QQ 托盘 16px 1:1 / 去错误半透明
- 工艺沉淀：b6_tray_px.py 可秒级重生成迭代（同 b1-b5 资产体系）

---
Task ID: 14
Agent: 主 Agent (Super Z)
Task: 用户反馈：①MSN 菜单栏(文件/联系人/…)换行 ②系统图标整体退步，要求 1:1 100% 复刻经典 XP

Work Log:
- BUG① MSN 菜单栏换行根因：Messenger 窗口 280px，5 个菜单按钮需 ~310px，flex 挤压导致按钮内文字换行
  修复：ui.tsx MenuBar 新增 compact 模式（px-[5px]/text-[10.5px]）+ 全局 whitespace-nowrap + flex-nowrap + shrink-0；Messenger.tsx 传入 compact —— VLM 确认单行显示正常（QQ 主面板 3 菜单 194px<244px 无此问题）
- BUG② 图标全面审计（3 大表面截图 + VLM 对照真实 XP 逐图标评分）：
  · 桌面 60 分：回收站 40（网纹质感丢失）/网上邻居 50（地球无大陆纹理）/OE 55（角标糊）/我的电脑 65（屏幕暗）/QQ 60（比例失调）
  · 我的电脑 55-75 分：硬盘 55（缺蓝色标签条+高光带）
  · 控制面板 45-60 分：8 分类图标是内联扁平 SVG（未进位图体系）
- 根因二：①192px 超采样 LANCZOS 缩小后整体软化（无锐化）②控制面板 size=34 → 48px PNG 浏览器 bilinear 二次缩小
- 修复① lib.py save() 增加 UnsharpMask(radius=1.35, percent=110, threshold=2) —— 48/32 桶全部锐化（16px 像素画桶不经此路径）
- 修复② b7_refine.py 高保真重绘 11 个 + 新绘 9 个：
  · 回收站：7竖+6横密网纹理+网结高光+银亮口沿(双层椭圆+高光弧)+底座基盘 → VLM 95 分
  · 网上邻居：五大洲形状大陆(亮暗两层)+经纬线+双显示器(银框蓝屏底座脚) → 90 分
  · OE：角标加大 17px+金飞行弧+白环+白粗 e → 88 分
  · 硬盘：3D 透视顶面+蓝色标签条(真 XP 标志特征)+斜向金属高光带×2+绿黄指示灯 → 95 分
  · 我的电脑：屏幕加白云两朵+更艳 Bliss 双色绿丘 → 90 分
  · QQ 48px：头身 1:1.2 圆润比例+蓝灰头部光泽+黄嘴改圆钝 → 95 分
  · folder-plain/pictures/music + mydocs：更亮黄渐变+加粗顶缘高光 → 88 分
  · 控制面板 9 个分类位图（cp-appearance/network/programs/sound/perf/user/clock/printer/access）全部 PIL 绘制 → 80-95 分
- 修复③ ControlPanel.tsx：CPIcon 从内联 SVG 改为 Bmp 位图渲染；尺寸对齐桶 34→32、44→48、46/52→48（消除浏览器二次重采样模糊源）
- 修复④ b8_regen.py 全量再生成（b3 应用 21 + b4 游戏 9 + b1/b2/b5 选择性 15 个）带锐化；跳过 b7 已重绘版本和 b6 托盘像素画 —— 69 个图标全部升级
- 命名修正：cp-datetime→cp-clock（与 kind 'clock' 对应）
- e2e 验证：刷新→登录→桌面截图→我的电脑→控制面板→MSN 启动全链路零错误；lint 0 错误；tsc src 零错误；生产构建成功
- VLM 终审：桌面 92/100（回收站95/网上邻居90/IE93/OE88/QQ85）·控制面板 85/100 ·我的电脑 92/100（硬盘95"教科书级"）·MSN 菜单栏单行正常
- 交付物：download/icon-upgrade-desktop.png、download/icon-upgrade-controlpanel.png

Stage Summary:
- MSN 菜单栏换行修复（MenuBar compact 模式可复用于其他窄窗口）
- 图标体系全面升级：60 分 → 92 分。三大关键工艺改进：UnsharpMask 锐化引擎 / 控制面板位图化 / 显示尺寸对齐桶消除二次重采样
- 重绘 11 + 新绘 9 + 全量锐化再生成，69 个图标全部达到 XP 经典水准（VLM 85-95）
- 资产体系：b7_refine.py + b8_regen.py 可秒级迭代

---
Task ID: 15 (回档恢复 + 图标原生替换 + 功能三件套)
Agent: 主 Agent (Super Z)
Task: 环境回档恢复——用户报告启动画面回退/整套代码疑似回档(实际回滚至 09-11 Task14 快照)。回顾沟通记录,用两个参考仓库(ShizukuIchi/winXP + ducbao414/win32.run.cf)对比当前代码,重新修复全部丢失工作。

Work Log:
- 回档排查:git HEAD 80a48fe@09-11、worklog 只到 Task14、download 最新 09-11、ux17-boot-real-logo.png 不存在、reference/ 丢失、vlm.mjs/icon_sheet.py 丢失 → 确认 Task15(ux1~ux17 UI 迭代+真 logo 启动画面)与 Task16(图标替换)全部丢失
- 工具重建:scripts/vlm.mjs(z-ai-web-dev-sdk createVision 识别工具)
- 仓库克隆:reference/winxp-ref(131 图标+扫雷全套)+ reference/win32ref(553 个 100px 语义命名 XP 图标+启动画面资产)
- 启动画面重构(screens.tsx):图片搜索 6 张候选→VLM 选定 boot0.jpg(1192×670 真实截图)→逐像素几何分析(logo 组 y166-375 高 31.2vh/进度条 178×23/bottom 文字带)→提取 logo.png(702×418 2x 锐化)+copyright.png+ms-mark.png(win32ref 170×34 高清版)+flag.png(真旗帜区域 x568-742 黑转透明 alpha=lum*2)
- 布局考证:VLM 与 win32ref xp_loading_logo.jpg 交叉验证——真 XP 布局=旗帜右上+Microsoft®左下+Windowsxp 底部大字(首次 VLM 误报位置,双源证据纠正)
- 跑马灯 CSS:xp-boot-marquee(块簇横穿 26.6vh,vh 单位自适应)
- 图标全量替换(scripts/replace_icons.py):win32ref 100px→48/32/16 三桶 LANCZOS+锐化 58 个;winxp-ref 原生 16px 直拷(tray-volume=W32:Volume 缩小版胜出/404 网络/159 MSN);扫雷四态笑脸(17px 原生)+mine-icon(30px);winflag=boot0 真旗帜黑转透明;保留:sndrec/useravatar/power 系列圆钮(QQ/shield 已移除)
- 修复 Taskbar 音量 flyout size12→16(16px 像素画 pixelated 渲染 12px 会坏)
- 工具链修复:eslint ignores 加 reference/scripts/download 等(SIGKILL 根治)、.gitignore 加 /reference/
- 功能①延迟双击重命名:Explorer 四视图 commonEvents+Desktop(选中≥500ms 再单击→内联重命名;selAtRef useEffect[selected] 记录时刻;Desktop justDraggedRef 抑制拖拽后误触发;双击打开加 if(rename) 守卫)
- 功能②菜单键盘快捷键:ui.tsx MenuList 栈顶响应字母键(menuKeyStack 挂载入栈/卸载出栈,级联子菜单自动成为栈顶;itemsRef 避免重渲染栈错乱;输入框聚焦时不拦截)+MenuLabel 下划线渲染「撤消(U)」→U 加下划线
- 功能③扩展名动态关联:fs.ts EXT_TABLE 19 种扩展名→图标/类型映射+assocOf();store.fsRename 改名后按新扩展名重算 icon/type(无 appId 文件);我的文档新增示例文件(mp3/wav/png/wmv 视频+My Videos 文件夹)
- QQ 全链路移除:删 qq/ 组件目录+registry 3 项+StartMenu 腾讯QQ 项+Taskbar QQTrayButton+store qq 状态层(保留 QQMsg 类型 MSN 复用)+fs QQ.exe/桌面快捷方式+RunDialog qq 命令+app-icons QQIcon+sounds 3 个 QQ 音效+图标资产;保留 api/qq/chat(MsnChat 共用)+QQMusic.exe(无关联 exe 报错演示)+useEdgeDock/xp-qq-blink(MSN 复用)
- 托盘 shield 移除:Taskbar 两处安全中心按钮+shieldCtx 删除;保留 9s 安全气球+Ctrl+Alt+Del SecurityDialog;补齐 tray-shield 32/48 桶(16px 原画最近邻放大)根治 404
- Explorer 地址栏 XP 下拉:addrBoxRef+下拉箭头按钮→openCtx 渲染路径层级树(我的电脑→各级祖先,FolderIcon 缩进+当前项加粗,单击直达)

验证:
- 启动画面 VLM:旗帜 95/排版 98/进度条 90;与参考图并排对比布局一致
- 欢迎屏旗帜黑转透明无黑块 ✓
- 托盘音量 VLM:"完全符合 XP 默认主题托盘音量图标设计(灰白喇叭+双弧声波)" ✓
- 桌面 VLM:图标真实 XP 风格(我的电脑 92);QQ 快捷方式已移除 ✓
- 开始菜单:QQ 项已移除 ✓;所有程序图标 95-100
- 我的电脑:驱动器 85 分(真实 LocalDisk/CD-ROM/Floppy)
- 扫雷四态笑脸:92/88/75/70(原生资产)
- 功能实测(真实鼠标+agent-browser):延迟双击重命名触发 ✓;txt→mp3 改名图标变音频+双击开 WMP(任务栏按钮出现)✓;右键菜单按 M 键→菜单关闭+重命名触发 ✓;地址栏下拉层级(我的电脑|本地磁盘(C:))✓+点击导航 ✓;QQMusic.exe 双击→「Windows 无法打开此文件」对话框与参考图一致 ✓
- 质量门:lint 0 错误 0 警告、tsc src 零错误、生产构建成功(6 路由)

Stage Summary:
- 回档丢失工作全部重建:真 logo 启动画面(几何比例源自真实截图逐像素分析)+58 图标三桶原生替换+托盘原生像素画+扫雷全套原版资产+旗帜黑转透明
- 三大功能落地:延迟双击重命名/菜单键盘访问键(含下划线渲染)/扩展名动态关联(EXT_TABLE 19 种)
- QQ 全链路移除(13 处引用清零,保留 MSN 共用设施)+托盘 shield 移除(保留气球与安全对话框)+地址栏层级下拉
- 交付物:public/icons/boot/(logo/flag/copyright/ms-mark)、scripts/replace_icons.py(可秒级重生成)、reference/ 两仓库(后续图标微调源)

---
Task ID: R-dialog-fix
Agent: 主 Agent (Super Z)
Task: 修复错误提示对话框"确定按钮溢出到底边外"的用户报告 bug（含连带发现的两处系统性 bug）

Work Log:
- VLM 分析用户截图 upload/pasted_image_1789369337959.png：确认按钮溢出对话框底边、对话框偏居屏幕左侧
- 根因 1（按钮溢出）：Notepad.tsx DialogBox 用固定公式 `130 + 行数×8` 猜窗口高度，未考虑文字换行（QQMusic.exe 错误文案在 340px 窄窗中折行，实际需 ~192px，公式只给 170px）
- 根因 2（位置偏左）：store.ts APP_DEFAULTS.dialog 为 w:0/h:0，级联定位产生偏左坐标，后续 setRect 只设尺寸不重定位
- 根因 3（连带发现·系统性）：store.openApp 的 title 只认 def.title ?? '窗口'，全项目 20+ 处 openApp('dialog', {title:...}) 传入的 props.title 从未生效 → 所有对话框标题栏都显示"窗口"
- 根因 4（连带发现）：registry.tsx dialog 的 icon 为空组件 → MessageBox 标题栏无消息级别图标（真实 XP 应有红叉等小图标）
- 修复 DialogBox 尺寸逻辑：canvas measureText 按 11px 真实字号逐字符测宽模拟浏览器换行 → 宽度自适应文字（340~500px）、高度精确计算（25 标题栏 + 32 padding + max(行数×16, 图标32) + 23 按钮 + 16 pb + 6 余量）、工作区居中略偏上（XP MessageBox 真实行为）；shutdown 保持 400×210 居中；canvas 异常回退 380×190
- 修复 store.openApp：titleOverride ?? props.title ?? def.title ?? '窗口'
- 修复 XPWindow 标题栏：dialog 窗口按 props.kind 显示对应 16px 消息图标（error→红叉/warn→三角/confirm+question→问号/其他→蓝i），复用 public/icons/16/dlg-*.png
- 验证：agent-browser 走完整用户路径（我的电脑→C:→Program Files→Tencent→QQ→双击 QQMusic.exe），VLM 审查 98/100 全项通过（标题=QQMusic.exe、标题栏红叉图标、按钮完整居中、对话框屏幕居中、排版正常）；第二场景（运行错误命令多行文案）同样全项通过
- 质量门：bun lint ✅ / tsc --noEmit（src 零错误）✅ / production build ✅ / 控制台零错误
- 截图证据：scripts/verify/dialog-fixed.png、dialog-final.png、dialog-run-err.png

Stage Summary:
- 用户报告的错误对话框按钮溢出 bug 彻底修复，且自适应算法保证任意长度文字（含 Pinball 11 行操作说明等）永不溢出
- 连带修复全局对话框标题 bug（20+ 处调用受益）与标题栏消息图标缺失
- 该修复顺带覆盖了历史遗留"QQMusic.exe 文件关联错误参考图（upload/pasted_image_1789265037410.png）"的布局部分；其文件关联逻辑本身（exe 本应可执行）仍待 r-7 扩展名动态关联打开任务处理

---
Task ID: R-msn-remove
Agent: 主 Agent (Super Z)
Task: 移除 MSN 功能（Windows Messenger / MSN Chat 全链路）

Work Log:
- 全量扫描：grep msn|messenger 命中 17 个文件，甄别出"MSN Messenger 功能"与"IE/Outlook 的 MSN 门户内容"两条线（后者保留：IE 默认主页 cn.msn.com、MSN Search、Hotmail 邮件均为 IE/Outlook 自身真实功能）
- 删除文件 5 个：apps/Messenger.tsx（主面板）、apps/MsnChat.tsx（对话窗）、msn/msn-icons.tsx（整个 msn/ 目录：MsnMan/MsnPic/MsnText/表情集）、useEdgeDock.tsx（仅 Messenger 使用的贴边停靠 hook）、public/icons/{16,32,48}/msn.png + 16/tray-msn.png（孤儿位图）
- store.ts：移除 MsnContact/MsnStatus/MsnState 三个接口、6 个联系人预设 + MSN_INIT、state 的 msn 字段与 8 个 action 声明及实现、APP_DEFAULTS 的 messenger/msnchat、openApp 单例规则中 messenger/msnchat 分支
- registry.tsx：移除 Messenger/MsnChat 组件注册与 MessengerIcon import
- Taskbar.tsx：移除 MsnTrayButton 组件（横/竖任务栏两处使用）与 MsnMan import、playDing 未用 import
- StartMenu.tsx：移除最常用程序列表与所有程序级联两处 Windows Messenger 入口
- RunDialog.tsx：移除 msmsgs / msmsgs.exe 命令映射（运行后正确报"找不到文件"，与真实 XP 卸载后行为一致）
- fs.ts：移除 C:\Program Files\Messenger 文件夹及 msmsgs.exe
- HelpCenter.tsx：移除"向朋友求助 (Messenger)"按钮
- app-icons.tsx：移除 MessengerIcon；Explorer.tsx：移除网上邻居"My Web Sites on MSN"项；InetOptions.tsx：移除"Internet 呼叫 → Windows Messenger"关联行；Outlook.tsx：欢迎邮件文案去掉 Messenger 宣传行
- 验证：残留扫描归零（仅保留 IE/Outlook 的 MSN 门户内容）；lint/tsc/production build 三门全过；agent-browser e2e：托盘无 Messenger 图标、开始菜单两处入口 0 命中、所有程序级联 0 命中、Program Files 无 Messenger 文件夹、运行 msmsgs 弹"找不到"错误、控制台零错误、VLM 桌面全景检查无残留无破损

Stage Summary:
- MSN Messenger 功能全链路移除完毕：状态管理/组件/注册/托盘/开始菜单/运行映射/文件系统/帮助中心/位图资产 10 个层面全覆盖
- 保留边界清晰：IE 的 MSN 门户与搜索、Outlook 的 Hotmail 邮件不受影响（它们是 IE/Outlook 自身功能而非 Messenger）
- 截图证据：scripts/verify/msn-removed-run.png、msn-removed-desktop.png

---
Task ID: R-qq-syscomplete
Agent: 主 Agent (Super Z)
Task: ① QQ 全链路移除 ② 安全中心气球提示移除 ③ 补全 XP 功能（控制面板等）

Work Log:
- 【QQ 移除】组件文件在上次回档中已丢失，本次清理全部残留：删 api/qq/chat 路由、store QQMsg 接口 + qqchat/qqprofile 默认值 + openApp 单例规则整段（QQ/MSN 均无使用方）、fs.ts C:\Program Files\Tencent 文件夹、globals.css xp-qq-blink 动画；IE 中 qq 仅为搜索变量名（无关保留）
- 【安全中心气球移除】XPSystem Balloon 组件 + 桌面就绪 9 秒定时器（唯一调用处）、store BalloonState/balloon/showBalloon/dismissBalloon、icons.tsx ShieldIcon、9 个 tray-shield 位图；Toast 共用的 xp-balloon-anim CSS 保留；Ctrl+Alt+Del 的"Windows 安全"中央对话框为真实 XP 功能保留
- 【新增 AddRemove.tsx 添加或删除程序】三页签（更改或删除/添加新程序/Windows 组件向导）：17 个真实程序列表（图标/大小/使用频率）、删除流程（确认→卸载进度动画→移出列表）、系统组件保护（IE/OE/记事本等报"是 Windows XP 一部分不能删除"）、组件向导（复选/磁盘空间汇总/配置进度/完成页）、CD 安装+Windows Update 入口；支持 props.tab 直达页签
- 【新增 NetworkConn.tsx 网络连接】本地连接（100Mbps 已连接）+ 1394（已禁用）+ 拨号 56K（已断开）；双击弹状态对话框（持续时间实时计时 + 已发送/收到数据包实时跳动 + 小灯活动指示）；右键启用/禁用切换；网络任务侧栏 + 详细信息
- 【新增 PrintersFax.tsx 打印机和传真】空文件夹 + 添加打印机向导 6 步（欢迎→本地/网络→厂商/型号（HP/Epson/联想/Star 真实型号）→命名/默认→测试页→复制进度→完成）；安装结果写入全局 store.printers（PrinterItem[]，addPrinter/removePrinter）；默认打印机绿勾角标；右键菜单（设为默认/删除/队列）
- 【新增 PrintDialog.tsx 通用打印对话框】有打印机：选打印机/打印范围/份数→"正在打印"进度动画→toast；无打印机：XP 真实文案"无法打印 xxx。没有安装打印机…"；记事本（菜单+Ctrl+P）/写字板/IE（菜单+Ctrl+P+工具栏）全部接入
- 【控制面板接线】添加或删除程序三任务→addremove（含组件向导直达）；查看网络连接→netconn；更改日期和时间→datetime（原有 app 之前竟未接线）；添加打印机→printfax；经典视图由 tasks.slice(0,1) hack 重写为 10 个真实 applet 图标（显示/网络连接/添加删除程序/声音/管理工具/用户帐户/日期时间/打印机和传真/系统/辅助功能）
- 【开始菜单】打印机和传真 toast 占位→openApp('printfax')
- 【registry/store/CSS】注册 addremove/netconn/printfax/print 四 app + APP_DEFAULTS + printing-anim 动画
- 质量门：lint ✅ / tsc ✅（清 .next 缓存） / production build ✅
- e2e：登录等 10 秒无安全中心气球（VLM 确认托盘仅音量）；控制面板→添加删除程序（三页签/列表/IE 保护错误框/扫雷卸载消失）；打印机和传真→6 步向导→HP LaserJet 6L 绿勾安装；记事本菜单打印→打印对话框→正在打印进度（VLM 全过）；网络连接→双击本地连接→状态对话框实时计时/数据包（VLM 全过）；Program Files 无 Tencent；控制台零错误

Stage Summary:
- QQ 与安全中心提示彻底移除，残留扫描归零
- XP 功能补全三大件落地：添加或删除程序 / 网络连接 / 打印机和传真（含向导），外加贯穿三应用的通用打印链路（安装打印机前后行为差异与真实 XP 一致）
- 控制面板从"toast 剧场"升级为真实可操作小程序矩阵，经典视图 10 applet 全接线
- 截图证据：scripts/verify/{no-balloon,addremove-main,sys-protected,prn-wiz-done,printfax-installed,print-dlg2,printing-progress,netconn-status,programfiles-clean}.png

---
Task ID: R-icons-repo-ctxmenu
Agent: 主 Agent (Super Z)
Task: ① 三 GitHub 仓库图标资源本地化并替换手绘图标 ② 桌面系统图标右键菜单对齐真实 XP（附带管理工具全家桶落地）

Work Log:
- 【仓库本地化】浅克隆三仓库到 reference/：ShizukuIchi/winXP（winxp-shizuku，131 个原生编号图标+扫雷全套，即丢失的 winxp-ref）、ducbao414/win32.run.cf（win32run，553 个 100px 语义命名图标，即丢失的 win32ref）、B00merang-Artwork/Windows-XP（boomerang-xp，FreeDesktop 分类多尺寸桶）
- 【图标替换】scripts/replace_icons_v2.py 三级优先管线（win32run 100px→三桶 LANCZOS+锐化 72 个 > boomerang 会话 4 个 > shizuku 原生 9 项：托盘 120/404 像素画直拷、mail 32→16、user.png 53px 头像、扫雷四态笑脸 17px、游戏内地雷 30px）；旧桶备份 scripts/icons-backup-pil；winflag 保留 boot 截图提取版（非手绘）
- 【VLM 驱动修正】首轮对比图 78/100：power-off/restart/standby/logoff 四钮 GNOME 风格严重违和（3/10）→ 核实 windows-off.png 实为土棕色（VLM 臆测"红圆钮"不可信）→ 恢复 PIL 四色圆钮到 48/32 桶并清 16 桶残留 → 复查 98/100
- 【右键菜单对齐】Desktop.tsx 重写五个系统图标菜单为真实 XP 中文版完整项：我的电脑（打开/资源管理器/搜索/管理(G).../映射网络驱动器/断开网络驱动器/创建快捷方式/删除灰/重命名灰/属性→系统属性）、我的文档（+属性→我的文档属性框）、网上邻居（+属性→信息框）、回收站（打开/资源管理器/清空回收站(B)...空时灰/创建快捷方式灰/删除灰/重命名灰/属性→回收站属性框）、IE（打开(O)/无加载项启动(B)/创建快捷方式/删除灰/重命名灰/属性→Internet 选项）
- 【新增 AdminTools.tsx 791 行】ServicesPanel（17 个真实 XP 服务表：右键启动/停止/暂停/恢复/重启+属性，Event Log/Plug and Play 保护不可停，停止 Windows Audio 真实联动系统静音）、EventsPanel（应用/安全/系统三日志，事件数据 ago 分钟数→渲染时换算真实时钟与任务栏自洽，双击弹事件属性详情）、PerfMon（SVG 折线实时图表+计数器条）、ComputerManagement（MMC 壳：树导航系统工具/存储/服务和应用程序，内嵌事件/服务/系统信息/设备管理器树/本地用户和组/磁盘管理卷表+磁盘图示，支持 props.node 直达）、AdmToolsFolder（管理工具文件夹视图 6 图标）、SecuPolicy（密码策略/帐户锁定/审核策略/安全选项四组只读表）、OdbcSources（用户/系统 DSN+驱动程序三页签）
- 【新增 DesktopProps.tsx】MyDocsProps（目标位置/共享 tab）、RecycleProps（容量滑块+三单选全局设置）、MapDriveDialog（盘符下拉+UNC 路径+登录时重连接，校验 \\server\share 格式）、UnmapDriveDialog（映射列表断开）、MouseProps（鼠标键切换/双击速度测试钮/指针方案/轮/硬件五 tab，main.cpl 正确落点）
- 【接线】store：netDrives state+addNetDrive/removeNetDrive+12 个 APP_DEFAULTS；registry 注册 admintools/compmgmt/services/eventvwr/perfmon/secpol/odbc/mydocsprops/recycleprops/mapdrive/unmapdrive/mouseprops；RunDialog：compmgmt.msc/services.msc/eventvwr.msc/perfmon.msc/secpol.msc/odbcad32/control admintools|printers|mouse|userpasswords + 修正 main.cpl 错误映射（原误指 charmap→现 mouseprops）；ControlPanel：性能和维护类别+管理工具任务、经典视图管理工具图标、sysprops 设备管理器按钮→compmgmt devmgr 节点
- 【修复】e2e 发现控制台 React key 重复：经典视图旧"管理工具"项（错误映射 sysinfo）与新项并存 → 删旧项保留正确接线（10 applet）；事件表格 table-fixed 百分比列宽在 compact 下叠压（"信息026日"）→ 改固定像素列宽 min-w-780px+overflow-hidden（真实 MMC 横滚动行为）
- 【验证】三门（lint/tsc/production build）全过；e2e：右键五图标菜单项逐一 snapshot 比对、管理(G)→计算机管理（VLM 90/100）、双击管理工具→服务→右键停止 Windows Audio 状态实时变化+静音联动、事件查看器双击 7000 错误事件弹详情、映射 Z:→\\FileServer\public→断开链路、运行 compmgmt.msc/main.cpl（鼠标属性正确打开）、经典视图 10 applet；VLM：图标对比图 98/100、桌面全景高分"以假乱真"、我的电脑右键菜单"极其精准的 XP 复刻"；控制台零错误
- 截图证据：scripts/verify/{icons-v2-compare,v2-desktop-icons,v2-mycomputer-ctx,v2-compmgmt,v2-eventvwr-final,v2-services,v2-svc-stopped,v2-eventdetail,v2-admtools-folder,v2-mapdrive,v2-mapdone,v2-unmap,v2-run-msc,v2-maincpl,v2-mouseprops,v2-cp-classic-final,v2-mydocsprops,v2-ie-ctx,v2-net-ctx,v2-recycleprops,v2-final-desktop}.png

Stage Summary:
- 三仓库图标资源永久本地化（reference/），85 项替换管线可重现（replace_icons_v2.py），全系统图标达到 XP 原生质感（VLM 98/100）；电源四色圆钮经 GNOME 版对比验证后保留 PIL 版（三仓库无 msgina.dll 资产）
- 桌面五系统图标右键菜单与真实 XP 中文版逐项对齐（含灰色禁用态），管理(G)/映射网络驱动器/各属性框全部真实落地
- 附带完成管理工具全家桶（计算机管理/服务/事件查看器/性能/本地安全策略/ODBC/管理工具文件夹）+ 5 个新属性框（我的文档/回收站/映射驱动器/断开驱动器/鼠标），App 总数 38→53

---
Task ID: R-3-cpl-fonts-tasks
Agent: 主 Agent (Super Z)
Task: 补全 XP 功能第 3 批：5 个 cpl 属性框 + 字体系统 + 任务计划 + 控制面板经典视图 19 applet

Work Log:
- 【会话恢复】发现 worklog 显示 R-icons-repo-ctxmenu 已完成但会话摘要过时（AdminTools/DesktopProps 实际在 apps/ 子目录完好，git 干净）——直接续做原计划剩余项
- 【新增 PropsDialogs.tsx 757 行】SoundProps（音量页签真实联动 store.masterVolume/volumeMuted + 静音；声音页签 22 个程序事件表带 .wav 文件名，7 种内嵌音效可真实播放；音频/语音/硬件页签含 AC97 设备表）；PowerProps（6 种电源方案切换真实联动四个下拉：便携=5/10/15/45 分钟；警报/电源计量表(UPS 无)/高级页签）；KeyboardProps（重复延迟/重复率滑块 + 真实可用的按住重复测试区 setInterval 实现 + 光标闪烁频率滑块驱动 252ms CSS 动画）；IntlProps（区域切换实时刷新数字/货币/时间/日期示例，语言页签 5 项 IME 列表，高级页签联动时区名）；AccessProps（粘滞键/筛选键/切换键/声音卫士/高对比度/鼠标键/自动复位全复选框组）
- 【新增 FontsTasks.tsx 473 行】FontsFolder（22 个真实 XP 中文字体表含文件名/CSS family/大小/版本/变体数，查看菜单"按相似性列出字体变体"折叠展开切换，文件菜单"安装新字体"）；FontViewer（头部信息区 + 8/12/18/24/36/48/60/72 多字号样例逐行渲染，宋体/Times/Courier 等真实 font-family）；TaskSched（任务文件夹 + 预置磁盘清理/碎片整理两任务 + 双击弹计划详情）；TaskWizard（6 步向导：程序单选 12 项→名称+周期 6 选→时间页→运行身份→完成页含摘要与高级属性勾选，完成后 addSchedTask 全局持久化）
- 【store】SchedTask 接口 + schedTasks 状态 + addSchedTask/removeSchedTask action + 8 个 APP_DEFAULTS（soundprops/powerprops/keyboardprops/intlprops/accessprops/fonts/fontview/taskssched）
- 【registry】注册 8 app（App 总数 50→58）；app-icons 追加 FontsFolderIcon/FontFileIcon/TaskSchedIcon（Bmp cp-fonts/fontfile/cp-tasks）
- 【fs.ts】FSNode icon 联合类型加 'font'；EXT_TABLE 加 ttf/ttc/fon/job；WINDOWS 下新增 Fonts（12 个字体文件节点）与 Tasks（2 个 .job 任务文件）目录，二者带 appId 触发外壳文件夹行为
- 【Explorer.tsx】nodeIcon 加 font→Bmp fontfile；openItem 重构：带 appId 的文件夹打开专用视图（双击 Fonts/Tasks 弹特殊窗口而非导航进原始目录，XP shell 行为）、icon==='font' 文件双击开 fontview 并传字体名
- 【RunDialog】命令表 +17 项：mmsys.cpl/powercfg.cpl/intl.cpl/access.cpl/main.cpl,,1(键盘)/fonts + control keyboard/desktop/color/date/fonts/schedtasks/tasks/intl/powercfg/access
- 【ControlPanel】经典视图 10→19 applet（新增电源/辅助功能/键盘/区域/任务计划/扫描仪照相机/文件夹选项/自动更新/鼠标/字体，全部真实接线，仅扫描仪/文件夹选项/自动更新为信息对话框）；类别视图任务重接线：声音类三任务→soundprops（含 tab 直达）、区域格式→intlprops、打印硬件类+鼠标/键盘任务、新增辅助功能类别
- 【属性框 props.tab】5 个新属性框均支持 props.tab 直达页签（与 display 一致惯例）
- 【图标】scripts/xpicons/b10_cp3.py：win32run 100px 原版 LANCZOS+UnsharpMask 三桶导出 cp-scanner/cp-folderopts/cp-autoupd（控制面板经典视图补齐）
- 【CSS】globals.css 加 @keyframes kbblink（键盘闪烁光标）
- 【质量门】lint ✅ / tsc ✅ / production build ✅（修复 FontsTasks flatMap 嵌套括号不平衡解析错误）
- 【e2e】登录→控制面板经典视图 19 图标（VLM 96.7/100"以假乱真"）；声音属性音量联动+声音页签选中"启动 Windows"播放真音效；键盘属性 3 滑块+2 处 kbblink 动画 eval 验证；电源方案切"便携/袖珍式"四下拉实时刷新 5/10/15/45；区域选项默认值正确；字体文件夹→双击宋体→预览窗口（VLM 95/100）；任务计划向导 6 步全流程→"计算器 每周 二 09:00"出现在任务列表（全局持久化）；我的电脑→C:→WINDOWS→双击 Fonts 打开特殊视图；运行 mmsys.cpl/control schedtasks/intl.cpl/control fonts 全部正确打开对应窗口；全新会话控制台零错误；VLM 键盘属性 100/100、任务向导 95/100、桌面全景"制作精良技术细节经得起推敲"
- 截图证据：scripts/verify/{cpl-classic-19,soundprops-vol,soundprops-snd,kbprops,powerprops,intlprops,fontsfolder,fontview-simsun,taskssched,taskwiz-1,taskwiz-2,taskwiz-6,taskwiz-final,taskwiz-done,fonts-via-explorer,run-mmsys,run-schedtasks,final-panorama}.png

Stage Summary:
- 控制面板从 10 applet 升级到 19 applet 的完整 XP 矩阵：10 个真实小程序对话框（含本批 5 个 cpl）+ 3 个信息框占位（扫描仪/文件夹选项/自动更新）
- 字体系统全链路：特殊文件夹视图 + 22 字体真实 family 渲染 + 多字号预览 + fs.ttf/ttc 关联 + 变体折叠
- 任务计划：6 步向导真实创建任务并持久化（store.schedTasks），向导周期动态反映真实星期
- 声音属性与全局音量真实联动；键盘重复率/闪烁频率可真实交互测试
- App 总数 58；原功能补全计划（AdminTools/PropsDialogs/FontsTasks/接线四批）全部完成

---
Task ID: R-taskbar-props-details
Agent: 主 Agent (Super Z)
Task: 补全系统细节复刻：任务栏右键→属性全链路 + 经典「开始」菜单 + 分组/自动隐藏/工具栏等 XP 真实行为

Work Log:
- 【新增 TaskbarProps.tsx 650 行】任务栏和「开始」菜单属性：任务栏页签（Bliss 风迷你预览图实时反映快速启动/时钟/分组/自动隐藏四态 + 任务栏外观 5 复选框 + 通知区域 2 复选框 + 自定义通知按钮）、「开始」菜单页签（Luna/经典双 GroupBox 预览缩略图 + 单选切换 + 双自定义按钮）；草稿式提交（应用/确定生效、取消还原，XP 真实语义）
- 【附属对话框×4】CustomizeNotif 自定义通知（音量/打印机两行 × 三列名称/行为/当前 + 行为下拉实时联动托盘：音量=总是隐藏→图标即刻消失）；CustomizeStart 自定义「开始」菜单（常规：图标大小/程序数目 spinner/清除列表→真实清空 programUse；高级：7 个「开始」菜单项目三态单选 不显示/链接/菜单 + 最近文档开关）；CustomizeClassic 自定义经典菜单（8 项复选直接控制经典菜单渲染）；NewToolbar 新建工具栏（fs 实时树选择 → 真实创建任务栏工具栏段落）
- 【store 扩展】taskbarAutoHide/taskbarOnTop/taskbarGroup/showClock/hideInactiveIcons/notifPrefs/tbDesktop/tbLinks/tbCustom/startClassic/classicOpts/startOpts{bigIcons,progCount,itemMode} 14 组状态 + 各 action + restoreAllWindows（含还原后最顶层窗口 z 提升修复激活态）+ 5 个 APP_DEFAULTS
- 【Taskbar.tsx 全量改造】属性→真实对话框（不再是 toast）；工具栏子菜单补全 XP 结构（快速启动/语言栏灰/桌面/链接/自定义列表/新建工具栏）；桌面工具栏段落（系统图标+文件内联 + » 展开菜单）；链接工具栏（IE 收藏夹→打开对应网址）；自定义工具栏段落；分组相似任务栏按钮（XP 真实策略：按钮超出容量才合并、堆叠图标、左键窗口列表、右键关闭组）；自动隐藏（pointermove 检测、贴边滑入/离开滑出、transform 过渡）；显示时钟显隐；托盘音量图标受通知偏好控制；置于前端取消时 z 降为 5（窗口可覆盖）；显示桌面切换（有可见窗→全最小化，再点→全还原）；横向/纵向平铺方向互换修复（XP：横向=全宽上下排、纵向=全高左右排）；音量弹出滑块底部改 XP 真实「静音」复选框
- 【右键菜单对齐真实 XP】时钟右键→仅"调整日期/时间(A)"；音量右键→打开音量控制/调整音频属性(A)→soundprops（去掉非真实"静音"项）；开始按钮右键→打开所有用户(O)/浏览所有用户(E)/搜索(S).../属性(R)（去掉非真实"运行"项，属性开属性框）；开始菜单背景右键→三项全接线
- 【StartMenu.tsx】经典「开始」菜单完整渲染（Win2000 风格 + "Windows XP Professional" 蓝色渐变品牌竖条 + 顶部固定区/我的文档/我最近的文档(空子菜单)/搜索子菜单(文件或文件夹/Internet/用户灰)/帮助/运行/所有程序级联复用/注销/关闭计算机，classicOpts 控制各项显隐）；右栏 7 项支持三态模式（菜单模式=级联子菜单：我的文档/图片收藏/我的音乐=fs 子项、我的电脑=驱动器+共享文档+映射盘+控制面板二级级联 16 applets、控制面板=16 applets、打印机和传真=打印机列表+添加）；常用程序数 progCount/大图标 bigIcons 真实生效；fs.ts 补 All Users「开始」菜单目录
- 【接线】registry 注册 5 对话框；RunDialog +taskbar.cpl/control taskbar；控制面板外观和主题类别 +任务栏和「开始」菜单任务
- 【XPWindow/getWorkArea】自动隐藏/不置于前端时任务栏不保留工作区（最大化窗口可全屏，XP 真实行为）
- 【修复】ESLint set-state-in-effect（自动隐藏重置改条件渲染）；restoreAllWindows zTop 漂移导致还原后无激活按钮
- 【质量门】lint ✅ / tsc ✅（src 零错误）/ production build ✅ ×2 轮
- 【e2e 全链路】任务栏右键 8 菜单项→属性对话框（两页签全要素）；显示时钟关→时钟消失；经典菜单切换→品牌竖条+全部菜单项+所有程序级联；自定义通知音量=总是隐藏→托盘图标实时消失→还原；8 记事本→分组堆叠按钮→左键窗口列表→右键关闭组→全部关闭；显示桌面两次点击最小化/还原+激活态恢复；桌面工具栏内联+展开、链接工具栏收藏夹菜单→IE 打开 cn.msn.com、新建工具栏（树展开 3 层选 My Documents→工具栏出现→子菜单移除）；运行 taskbar.cpl 开属性；自动隐藏指针离开 translateY(28px) 滑出/贴边滑回/取消恢复 none；自定义开始菜单高级页我的电脑=显示为菜单→右栏级联（软盘/C:/D:/共享文档/控制面板）→控制面板二级级联 16 applets；控制台零错误
- 【VLM 审查】属性任务栏页签 95/100（"中文本地化文案的准确性上表现完美"）、经典开始菜单 95/100（"以假乱真"）、桌面工具栏 95/100、分组右键菜单 95/100（"未保存文件星号标记细节还原度极高"）、最终全景 A+（"对绝大多数观众而言这就是 100% 的 Windows XP"）
- 截图证据：scripts/verify/tbp-{01..28}-*.png

Stage Summary:
- 状态栏右键→属性从 toast 占位升级为完整可用的 XP 属性系统：主对话框 + 4 个附属对话框（自定义通知/自定义开始菜单/自定义经典菜单/新建工具栏）全部真实接线，草稿式应用语义与 XP 一致
- 7 个任务栏复选框全部真实生效（锁定/自动隐藏/前端/分组/快速启动/时钟/隐藏图标），含此前完全缺失的自动隐藏滑入滑出、分组堆叠按钮、置于前端层级切换
- 经典「开始」菜单首次落地：品牌竖条+经典布局+可定制项显隐，与 Luna 菜单通过属性框一键切换
- 「开始」菜单右栏支持不显示/链接/菜单三态（菜单模式含二级级联 16 控制面板 applets）
- 工具栏系统：桌面/链接/自定义（新建工具栏 fs 树）三段落真实渲染与移除
- 修正三处历史偏差：横向/纵向平铺方向互换、时钟/音量/开始按钮右键菜单非真实项、显示桌面无还原

---
Task ID: R-xp-classic-details
Agent: 主 Agent (Super Z)
Task: 继续补全未复刻的 XP 经典交互细节（用户反馈"还有很多细节都没有复刻"——本批六大经典缺失交互）

Work Log:
- 【盘点】代码核查确认六项经典交互全部缺失：右键拖放菜单、发送到(N)子菜单、驱动器属性饼图、格式化对话框、Win+L 锁定计算机、Shift×5 粘滞键提示
- 【右键拖放菜单】Desktop + Explorer 双表面落地（HTML5 DnD 不支持右键拖 → 自建 pointer 跟踪系统）：
  · pointerdown(button 2) 装填 → move 超过 6px 阈值生成克隆鬼影（svg+位图 img 双支持）→ pointerup 时 elementFromPoint 命中检测 → XP 四项菜单「移动到当前位置(M)/复制到当前位置(C)/在当前位置创建快捷方式(S)/取消」（回收站目标仅 移动+取消，XP 真实行为）
  · contextmenu 双时序兼容（Linux=mousedown 时 / Windows=mouseup 时）：一次性 capture 拦截标志（rdBlockRef），确保拖放期间浏览器菜单不冒出、原地右键仍正常弹普通菜单（pointerup 手动补弹）
  · 装填期间松开非右键 → 中止；落点为普通图标/窗口/任务栏 → 不弹菜单（XP 行为）；左键拖拽鬼影 buildDragGhost 同步修复（svg → svg+img，位图化迁移后的隐藏回归）
  · Desktop 落点：文件夹/我的文档/回收站/桌面背景（背景=重排空闲格/副本/快捷方式+落点定位）；Explorer 落点：文件夹行/列表空白（当前文件夹）
- 【发送到(N)】Desktop + Explorer 文件/文件夹右键菜单插入 XP 真实五项：3.5 英寸软盘(A:)（未格式化→「设备未就绪」错误框；格式化后真实复制，原文件保留）/ 桌面快捷方式（fsCreateShortcut）/ 邮件接收者（Outlook 直开写邮件+附件行+主题预填）/ 压缩(zipped)文件夹（fsCreateFile zip + PIL 新绘拉链文件夹图标 b11_zip.py 三桶 48/32/16）/ 我的文档（移动）
  · fs.ts：FSNode icon 联合类型 +zip、EXT_TABLE +zip；Desktop.tsx 文件图标链补 zip/audio/font/exe 分支（zip 图标显示修复）；Explorer nodeIcon +zip
- 【驱动器属性 DriveProps.tsx】三选项卡：常规（卷标可编辑真实 fsRename/类型/文件系统/XP 蓝已用-紫红可用饼图 SVG/容量-已用-可用三行字节数/磁盘清理按钮→cleanmgr）；工具（查错→检查磁盘对话框/碎片整理→dfrg/备份→XP Home 无 ntbackup 真实提示）；硬件（ST340016A/TEAC CD-224E 设备表+设备属性+疑难解答）
  · 卷标派生模式（liveNode + labelEdit 本地编辑优先），驱动器按盘符查找（driveNameByLetter，卷标重命名后依然健壮）
- 【格式化对话框 FormatDialog】XP 经典全流程：容量(3.5", 1.44 MB, 512 字节/扇区)/文件系统(FAT/NTFS/CDFS)/分配单元/卷标/快速格式化/启用压缩(disabled)/创建 MS-DOS 启动盘 → 蓝色分段进度条动画（快速 2.1s/完整 5.2s）→「格式化完毕」报告（总容量/可用字节）
  · A: 格式化成功后 fsUpdateNode 清除 error+空白盘+应用卷标（A: 变为可打开、可接收发送到文件）
  · C: → XP 真实拒绝「退出所有正使用此驱动器的磁盘实用程序…」；D: → CD 只读拒绝
- 【检查磁盘 CheckDiskDialog】自动修复文件系统错误/扫描并试图恢复坏扇区复选框 → 三阶段进度（文件系统/索引/安全描述符）→「磁盘检查完成」报告（41832 文件记录段/未发现错误/未发现坏扇区）
- 【Win+L 锁定计算机】Phase +locked；LockScreen（screens.tsx）：「解除计算机锁定」标题/左侧旗帜品牌/Administrator 磁贴+密码框+绿色箭头/切换用户/关闭计算机；Enter 或箭头解锁（Administrator 无密码），窗口全程保留（原 Win+L 误为注销关全部窗口——已修正为真实锁定语义）
- 【Shift×5 粘滞键】XPSystem 全局计数（其它键重置/10 秒窗口/stickyKeys 已启用不再弹）→ DialogBox 新 kind 'sticky'：确定（启用+toast）/取消/设置(S)（开辅助功能选项）；AccessProps 粘滞键复选框改接全局 store（双向联动）
- 【接线】store：Phase 'locked'、fsUpdateNode、stickyKeys/setStickyKeys、3 个 APP_DEFAULTS（driveprops/format/chkdsk）；registry 注册 3 app（HardDriveIcon/FloppyDriveIcon）；RunDialog +chkdsk/format（命令表支持 props 传递）；Outlook props.compose 直开写邮件+附件行
- 【e2e 全链路 13 项全过】（agent-browser 真实鼠标 + CDP 事件）：桌面右键拖放→我的文档（四项菜单+移动生效+我的文档窗口可见）/Explorer 发送到子菜单五项+桌面快捷方式创建/桌面发送到压缩文件夹+zipfile 图标/格式化 A: 全流程（要素/进度/完成报告/A: 可打开无错误）/发送到软盘复制/驱动器属性饼图（卷标/NTFS/23.1GB/15.1GB/41,016,232,448 字节/磁盘清理按钮）/工具页签/检查磁盘三阶段+完成报告/Win+L 锁定屏五要素+密码回车解锁+窗口保留/Shift×5 三按钮对话框+确定启用 toast/Explorer 右键拖放→My Music 复制生效/右键拖到回收站（仅移动+取消→确认→删除生效）/发送到邮件接收者（Outlook 写邮件+附件行）/发送到我的文档/格式化 C: 拒绝；控制台零错误
- 【VLM 终审】驱动器属性饼图 92/100、格式化对话框 95/100、锁定屏 95/100、右键拖放菜单 95/100、桌面全景 95/100（"教科书级呈现"）；按 VLM 建议修正容量下拉文案为 XP 真实「3.5", 1.44 MB, 512 字节/扇区」
- 【质量门】bun run lint 0 错误 0 警告；tsc src 零错误；生产构建成功（5 路由）
- 截图证据：scripts/verify/r6-{01..25}-*.png

Stage Summary:
- 六大经典缺失交互全部落地：右键拖放（双表面+自定义 pointer 系统）、发送到五项、驱动器属性饼图、格式化全流程（A: 真实就绪/CD 拒绝/系统盘拒绝）、Win+L 锁定（窗口保留）、Shift×5 粘滞键（三按钮+全局联动）
- 软盘子系统从"摆设"变为可用闭环：格式化 A: → 卷标 → 可打开 → 发送到软盘复制
- 修复两处历史隐藏 bug：Win+L 误注销（丢失窗口）、左键拖拽鬼影在位图化迁移后失效（svg 选择器不匹配 img）
- 技术沉淀：contextmenu 双时序一次性拦截方案、pointer 跟踪右键拖放架构（可复用于其他表面）

---
Task ID: R-logoff-icon-deepdetails
Agent: 主 Agent (Super Z)
Task: ① 修复用户报告：经典菜单注销图标不显示 ② 继续盘点更深细节（注销确认对话框 + 我最近的文档真实记录）

Work Log:
- 【注销图标 bug 根因】写 scripts/audit_icons.py 全量审计 Bmp 图标桶缺失：经典菜单 LogOffIcon size=20 → 16 桶 /icons/16/logoff.png 不存在（404 图标空白）；连带发现 power-off/restart/standby 16 桶同样缺失
- 【图标考证】克隆 win32run + ShizukuIchi 两仓库到 reference/（本环境曾丢失）；图片搜索真实 XP 截图 8+5 张 + VLM 逐级放大分析确认：
  · Luna 菜单页脚注销 = 金色圆角方块+白钥匙（win32run Logout.png，其源码 start_menu.svelte 同款用法佐证）
  · 经典菜单注销 = Win2000 风金色钥匙（侧向、钥匙头四色风车芯、黑描边、透明背景）
  · 两种菜单用不同图标 = 真实 XP 行为（经典菜单拉旧版图标资源）
- 【b12_logoff.py】logoff 48/32 桶替换为原生金方块白钥匙（LANCZOS+UnsharpMask）；16 桶用 b6 PX 引擎图元栅格化手绘金钥匙（金环+高光/阴影弧+四色 2×2 芯+杆+双方齿），VLM 审查通过；power 系列 16 桶 LANCZOS 补齐
- 【StartMenu】经典菜单注销/关闭计算机图标 20→16px（真实 XP 经典菜单 16px 图标，16px PNG 1:1 零缩放渲染）
- 【注销 Windows 确认对话框】（此前点击注销直接进转场，跳过 XP 真实确认步骤）：
  · DialogBox 新 kind='logoff'：蓝渐变横幅（钥匙图标+标题）+ 双大按钮（切换用户 S/注销 L，图标左文字右）+ 底部取消；xp-shutdown-dlg 同款视觉体系
  · b13_logoff_dlg.py PIL 绘制 switchuser（银白前人影+蓝灰后人影+双绿换向弧箭头）/logoffkey（平滑金钥匙：环头+白底四色风车芯+高光弧+杆+双齿）48/32 桶
  · 切换用户 = playLogoff + 关闭对话框 + setPhase('welcome')（窗口保留 = XP 快速用户切换真实语义，重新登录后窗口原样恢复）；注销 = closeAll + logging-off
  · Luna 页脚 + 经典菜单 + 两处 onLogoff 全部改走对话框
- 【我最近的文档真实记录】（此前经典菜单硬编码“(空)”子菜单）：
  · store：recentDocs: string[][]（段数组）+ pushRecentDoc（去头插/上限 15）+ clearRecentDocs
  · 接线：Explorer.openItem（文本/图片/音频/字体/zip）、Desktop 双击打开（含快捷方式目标）、记事本 文件→打开 对话框
  · 经典菜单子菜单真实渲染：按扩展名图标（txt/image/audio/font/zip）+ 点击按类型打开（记事本/图片查看器/WMP/字体预览）+ 目标被删弹 XP 错误框
  · 清除列表接线 3 处：自定义「开始」菜单常规 tab、高级 tab、自定义经典「开始」菜单（新增真实 XP「清除(C)」按钮）
- 【e2e 修复 1 个连带 bug】切换用户后注销对话框窗口残留 → closeWindow(win.id) 先关再转场
- 【e2e 验证全过】经典菜单金钥匙图标显示（VLM 确认）/Luna 页脚金方块白钥匙（放大复核=钥匙）/注销对话框三按钮+取消/切换用户→欢迎屏→重新登录窗口保留且对话框不残留/注销→正在注销转场/最近文档：双击桌面 txt+记事本打开对话框双路记录→经典菜单子菜单显示（VLM 确认文件名+记事本图标）→点击新开记事本/控制台零错误
- 【质量门】bun run lint 0 错误 0 警告；tsc src 零错误；生产构建成功（5 路由）；VLM 终审 95/100「堪称完美的模拟或截图」
- 截图证据：scripts/verify/{b12-classic-menu,b12-luna-menu,b12-luna-footer,b13-recentdocs2,b13-recent-open,b13-logoff-dlg,b13-luna-logoff,b13-switchuser,b13-logging-off,b13-recentdocs3,b13-final-classic}.png

Stage Summary:
- 用户报告的经典菜单注销图标不显示根治：16 桶金钥匙像素画 + Luna 32/48 桶原生金方块白钥匙双升级，图标资产审计脚本沉淀（audit_icons.py 可防回归）
- 深细节两件套落地：注销 Windows 确认对话框（切换用户=快速用户切换窗口保留）+ 我最近的文档真实记录（三入口记录/按类型打开/三处清除）
- 修复连带 bug：切换用户对话框残留
- 图标资产新增：switchuser/logoffkey 48/32、logoff 16、power 系列 16（可秒级重生成的 b12/b13 脚本）

---
Task ID: R-xp-deeper-2
Agent: 主 Agent (Super Z)
Task: 继续盘点更深细节第四批：XP tooltip 系统 + 运行 MRU 历史 + 前进后退下拉 + 辅助工具四件套

Work Log:
- 【盘点】审计确认四类深层缺口：全站原生 title= 浏览器样式 tooltip（非 XP 黄底黑框）、运行对话框无 MRU 历史、Explorer/IE 后退前进无下拉历史箭头、Win+U 为占位文本框（辅助工具三件套缺失）
- 【XPTip 组件 ui.tsx】XP 真实 tooltip 系统：#FFFFE1 黄底 + 1px 黑框 + 1px 柔和阴影 + 11px 字号 + 500ms 悬停延迟；createPortal 到 body（规避任务栏 transform 定位陷阱）；贴底自动向上翻转；全局排他（同屏仅一个）；任意 mousedown/keydown 即隐藏；show 时派发 xp-narrate 事件（讲述人联动钩子）
- 【Tooltip 全站接线 20+ 处】开始按钮「单击这里开始」（XP 标志性彩蛋）、任务栏时钟（完整日期「2026年9月16日 星期三」XP 格式）、快速启动三按钮、任务按钮（窗口标题）、分组按钮、托盘音量、桌面/链接/自定义工具栏条目、grip/» 展开钮（水平+垂直两套任务栏全覆盖）、XPWindow 标题栏最小化/还原/最大化/关闭
- 【运行 MRU】store: runHistory + pushRunHistory（去头插、上限 26=XP 真实值）+ clearRunHistory；RunDialog 改 XP 真实组合框（input+▼ 下拉、白底列表、蓝底高亮、↑↓/Enter/Esc 键盘导航）；成功运行入史（URL 亦记录）；预填 notepad/cmd/mspaint；去掉非真实 placeholder
- 【后退/前进下拉】Explorer：拆分按钮 + ▼ chevron（仅历史非空时出现），后退列表=历史倒序（最近在顶加粗）、前进列表正序，点击直达 gotoIdx；提取 pathLabel 复用；IE 同款（per-window hist，gotoIdx 重建加载态）
- 【辅助工具四件套 Accessibility.tsx】
  · utilman 辅助工具管理器：真实 Win+U 对话框（三工具行：图标+复选+描述+启动/停止按钮，store 实时驱动启停；「当 Windows 登录时」GroupBox 双复选；确定/取消）
  · osk 屏幕键盘：增强型 101 键完整布局（F 行+主区四排+导航区+数字小键盘，+/Enter 双行高、0 双列宽、Space 6.25u）；点击真实键入聚焦输入框（onMouseDown preventDefault 不抢焦点 + 原生 value setter 触发 React onChange）；Shift 闩锁（输入后自动释放）、CapsLock、Backspace/Delete/方向键/Home/End 光标操作；键盘/设置/帮助菜单；击键发音开关
  · magnify 放大镜：顶部停靠放大条（138px 全宽，壁纸按倍率放大跟随鼠标，rAF 节流，imageRendering pixelated=XP 最近邻马赛克观感[采纳 VLM 建议]）；设置窗：倍率 2-9 级按钮组/跟随鼠标/颜色反转/隐藏/退出
  · narrator 讲述人：菜单栏+白底朗读文本区；监听 xp-narrate（任意 tooltip 显示即追加「正在朗读: …」）；订阅焦点窗口标题（排除自身+值守卫）
- 【图标 b14_access.py】osk/magnifier/narrator/utilman 三桶（48/32=4x 超采样 LANCZOS+锐化；16=硬边像素画）；utilman 16px 按 VLM 建议二版简化（去辐条+加粗形）；VLM 审查通过
- 【接线】registry 注册 4 app；APP_DEFAULTS 4 条；Win+U → openApp('utilman')；RunDialog APP_MAP +osk/magnify/narrator/utilman；store 暴露 __xp 调试钩子（e2e 用）
- 【修复 2 个连带 bug】① 讲述人 useXP.subscribe 中 setWindowTitle 自指回环（标题「讲述人-讲述人-…」无限增长 → Maximum update depth 崩溃白屏）→ 排除自身+值相等守卫；② OSK 字母键默认应小写（原 key 定义大写导致恒输出大写）→ shiftOn!==capsOn 决定大小写、符号走 SHIFT_MAP
- 【e2e 全链路 8 组全过】开始按钮 tooltip「单击这里开始」/时钟完整日期/快速启动 tooltip；OSK 键入 XHELLO→BS 删 X→「xhell」+Shift 闩锁 I→「xhellI」；讲述人 tooltip 联动「正在朗读: Internet Explorer」；放大镜条 h=138 4×；四件套同屏 DOM 4 窗；运行 MRU「taskmgr,notepad,cmd,mspaint」；Explorer 后退菜单「Documents and Settings|本地磁盘 (C:)|我的电脑」最近在顶；健康终检 healthy + 控制台零错误
- 【VLM 审查】开始按钮 tooltip 92/100、运行 MRU 88/100、utilman 95/100（「图标绘制得几乎与原版资源一致」）、osk 90/100、四件套同屏 88/100、Explorer 后退菜单 92/100、放大镜初版 85→像素化后「高保真」（草叶阶梯锯齿/无抗锯齿模糊=XP 观感）；按建议补 tooltip 阴影、时钟日期空格、放大镜 pixelated
- 【质量门】bun run lint 0 错误 0 警告；tsc src 零错误；生产构建成功
- 截图证据：scripts/verify/d2-{01,02,03,04,07,08,09,10,11,12,14}-*.png

Stage Summary:
- 四类深层缺口全部落地：XP 原生观感 tooltip 系统（全站替换浏览器原生 title）、运行对话框 MRU 历史、Explorer/IE 后退前进拆分按钮下拉、Win+U 辅助工具从占位文本升级为完整四件套
- 屏幕键盘成为本复刻最深的"系统级"交互：可向任意聚焦输入框真实键入（含 Shift/Caps/Backspace/光标键全套）
- 放大镜/讲述人达成真实联动：放大条像素化跟随鼠标、讲述人朗读全系统 tooltip 与焦点窗口标题
- 修复一个隐蔽严重 bug（讲述人订阅回环导致 React 崩溃白屏）与一个键入逻辑 bug（字母大小写）
- 技术沉淀：XPTip portal 方案（transform 陷阱）、OSK 原生 setter 键入方案、zustand 订阅值守卫模式

---
Task ID: R-xp-deeper-3
Agent: 主 Agent (Super Z)
Task: 继续盘点更深细节第五批：Rover 搜索伙伴 + 修饰键拖放 + 画图三对话框 + 写字板字体/查找替换 + 打印队列 + 剪贴板查看器 + CMD Tab 补全

Work Log:
- 【盘点】核查确认 7 项缺口：搜索窗口仅简笔狗 SVG（无动画）、左键拖放无修饰键语义（仅 Desktop 有 Ctrl=复制）、画图翻转/旋转 disabled 占位且无拉伸/扭曲与属性、写字板字体/查找为 toast 占位、打印机队列为 toast 占位、clipbrd 缺失、CMD 无 Tab 补全
- 【Rover 搜索伙伴】SearchApp 重绘精细 SVG（米黄身/棕垂耳/口鼻/白爪/白尾尖），5 姿态状态机：idle（摇尾巴+耳朵摆+偶尔歪头）/sniff（下探嗅迹线）/run（奔跑起伏+前腿摆+速度线）/found（欢呼跳跃+吐舌+挑眉）/sit（安静呼吸）；CSS keyframes 系统（roverWag/roverTilt/roverSniffBody/roverRunLegs/roverFoundJump）；搜索链路真实联动（点击搜索→run→450ms后sniff→完成有结果found庆祝1.6s/无结果sit歪头→回idle）；单击 Rover 随机切换姿态彩蛋
- 【键盘修饰拖放（XP 真实语义）】Ctrl+Shift/Alt=创建快捷方式、Ctrl=强制复制、Shift/无=移动；Explorer onDropOn 三分支重写 + 列表背景复用；Desktop onIconDrop 补快捷方式分支、背景 drop 补三分支（副本/快捷方式落点定位）；全站 onDragOver 设置 dropEffect（copy/link/move 光标反馈）
- 【画图三对话框】翻转/旋转（水平/垂直翻转 + 90/180/270 旋转，canvas transform 矩阵实现）；拉伸/扭曲（双 GroupBox 四输入框，transform 斜切矩阵+scale，1-500%/±88 度校验）；属性（画布尺寸修改真实生效+W/H 改 state+内容保留+单位换算 96dpi/37.8px-cm+黑白抖动转换）；菜单顺序对齐 XP（翻转/拉伸/反色/属性/清除）；「重复(R)」接 redo 激活
- 【写字板】字体对话框（三栏字体/字形/大小+示例预览区实时渲染+选区或全文应用，execCommand fontName/fontSize/bold/italic）；查找（Ctrl+F，TreeWalker 偏移→Range 映射，从光标循环查找+选中滚动到可见）；替换（替换单处/全部替换循环+完成 toast）
- 【打印队列系统】store：PrintJob 接口+printJobs+addPrintJob（6.5s 完成自动出队+暂停跳过+恢复重计时，模块级 printTimers Map）+pausePrintJob/cancelPrintJob/cancelAllPrintJobs；PrintQueue 组件（打印机/文档/查看/帮助四菜单，XP 真实六列：文档名/状态/所有者/页数/大小/提交时间，右键暂停/继续/取消/属性，状态栏 N 个文档）；PrintersFax 双击/打开(O) 真实开队列窗口（同打印机查重聚焦）；PrintDialog 打印真实入队（多份拆分入队）
- 【剪贴板查看器 Clipbrd.tsx】运行 clipbrd 打开；XP 真实布局（左侧格式列表+右侧内容区）；复制文件时显示 Shell IDList Array/FileGroupDescriptorW/Preferred DropEffect 三格式（pidl 明细/DropEffect 2-COPY 3-MOVE），文本格式读浏览器剪贴板（授权降级）；删除(D)=清空剪贴板真实联动（粘贴随之失效）；另存为=.clp 落盘桌面
- 【CMD Tab 补全】首词补命令名（28 命令表）、参数补当前目录子项（文件夹带\）；循环匹配（同前缀/上轮结果续接，indexOf 后继取模回绕）；含空格名引号包裹（"My Documents\，正则提取行尾引号段 token）；输入字符重置游标
- 【修复 1 个 React 19 严重级隐藏 bug】写字板 contenteditable 用 dangerouslySetInnerHTML={__html:''}：React 19.2 对 dangerouslySetInnerHTML 的 update 路径无条件重设 innerHTML（新对象字面量引用必变必进 payload，源码核实 21838 行无 prevHTML 比较），任何 state 更新（dirty/对话框开关）都会清空用户输入 → 改为挂载时 useEffect 一次性注入；全项目排查仅 WordPad 一处受影响
- 【修复 2 个 e2e 发现的补全逻辑缺陷】①空前缀不补全（type +Tab 应循环全部子项）②含空格文件名被 split(' ') 破坏无法循环（改正则引号段提取）
- 【e2e 全链路 7 组全过】Rover 姿态链（idle→搜索run→sniff→found 庆祝，结果列表正常，VLM 确认"官方设定金毛寻回犬 Rover"98/100）；修饰键拖放（Ctrl+Shift 拖 boot.ini→WINDOWS 生成快捷方式/Ctrl 拖→Program Files 生成副本/默认拖→移回 C 根，测试痕迹清理）；画图（翻转/旋转对话框 VLM 100/100、90 度旋转像素级验证红块左上→右上、拉伸150%+扭曲15 度 VLM 确认宽斜变形、属性改画布 460x280→500x300）；写字板（查找选中"写字板"、循环第二处、全部替换 3 处、字体对话框楷体+粗体+24 应用为 font face+b+size=6、React19 清空 bug 修复后对话框开关不再丢内容）；打印队列（打印入队"无标题-记事本/printing/1页"、双击打印机开队列、两文档"正在打印"截图 VLM 高分、暂停 8s 保留、恢复 7.5s 自动出队）；剪贴板查看器（2 文件复制显示三格式+文件列表 VLM 通过、删除清空、空状态提示）；CMD（pi+Tab→ping、type +Tab 循环 桌面→Favorites→"My Documents"→桌面回绕、dir 桌面 真实执行）；全新会话控制台零错误
- 【VLM 审查】Rover 98/100、翻转/旋转对话框 100/100、拉伸扭曲效果"准确展示"、字体对话框 92/100（扣分为描述值与截图选中值不符的测试瑕疵）、打印队列六列 100%、剪贴板查看器"非常标准"、最终桌面全景 95/100"博物馆级还原度"
- 【质量门】bun run lint 0 错误 0 警告；tsc src 零错误；生产构建成功（5 路由）
- 截图证据：scripts/verify/d5-{01-rover-found,02-paint-before,03-flipdlg,04-stretch,05-attr,06-find,07-wp-font,08-printqueue,09-clipbrd,09b-clipbrd-empty,10-final-desktop}.png

Stage Summary:
- 七项深细节全部落地：Rover 搜索伙伴（本项目首个多姿态 SVG 动画角色）、修饰键拖放三语义、画图三真实对话框、写字板查找/替换/字体对话框、打印队列全生命周期（入队-暂停-恢复-出队）、剪贴板查看器、CMD Tab 循环补全
- 连带根治 1 个 React 19 隐患级 bug：dangerouslySetInnerHTML 在 React 19.2 重渲染时无条件重设（源码级定位），写字板内容清空问题修复；此项对任何升级 React 19 的 contenteditable 场景都有参考价值
- 打印子系统闭环补全：打印对话框→入队→队列窗口实时展示→暂停/恢复/取消→完成出队
- 技术沉淀：TreeWalker 偏移→Range 映射（contenteditable 查找替换）、canvas transform 矩阵图像变换、模块级打印计时器（窗口无关后台推进）、引号段 token 正则（含空格路径补全）

---
Task ID: R-xp-api-layer
Agent: 主 Agent (Super Z)
Task: ① 执行下一步建议：补齐「打开方式(H)」右键菜单全链路 ② 全功能 API 化：URL 可配置 + 本地 JSON 模拟 + API 文档交付

Work Log:
- 【打开方式（XP 真实行为补全）】新增 apps/OpenWith.tsx：XP「打开方式-选择程序」对话框（程序列表+描述+「始终使用选择的程序打开这种文件」复选框+双击直达）+ 双击无关联文件的「Windows 不能打开此文件」双选项首屏（Web 服务/从列表选择）；ctx-menus.ts 新增 openWithItems()（顶部当前关联程序粗体+推荐程序+选择程序(C)...）；Desktop/Explorer 双表面文件右键菜单插入；store 新增 extAssoc 扩展级关联 + setExtAssoc，Desktop/Explorer openItem 优先走 extAssoc；双击无关联文件从错误框升级为打开方式对话框；Paint 支持 props.src 加载图片（打开方式→画图不丢图）
- 【共享领域模型抽取】fs.ts 去 'use client' 成为客户端/服务端共享纯模块，并下沉 mutateAt/detachNode/insertNode 树操作；新增 model.ts：领域类型（RecycleItem/PrintJob/PrinterItem/SchedTask/IE 数据等 14 类）+ SettingsDTO + DEFAULT_SETTINGS/DEFAULT_IE 默认值 + MockStateDTO 全量快照 + freshMockState() 播种——单一事实来源防双端漂移；store.ts 改用共享默认值并再导出类型（既有导入零破坏）
- 【本地 JSON 模拟服务端】src/server/mock-db.ts：db/xp-state.json 持久化（tmp+rename 原子写、promise 链串行互斥、损坏自动重播种）+ resetState + ApiError；src/server/ops.ts：fs 领域操作与 store fs* 动作逐条镜像（唯一命名/改名重算关联/移动防环/回收站 key 客户端权威/还原回退桌面/undefined→null 补丁防 JSON 丢键）
- 【/api/v1 全量 REST 路由 16 组 38 端点】state/system(ping+reset)/session(事件流水)/fs(GET?path/POST/PATCH rename|patch/DELETE)/fs/write/fs/move/fs/copy/recycle(GET/POST restore/DELETE)/settings(GET/PATCH 白名单合并)/recent-docs/run-history/printers/print-jobs/sched-tasks/desktop/ie/net-drives/audio；统一信封 {ok,data}/{ok,error{code,message}}；src/server/http.ts ok/fail/jsonBody/requireFields
- 【API 客户端层 src/lib/api/】client.ts：BaseURL 三级配置（localStorage xp.apiBase 运行时 → NEXT_PUBLIC_API_BASE 环境变量 → 默认同源 /api/v1）+ 串行请求队列（保序）+ 在线状态 pub/sub（markOnline/markOffline）+ testConnection 直连探测；endpoints.ts 全端点类型化封装；fs-sync.ts 操作级同步（不 import store 防循环依赖）；sync.ts 启动 hydrate（服务端权威整表替换+打印作业计时器补挂 >8s 出队）+ WATCH_KEYS 订阅 diff（防抖 400ms：settings 字段级 PATCH、列表资源整表 PUT、ie 分字段）+ 脱机不建基线（绝不拿本地默认值覆盖服务端）
- 【store 接线 16 处】fsCreateFolder/fsCreateFile/fsCreateShortcut/fsWriteFile(区分更新/新建名)/fsDelete(带 items)/fsDeletePermanent/fsRestore/fsRemoveRecycle/fsEmptyRecycle/fsRename/fsUpdateNode(null 清除)/fsMove/fsDuplicate/fsPaste(copy 分支)/setPhase(会话事件 login|unlock|lock|logoff|shutdown|restart 按前一 phase 区分)；XPSystem 挂载即 hydrateFromApi().finally(initApiSync)
- 【API 数据源设置对话框】apps/ApiConfig.tsx：XP 风格（GroupBox/单选/测试连接实时状态「连接正常：Windows XP WebOS @ XP-STATION」/重置出厂数据带确认+自动重启/文档指引）；入口三处：运行 apicfg + 管理工具新增「数据源设置」(7 对象) + APP_MAP
- 【质量门】bun run lint 0 错误 0 警告；tsc src 零错误（仅历史遗留未接线孤儿文件 Messenger/MsnChat/qq/ 为前会话预存，不在构建图内）；生产构建成功（24 路由含 16 组 /api/v1/*）
- 【API 回归 38/38 两轮全过幂等】scripts/api_regression.py：出厂重置前置+全资源 CRUD（重名→(2)/改名重算 icon/409 冲突/移动防环/回收站还原/设置白名单/最近文档去重置顶/打印作业暂停恢复/会话事件/404 错误信封/db 落盘校验）
- 【e2e 全链路 10 项全过】登录事件同步 JSON（login+lock 流水）；桌面右键新建→改名「API落盘测试.txt」→服务端 JSON 落盘；整页刷新→重新登录→文件仍在（hydrate 完整闭环）；右键「打开方式(H)」XP 真实位置+子菜单（记事本/写字板/选择程序...）；选择程序对话框选写字板+勾选「始终使用」→写字板打开且 extAssoc{txt:wordpad} 服务端持久化；运行 apicfg→对话框+测试连接通过；自定义不可达 URL→脱机模式正常开机进桌面零报错（本地默认态）；恢复默认→服务端数据自动回归（renamed.log/API落盘测试.txt 重新出现）；UI 删除→确认→服务端桌面移除+回收站条目 key 完整传递；出厂重置+最终桌面零错误
- 【VLM 审查】打开方式对话框 92/100（A 级复刻）、API 数据源设置 98/100（教科书级 XP 风格）、打开方式子菜单「足以乱真」、最终桌面全景 95-100（Bliss 壁纸/图标 100）
- 【API 文档双交付】docs/API.md 仓库版（架构图/三级配置/信封/路径表示法/数据模型/38 端点参考含 ●客户端实际调用标记/同步机制表/真实后端对接清单/错误码/测试运维）；docx 交付版 download/WebXP-API接口文档.docx（docx skill 规范：R2 双线框封面 CM-2 蓝橙 + 三节页码架构（封面无页码/目录罗马/正文阿拉伯从 1）+ TOC 域代码+30 条目占位+刷新提示 + WPS 兼容页脚补丁 ROMAN|arabic + postcheck 0 错误 + LibreOffice 渲染 13 页 + VLM 封面/目录/正文全过）；生成链脚本化（gen_api_docx.js/patch_docx_footers.py 可迭代重生成）
- 【运维】db/xp-state.json 加入 .gitignore（运行时数据不进版本库）

Stage Summary:
- 「下一步建议」兑现：打开方式全链路（含「始终使用」扩展级关联真实生效+双击无关联文件 XP 双选项首屏）
- 全功能 API 化落地：文件增删改查/回收站/设置/最近文档/运行历史/打印机/打印队列/任务计划/桌面布局/IE 数据/网络驱动器/录音/会话事件全部走 REST API；本地 JSON 模拟（db/xp-state.json 原子持久化）；BaseURL 三级可配置（运行时对话框/环境变量/默认同源）；脱机自动降级
- 架构沉淀：fs.ts+model.ts 客户端/服务端共享纯模块（单一事实来源）；操作级+差异级双通道同步；串行队列保序；服务端权威 hydrate
- API 文档三态交付：仓库 docs/API.md（开发者）+ docx（交付评审）+ 回归脚本（可持续验证）
- 遗留说明：Messenger/MsnChat/qq/ 孤儿文件为前会话未接线 WIP，未纳入本次范围

---
Task ID: R-md-api-doc
Agent: 主 Agent (Super Z)
Task: ① download/WebXP-API接口文档.docx 转换为 Markdown 交付版 ② 继续下一步兑现（第六批深细节：文件夹选项/幻灯片缩略图/zip 原生压缩文件夹）

Work Log:
- 【docx→md 转换】pandoc 提取 docx 全文 → 手工组装高质量 Markdown（download/WebXP-API接口文档.md）：封面转文档头表格、TOC 域转 GitHub 锚点目录、5 表格+8 代码块全量转写、清理 pandoc 转义；顺手修正 docx 原文两处错字（「浏览器剅的」→「浏览器端的」、「回扯」→「回查」）
- 【md 完整性验证】脚本对照：7 章+23 小节与 docx 30 headings 1:1、8 表格=8、30 目录锚点零失效、零残留转义
- 【盘点第六批缺口】快捷键/记事本/CMD/任务管理器/balloon 均已完备，确认三大缺口：文件夹选项为 toast 占位、查看模式缺幻灯片/缩略图、双击 zip 误走「打开方式」
- 【文件夹选项 FolderOptions.tsx 460 行】四页签属性框：常规（任务/浏览文件夹/打开项目方式三组单选+恢复默认值）、查看（高级设置 8 项：复选/单选/缩进层级，XP 即时生效语义）、文件类型（EXT_TABLE+extAssoc 合并注册类型列表+扩展名详细信息+更改按钮→OpenWith ext 模式+删除自定义关联）、脱机文件（XP Home 简化样式）
- 【XP 经典警告框】取消「隐藏受保护的操作系统文件」→「您已选择显示受保护的操作系统文件…显示这些文件可能带来危险」是(Y)/否(N) 确认（VLM 审查文案「完美还原」）
- 【真实联动五项设置】hideFileExt/showHiddenFiles/showSystemFiles/showCommonTasks/clickToOpen + folderMisc（SettingsDTO 自动进 API 白名单与 diff 同步链，PATCH 验证 applied 正确）；stripExt() 显示名 helper（Explorer 全视图+桌面+侧栏，重命名输入仍显示全名）
- 【隐藏系统文件】fs.ts：C 盘新增 ntldr/bootfont.bin/hiberfil.sys/pagefile.sys（system+hidden）、Administrator 下 NTUSER.DAT；EXT_TABLE zip 类型改「压缩(zipped)文件夹」；过滤语义：system 文件独立受系统开关控制（e2e 发现 hidden&&!showHiddenFiles 误滤 system 文件后修正）
- 【幻灯片视图】大图预览区+四圆形蓝底按钮（上一张/下一张/顺时针/逆时针，radial-gradient 高光）+底部胶片条（水平滚动/当前项蓝框/非图片项图标）；旋转会话内 Map 角度；图片文件夹模板默认进入（未手动改视图时导航跟随 isPictureFolder）
- 【缩略图视图】96px 网格：图片真实 <img> 缩略+灰边框+阴影，非图片 48px 大图标居中
- 【zip 原生压缩文件夹】fsCreateFile 支持 children；发送到→压缩 = structuredClone 源节点填充；双击 zip → navigate 进入内部（XP 只读浏览语义）；侧栏「压缩文件夹任务：提取所有文件/关于压缩文件夹」；右键 zip 首项「全部提取(A)...」（XP 置顶真实行为）；提取=剪贴板 copy+fsPaste 到 zip 父目录（重名自动编号，原 zip 保留）；桌面右键新建→压缩(zipped)文件夹(Z)
- 【接线】registry+APP_DEFAULTS（folderoptions 400x472）；OpenWith 扩展 ext 模式（文件类型更改入口，不改具体文件）；store.clearExtAssoc；Explorer 工具菜单+控制面板经典视图+运行 control folders 三入口；查看菜单六模式（幻灯片仅图片文件夹可用）+排列图标四项真实接线（名称/类型/大小/修改时间）
- 【e2e 修复 2 个隐藏 bug】① 服务端 db/xp-state.json 旧快照缺新字段/新文件——出厂重置重新播种验证；② inZip 判断从 parentNode 改为当前 node（浏览 zip 内部时 path 终点即 zip 节点）
- 【e2e 全链路 14 组全过】文件夹选项四页签渲染（VLM 92/100 S级）；取消隐藏系统文件→警告框→是→C 盘 4→8 个对象（ntldr/pagefile.sys 可见）；hideFileExt 切换 boot.ini↔boot 显示联动；图片收藏自动幻灯片→下一张切 azul.jpg→旋转 180°（transform 验证）；菜单栏切缩略图（3 图网格）；发送到压缩→欢迎.zip 落盘（API GET 验证 children）；双击进入→压缩文件夹任务+提取所有文件→「欢迎 (2).txt」出现；右键「全部提取」→「欢迎 (3).txt」；文件类型 jpg→更改→写字板→extAssoc{jpg:wordpad}；control folders 运行直开；桌面右键新建压缩文件夹（真实鼠标右键+悬停+点击三段）；PATCH settings 新字段 applied 验证+恢复；全新会话控制台零错误
- 【VLM 审查】文件夹选项 92/100（「S级顶级还原…几乎就是从虚拟机里截出来的画面」）、幻灯片 92/100、zip 内部 88/100（扣分均为像素级吹毛求疵）、警告框「文案完美还原」、最终桌面 92/100「视觉欺骗性极强」
- 【质量门】bun run lint 0 错误 0 警告；tsc 新代码零错误（孤儿文件历史遗留不变）；生产构建成功两轮
- 截图证据：scripts/verify/d7-{01..17}-*.png

Stage Summary:
- API 文档三态交付补全：docx（评审）+ docs/API.md（仓库权威）+ download/WebXP-API接口文档.md（Markdown 对接版，锚点目录+代码块适配 git 工作流）
- 第六批深细节三件套落地：文件夹选项从 toast 占位升级为四页签真实属性系统（五设置真实联动+XP 警告框+文件类型注册表视图）、幻灯片/缩略图两视图（XP 图片文件夹标志性体验）、zip 原生压缩文件夹（创建-浏览-提取全闭环）
- 系统 XP 语义增强：隐藏/系统文件双开关独立控制、扩展名隐藏全站联动（含重命名显示全名细节）、图片文件夹模板视图
- 技术沉淀：SettingsDTO 派生白名单的零成本扩展模式（加字段即全链路同步）、zip 节点 children 复用树遍历方案

---
Task ID: pkg-1
Agent: 主Agent（Super Z）
Task: 将 WebXP 项目打包到 download/ 供用户下载到本地调试

Work Log:
- 确认项目根目录为 /home/z/my-project（非摘要中的 /root/webxp）
- 引用完整性检查：src/ 不依赖 scripts/selfcheck/examples 等待排除目录（仅注释提及）；prisma 的 lib/db.ts 无页面引用，打包后无需 prisma generate
- rsync 组装 staging（.zscripts/webxp-pkg/webxp）：含 src/ public/ prisma/ db/ docs/ tests外全部配置文件；排除 node_modules/.next/.git/scripts/selfcheck/skills/download/upload/tool-results/examples/mini-services/Caddyfile/worklog.md 等
- 复制 download/WebXP-API接口文档.md/.docx 至包内 docs/
- 新增 .env.example（DATABASE_URL 相对路径 + NEXT_PUBLIC_API_BASE 说明）与 README-LOCAL.md（环境要求/安装/dev/build/数据说明/API三级配置/目录结构/FAQ，含 Windows cmd 下 tee/cp 不可用的替代方案）
- 生成 zip：download/WebXP-source-20260918.zip（2.9MB，558 文件）
- 校验：关键文件（page.tsx/XPSystem.tsx/xp-state.json/schema.prisma/mock-db.ts/client.ts/bun.lock）均在包内；无 node_modules/.next/.git 混入；src+public+prisma+db+docs 文件清单与源一致（仅多出主动复制的2份API文档）

Stage Summary:
- 交付物：/home/z/my-project/download/WebXP-source-20260918.zip（2.9MB，解压得 webxp/ 目录，npm/bun install 后 npm run dev 即可本地调试）
- 包内含 README-LOCAL.md 本地运行指南 + .env.example + docs/API.md + docs/WebXP-API接口文档.md/.docx
- mock 数据 db/xp-state.json 随包携带（当前系统状态），删除即恢复出厂
- staging 保留于 .zscripts/webxp-pkg/ 便于后续增量更新打包

---
Task ID: R-xp-winanim
Agent: 主 Agent (Super Z)
Task: 第七批深细节：XP 窗口动画体系（最小化/还原/关闭三动画 + 菜单淡入）+ 性能选项对话框（视觉效果设置真实化）

Work Log:
- 【盘点】对话框体系已完备，确认最大缺口为窗口动画体系完全缺失（minimized 直接 return null 瞬间消失、无菜单淡入），且系统属性→高级→性能「设置(S)」为 toast 占位
- 【数据层】model.ts：新增 VisualFXOpts（8 项 XP 真实复选：拖动窗口内容/窗口动画/平滑滚动/菜单淡入/组合框滑动/菜单阴影/指针阴影/视觉样式）+ DEFAULT_VISUAL_FX；SettingsDTO 加 visualFX（SettingsDTO 派生白名单 → API PATCH/diff 同步零成本接入）；store.ts：visualFX 平铺字段 + setVisualFX 合并动作 + APP_DEFAULTS perfopts；mock-db readState 旧快照字段级兜底；sync.ts hydrate 兜底防 undefined 崩溃
- 【动画体系 globals.css】winToTaskbar/winFromTaskbar（几何 CSS 变量 --wa-dx/dy/sx/sy 由组件注入：窗口中心→任务栏按钮中心）、winShrinkOut（无按钮降级）、winGrowIn、winClose 快速缩小淡出、menuFade 菜单淡入（opacity+translateY(2px)，XP menu fade）；body class 三开关 xp-no-winanim/xp-no-menufade/xp-no-menushadow 全局禁用
- 【XPWindow 动画状态机】anim 状态 none/minimizing/gone/restoring/closing；渲染期 derived-state 检测 minimized 转换（React 官方模式，规避 lint set-state-in-effect）；effect 仅挂结束 timer；animTarget useMemo 渲染期查询 data-task-btn/data-task-grp 按钮几何；找不到按钮降级原地缩小；doClose 关闭前播动画 170ms 后真卸载；关闭按钮接线 doClose
- 【Taskbar】4 处任务按钮（水平/垂直 × 普通/分组）加 data-task-btn={id}/data-task-grp={app} 锚点标记
- 【XPSystem】visualFX 订阅 → body class 开关三连（动画全局启停真实生效）
- 【PerfOptions.tsx 新组件】XP sysdm.cpl 性能选项 1:1：四单选预设（让 Windows 选择=出厂默认指针阴影关/最佳外观=全开/最佳性能=全关/自定义）+ 8 复选清单（草稿模式，确定/应用/取消三按钮）；系统属性→高级→性能「设置(S)」从 toast 升级为真实对话框；registry perfopts 注册
- 【质量门】lint 0 错误 0 警告；tsc 新代码零错误（32 个历史遗留全为孤儿文件）；生产构建成功
- 【e2e 全链路】最小化（xp-win-min class + 几何变量注入 + 240ms 后卸载）；还原（xp-win-restore + 几何变量 + 最终可见）；关闭（xp-win-closing + 卸载）；菜单淡入 animationName=menuFade；性能选项对话框打开；「调整为最佳性能」→ body 三 class + 菜单 animationName=none + API visualFX 落库；hydrate 后开关持久化验证
- 【调试方法论沉淀】Playwright click 的 actionability 耗时会吃掉 250ms 级动画窗口期导致瞬时采样全 miss——MutationObserver 预挂 / evaluate 内 rAF 采样两种方案解决；一次「还原动画不触发」假警报实为 e2e 会话状态污染（winAnim 被上次测试关闭且 API 持久化），reset 后全过
- 【VLM 审查】性能选项对话框 98/100（「文案与简体中文版 XP SP2/SP3 完全一致」「布局逻辑严格遵循 sysdm.cpl」，建议补焦点虚线框）；动画界面 95+（「像素级还原 Bliss 壁纸/Luna 任务栏/记事本样式」）
- 截图证据：scripts/verify/d8r-{01..07}-*.png + d8-{01..13}-*.png

Stage Summary:
- XP 视觉体验最后一块拼图：窗口最小化缩向任务栏按钮（几何真实计算）、还原从按钮展开、关闭快速缩小淡出、菜单淡入——四路动画全部落地且被「性能选项→视觉效果」真实控制
- 性能选项对话框：toast 占位升级为 XP 1:1 真实属性框（四预设 + 8 复选草稿模式），三项真实联动系统动画，设置走 API 同步链持久化
- visualFX 进 SettingsDTO 白名单：加字段即全链路同步（PATCH/diff/hydrate/mock 兜底）模式再次验证有效

---
Task ID: pkg-2
Agent: 主Agent（Super Z）
Task: 第七批完成后重新打包到 download

Work Log:
- staging rsync 增量同步（--delete 防陈旧文件）：src/ public/ db/ docs/ 全量 + 7 个本批改动文件定点覆写
- 重新生成 download/WebXP-source-20260918.zip（2.9MB，559 文件）
- 校验：PerfOptions.tsx/XPWindow.tsx/globals.css 新版本在包内；源文件清单与工作区 diff 完全一致

Stage Summary:
- 交付物已更新：download/WebXP-source-20260918.zip 含第七批窗口动画体系 + 性能选项对话框全部改动

---
Task ID: R-xp-d9-cleanup+deskenv
Agent: 主 Agent (Super Z)
Task: ① 项目垃圾清理（用户点名） ② 第八批深细节：通知区域不活动图标体系 + 显示属性「桌面」页全链路

Work Log:
- 【垃圾清理 ~400MB】删除：scripts/verify(205张历史验证截图158MB)、scripts/bootsrc、scripts/xpicons 与根目录全部 PNG/旧VLM json、scripts/icons-backup-pil(旧手绘图标备份)、scripts/imggen(壁纸中间产物)、selfcheck/、tool-results/、examples/、download/ 全部历史截图、dbg_*.py 调试脚本；保留全部可复用工具脚本(vlm.mjs/api_regression.py/gen_api_docx.js/xpicons/*.py 等)。项目 2.3G→1.9G，scripts 283M→2.5M，download 48M→3.0M(仅交付物)
- 【孤儿代码清零】删除已移除功能的死代码集群：apps/Messenger.tsx、MsnChat.tsx、msn/msn-icons.tsx、qq/(4文件)、api/qq/chat —— tsc 历史遗留 32 错误归零
- 【盘点】右键菜单体系/键盘工作流/列排序/框选均已在前期批次完备，确认两大真缺口：通知区域无 « 折叠机制、显示属性桌面页为静态占位（位置下拉只读/颜色(无)/无浏览/无自定义桌面）
- 【数据层】SettingsDTO +6 字段：wallpaperPos(居中/平铺/拉伸)/bgColor/customWallpaper(+Name)/deskIcons/deskIconOverrides；store 平铺+setters；mock-db 与 sync hydrate 字段级兜底（旧快照兼容）；WallpaperPos 类型经 store 重导出
- 【fs】新增 C:\WINDOWS\Web\Wallpaper 壁纸目录（7图：bliss/azul/autumn + blue-hills/sunset/water-lilies/winter 真实像素资产）
- 【通知区域体系】XP « 折叠按钮（11×17px 灰白渐变胶囊+深蓝双箭头，展开态箭头翻转）；trayActivity 活动时间戳+touchTray 交互刷新+会话起点兜底（开机全展示，闲置45s折叠——e2e 可直接改写时间戳）；trayShow 语义：always 恒显/hide 恒隐（展开态也不出——XP 真实行为）/inactive 按活动性；« 仅在有被藏图标时出现；4s tick 重算；水平+垂直任务栏双接入；网络托盘图标（真像素 tray-network.png：单击touch/双击与右键打开网络连接/tooltip 含 100Mbps）
- 【自定义通知】本地连接项（默认总是显示）+「当前」列实时反映活动状态 + 还原默认项三键
- 【显示属性桌面页重做】位置下拉真实生效（拉伸=100% 100% 变形铺满/居中原尺寸/平铺repeat，(无)时禁用）；颜色下拉（XP 20色板 AnchoredMenu 色块菜单）；(无) 背景=bgColor 真实联动；浏览(B)... 子对话框（搜寻下拉双位置+缩略图网格+文件名+打开/取消，选图即设自定义壁纸并进背景列表）；自定义桌面(C)... 按钮接新对话框；监视器预览随位置/颜色实时变化（预览桌面图标+任务栏条）
- 【自定义桌面 DesktopItems.tsx 460行】常规页：四系统图标复选列表（草稿模式确定生效）真实联动桌面渲染+更改图标（20个真像素位图网格子对话框，Bmp 资产替换渲染）+还原默认图标；Web 页（Active Desktop 结构性还原）；桌面清理区（60天复选+现在清理桌面入口）
- 【桌面清理向导】XP 三步向导（欢迎说明→项目勾选列表（快捷方式从未打开/文件60天未改判定「未使用」默认勾选）→完成页移动清单）；执行=fsCreateFolder「未使用的桌面快捷方式」+fsMove 真实移动（XP 语义：移动而非删除）
- 【Desktop.tsx】壁纸渲染重写（位置语义+bgColor 底色+自定义壁纸优先级）；系统图标 deskIcons 过滤+deskIconOverrides Bmp 替换渲染
- 【基建】store 尾部 window.__XP_STORE__ e2e 探针；XPCheck label 可选；mock-db STATE_FILE 支持 XP_STATE_FILE 环境变量覆盖（根因：Next standalone server.js 启动时 process.chdir(__dirname)，cwd 恒为 .next/standalone，导致 JSON 库写偏位置——dev 模式不受影响）
- 【质量门】lint 0 错误 0 警告；tsc src 零错误（孤儿删除后全绿）；生产构建成功两轮
- 【e2e 32/32】开机网络+音量常驻无«；音量闲置(时间戳改写)→«出现+音量藏起；点击«展开；网络右键菜单；任务栏属性关「隐藏不活动图标」→闲置仍全显无«；自定义通知网络项+总是隐藏生效+还原默认；位置居中(no-repeat)/平铺(repeat)计算样式验证；(无)+红色 rgb(255,0,0)；浏览对话框双位置7图；Water lilies 自定义壁纸+列表自定义项；API wallpaperPos/bgColor/customWallpaper 落库；自定义桌面四项；我的电脑隐藏；更改图标网格20+替换；清理向导三步+桌面文件夹出现+API 结构化验证文件移入；终态全新会话零错误
- 【API 回归 38/38】（XP_STATE_FILE 修复后全过，此前 37/38 为 standalone cwd 陷阱的误报）
- 【VLM 审查】« 按钮风格「高度还原 Luna」+像素级自检（11px 胶囊+网络双显示器图标布局正确）；显示属性桌面页「还原度极高」；浏览子对话框 95/90（「搜寻(I): 完全符合 XP 简体中文版原文」）；更改图标 92（5×4 网格还原）；清理向导 95（「黄金三段式」）；自定义桌面 95；终态桌面 92-95
- 【调试方法论】pkill -f 模式会匹配自身 shell 命令行导致自杀（后续命令静默未执行）——用 [n]ext-server 括号技巧；Playwright text= 中文子串匹配（红色命中紫红色）——精确匹配用 text="..."
- 截图证据：scripts/verify/d9-{01..19}-*.png

Stage Summary:
- 项目空间清理：~400MB 垃圾（历史截图/旧备份/调试脚本）+ QQ/MSN 死代码集群清零（tsc 历史错误归零）
- 通知区域完整 XP 语义：« 折叠/展开、活动性判定、per-icon 三态（总是显示/总是隐藏/不活动时隐藏）、网络托盘图标真像素常驻
- 显示属性桌面页从静态占位升级为全链路：位置/颜色真实生效、浏览壁纸（虚拟 fs 双位置图片网格）、自定义桌面（图标显隐+更改图标）、桌面清理向导（标志性 60 天向导真实移动文件）
- 六个新 SettingsDTO 字段全走 API 同步链（PATCH/diff/hydrate/mock 兜底），加字段即全链路模式持续验证
- 基建修复：XP_STATE_FILE 环境变量根治 standalone chdir 陷阱（对真实部署同样有益）

---
Task ID: d10
Agent: 主 Agent (Super Z)
Task: 修复资源管理器「排列图标→类型」不生效 + 排列体系全面补全（桌面排序/按组排列/时间戳/对齐网格/radio 圆点）

Work Log:
- 【根因】类型排序比较用 `a.type ?? ''`，而驱动器与绝大多数文件夹节点无 type 字段 → 全部相等退化为按名称排序；详细信息「类型」列显示有 fallback（但 A:/D: 均显示"本地磁盘"）而排序无，两处口径不一致
- 【fs.ts】新增共享 typeOf(n)：驱动器按 icon 推导 XP 真实描述（3.5 英寸软盘/本地磁盘/CD 驱动器）、文件夹→文件夹、文件按扩展名动态关联（assocOf）兜底「文件」；排序/类型列/预览窗格/属性对话框四处统一口径
- 【排序修复】sortedItems 类型比较改用 typeOf()；排列图标菜单修正为 XP 顺序 名称(N)/大小(Z)/类型(T)/修改时间(M) + 快捷键字母
- 【静态树时间戳】ensureDatesInPlace()（djb2 确定性哈希→分钟偏移）：系统目录 2001-08 中下旬（XP RTM 前）、用户目录 2001-10 下旬；模块加载即补齐 FS，服务端旧快照在 mock-db readState 用同一函数迁移（幂等）→ 修改时间排序真实生效 + 修改日期列/属性对话框出现 XP 时代氛围日期（此前恒为 2001-10-25 10:00 占位）
- 【按组排列（XP SP2 Show in Groups）】groupBy 组件态 + groups memo 按当前排序列分组：名称→首字母、类型→typeOf、大小→XP 桶（无/微小/小/中/巨大）、修改时间→XP 桶（今天/昨天/本周/上周/一个月前/很久以前）；组头「类型: 文本文档 (2)」粗体+箭头+贯穿线（GroupHead 提升至模块级避 lint）；details/list/图标/平铺/缩略图全视图接入（contents 布局不断 flex-wrap 流），幻灯片视图除外；切排序自动重组
- 【radio 圆点】CtxItem 新增 radio?: boolean → MenuList 渲染实心圆点（XP 互斥菜单语义），应用于 Explorer 查看/排列图标、Desktop 排列图标；工具栏/锁定任务栏保持勾选 ✓（XP 真实区分）
- 【桌面排列图标】SettingsDTO 新增 desktopSort: 'none'|'name'|'size'|'type'|'modified'（走加字段即全链路模式：store spread DEFAULT_SETTINGS → PATCH 白名单/diff/hydrate 自动包含 + mock-db 旧快照兜底）；icons memo 按模式排序（系统图标与文件混排、同名做次序键、类型按 系统对象/Internet 快捷方式/typeOf）；「按网格排列」更名「对齐到网格(G)」并实现真·就近吸附（碰撞顺延）；补 修改时间(M) 项
- 【菜单交互 e2e 方法论】agent-browser find text 对带括号中文菜单项不可靠 → 纯 JS 驱动（mouseover+mousemove 合成 React mouseenter、.click() 触发 onClick）；列表容器选择器必须用 .bg-white.xp-thin-scroll（.flex-1.bg-white 首先命中地址栏！）
- 【质量门】lint 0/0；tsc src 零错误；生产构建成功
- 【e2e d10 全绿】我的电脑类型列=3.5 英寸软盘|本地磁盘|CD 驱动器|文件夹；修改日期各不相同；修改时间排序真实换序（A:,D:,C:）；按组排列组头「类型: 3.5 英寸软盘 (1)」×4；我的文档类型排序 [欢迎.txt,桌面备忘.txt,示例图片.png,录音备忘.wav]（文本文档→PNG→Wave）；组头 文件夹(3)|文本文档(2)|PNG(1)|Wave(1)；修改时间组「很久以前 (7)」；radio DOT-OK；桌面类型排序=网上冲浪指南.txt→系统对象×4→IE；对齐到网格 (500,400)/(600,430)/(420,380)→(522,384)/(606,384)/(438,384)；API desktopSort none→type 落库；终态 healthy
- 【API 回归】38/38 PASS
- 【VLM 审查】我的电脑按组视图「高（优秀）还原」（类型列值/组头/任务窗格全对）；我的文档分组+radio 圆点+菜单顺序全对「无排版错位」；对齐网格前后对比通过
- 【文档】docs/API.md SettingsDTO 与 model.ts 完全同步（补 15 个历史缺失字段 + desktopSort）
- 【打包】scripts/pkg-webxp.sh 固化（rsync staging → .env/.env.example 生成 → 接口文档双格式 → 移除开发态 JSON 库首跑自动播种 → Python zipfile 打包【非 ASCII 名带 UTF-8 标志，修掉旧包 CP437 mojibake】→ NFC 校验）；download/WebXP-source-20260919.zip（2.9MB，501 条目，抽查新代码/文档全在包内，无 scripts/skills/.next/开发态库混入）
- 截图证据：scripts/verify/d10-{01..10}-*.png

Stage Summary:
- 用户报告的「类型排序不生效」修复：typeOf 统一推导 + 四处消费点统一口径；类型列驱动器描述修正
- 排列体系补全：修改时间排序（确定性 XP 时代时间戳）、按组排列（XP SP2 标志特性）、桌面排序四模式 + 对齐到网格真吸附、菜单 radio 圆点保真
- desktopSort 走完整 API 链（第 7 个"加字段即全链路"验证案例）
- 打包流程脚本化 + zip UTF-8 文件名修复（旧包中文文件名在部分 Windows 工具下乱码）

---
Task ID: d11
Agent: 主 Agent (Super Z)
Task: 类型排序残留问题修复（rank 预分组导致视觉无变化）+ 项目垃圾清理 + 重新打包

Work Log:
- 【用户反馈追踪】d10 修复后用户仍报「排列图标→类型未生效」。实测复现：我的电脑/C:/WINDOWS 下按类型排序顺序完全不变——d10 修了 typeOf() 口径，但 sortedItems 里 rank()（驱动器0/文件夹1/文件2）预分组仍在类型比较之前生效，常见目录中类型比较被架空：
  · 我的电脑：4 项排序结果与按名称完全一致
  · C:\：boot.ini（文本文档）恒排最后（文件 rank=2）
  · C:\WINDOWS：全部文件同为「应用程序」→ 无变化
- 【修复】Explorer sortedItems：sortCol==='type' 分支提前返回，做纯类型描述字符串比较（typeOf().localeCompare(zh) + 名称次序键），不再走 rank 预分组——XP 真实行为（英文 XP「File Folder」按字母混排、中文 XP 拼音序「文本文档(wenben)」先于「文件夹(wenjian)」）；同时回收站「类型」列实为「原位置」→ 该分支改按 _origKey 排序，与分组/列显示口径统一；名称/大小/时间排序保留 rank 预分组（XP 我的电脑驱动器置顶习惯）
- 【实测效果】C:\ 按类型：boot.ini → Documents and Settings → Program Files → WINDOWS（此前 boot.ini 恒最后）；我的文档：欢迎.txt/桌面备忘.txt → 图片收藏/My Music/My Videos → 示例图片.png → 录音备忘.wav（类型混排，拼音序）；我的电脑：A: → C: → 共享文档 → D:（文件夹与驱动器按类型串交错）；详细信息列头升/降箭头切换正常；回收站原位置列排序正常；单选圆点回显正常
- 【e2e 方法论】agent-browser 合成 mouseenter 不触发 React onMouseEnter（ submenu 不展开）→ 必须 mouse move 真实坐标；菜单项点击需先 move 到安全中间点再逐步移入，避免跨越其他菜单项导致 hover 丢失；Delete 键需先真实 click 选中 + eval 聚焦 [tabindex=0] 根节点
- 【VLM 误报排除】VLM 两轮报告「修改日期列乱码」→ DOM 文本干净（2001-10-26 19:06 等），LANCZOS 4x 放大涂抹抗锯齿小字所致误判；最近邻 5x 放大复核：全部日期清晰完整「无重叠无乱码」
- 【质量门】lint 通过；tsc src 零错误（仅环境 skills/ 预存报错，非项目代码）；生产构建成功；页面 0 错误
- 【垃圾清理（指令 #10）】删除 scripts/verify/（36 张 d9/d10 验收截图）、.zscripts/shot-*.png（6 张今日调试截图）、crop-datecol*.py、dev.log、tsconfig.tsbuildinfo；保留 e2e 模板脚本/打包脚本/图标工具（后续任务复用）；项目空间清爽（.zscripts 剔除 staging 后 56K）
- 【重建】README-LOCAL.md（此前遗失，打包校验必需）：快速开始/standalone XP_STATE_FILE 注意事项/环境变量表/目录速览
- 【打包】download/WebXP-source-20260919.zip 刷新（2.83MB，501 条目）——含本轮类型排序修复；校验：修复代码在包内、无 scripts/skills/开发态库混入

Stage Summary:
- 「类型排序未生效」根因彻底解决：d10 修口径 + d11 修 rank 预分组，两轮叠加后与中文 XP 行为一致（纯类型串排序、文件夹不强制置顶）
- 回收站「原位置」列排序语义对齐（_origKey）
- 项目垃圾清理完成，README-LOCAL.md 重建，包已刷新

---
Task ID: d12
Agent: 主 Agent (Super Z)
Task: 纸牌「选定纸牌背面」对话框（XP cards.dll 十二款牌背 + 全局设置链）

Work Log:
- 【盘点】系统性核查深细节缺口：任务栏右键菜单/经典开始菜单切换/格式化对话框/驱动器工具页/文件夹选项四页/辅助工具四件套/扫雷英雄榜 均已存在；真实缺口 = 纸牌「选定纸牌背面」（XP 游戏菜单经典项）
- 【牌背美术】Solitaire.tsx 新增 CardBackArt：cards.dll 十二款 SVG 复刻（经典红/经典蓝/宇航/海滩/城堡/热带鱼/玫瑰/月夜/沙漠/赛车/鹦鹉/方片），backFrame 统一 71×96 viewBox + 白边框 + preserveAspectRatio=none（任意尺寸拉伸：纸牌 71×96 / Hearts 28×40 共用）
- 【渲染改造】SolCardView 背面分支渲染 CardBackArt（store 订阅实时切换）；Hearts 三家牌背同步接入（cards.dll 全局牌背语义——XP 中改牌背 Hearts 跟随）；删除 globals.css 孤儿规则 .sol-card-back
- 【对话框】DeckOptions（app: deckopts 428×344 不可缩放）：4×3 网格十二款、单击选中蓝框、双击=确定（XP 行为）、确定/取消按钮；游戏菜单新增「选定纸牌背面(B)...」（发牌/撤销/重发之后）
- 【设置链·第 8 个"加字段即全链路"案例】model.ts SettingsDTO+DEFAULT（solitaireBack: 1 经典蓝）→ store 类型+setSolitaireBack+APP 注册 → registry 组件映射 → mock-db 旧快照兜底 → PATCH 白名单/diff/hydrate 自动（SETTING_KEYS=Object.keys(DEFAULT_SETTINGS) 泛型驱动）→ docs/API.md 字段表
- 【质量门】lint 通过；tsc src 零错误；生产构建成功；页面 0 错误
- 【e2e】对话框 12 款渲染+选中蓝框 ✓；选玫瑰→确定→纸牌 22 张牌背实时变玫瑰 ✓；Hearts 打开后 39 张牌背联动玫瑰 ✓；PATCH 落库 solitaireBack=6 ✓（中途误选热带鱼=5/鹦鹉=10 也均正确落库——三级验证）；reload→登录→重开纸牌 仍玫瑰（hydrate 持久化）✓；API 回归 38/38 PASS
- 【VLM】对话框审查：12 款 4×3 网格+蓝色选中框+图案可辨（斜纹/宇航/海滩/城堡/鱼/玫瑰/月夜/赛车/鹦鹉）无缺陷；游戏内审查：深绿玫瑰牌背+牌面红黑花色正常无缺陷
- 截图证据：.zscripts/shot-sol-default.png / shot-deckopts.png / shot-sol-rose-final.png / shot-sol-after-reload.png（打包前清理）

Stage Summary:
- 纸牌/红心大战共用牌背系统上线：12 款 XP 风格牌背、对话框选择、全局联动、API 持久化全链路闭环
- solitaireBack 成为第 8 个"加字段即全链路"设置项，验证了泛型设置链的持续可扩展性

---
Task ID: d13
Agent: 主 Agent (Super Z)
Task: ① 项目垃圾清理（用户点名清单） ② Windows 经典样式主题（显示属性缺失的标志性大项）

Work Log:
- 【垃圾清理（用户指令）】删除：upload/（用户粘贴图 667K，目录为挂载点仅清空内容）、tests/（脚手架遗留 3 个 sh）、tool-results/、scripts/（40+ 开发脚本 488K）、download/WebXP-source-20260918.zip + 20260919.zip、.zscripts/webxp-pkg/ staging（5.5M 全量副本）；打包脚本保留至 .zscripts/pkg-webxp.sh（隐藏基建，履行「每次完成后打包」约定）；download/ 仅余 API 文档双格式 + README（56K）
- 【盘点】系统性核查：任务栏右键菜单/桌面图标菜单/窗口系统菜单/任务栏分组/开始菜单级联 均已在前批完成；发现真缺口 = 显示属性「外观→窗口和按钮」仅有 Luna 三主题，Windows 经典样式（XP 标志性选项）缺失
- 【经典主题 CSS】globals.css 新增 .xp-root[data-theme='classic']：26 个主题变量改经典配色（任务栏/托盘 #d4d0c8、标题栏 90deg 横向渐变 #0a246a→#a6caf0、菜单高亮纯深蓝）+ 约 40 条结构覆盖（开始按钮矩形 3D 凸起黑字非斜体 Tahoma、任务/标题栏按钮凸起-按下凹陷双态、标题栏直角压扁 25px 与窗口体 top:25px 严丝合缝、关闭钮去红、对话框底色经 .bg-[#ece9d8] 类选择器一次性覆盖 44 个组件、选项卡渐变/开始菜单蓝边框/分隔带 → 灰、滚动条经典灰 3D）
- 【类型链】model.ts ThemeKey + 'classic'（第 9 个「加字段即全链路」案例——SETTIN_KEYS 泛型驱动，PATCH/diff/hydrate/API 文档自动同步；docs/API.md theme 字段更新）
- 【显示属性改造】主题页：静态 div → 真实下拉（Windows XP / Windows 经典）；外观页：列表框 → XP 真实三下拉（窗口和按钮 W / 色彩方案 C 联动——经典样式时显示「Windows 标准」/ 字体大小 F），均实时预览；ThemePreview 双色适配（标题栏白字 vs 任务栏黑字分立判定）
- 【质量门】lint 0/0；tsc src 零错误（仅环境 skills/ 预存）；生产构建成功
- 【e2e 22/22】data-theme=classic；任务栏 rgb(212,208,200)；开始按钮直角/黑字/非斜体；记事本标题栏 90deg 深蓝渐变+直角；窗口体灰底；标题栏按钮直角灰底（无红色关闭）；任务按钮直角；开始菜单头部灰+用户名黑字；外观页下拉切换生效+色彩方案联动 Windows 标准；reload 后 classic 持久（API hydrate）；窗口和按钮切回 XP 样式→默认蓝+Luna 渐变恢复；控制台 0 错误
- 【API 冒烟】GET settings theme 落库正确；PATCH classic→GET classic→PATCH blue applied=['theme'] 全链通过
- 【VLM 审查】经典全桌面（我的电脑+记事本）92/100「质量极高…完美唤起 Win2000/XP 经典界面记忆」；开始菜单 95（头部灰底黑字/双栏 3D 边框/页脚可读）；显示属性外观页 95（三下拉值正确/预览反映经典主题）
- 【e2e 方法论】agent-browser eval 返回 JSON 编码字符串 → python json.loads 解码后比对；色彩方案下拉在经典样式下仅含「Windows 标准」——切回 XP 样式必须走「窗口和按钮」下拉（与真实 XP 交互一致，非 bug）
- 截图证据：.zscripts/shot-classic-{full,notepad,startmenu,displayprops,after-reload}.png（打包前清理）

Stage Summary:
- 项目目录清爽化：用户点名垃圾全清（约 7MB + 5.5M staging），打包脚本隐藏化保留
- Windows 经典样式主题上线：CSS 变量 + 结构覆盖体系，全系统（任务栏/开始按钮/标题栏/窗口按钮/菜单/对话框/滚动条/开始菜单）一键切灰 3D，走完整 API 持久化链
- 显示属性主题/外观两页升级为 XP 真实交互（联动下拉 + 实时预览）
---
Task ID: d14
Agent: 主 Agent (Super Z)
Task: 经典样式「色彩方案」补全（真实 XP 全量 22 方案：Windows 经典 + 高对比度×4 + 16 彩色系）

Work Log:
- 【数据考证】web-search 定位权威数据源 gist.github.com/zaxbux/windows-colors.json（.NET SystemColors 实测，含 XP 全部 26 经典方案）→ 下载并导出 22 方案关键色值（ActiveCaption/Gradient/Control 系/Menu 系/Highlight/Window/Desktop）；交叉验证 Win7 Classic 条目 + winclassic.net 投票帖确认口径：Windows 标准=Win2000 观感(#0a246a→#a6caf0+#d4d0c8)、Windows 经典=Win95/98 观感(#000080→#1084d0+#c0c0c0)——用户记忆的「灰标题栏」实为银灰铬件整体观感，按真实数据实现
- 【数据同源生成】.zscripts/gen-classic-schemes.py 一份 JSON 源生成两份产物（杜绝转写漂移）：① src/components/xp/classic-schemes.ts（ClassicSchemeKey 22 键 + 调色板 18 字段/方案 + CLASSIC_SCHEME_ORDER 真实 XP 下拉序：两 Windows 置顶+英文序）② globals.css 21 个 [data-scheme] 覆盖块（派生值：hover=face+30%白/on=+47%白/shade=-21%黑）
- 【CSS 体系重构】globals.css 经典区（260→2010 行）：--cls-* 方案变量 18 个（face/hi/shadow/dkdk/fg/gray/menu/menu-fg/menuhi/menuhi-fg/window/window-fg/cap 渐变×2/cap-fg/desktop/hover/on/shade/track）+ Luna 变量→cls 变量全映射 + 约 45 条结构规则硬编码色全部改 var（开始按钮/任务按钮/标题栏按钮/按钮/托盘/开始菜单/对话框/滚动条/菜单）；修复 d13 遗留保真缺口：经典模式菜单从 Luna 白底→方案 Menu 色（标准=#d4d0c8 灰底）、菜单文字/禁用项/分隔线/资源管理器工具栏蓝字全部方案化
- 【高对比度落地】HC 四方案真实配色（HC1 黑底黄字/HC2 黑底绿字青标题/HC黑 全黑紫标题/HC白 全白黑标题反色）：.bg-white 客户区→Window 色（HC 黑/白、Marine #c8e0d8、Plum #d8d0c8 有色窗口一并还原）+ [data-scheme^='hc'] 客户区文字→WindowText + hcwhite 非活动标题白底黑字特判
- 【设置链·第 10 个"加字段即全链路"案例】classicScheme: ClassicSchemeKey——model.ts DTO+DEFAULT('standard') → store 字段+setClassicScheme（XP 语义：切方案联动 bgColor=方案 Desktop 色）→ SETTING_KEYS 泛型驱动 PATCH/diff/hydrate 自动 → mock-db 旧快照兜底 → docs/API.md 字段表
- 【XPSystem】data-scheme 属性仅 theme=classic 时渲染（XP 样式下移除，Luna 变量不受影响）
- 【显示属性】外观页色彩方案下拉：经典样式→22 方案全量（选中实时预览+桌面页 bgColor 草稿同步防"确定回滚"）；主题页切「Windows 经典」→方案重置 standard（XP 主题应用语义）；ThemePreview 双色判定重构（capText/fg 实测值驱动，HC2 青底黑字标题栏正确）；外观页预览桌面底色随方案 Desktop 色
- 【质量门】lint 0/0；tsc src 零错误（skills/ 环境预存）；生产构建成功
- 【e2e 34/34】22 选项下拉+首末项；Windows 经典：任务栏 rgb(192,192,200)+标题栏渐变 rgb(0,0,128)→rgb(16,132,208)+窗口体银灰+bgColor #3a6ea5；hcblack：任务栏/开始按钮/菜单全黑+白字+bgColor #000000；eggplant：任务栏 rgb(144,176,168)+渐变 #588078→#834b83+bgColor #400040；API GET 落库；reload 持久化（eggplant hydrate 回放）；PATCH teal applied=['classicScheme']+GET 落库；主题页重置语义 teal→standard；切回 XP 样式 data-scheme 移除+Luna 渐变恢复；页面 0 错误；补充：standard 菜单灰底 rgb(212,208,200)+marine 客户区 rgb(200,224,216)
- 【VLM 审查】Windows 经典 95/100（「高度相似…纯正 Win98/经典 XP 怀旧氛围」）；高对比度黑 95/100（无障碍效果优秀，无文字不可见）；茄子色 95/100（「塑料质感复古 UI 气质完美还原」）
- 【API 文档滞后修复】发现打包链隐患：pkg 脚本从 download/ 复制文档进包，而 download/ 双格式文档停留在 09-18 版（缺 desktopSort/solitaireBack/classicScheme，且 §8 仍含 d11 已删除的 /api/qq/chat、§9 引用已清理的 scripts/api_regression.py）——docs/API.md 修正两处 + 全量重生成 docx（.zscripts/gen-api-docx.cjs：模板跟随原交付物版式，表格四件套/代码块等宽灰底/postcheck 0 错误，LibreOffice 转 PDF 10 页 VLM 目检 95×2）；download/ 双格式同步刷新后重打包
- 【工具重建】scripts/ 上轮清理误伤的 vlm.mjs（createVision 正确姿势）+ e2e-d14-schemes.sh 沉淀至 .zscripts/
- 截图证据：.zscripts/shot-d14-{classic98,hcblack,eggplant}.png（打包前清理）

Stage Summary:
- 经典样式色彩方案从 1 种（Windows 标准）补全到真实 XP 全量 22 种：Windows 标准/经典（两代经典观感）+ 16 彩色系（砖红/沙漠/茄子/淡紫/枫叶/海洋/李子/南瓜/雨天/红白蓝/玫瑰/石板/云杉/风暴/蓝绿/麦）+ 4 高对比度（#1/#2/黑/白）
- 全链路数据同源（JSON→TS 表+CSS 块脚本生成）；切方案联动桌面背景色（XP 真实语义）；高对比度方案对窗口客户区/菜单/铬件全面生效
- classicScheme 成为第 10 个"加字段即全链路"设置项，泛型设置链第 10 次验证
---
Task ID: d15
Agent: 主 Agent (Super Z)
Task: 系统性盘点后的三大感知缺口补全：真实 XP 音效采样 / 画图 XP 全量 16 工具 / 三维文字+三维管道屏保 + Cmd/菜单快修

Work Log:
- 【缺口盘点】Explore 子代理 14 项系统核查：声音（合成非采样△）、启动关机✓、任务管理器五页✓、记事本写字板✓、Cmd（缺 11 命令△）、窗口贴边（XP 无 Snap 不做=保真）、AltTab✓、辅助工具（应用有但开始菜单入口断△）、控制面板双视图✓、打印机✓、气泡通知△、回收站拖放✓、屏保（仅 2 种△）、画图（16 工具缺 5△）→ 按感知度排序选定本轮四大项
- 【真实音效】GitHub 考证两个仓库：wonordel/Windows-XP-Sound-Theme-KDE（21 个真实 XP 采样，时长与原版逐一吻合：shutdown 3.27s/login 2.22s/logout 2.09s/error 1.0s…唯 startup 是 0.05s 坏占位）+ jamstop/claude-code-nostalgia-sounds（winxp_startup.mp3 4.94s 真开机音）；下载 → ffmpeg 96k mp3/原样 wav 混合（大文件压缩小文件保真解码零延迟）→ public/media/snd/ 16 个采样 592KB，全部 ffprobe 校验时长
- 【sounds.ts 双层架构重写】采样层（fetch+decodeAudioData+Map 缓存+inflight 去重）优先、原 Web Audio 合成体降级保留；unlockAudio 预取开机两件套 + 欢迎屏挂载预取开机音（登录零网络延迟）；新增 playLogon/playCritical/playExclamation/playBalloon/playRecycle/playHwInsert/playHwRemove/playPopupBlocked/playPrintDone/playTada/playChord
- 【事件接线·XP 真实语义】DialogBox：error→严重停止(SystemHand)/warn→感叹(SystemExclamation)/confirm+info→叮声(SystemAsterisk)；清空回收站（Desktop+Explorer 三处）→playRecycle；打印测试页完成→playPrintDone；声音属性 SND_EVENTS 扩到 25 行真实事件全集（登录 Windows/异常停止/感叹声/清空回收站/打印完成/弹出窗口已阻止/任务已完成等全部映射真实采样，▶ 可播）
- 【画图 16 工具全集】Paint.tsx 全量重写（873→1646 行）：工具箱按 XP 真实 2×8 顺序排列，新增 文字（拖框/单击默认框+textarea 同步缩放+文字工具栏字体/字号/B/I/U+透明/不透明背景+Esc 提交）、曲线（直线→两段贝塞尔弯曲状态机）、多边形（拖边→单击顶点→双击/右键/近起点闭合）、任意形状裁剪（套索 Path2D 掩膜选区+掩膜擦除+DOMMatrix 平移跟随）、放大镜（1x-8x 点击放大/右键缩小/pixelated 像素风/4x+ 像素网格/滚动居中）；形状三填充模式（前景/背景/仅边框）+选择透明模式（背景色像素 alpha 挖空）作用于矩形/椭圆/圆角矩形/多边形；查看菜单（缩放/文字工具栏）；Esc 级联收尾（文字→曲线→多边形→选区）
- 【屏保 +2】SaverKey 扩 'pipes'|'text3d'（第 11 个全链路字段口径，docs/API.md 同步）：三维管道（13³ 网格随机游走+六色管道+卡死重生+420 段上限老化退场+偏航/俯仰环绕相机+画家算法+高光线金属感）；三维文字（离屏 Arial→体素化 623 块→前后层挤出+侧壁三色面片+旋转投影；自适应字号防溢出+减速旋转防 edge-on 不可读窗）；显示属性下拉 XP 真实顺序（无/三维管道/三维文字/变幻线/星空）+迷你预览（SVG 管道/3D XP 字样）+新增「预览(V)」按钮（xp-saver-preview 事件强制全屏启动，XP 真实控件）
- 【快修】Cmd 补 11 命令：md/mkdir、rd/rmdir（空目录限制）、ren/rename、move、attrib、tasklist（窗口→真实进程表：exe 名映射+PID+内存）、taskkill（/IM /PID 真实关窗）、set（25 个 XP 经典环境变量+局部会话）、title（setWindowTitle 真改标题）、color（16 色 cmd 前景/背景）、prompt（$P$G 等代码）；Tab 补全列表与实现完全同步（修 d11 遗留不一致：移除 chkdsk、补全 md/rd/ren/tasklist 等）；help 重排 30 行
- 【预存 bug 修复】font-mono 全站失效：@theme --font-mono 引用未挂载的 --font-geist-mono 变量 + .xp-root * Tahoma 规则同特异性后声明覆盖 → 双修（@theme 字面等宽栈 + .xp-root .font-mono 0,2,0 特异性覆盖）；Cmd 控制台自此真正等宽（tasklist 表格对齐的前提）
- 【质量门】lint 0/0；tsc src 零错误；生产构建成功；页面 0 错误
- 【e2e 32/32】16 采样 HTTP 200；声音属性选「登录 Windows」→下拉「Windows XP 登录.wav」+▶播放零报错；画图 16 工具格+五种新工具逐一实测（文字输入→提交像素 137+/曲线三段 650/多边形 1400/放大镜 920px+pixelated/三填充模式按钮）；屏保下拉 5 项+管道全屏挂载；Cmd tasklist 表头+cmd.exe 行+md→dir 可见+set USERNAME+color 0a 黑底 #40ff40+title 真改+Tab 补全 taskkill；开始菜单 hover 链路（开始→所有程序(A)→附件→辅助工具 出现）；桌面文件夹右键含 搜索(E)/共享和安全(H)；0 控制台错误
- 【VLM 审查】三维管道 95/100（六色圆柱+高光+90°弯折+画家算法正确，「完美捕捉怀旧氛围」）；三维文字 95/100（"Windows XP" 可辨+蓝色体素挤出+构图充满宽度；两轮修复：自适应字号防裁字+减速旋转+黄金角度）；画图 98/100（16 格工具箱+文字工具栏+调色板「几乎是完美的」）；Cmd 高分（等宽对齐+title 生效+Luna 边框）；声音属性 90+（事件树+方案下拉+文案专业级准确）
- 【e2e 方法论沉淀】React 合成事件时序：同一 eval 内 click 工具按钮后立即 dispatch 画布事件，handler 闭包仍是旧 tool（setState 未提交）→ 必须 click 与 dispatch 拆 eval + sleep；agent-browser 无 `move` 命令（正确为 `mouse move x y`，错误调用被 2>/dev/null 吞掉极难察觉）；截图路径必须绝对路径（相对路径静默落 ~/.agent-browser/tmp）；屏保截图避开 edge-on 相位
- 截图证据：.zscripts/shot-d15-*.png（打包前已清理）

Stage Summary:
- 听觉签名上线：16 个真实 XP 采样（开机 4.94s 管弦乐/关机/登录注销/严重停止/叮声/气球/硬件插拔/回收/打印/欢呼/和弦）双层播放架构，系统事件全面真实发声
- 画图从 11 工具到 XP 全量 16 工具：文字/曲线/多边形/套索裁剪/放大镜 + 形状三填充模式 + 选择透明模式 + 文字工具栏 + 像素网格
- 屏保从 2 种到 4 种：三维管道（网格游走+金属高光）+ 三维文字（体素挤出旋转）+ 预览按钮真实全屏启动
- Cmd 从 20 到 31 命令（tasklist/taskkill 真实映射窗口系统）+ Tab 补全一致性修复 + 控制台等宽字体预存 bug 根治
- 开始菜单附件→辅助工具入口链修复；桌面文件夹右键补 搜索/共享和安全
---
Task ID: d16
Agent: 主 Agent (Super Z)
Task: 真实 XP 图标批量替换（克隆 GitHub 图标仓库 → 替换 PIL 手绘系统图标）

Work Log:
- 【用户新常态指令】每次任务完成后必须清理 download/ 中的截图（本轮起执行并记入常态要求）
- 【选源考证】web-search + GitHub API 双轮筛选：PonyRoleplayer/WinXP-icon-theme 实测为 Win98 SE 风格（SE98）弃用（克隆 619M 后即删）；选定 B00merang-Artwork/Windows-XP（YlmfOS 经典主题 remake = 真实 XP 提取画风，GPL-2.0，16/22/24/48/128px + scalable 全档）浅克隆 21M 至 reference/b00merang-xp（.gitignore 已含 /reference/）
- 【三轮 VLM 对比评审】接触表逐图标裁决：第一轮 20 图标（B00merang 17/20 胜出，全维度材质/光影/色彩碾压 PIL；例外：网上邻居 GNOME 风、信息/警告框偏 Vista）；第二轮 4 候选/行（争议图标全部选出最优：gnome-dev-network/stock_dialog-×3/drive-cdrom/gtk-harddisk/user-info/preferences-system/audio-volume-medium）；第三轮 14 项（电源+文件类型+旗帜：winflag→distributor-logo、power-restart→gnome-reboot、power-standby→gpm-suspend、switchuser→gnome-session-switch、audiofile/videofile→x-generic 胜出；search/help/power-off/logoff/txt/image/zip/font 九项 KEEP PIL——PIL 复刻本就贴近 XP 原版）
- 【替换工程】.zscripts/apply-real-icons.py：26 名 × 48/32 桶（128 源 LANCZOS 直降 / 48 源 32 再降）+ 16 桶 10 名（仅原生 16px 像素画：folder 系列/mydocs/user-trash/network/tray-volume/audio/video）+ winflag 特例（16 桶渲染 20×20，开始按钮 1:1 零缩放）；原 PIL 全量备份 .zscripts/pil-icons-backup/（可整目录回滚）；尺寸校验全部通过（winflag16=20×20 预期特例）
- 【混合策略定型】48/32 桶系统图标走真实 XP 素材；16 桶仅在有原生像素画时替换（ Explorer 树/地址栏/开始菜单左栏清晰度优先）；应用类图标（记事本/画图/游戏等）无真实源全档保留 PIL——XP 应用图标在 B00merang/Linux 主题中不存在
- 【GPL 合规】docs/ICON-CREDITS.md（来源/许可证/替换清单/回滚说明）+ docs/ICON-LICENSE-GPL2.txt（许可证全文）+ README-LOCAL.md 素材致谢节
- 【质量门】lint 0/0；tsc src 零错误（skills/ 环境预存）；生产构建成功
- 【e2e 12/12】63 个替换图标三桶 HTTP 200 全量；桌面 5+1 图标 IMG 渲染；Explorer 树 16px/地址栏 14px/平铺 32px 多桶并用；开始按钮旗帜 = 16/winflag @20×20；开始菜单头像 48 桶；控制面板/关机对话框/注销对话框/错误对话框新图标全部到位（dlg-error 正文 32 新图 + 标题栏 16 并存）；0 控制台错误
- 【VLM 审查】桌面图标实际渲染尺寸 95/100（「清晰度优秀/真实度极高/几乎无瑕疵」——4× 放大下的「软」系抗锯齿固有特征，真实 XP 48px 图标本就是 32bit 抗锯齿位图，11/11 真实性胜出）；开始按钮旗帜四色波浪正确（初报「黑色圆形遮挡」实为 e2e 鼠标指针残留，排除）；我的电脑 92 级（共享文档手形叠加为已知预留项）；关机对话框 92/100；回收站 A-；开始菜单 88+（「经典控制面板图标是亮点」）
- 【方法论沉淀】全屏截图 VLM 审查会把小图标判「糊」（1280×800 下 48px 图标 + VLM 内部缩放）——必须做实际渲染尺寸 2× 裁切复核才能定论；agent-browser 点击后鼠标指针会残留在截图上，勿误判为 UI 缺陷
- 截图证据：.zscripts/shot-d16-*.png + icon-compare{,2,3}.png（评审依据，.zscripts 不入包）

Stage Summary:
- 图标体系换代：26 个系统图标 × 48/32 桶 + 10 个 16 桶 + 开始按钮旗帜，全部换为真实 XP 提取素材（YlmfOS/B00merang 渠道，GPL-2.0 合规署名）
- 桌面/资源管理器/开始菜单/三个系统对话框视觉真实性大幅提升；三轮 VLM 对比评审 + 实际尺寸复核双重把关
- PIL 原稿全量备份可回滚；应用类图标保留 PIL（无真实源）
---
Task ID: d17
Agent: 主 Agent (Super Z)
Task: ① 经典+高对比度全局巡检（新图标灰阶观感） ② 共享文档手形图标等缺口 ③ 桌面网格 XP 行为复核

Work Log:
- 【①巡检】经典 standard/高对比度黑/茄子 三主题 e2e 截图 + VLM 审查：经典桌面「博物馆级还原」（Luna 彩色图标+灰铬件时代混搭感=XP 经典灵魂）；经典 Explorer 95/100（平铺双行文字+手形徽章清晰可见+经典侧栏浅蓝正确）；经典开始菜单高分；HC 黑修复后 95/100（白字黑底高对比达标）；茄子 85/100
- 【①修复·HC 去壁纸】VLM 抓到真实缺陷：HC 方案+Bliss 亮壁纸=白字不可读（真实 XP 中 HC 主题自动去壁纸）→ 双端修复：客户端 setClassicScheme（hc* → wallpaper none-blue）+ 服务端 PATCH settings 镜像「主题应用语义」（classicScheme → bgColor=方案 Desktop 色 + hc 去壁纸，applied 列表补 bgColor/wallpaper）
- 【②共享文档】B00merang gnome-fs-share 实为符号链接→folder-remote-ftp（非手形）；图片搜索仅得现代插画 → PIL 复刻路线：手形剪影（掌+四指+拇指）MaxFilter 膨胀均匀描边 + 指缝细线 + 左上光照，合成到 B00merang 真实文件夹（48/32 桶 LANCZOS）；16px 像素级直绘（3 指横条+硬边）；三轮 VLM 迭代（比例 72%→62%、去指缝黑团、降饱和、上移避让金属条）→ ACCEPT 92/100；fs.ts 共享文档×2 节点 icon:'shared'（FSNode 类型扩 video/shared）+ Explorer map 显式 shared 键（map[n.icon] 查找不走 folder 分支的坑）+ Desktop folder 分支；图标生成器沉淀 .zscripts/gen-shared-folder3.py
- 【③网格复核】已有：setDesktopSort 排序即清 desktopPos（物理重排 ✓）、setAutoArrange 开启清位置 ✓、拖放 findFreeCell 网格吸附 ✓；本轮补齐三缺口：
  - Vista 残留「查看(V)→大图标/中等图标」菜单移除（XP 桌面右键无此菜单）；图标大小改走 XP 正道：显示属性→外观页「使用大图标(U)」功能化复选框（原假 radio+toast 删除；新增 XPCheckbox 组件 13×13 白底蓝勾）
  - iconSize 默认 48→32（XP 出厂默认小图标；cellW 自适应 75(小)/84(大)；网格起始 y 16→12）
  - 「对齐到网格」从一次性动作改为持久开关（alignGrid: boolean 默认 true——第 11 个「加字段即全链路」：model DTO+DEFAULT → store → SETTING_KEYS 泛型 PATCH/diff/hydrate → mock-db 旧快照兜底 → docs/API.md）；关闭后拖放自由落点（跟随鼠标不吸附）、开启后立即吸附现有图标
- 【③附带修复·视图错位】验证共享文档 48px 时发现 Explorer「图标/平铺」两视图布局互换错位（平铺=32px 横排单行、图标=44px 竖排）→ 修正为 XP 真实规格：平铺=44px 大图标+名称+类型双行文字（w150 横条）、图标=32px 竖排网格（w76）——影响所有文件夹的视图保真度
- 【质量门】lint 0/0；tsc src 零错误；生产构建成功
- 【e2e 19/19】alignGrid GET 兜底+PATCH 落库；使用大图标复选框往返 32↔48；桌面右键无「查看」+子菜单含对齐到网格/自动排列；对齐关闭拖放自由落点(521,295=鼠标-图标半宽)/开启吸附(x=18+n·cellW)；排列名称清手动位置；共享文档 48(平铺默认)/32(图标)/16(列表) 三桶全渲染；folder-shared HTTP 200；经典 standard/hcblack/eggplant 主题切换与恢复；HC 自动去壁纸；0 控制台错误
- 【方法论】agent-browser eval 对 let/中文路径敏感 → var+function 稳妥；React onMouseEnter 需派发 mouseover/mouseout 对；fsTree 是根对象非数组（先 .children）；改 fs.ts 静态树后必须重置 db/xp-state.json 才见新树（运行时持久化优先）；服务端 API 直改设置时「主题应用语义」需双端镜像（store action + route PATCH）
- 截图证据：.zscripts/shot-d17-{classic-desktop,classic-explorer,classic-startmenu,hcblack-desktop,hcblack-explorer,eggplant-desktop,blue-tiles}.png（打包前清理）

Stage Summary:
- 新图标三主题巡检通过：经典灰铬件/HC 纯黑/茄子紫下 Luna 图标观感正确；HC 去壁纸真实 XP 行为补齐（双端）
- 共享文档手形图标上线（XP shell32 风格，三桶全尺寸，三轮 VLM 迭代 92 分）
- 桌面网格行为对齐 XP：默认 32px 小图标+75px 网格、大图标走显示属性「效果」、对齐到网格持久开关（第 11 个全链路设置字段）、Vista 残留菜单清除
- 意外收获：Explorer 平铺/图标视图规格互换错位修复（平铺=44px 双行文字、图标=32px 网格——全系统视图保真度提升）

---
Task ID: d18
Agent: 主 Agent (Super Z)
Task: ① 任务窗格对照 XP 精修（含经典主题全面适配）② 任务栏工具栏行为复核（快速启动自定义/显示标题/段落菜单）③ 帮助和支持中心巡检重建 ｜ 插单：IE 图标回退 PIL

Work Log:
- 【插单·IE 图标回退（用户指令）】d16 把 ie.png 32/48 桶换成了 B00merang 版，用户要求回退：48 桶用附件（upload/pasted_image，md5 与 PIL 备份一致）→ public/icons/32/ie.png=备份 PIL、48/ie.png=附件、16 桶本就未动；docs/ICON-CREDITS.md 移出 ie（26→25 项）+ 回退注记；apply-real-icons.py 注释 ie 防重跑再换；VLM 实际渲染复核=「蓝 e 金环」PIL 风格 ✓
- 【①任务窗格】四轮参考取证（image-search 三轮 + WS2003 方向一轮，19 张候选全数 VLM 筛选：多为 Win10/11/Aero/实拍误命中）→ 最终以 w3b-0（真实 WS2003 经典 webview 截图）实证经典任务窗格=白底/灰边/黑标题/纯蓝链接/黑三角箭头：
  - TaskPanel 组件（模块级，后抽至 ui.tsx 共享）：标题行整行可点折叠 + 右侧小箭头钮（Luna=渐变蓝底白箭头、经典=face 3D 方块黑箭头）；aria-expanded 无障碍
  - 上下文化第一面板（XP 真实语义）：我的电脑=系统任务（查看系统信息/添加删除程序/更改一个设置）/普通文件夹=文件和文件夹任务（无选中：创建新文件夹/共享/发布 Web；选中：重命名/复制/删除/移动——真实调 doCopy/doCut/deleteSelected）/图片收藏=图片任务（幻灯片→imgviewer/打印/联机订购）/My Music=音乐任务（全部播放/联机购买）/回收站/压缩文件夹保留
  - 「其他位置」XP 真实集合：根=网上邻居/我的文档/共享文档/控制面板；文件夹=我的文档/共享文档/我的电脑/网上邻居（回收站移除——XP 无此项）
  - 「详细信息」升级：48px 大图标+名称+类型+大小+修改日期；无选中=当前文件夹摘要（对象=直接子项数，修正 countStats 递归误用）+修改日期
  - CSS：.xp-taskpanel/.xp-taskpanel-head/.xp-taskpanel-chev/.xp-taskpane-meta 新类族 + 经典覆盖（面板=--cls-window 白底/灰边/直角、标题=--cls-fg、链接=#0000e0 纯蓝、chev=face 3D）+ HC 覆盖（面板边框/标题/链接=window-fg，链接常下划线）；--luna-sidebar 经典值 face→window（白）
- 【②任务栏工具栏】
  - 快速启动文件夹化（XP 真实路径 C:\...\Application Data\Microsoft\Internet Explorer\Quick Launch，隐藏目录）：fs.ts 建目录+3 快捷方式（IE.lnk/显示桌面.scf/WMP.lnk）+QUICK_LAUNCH_PATH/LINKS_PATH 导出；Taskbar 快速启动区改由文件夹渲染（fileEntryFor：appId→APP_REGISTRY 直达应用，修复 .lnk 落记事本旧缺口；显示桌面.scf→ShowDesktopIcon+toggle）；支持 Explorer 拖入（onDrop→fsMove 同 DND MIME 通路）→ 拖文件进任务栏即自定义（e2e 实测 3→4 按钮）
  - 段落右键菜单（XP 真实三件套）：打开文件夹(O)/显示标题(T)/关闭工具栏(C)——快速启动/桌面/链接/自定义四类工具栏×水平垂直两版全覆盖；打开文件夹→explorer 真实导航
  - tbTitles: Record<string,boolean>（第 12 个「加字段即全链路」：model DTO+DEFAULT → store+setTbTitle → SETTING_KEYS 泛型 PATCH/diff/hydrate → mock-db 旧快照兜底 → docs/API.md）；默认语义=链接/自定义显示标题、快速启动/桌面不显示（XP 出厂态）
  - 链接工具栏补 2 个内联收藏项+保留标题（XP 默认）；Favorites\链接 FS 文件夹建立
- 【③帮助和支持中心】226→393 行重写（VLM 95/100）：
  - 工具栏：后退/前进/主页/打印/支持/选项 图标+文字按钮（蓝渐变）+右上搜索框（XP helpctr 布局）；打印→showToast+playPrintDone；支持/选项→XP 风格信息框
  - 主页：蓝横幅+「选择一个帮助主题(S)」双列 6 主题（保留原优质内容）+右栏三面板（TaskPanel 复用→主题自适应）：请求帮助（远程协助信息框/Messenger）/选择一个任务（系统信息/Windows Update→IE/磁盘清理→cleanmgr 真实打开）/您知道吗?（6 条提示 12s 轮播+手动下一个）
  - 站内搜索：computeHits 标题+正文包含匹配→结果页（计数+摘要片段+跳转+无结果提示）；搜索视图入历史栈（'search:关键词' 标记，后退/前进经搜索页往返——修复初版直跳主页 bug）
  - 窗口默认 660×500→780×560
- 【质量门】lint 0/0；tsc src 零错误（skills/ 环境预存）；生产构建成功
- 【e2e 23/23】任务窗格：系统任务/其他位置 XP 集合/折叠 aria/48px 图标/图片任务/经典白底+纯蓝链接；工具栏：3 按钮=文件夹/段落菜单三件套/显示标题+API 落库/拖入 4 按钮/打开文件夹/链接标题；帮助中心：6 主题/三面板/搜索蓝屏→故障排除/结果→正文/后退返搜索页；ie.png 三桶 200+md5=附件；控制台无新错误
- 【VLM】经典任务窗格 98/100（「极其精准还原…朴素高效工业设计」）；HC 黑可读性全过；帮助中心主页 95/100；最终 Luna 全景 95/100；Luna 任务窗格 4/5 通过（第 5 项为裁切伪截断，全窗复核排除）
- 【方法论】z-ai image-search stdout 前有进度行需剥离解析；维基媒体 429 限流时 OSS 中转图可取；agent-browser console 的 [error] 会跨刷新残留——验证需认准时间戳/重开页；React 受控输入赋值必须原生 setter+input 事件（再验证一次）；FS 静态树改动后重置 db/xp-state.json（本轮重播种一次）
- 截图证据：.zscripts/shot-d18-*.png（打包前已清理）

Stage Summary:
- 任务窗格体系化：可折叠面板+上下文任务区+XP 真实「其他位置」+48px 详细信息；经典/22 色彩方案/HC 全面适配（白底灰边黑标题纯蓝链接——WS2003 实证口径）
- 任务栏工具栏 XP 化：快速启动=真实文件夹（拖入即自定义）、四类工具栏段落右键三件套、显示标题持久化（tbTitles 第 12 个全链路字段）
- 帮助和支持中心从占位式列表页重建为 XP helpctr 结构：图标工具栏+搜索+双列主题+右栏三面板（远程协助/任务/您知道吗）
- IE 图标依用户指令回退 PIL 原稿（三桶+文档+生成脚本同步）
---
Task ID: d19
Agent: 主 Agent (Super Z)
Task: ① Windows Media Player 9 全模式复刻 ② Outlook Express 6 精修 ③ 通知气球 XP 化（安全中心盾牌）

Work Log:
- 【参考取证】两轮 image-search（24 张候选）+ 接触表 + VLM 逐张转录鉴版本：首轮 WMP 候选全灭（实为 WMP11/12/Win11/手机/IE/CD 光驱照片——VLM 缩略图初筛会把 WMP12 认成 WMP9，靠顶部文字转录「Organize/Stream」=WMP12、「Rip/Burn/Sync 标签」=WMP10/11 才排除）；二轮锁定 wmp9b-3（真实 WMP8/9 full mode：File/View/Play/Tools/Help + 左条七项 Now Playing/Media Guide/Copy from CD/Media Library/Radio Tuner/Copy to CD or Device/Skin Chooser——顺带确认 WMP8/9 用标准 OS 窗口框而非自绘深色标题栏，纠正记忆偏差）；OE6 仅 oe6-2 可用（真实 OE6：菜单 File/Edit/View/Tools/Message/Help——确认「邮件」菜单在「工具」之后，及工具栏 Create Mail▾/Reply/Reply All/Forward/Print/Delete/Send-Recv▾/Addresses/Find）
- 【取色方法论延续】颜色一律 PIL：WMP 左任务条钢蓝 #5b7ab3、菜单银白、可视区近黑、控制台深蓝；不采信 VLM 色彩描述
- 【①WMP9】MediaPlayer.tsx 280→680 行全量重写：
  - 布局：银白菜单栏（文件/查看/播放/工具/帮助，含转到子菜单/无序/重复/音量真实项）+ 钢蓝左任务条七钮（圆形光泽图标+选中高亮）+ 主区 + 深蓝底部控制台（定位滑条+时间 + 外观/全屏/无序/重复/停止/上一/播放暂停/下一/静音+音量滑条）
  - 七视图：正在播放（径向深色画布+条形与波峰可视化（细条+底部辉光+下落波峰帽）+银灰播放列表窗格（标题/长度列+总时间））、媒体指南（MSN 音乐门户）、从 CD 复制（CD 音轨复选列表）、媒体库（标题/艺术家/流派/长度表）、收音机调谐器（电台预设）、复制到 CD 或设备（刻录列表+Lite-On 光驱）、皮肤选择器（8 皮肤缩略格）
  - 引擎：保留 Web Audio 芯片合成器并升级——暂停/恢复（elapsed 锚点）、seek（按音符累计时长定位索引）、音量/静音（master.gain）、曲目自然结束→重复/下一曲；曲目 3→5（新增 局域网派对/回收站蓝调）
  - registry/store：resizable true + 默认 700×540
- 【②OE6】Outlook.tsx 379→780 行重建：
  - 菜单：文件/编辑/查看/工具/邮件/帮助（顺序按参考截图；邮件菜单含答复/全部答复/转发/阻止发件人）
  - 工具栏九钮（创建邮件▾分裂钮/答复/全部答复/转发/打印/删除/发送接收▾/地址簿/查找，21px 彩色 SVG）
  - 左窗格：Outlook Express 根 + 「本地文件夹」+/− 折叠树（收件箱/发件箱/已发送邮件/已删除邮件/草稿——补齐发件箱）+ 联系人窗格（6 人，双击直接撰写）
  - 邮件列表：优先级(!)/附件(📎)/标记(⚑ 可点击切换)/发件人/主题/接收时间 六列，列头点击排序（▲▼），未读=粗体+黄信封、已读=白信封
  - 预览窗格：灰标签表头（发件人/主题/接收时间）+正文+附件芯片；右键菜单（答复/转发/标记/删除）
  - 撰写邮件=独立子窗口 oecompose（新注册表项）：菜单/工具栏（发送/剪切/复制/粘贴/检查姓名/优先级/附件）+收件人/抄送/主题+格式栏（字体/字号/B/I/U 功能性）+签名插入；Explorer 右键「发送到→邮件接收者」直开撰写窗
  - 邮件流：发送→发件箱（真实 OE 语义）→「发送/接收」清空→已发送邮件；随机新邮件池（天涯/瑞星/网易/老王 4 封 45% 概率到达）带邮件图标气球；种子邮件 4→6（联众/Winamp 皮肤站）
  - 跨窗口邮件仓库：useSyncExternalStore 模块级 store（主窗口/撰写窗/未来多实例共享）
- 【③气球】XPSystem Toast 从居中黄框升级为真实 XP 气球：
  - 锚定托盘（right 14 / taskbarH+13，四向任务栏适配）+ 小三角尾巴指向托盘（底停靠时）+ 关闭钮 + #ffffe1 圆角黑边 + 悬停暂停自动消失（6.4s）
  - BalloonSpec（title/text/icon:shield|mail|info|warn/onClick）向后兼容纯字符串（全系统数十个 showToast 调用点零改动）
  - 安全中心：托盘红盾图标（16px tray-shield-red，点击弹状态气球）+ XP SP2 经典首启气球「您的计算机可能存在风险。防病毒软件未启用。单击此气球修复该问题。」（桌面后 4.5s 自动弹出+playBalloon 音效，每页面加载一次）
- 【质量门】lint 0/0（FOLDERS 组件级→模块级修复 hooks 规则）；tsc src 零错误；生产构建成功
- 【e2e 24/24】WMP：七任务钮/五菜单/播放列表新曲目/播放暂停切换/媒体库列/双滑条/关于 9.00.00.2980；OE6：五文件夹+联系人/六列头/选中即预览/未读计数（选中 6→5 真实已读语义）/独立撰写窗口入任务栏/发送→发件箱→发送接收→已发送/软删除/状态栏；气球：字符串→气球（关闭钮）/右下锚定 (right14,bottom43)/结构化（图标+标题）/托盘盾牌+点击状态气球
- 【VLM】WMP9 播放态终审 98/100（「完美复刻钢蓝配色+布局+控制台细节」）；OE6「非常高水准的视觉复刻」；首启安全气球裁剪验证通过（黄圆角+盾牌+尾巴+托盘三图标）
- 【方法论】VLM 全屏截图会漏看角落小元素（气球 16px 盾牌）→ 裁剪放大再问；VLM 鉴版本必须靠「顶部菜单/按钮逐字转录」而非整体观感（缩略图会把 WMP12 认成 WMP9）；agent-browser screenshot 不吃路径参数（存到 ~/.agent-browser/tmp 再 cp）；多窗口叠加会误导 VLM（DOM 断言优先）；React 受控 input 程序化赋值仍需原生 setter+input 事件

Stage Summary:
- WMP9 全模式复刻上线：从「创意合成器」到 98 分 WMP9——七任务视图+传输控制台+可暂停/seek/音量的完整播放机，XP 旗舰应用三件套（IE/WMP/OE）全部达标
- OE6 重建为真实邮件客户端：五文件夹树+联系人+六列可排序列表+预览窗格+独立撰写子窗口+发件箱发送语义+新邮件到达（随机池）
- 通知系统 XP 化：全系统 toast 升级为锚定托盘的 XP 气球（结构化图标/标题/可点击），安全中心红盾+SP2 经典首启警告气球补齐
---
Task ID: d20
Agent: 主 Agent (Super Z)
Task: 开始菜单深审（pin 区拖拽排序 + 右键菜单全项复核）+ 多账号登录体系（API/欢迎屏/密码提示/FUS）1:1 复刻

Work Log:
- 【①pin 区拖拽排序精修】
  - 落点指示：onDragOver 按指针在项中心左/右计算前插/后插，渲染 2px 蓝竖线（Luna 两列网格 left/right 定位；经典单列横线 dropHint before/after）
  - 关键 bug 修复×2：a) dragOver 从纯 state 改「ref 同步双写」（setDragOverSync）——合成 DragEvent 连发时 onDrop 闭包读到的 state 是旧值 null，ref 才是同步的；b) onDrop 读 dragOverRef.current
  - MFU→pin 拖入：常用程序按钮 draggable + pinDragRef {source:'pin'|'mfu'} 双源；MFU 落入 pin 区 = 附到开始菜单 + reorderStartPinned 到插入位 + toast
  - 经典菜单 pinned 行同步支持拖拽（ClsRow 扩展 draggable/drag handlers/dropHint/onContextMenu props）
- 【②右键菜单全项复核】
  - pinned：打开(O)粗 / 从「开始」菜单脱离(U) / 属性(R)→fileprops 快捷方式属性（真实路径 C:\Documents and Settings\{user}\「开始」菜单\xx.lnk）
  - MFU：打开(O) / 附到「开始」菜单(P) / **从列表中删除(I)**（removeFromMFU 墓碑 -1 语义：计数置 -1 移出列表，再次使用 +1 会重新回来——XP 真实行为） / 属性(R)→fileprops 应用程序
  - 出厂 MFU 列表与墓碑联动：FACTORY_MFU.filter(programUse[key] >= 0)（-1 被删的不再回填；过滤条件 <=0 是初版 bug 已修）
  - 所有程序子菜单叶子：progItem 工厂全量重构（20+ 项）——每项带 onContextMenu（打开/附到/属性）；CtxItem 类型扩展 onContextMenu + MenuList 行绑定（不关菜单链，XP 手感）+ ContextMenuHost z-600→z-760（盖过级联子菜单 720）
  - 右栏条目：shellCtx 工厂——打开(O)/属性(R)；我的电脑→系统属性（XP 真实语义）、我的文档/图片收藏/我的音乐→fileprops（文件夹 stats）、控制面板/打印机和传真/网上邻居→系统文件夹、帮助/搜索/运行→快捷方式属性
  - 关键修复：openCtx 原本强制 startOpen:false（右键即关开始菜单——桌面语义误伤）→ 加 opts {keepStart} 参数，开始菜单内 6 处右键全部 keepStart:true
- 【③多账号登录体系（API + UI 全链路）】
  - 数据层：AccountItem（name/type/avatar/hint/hasPassword 派生）+ AccountRecord（+password 仅服务端）；种子 3 帐户：Administrator（无密码，保持默认单击即登录）/ 王小明（受限，密码 2001，提示「Windows XP 的发布年份」，chess 头像）/ Guest（公文包头像）；MockStateDTO.accounts + mock-db 旧快照兜底
  - API：/api/v1/accounts GET（stripAccount 剥密码）/ POST 创建（重名 409）/ PATCH 改名+密码+提示+头像（内置不可改名）/ DELETE（内置 Administrator/Guest 403）；/api/v1/accounts/login POST 验证（ok:false + reason bad-password/no-user；验证通过更新 session.user 但不记事件——登录事件由客户端 setPhase 统一上报防重复）；GET /state 同步剥离密码（防泄漏）
  - 客户端：store 加 accounts/sessionUser/switchFrom + setAccounts/setSessionUser/setSwitchFrom；hydrate 填充；endpoints 5 个封装；fsSync.session 带用户名；setPhase 会话事件全部携带 sessionUser
  - 欢迎屏重写：多磁贴纵列（58px 头像白边框+19px 白字用户名+hover 高亮）；点击有密码帐户→密码态磁贴（?蓝圆提示钮 + 密码框 + 绿箭头 GoButton，XP logonui 三件套）；错密码→白字错误文案+抖动+清空；?→「密码提示: xx」（与错误可并存）；Guest 单击直接登录
  - FUS 快速用户切换：注销对话框「切换用户」/锁定屏「切换用户」→ setSwitchFrom(sessionUser) 保留会话回欢迎屏；磁贴显示「已登录 · N 个程序正在运行」；点击直接返回原桌面（窗口全保留——XP FUS 语义）；切换到其他用户才 closeAll
  - 锁定屏：按 sessionUser 渲染（头像/用户名动态）；API 密码验证（错→提示+抖动；脱机时无密码帐户兜底放行）
  - 开始菜单头部/任务管理器用户页/任务栏属性缩略图：全部 sessionUser 动态化 + 帐户头像渲染
- 【④用户帐户应用重建（API 管理面）】7 页视图栈：home 帐户磁贴列表（store.accounts）/ account 任务页（改名/创建密码/更改图片/.NET Passport/删除帐户）/ rename / password（新密码+确认+提示，含删除密码）/ picture（5 头像网格）/ delete 确认 / create（名称+受限/管理员 radio）；全部走 API + 本地镜像更新
- 【⑤头像资产】PIL 生成 XP 默认用户图片集 5 枚（48px 4x 超采样 LANCZOS：彩色渐变底+白剪影+2px 深色描边+柔影）：avatar-admin 人形蓝/admin-chess 骑士绿/admin-guest 公文包青/admin-fish 金鱼橙/admin-plane 飞机天蓝；骑士与金鱼各迭代 2 轮（马脸拉长+嘴线、鱼眼放大+纺锤身）VLM 6.5-8 → 全部 ≥8
- 【质量门】lint 0/0；tsc src 零错误；生产构建成功（/api/v1/accounts + /login 入产物）
- 【e2e 25/25】欢迎屏 3 磁贴+提示语；密码态展开/错密码文案+清空/?提示/对密码登录；开始菜单头部王小明+chess 头像；pin 重排（ie,outlook→outlook,ie）+插入线 DOM 断言+MFU 拖入 +1；pinned/MFU/右栏三类右键全项断言；从列表中删除生效；FUS 切换用户→已登录标记→返回窗口保留；锁定屏错/对密码；用户帐户创建+删除；session 事件用户名；状态恢复
- 【VLM】欢迎屏 92/100（多磁贴+布局+头像质量）；密码态 95/100（? → 输入框 → 绿箭头顺序正确）；错误+提示并存 95/100；Luna 开始菜单 98/100（头部+右键三段）；经典菜单 98/100（竖条+单列+10 项齐全）
- 【API 冒烟 10/10】GET 剥离/王小明 2001 验证/错密码 bad-password/Administrator 空/POST 创建/重名 409/PATCH 改密/DELETE 内置 403/DELETE 自定义/GET /state 无密码泄漏
- 【方法论】zustand getState() 快照上没有 setState（直接 useXP.setState）；React 合成 DnD 用 new DragEvent + new DataTransfer() 可靠触发，但 state 闭包旧值问题必须用 ref；openCtx 这类「关上下文」副作用要考虑调用方语义（开始菜单内右键需 keepStart）；e2e 残留数据会污染下轮（帐户预清理幂等）；agent-browser 截图残留指针/字母会被 VLM 误判为 UI 缺陷
- 截图证据：.zscripts/shot-d20-{welcome,pwdtile,pwderr,startmenu,classic}.png + sheet-d20-avatars.png（.zscripts 不入包）

Stage Summary:
- 开始菜单 pin 区交互体系化：拖拽插入指示线 + MFU 拖入固定区 + 经典菜单同步支持；右键菜单对照 XP 补全（pinned 属性/MFU 从列表中删除/所有程序叶子右键/右栏打开+属性），openCtx keepStart 修复右键误关开始菜单
- 多账号登录全链路上线：/api/v1/accounts CRUD + login 验证（密码剥离架构）→ 欢迎屏多磁贴 + 密码输入 + ? 密码提示 + 错误抖动 + FUS 已登录磁贴回切；锁定屏/开始菜单头部/任务管理器全部按当前帐户动态化
- 用户帐户应用从占位重建为 API 驱动 7 页管理台（列表/改名/密码+提示/头像/删除/创建）
- XP 默认头像集 5 枚 PIL 复刻（渐变底+白剪影）

---
Task ID: d21
Agent: 主 Agent (Super Z)
Task: ① 移除托盘 Windows 安全中心图标 ② 每帐户独立「我的文档」文件树（完全受接口帐户控制）③ 欢迎屏帐户名+密码登录表单（为自定义帐户预留）

Work Log:
- 【①托盘安全中心移除】Taskbar.tsx 删除 ShieldBtn（红盾+状态气球，水平/垂直两处渲染点）→ 托盘仅剩网络/音量/时钟；XPSystem.tsx 删除 SP2 首启气球 effect（secBalloonShown/playBalloon/phase 订阅连带清理）；BalloonIcon 'shield' 分支保留（toast 图标 API 兼容）
- 【②每帐户独立主目录——数据层】fs.ts：
  - 路径助手函数化（替换 4 个 Administrator 硬编码常量）：DNS_PATH/userHomePath/myDocsPath/userDesktopPath/userStartPath/quickLaunchPath/linksPath(user)——「我的文档」/桌面/快速启动/链接/开始菜单全部按会话用户解析
  - freshUserHome(name) 工厂：XP 全新 profile 骨架（My Documents[个人欢迎 txt+图片收藏+My Music]/桌面/Favorites\链接/Application Data\...\Quick Launch[3 默认快捷方式]/隐藏 NTUSER.DAT）；Administrator 丰富内容保留在静态树
  - ensureUserHomes(root, users) 对帐（幂等补齐缺失主目录+确定性时间戳）；RECYCLE_KEY 无引用顺手删除
- 【②服务端生命周期】model.ts freshMockState 播种 3 帐户主目录；mock-db readState 对帐（旧快照自动迁移）；/accounts POST 同步 seedHome/PATCH 改名 renameHome/DELETE removeHome（主目录增删改名完全受帐户资源控制）；/system GET user 改读 st.session.user；ops.ts 回收站还原回退→会话用户桌面；print-jobs owner→会话用户
- 【②客户端会话化】store 加 seedAccountHome/removeAccountHome/renameAccountHome/reconcileAccountHomes 四镜像动作（ControlPanel 帐户管理后本地树同步）；sync.ts hydrate 前对帐；fsCreateShortcut 回退/打印 owner→sessionUser；10 处硬编码路径全部动态化：Desktop/StartMenu（MY_DOCS/PIC/MUSIC/USER_START useMemo）/Taskbar（快速启动/桌面/链接三工具栏）/DesktopCleanup/Clipbrd/ctx-menus 发送到/Notepad 保存对话框/SoundRecorder MyMusic/DisplayProperties 壁纸浏览/Cmd（HOME+USERNAME/USERPROFILE 环境变量按帐户派生）/TaskbarProps TB_SYS_ICONS/Explorer 任务窗格两处我的文档链接
- 【③欢迎屏登录表单】screens.tsx：tryLogin 重构为 attemptLogin（返回 ok/no-user/bad-password/offline/busy，磁贴流与表单流共用）；磁贴列表下方新增表单区（分割线+「或键入帐户名和密码登录」+帐户名/密码输入+?提示钮[匹配帐户有 hint 时出现]+绿箭头）；Enter 提交/错误抖动/脱机无密码放行——未来自定义帐户直接键入即可登录
- 【文档】docs/API.md 4.2a 补主目录联动语义（增/删/改名/对帐迁移/会话路径解析）
- 【质量门】eslint src 0/0；tsc src 零错误（skills/ 两处环境预存）；生产构建成功
- 【API 冒烟 8/8】旧快照迁移（DNS 只有 Administrator→自动补出王小明/Guest 主目录[欢迎.txt+图片收藏+My Music]）；POST 测试员→主目录即现；PATCH 改名→主目录同步改名；login 验证；/system user=会话用户；DELETE→主目录移除；GET /state 密码零泄漏；还原 Administrator 会话
- 【e2e 9/9】欢迎屏表单两输入框；错密码→「您键入的密码不正确」；王小明+2001 表单登录成功；桌面 [data-tray-shield] 不存在+网络/音量在位；王小明我的文档=3 对象（欢迎/图片收藏/My Music，地址栏王小明 profile，无 Administrator 文件）；FUS 切换 Administrator→7 对象（桌面备忘/图片收藏/My Videos/示例图片/录音备忘，地址栏 Administrator profile）；任务窗格新建文件夹→服务端落库 Administrator 路径；不存在帐户→「帐户不存在」；表单?→「密码提示: Windows XP 的发布年份」；重载后控制台 0 错误
- 【VLM】欢迎屏表单 4/4 项通过（三磁贴+已登录标记/表单区完整/提示文字/布局协调「高度还原 XP 特征」）；桌面托盘复核=无红盾（音量+时钟清晰，网络图标按 XP 不活动折叠）
- 【方法论】agent-browser 跨命令 ref 会失效（snapshot→click 之间页面重渲染）→ 时序耦合交互放单个 eval 内 setTimeout 链；开始菜单按钮文本带助记符「注销 (L)」需 indexOf 匹配；XP 隐藏已知扩展名——DOM 断言文件名勿带 .txt；e2e 残留清理走 API DELETE fs permanent
- 截图证据：.zscripts/shot-d21-{welcome-form,desktop-tray}.png（.zscripts 不入包）

Stage Summary:
- 托盘安全中心图标+首启 SP2 风险气球整体下线（XP SP2 前的干净托盘）
- 「我的文档」体系成为帐户资源的从属物：每个 API 帐户在 C:\Documents and Settings\{name} 拥有独立主目录，创建/改名/删除实时联动，旧快照自动迁移；客户端 10 余处 shell 路径全部按会话用户解析（桌面文件/快速启动/发送到/保存对话框/CMD 环境变量等）
- 欢迎屏新增帐户名+密码直接登录表单（含密码提示/错误抖动/脱机兜底）——自定义帐户体系的登录通路就绪，未来在用户帐户应用创建的帐户直接键入即可登录
---
Task ID: d22
Agent: 主 Agent (Super Z)
Task: ① 移除王小明登录 ② Administrator 改为密码登录（遗留任务收尾）

Work Log:
- 【数据层】model.ts DEFAULT_ACCOUNTS：删除演示帐户「王小明」（受限/2001/chess 头像），Administrator 补默认密码 2001 + 提示「Windows XP 的发布年份」；MOCK_STATE_VERSION 1→2（store 初始态/hydrate/服务端种子共用该常量，单一改动点生效）
- 【旧快照迁移】mock-db.ts readState 新增 LEGACY_STATE_VERSIONS=[1] + migrateLegacyState（幂等，迁移后立即落盘防重启丢失）：① 移除王小明帐户记录与 DNS 主目录（resolvePath(DNS_PATH) 定位）；② Administrator 仅在旧「空密码」记录时补默认密码+提示（用户主动设置/清除过的密码不动）；③ 会话若落在被删帐户上回落 Administrator；版本不符且非 legacy 才整体重播种（保数据不重置）
- 【文档】docs/API.md 4.2a：GET /accounts、login、PATCH 示例改用 Administrator/2001 与测试员；补种子帐户说明与 v1→v2 迁移语义
- 【零 UI 改动验证】欢迎屏/锁定屏/表单全部由 accounts 数据驱动（hasPassword 派生），Administrator 磁贴自动变为密码态，Guest 保持单击即登录；hydrate 全量替换 accounts 不会复活旧帐户
- 【质量门】eslint src 0/0；tsc 零错误；生产构建成功
- 【API 冒烟 18/18】GET /accounts=Administrator+Guest（无王小明）+hasPassword+hint+无密码泄漏；快照 version=2、王小明帐户/主目录移除、Administrator 密码 2001、Administrator/All Users/Guest 主目录保留；错密码 bad-password；Administrator+2001 登录成功；王小明 no-user；Guest 空密码成功；/state 零密码泄漏+无王小明；会话=Administrator；幂等重读稳定
- 【e2e 18/18】boot→欢迎屏；2 磁贴+无王小明+表单在位；Administrator 单击→密码态（磁贴变输入行、未自动登录、仍在欢迎屏）；? →密码提示；错密码→错误文案+停留；2001→桌面+开始按钮；重载回欢迎屏；Guest 单击即登录；表单通路（错密码文案+2001 进桌面）；控制台零错误
- 【VLM】欢迎屏 4/4（2 磁贴无王小明/表单完整/logonui 布局）；密码态 3/3+（磁贴展开/? 按钮/提示文字；「无圆点」为截图时机在输入前的空框光标，非缺陷）
- 【方法论】测试自扰：冒烟脚本先 Guest 登录再断言 session=Administrator——login API 按设计更新 session.user，会话断言须放在干扰登录之前；e2e 的 eval 断言表达式过长易出手误（六个点语法错误被当作产品 FAIL），断言失败先复跑单条再定位；agent-browser find first 'input[aria-label=…]' 可稳定区分磁贴态与表单态的同名输入框（磁贴在 DOM 序靠前）
- 截图证据：.zscripts/shot-d22-{welcome,pwdtile}.png（.zscripts 不入包）

Stage Summary:
- 欢迎屏瘦身：演示帐户王小明整体下线（帐户记录+主目录+登录磁贴），现存 Administrator（密码登录）与 Guest（单击即登录）
- Administrator 全面密码化：默认密码 2001 + 密码提示，旧 v1 快照自动迁移（空密码补默认、已设置密码不覆盖），锁定屏/表单/磁贴三通路一致生效
---
Task ID: d25（三批执行计划·第一批）
Agent: 主 Agent (Super Z)
Task: 全面缺口分析后的第一批五件套：regedit + 语言栏 CH + 欢迎屏关机面板 + 任务管理器修复 + 计算器进制

Work Log:
- 【①regedit 注册表编辑器】全新应用（XP 出厂 100% 标志性工具）：
  - regseed.ts：RegKey/RegValue/RegType 数据模型 + XP 真实种子（五大根键 ~50 值：HKLM CurrentVersion ProductName=Microsoft Windows XP/CSDVersion SP3/P4 2.00GHz ~MHz、HKCU Desktop ScreenSaveActive、RunMRU、HKCR .txt→txtfile shell open command 等）
  - RegEdit.tsx 580 行：左树（+/- 展折/文件夹图标/蓝底选中）+ 右值表（名称/类型/数据、(默认) 首行、类型小图标）+ 状态栏路径；右键菜单（新建项/字符串/二进制/DWORD、修改/重命名/删除/复制项名称）；弹窗族（值编辑——字符串/DWORD 十六进制十进制互转/二进制偶校验、项重命名、查找——全部/项/值三模式）
  - 持久化：regTree 整树入 settings（第 14 个「加字段即全链路」：model DTO+DEFAULT → store+setRegTree → SETTING_KEYS 自动白名单 → mock-db 旧快照兜底 → API.md）；不可变更新 structuredClone→mutate→setRegTree
  - 入口：registry 注册 + 运行框 regedit + fs.ts system32/regedit.exe + Explorer APP_FILE_ICON regedit 专属图标
  - 图标：PIL 等距双立方体（48/32 超采样 LANCZOS + 16 像素画）三桶
- 【②语言栏 CH 指示器】Taskbar 托盘常驻 CH 白底蓝字钮（22×18，水平/垂直两版渲染点）；单击 CH↔EN、右键（还原语言栏/设置→intlprops）；任务栏右键→工具栏→语言栏 从 disabled 改为真实开关（langBarOn 持久化，第 15 个全链路字段）；XPSystem 键盘处理器 Shift 分支加 Ctrl+Shift 全局切换（inputLang 第 16 个字段）
- 【③欢迎屏关机三圆钮】screens.tsx 新增 ShutdownPanel 共享组件（红盾横幅+蓝渐变三圆钮 待机/关闭/重新启动+底栏取消，样式与桌面侧 dialog 完全一致）；WelcomeScreen/LockScreen 的「关闭计算机」从直接关机改为弹面板（XP logonui 真实行为）
- 【④任务管理器修复】进程页：行选中态+「结束进程」钮（窗口进程=closeWindow 真实生效、系统进程=移出列表+killed 记忆、进程数统计联动）；「切换至」从误开关机框改为还原+置顶选中任务；「注销」从永久 disabled 改为 closeAll+logging-off；用户页：帐户列表（头像+活动/断开状态）+ 断开(FUS)/注销 双钮
- 【⑤计算器进制真实化】base 状态（16/10/8/2）：进制单选钮接通（切换时当前值自动换算显示——XP 真实行为）、parseBase/toBaseStr/digitOk（越界数字忽略）、A-F 键区（仅 hex 可用其余置灰）、键盘 a-f 支持、非十进制 fmt 取整显示、切回标准型重置十进制；全部运算路径 parseFloat→curVal()
- 【文档】docs/API.md settings 字段表补 regTree/inputLang/langBarOn
- 【质量门】eslint 0/0；tsc 零错误；生产构建成功
- 【e2e 23/23】五根键+虚拟根+ProductName 值；regTree setRegTree→settings PATCH 落库（curl 服务端断言）；CH 在位/单击 EN/store 同步；欢迎屏面板弹出+三圆钮+取消；FUS 磁贴返回；结束进程 notepad 真关窗；切换至计算器还原置顶；hex 1A→dec 26 换算+A-F 置灰；运行框 regedit 直达；控制台零 error
- 【VLM】regedit「质量很高…高度还原」（InstallDate 十六进制格式/(数值未设置) 表现被点名符合原版）
- 【方法论】① agent-browser find text 对 MenuBar 按钮/含 SVG 按钮可达名称匹配不到（Administrator 磁贴却能匹配）→ 此类点击统一 eval querySelector+click ② finishLogin 有 1.6s 转场，FUS 断言用 wait --fn 而非固定 sleep ③ 内联 python 链式条件表达式（'yes' if x if y else 'no'）语法陷阱 ④ structuredClone 在浏览器 eval 可用（e2e 模拟 store mutate 通路的捷径）
- 截图证据：.zscripts/shot-b1-{sdpanel,final,regedit}.png + dbg-b1-*.png（.zscripts 不入包）

Stage Summary:
- regedit 上线：XP 最后一个标志性系统工具补齐（树+值编辑+查找+持久化全链路）
- 中文版第一观感补齐：托盘 CH/EN 语言栏指示器（Ctrl+Shift 切换+工具栏菜单真实开关）
- 关机体验统一：欢迎屏/锁定屏/桌面三处均为三圆钮中间面板
- 任务管理器「一眼假」三处修复（结束进程/切换至/注销）；计算器十六进制从纯装饰变真实可算
---
Task ID: d26（三批执行计划·第二批）
Agent: 主 Agent (Super Z)
Task: 保存体系统一（画图/写字板入 VFS + Outlook 持久化）+ 搜索高级条件 + 屏保补全 + CMD 命令族

Work Log:
- 【⑥保存统一】fsWriteFile 扩展 opts{icon,type,src,appId}（新文件走 fsSync.create 全节点、改写图片走 fsSync.update 同步 src）：
  - Paint：保存/另存为 → 图片收藏（PNG dataURL 存 src、icon bmp、类型「BMP 图像」）；打开对话框（全树图片列表缩略）→ Image 载入画布自适应尺寸；localStorage 旧通路彻底移除（挂载恢复/保存双清）
  - WordPad：保存/另存为 → 我的文档（innerHTML 存 content、icon doc、appId wordpad）；打开对话框（doc/text 文档列表）；fs.ts icon union + 'doc'，Desktop/Explorer 图标 map（docfile.png）+ 双击 doc → WordPad 带 content（Desktop/Explorer 两处 openItem，appId 文件统一带 fileName/content/src）
  - Outlook：邮件持久化全链路——model OeMail/OeFolder + DEFAULT_OE_MAILS（种子移入 model）/api/v1/oe-mails GET+PUT 整表（printers 模式）/endpoints/sync（snap+diff+hydrate+oeHydrate 注入模块仓库）/store oeMails/setOeMails/mock-db 旧快照兜底；commit() 镜像 store → API PUT（刷新不丢邮件）
- 【⑦搜索高级】SearchApp：新增「文件中的一个字或词组」内容搜索（node.content 匹配）；「什么时候修改的?」折叠面板（昨天/上星期/上个月/过去一年——modified 时间真实过滤）；「大小是?」面板（小<100KB/中<1MB/大>1MB——size 字段解析过滤）；高级选项复选框真实化（搜索系统文件夹/隐藏文件——system/hidden 节点过滤）；结果行单击选中蓝条（替换原 toast 兜底）
- 【⑧屏保补全】4→8 种（XP 出厂全集）：图片收藏幻灯片（全树图片 DOM 渲染+6s 淡入淡出切换）/滚动字幕 marquee（彩虹渐变 fillText 滚动）/三维飞行对象 flight3d（三种线框体轮换迎面飞行）/三维花盒 flowerbox（旋转立方体六面 HSL 渐变+深度排序）；显示属性列表补 4 项 + 「设置(T)」按钮（marquee/slideshow 提示预置参数、其余「没有可配置的选项」）
- 【⑨CMD 命令族】+10 命令（31→41）：netstat（活动连接表+本机网卡 IP）/tracert（12 跳递增延迟路由）/nslookup（服务端真实 DNS 解析）/nbtstat（NetBIOS 名字表）/arp -a（地址解析表）/systeminfo（从 regTree 取 ProductName/RegisteredOwner/SystemRoot——注册表与 CMD 打通）/findstr（VFS 文件内容真实搜索）/xcopy（copy 别名）/reg query（读 regTree，HKLM 缩写映射+含空格路径）/net start|user（服务列表/帐户列表真实 store）；help 列表与 Tab 补全表同步
- 【质量门】eslint 0/0；tsc 零错误；生产构建成功
- 【e2e 18/18】画图：画笔→保存→另存为→图片收藏 e2e画作.bmp+服务端 fsTree 落库；写字板：输入→保存→我的文档 e2e文档.rtf（doc 图标+appId+内容）；Outlook：创建邮件→发送→/api/v1/oe-mails outbox 落库；搜索：内容搜索「欢迎」命中+折叠面板展开；CMD：systeminfo/netstat/tracert/reg query/net user 五连；屏保：marquee/flight3d/flowerbox/slideshow 四预览全启动；控制台零 error
- 【方法论】e2e 填 React 受控 input 仍需原生 setter+input 事件（双输入框按 placeholder 索引）；MultiEdit 大段插入 case 时 old_str 命中两组导致重复块——insertion 后必须 grep 去重；agent-browser find first 'input' 对多窗口层叠时按 DOM 序取第一个（Outlook 主窗优先——主题填充要按 placeholder 找）；XPRadio/XPCheckbox 是 button 元素（断言别查 label）
- 截图证据：.zscripts/shot-b2-final.png（.zscripts 不入包）

Stage Summary:
- 保存能力三档分裂终结：记事本/画图/写字板全部写 VFS 落库，Outlook 邮件 API 持久化（刷新不再丢）
- 搜索从「文件名过滤器」升级为 XP 真实搜索（内容/日期/大小/系统文件四维条件+结果选中态）
- 屏保补齐 XP 出厂 8 种全集（图片幻灯片复用真实 FS 图片）
- CMD 命令面 +10（含 reg query 与注册表打通、systeminfo 从注册表取值）
---
Task ID: d27（三批执行计划·第三批）
Agent: 主 Agent (Super Z)
Task: 账号权限门禁 + 回收站配额 + 密码哈希（架构债清偿）

Work Log:
- 【⑩权限门禁】store.openApp 入口全局拦截：ADMIN_ONLY_APPS = {compmgmt, services, eventvwr, perfmon, secpol, odbc, defrag}（XP 真实需管理员的管理工具+磁盘碎片整理）；sessionUser 帐户 type !== 'admin' 时弹 XP 风格「您没有执行此操作的适当权限。请与系统管理员联系…」错误对话框（标准文案）并 return -1；Administrator 不受限、普通应用（记事本/CMD/任务管理器等）不拦——帐户类型从「纯显示标签」变为真实门禁
- 【⑪回收站配额】客户端 store.fsDelete + 服务端 ops.opFsDelete 双端同步裁剪：上限 20 条，超出按时间序挤掉最旧（XP 磁盘配额语义——「删除的文件全文节点永久驻留 JSON」结构性风险闭环）
- 【⑫密码哈希】server/passwords.ts：hashPassword（SHA-256 + 8 字节随机盐，格式 sha256$<salt>$<hash>）/verifyPassword（双格式兼容）/isHashed；三个入口统一：login route（verify + 旧明文首验成功透明升级落库）、POST accounts（创建即哈希）、PATCH accounts（改密即哈希）；mock-db readState 存储层迁移（所有非哈希密码统一哈希化 + pwMigrated 强制落盘，幂等）；明文仅存在于请求体；docs/API.md 4.2a 语义更新
- 【质量门】eslint 0/0；tsc 零错误；生产构建成功
- 【API 冒烟 18/18】Administrator/2001 哈希验证通过；db 中 sha256$ 格式断言；帐户记录零明文；错密码 bad-password；创建受限帐户（哈希落库+验证）；PATCH 改密（哈希+新密码验证）；/state 零密码泄漏（连哈希都无）；桌面 24 文件全删→回收站恰好 20 条+最旧 4 条被挤出+清空还原；会话还原；测试帐户清理
- 【e2e 11/11】受限帐户 e2e门禁 登录；openApp(compmgmt) 返回 -1+权限错误对话框+窗口未开；defrag 同拦；记事本不拦；Administrator FUS 回桌面后 compmgmt 正常打开；测试帐户清理回 2 帐户；控制台零 error
- 【VLM】权限对话框「标准官方文案…完美复刻 Luna 特征」
- 【方法论】openApp 拦截点选在窗口创建前 return -1（调用方可判）；服务端 readState 迁移若不触发版本变更需显式 dirty 落盘（否则仅内存，重启即失）；bash 双引号内 \\ 转义链路（find fill 传路径含 \ 时注意）；python 内联脚本写复杂生成器表达式易出语法错——先写文件再跑
- 截图证据：.zscripts/shot-b3-guard.png（.zscripts 不入包）

Stage Summary:
- 多账号体系从数据层闭环到权限层：受限/来宾打开管理工具被真实拦截（XP 标准文案+Luna 对话框）
- 回收站无限增长风险闭环（双端 20 条配额）
- 密码明文存储清偿：SHA-256 加盐哈希全链路（创建/改密/登录/存储迁移），请求明文即焚、响应零泄漏
---
Task ID: d28（审计遗留收尾 + 用户报障：运行框回车）
Agent: 主 Agent (Super Z)
Task: ① 运行框输入后回车无响应（IME 组态回车 bug 类，全站清扫）② 审计遗留三项：扫雷自定义难度 / 纸牌选项对话框 / fs-sync 静默吞错

Work Log:
- 【根因定位】运行框 Enter 处理代码早已存在、自动化点击路径也通 → 差异在真人中文输入法：组态期间回车（确认候选/原文上屏）的 keydown 为 Chrome key='Process'/keyCode=229 或 Firefox key='Enter'+isComposing=true，此刻组件 state 是上屏前旧值（常为空）→ run() 拿空值早退 → 用户观感「回车无任何响应，必须鼠标点击」
- 【imeEnter 共享助手】新建 ime-keys.ts：干净回车立即执行并取 DOM 实时值；组态回车不 preventDefault（避免干扰 IME 提交）、setTimeout 排到 compositionend 上屏后取最终值执行（fn 收到的 val 恒为实时值，规避过期闭包）；Ctrl/Meta/Alt 修饰回车不归助手管（保住 IE 地址栏 Ctrl+Enter 补全）
- 【全站清扫 16 处】RunDialog（含顺带修复：下拉开时 Enter 双重执行 bug + 新增 dropNav 箭头导航语义——XP 组合框 Enter 跑选中项/输入内容）/ Explorer 地址栏+重命名 / IE 地址栏+双搜索框 / Notepad 转到行+查找 / Paint 另存为 / WordPad 查找+另存为 / RegEdit 值命名+查找 / SearchApp 双输入框（doSearch 加字段覆盖参数）/ HelpCenter 搜索 / CMD 命令行（echo 你好 组态回车直达）/ 桌面图标重命名（Desktop.tsx，中文文件名高频场景）/ 欢迎屏磁贴密码+表单帐户名/密码+锁定屏解锁（submitForm/unlock 加 pwd0 参数）
- 【fs-sync 吞错】sw 包装失败时广播 xp-fs-sync-error 事件（带 op 名）；XPSystem 新增 FsSyncErrorHost 监听 → showToast「{op} 未能保存到服务器，更改仅在本次会话内有效」，30s 节流防刷屏（循环依赖用事件解耦，fs-sync 仍不 import store）
- 【扫雷自定义】游戏菜单「自定义(C)...」+ 窗口内居中模态（XP「自定义棋盘」三输入框）；确定时钳位 XP 边界：高 9-24 / 宽 9-30 / 雷 ≤(h-1)(w-1)（30×24 上限 667 与真实 XP 一致）；自定义局不进英雄榜（XP 行为）；输入框 Esc 取消/imeEnter 确定
- 【纸牌选项】solitaireOpts 第 16 个 settings 全链路字段（model DTO+默认 → store+setter → SETTING_KEYS 自动白名单 → sync hydrate 嵌套兜底 → mock-db 旧快照兜底 → API.md）：draw 1|3（clickStock 翻 1/3 张 + waste 顶部三张扇形展开）/ scoring none|std|vegas（标准=翻牌+5 上基础堆+10 重发-20 胜利+100；维加斯=牌堆→列+5 列→基础堆+5 牌堆→基础堆+4 不扣重发）/ timed（首次动牌起表、胜利停表、状态栏+胜利面板显示）；菜单「选项(O)...」→ solopts 应用窗口（registry 注册，XPRadio/XPCheckbox 组装）
- 【产品加固】SolOptions/Minesweeper 确定按钮改 latest-ref 模式（useEffect 同步，lint 合规）——防高负载渲染延迟下闭包旧值提交；RunDialog 确定按钮同样改 inputRef 兜底取值；SolOptions setDraft 六处改函数式更新（防同帧连击互相覆盖）
- 【质量门】eslint 0/0；tsc 零错误；生产构建成功
- 【e2e 13/13】干净回车回归（notepad）；组态回车 Chrome 模式（Process/229 → calc）；组态回车 Firefox 模式（Enter+isComposing → winmine）；CMD 组态回车（echo 你好 输出）；扫雷自定义 40/40/700 → 钳位 30 宽；纸牌选项对话框三组控件；store {draw:3,vegas,timed:true}；settings PATCH 落库（curl 服务端断言）；翻三张状态栏；fs-sync 事件 → 气泡；控制台零 error
- 【VLM】扫雷自定义棋盘 ~93（「完全符合 XP 标准」三段全 90+）；纸牌选项 95/100（初版 92 分抓到「计时游戏」复选框被 224px 窗高截断 → 加高到 262 复测通过——VLM 复核真抓了一个布局 bug）
- 【方法论】① e2e 断言 IIFE 忘写 return → 永远 null 永远 FAIL，与「页面真值 dump」对照才能定位（dbg-status true 但断言 FAIL = 脚本 bug 而非产品 bug）② agent-browser eval 需留足 React commit 间隔，紧凑连击会偶发读到旧渲染态（独立循环 10/10 稳定、长会话偶发——产品侧用 latest-ref 加固后两边都稳）③ dev server 增量编译竞态：改完代码立即跑 e2e 可能拿到旧 bundle，先等编译再跑 ④ VLM 复核布局截断类问题有效（人眼容易漏）⑤ React 18 click 为 discrete event 同步 flush：同帧双击 checkbox 会 true→false 抵消（radio 幂等无感）
- 截图证据：.zscripts/shot-d28-{minecustom,solopts,solopts2}.png（.zscripts 不入包）

Stage Summary:
- 「回车无响应」bug 类根除：16 处输入框回车全部 IME 安全（中文输入法组态确认即执行，读上屏后最终值）
- 文件操作静默失败闭环：fs-sync 失败气泡提示（30s 节流）
- 审计遗留三项清偿完毕：扫雷自定义棋盘（XP 边界钳位）、纸牌选项（翻牌方式/计分/计时三组真实生效 + settings 持久化）、至此全面审计清单全部关闭
- 交互细节全面体检：全站键盘回车/取消通路、下拉导航、按钮闭包时序加固
---
Task ID: d29
Agent: 主 Agent (Super Z)
Task: 用户报障：右下角托盘 « 展开钮未 1:1 复刻（太大、不是纤细款）

Work Log:
- 【根因】d16 凭记忆设计的「11×17 灰白渐变胶囊 + 深蓝双箭头 «（7×9 svg strokeWidth 1.2，墨量 24px）」未经参考取证；当时 VLM「高度还原 Luna」属小元素盲区误判（d19 方法论已记录 VLM 漏看/幻觉角落小元素）
- 【参考取证】image-search 三查询 30 张候选（多数非 XP/缩放/实拍出局）+ Wikipedia《Windows XP task grouping (Luna).png》原文件（Special:FilePath 通道，800×24 任务栏横条，0.8x 缩放——量尺寸除 0.8、取色直接可用）：
  - 新工具：d29-segment.py（按列非蓝统计分段任务栏结构）+ d29-fine.py（细分类字符图：蓝底/浅蓝/白/灰/藏青）+ d29-measure-chev.py（按 DOM rect 精确裁测字形）
  - 像素实证（PIL，不采信 VLM 色彩）：真实 XP chevron = **单箭头 <（非 «）**、**白色 1px 细线 ~5×9**、**浅蓝光面小胶囊 ~10×14**（亮青蓝渐变 顶 #90d7f9→底 #5ac1f6 + gel 高光 + 白箭头）
  - 反例教训：xp2-1 图 VLM 坚称「有单箭头按钮」，像素分段证明只是托盘分隔竖线+空托盘——VLM 对 8px 级元素会无中生有
- 【重绘】Taskbar.tsx TrayChevron：双 « → 单 <（展开翻转 >）；stroke #1a3a7a → currentColor 白；viewBox 8×10 path M6 0.75 L1.5 5 L6 9.25 sw 1.2 → 字形 5×8、核心墨量 10px（原 24px 减半）；按钮 11×17 → 10×14（wiki 比例 0.55w/0.70h 实测 0.5/0.71）
- 【样式体系化】globals.css 新增 .xp-traychev 样式族：--traychev-bg/--traychev-edge 变量入三主题块（Luna 亮青蓝光面渐变 / Olive 浅鼠尾草绿 / Silver 银灰）+ hover brightness(1.1)+白边 / active 压暗；经典主题覆盖块（--cls-face 3D 凸边 hi/dkdk + --cls-fg 黑细箭头 + face-hover/按下内凹）——22 色彩方案与 HC 随 --cls-* 变量自动适配
- 【连带功能 bug】anyHidden 原把 trayExpanded 计入（trayShow 展开恒真）→ 点 « 后按钮消失、**无法再折叠**，旧代码 » 翻转分支是死代码：新增 trayShowCollapsed（不含展开项）作显隐判定 → 展开态按钮驻留翻转为 > 可再点回收；+ 自动回收 effect（展开态下已无被藏图标时 setTrayExpanded(false)，防 touchTray 后卡在展开态）
- 【验证】PIL：折叠 < 白 5×8(10px)/展开 > 白 5×8(9px)/经典 < > 黑 6×10 #2f2e2c+灰面 #d4d0c8；回收 e2e（再点 → chevron 在位/vol 隐藏/trayExpanded:false）；VLM 终审：Luna「完全符合」/经典「准确还原」/展开态「细节还原度很高」
- 【质量门】eslint 0/0；tsc src 零错误（skills/ 环境预存 2 处）；生产构建成功
- 【方法论】① agent-browser 截图与 getBoundingClientRect 1:1 对应——小元素测量用 DOM rect 定位远比图像识别可靠 ② 展开态 chevron 会左移（隐藏图标内联现身推挤），二次测量必须重取 rect ③ 维基媒体 429 限流：sleep 重试 / Special:FilePath 通道可绕过；thumb URL 会 400（需列出的尺寸） ④ 0.8x 缩放参考图：图标 12px 高≈16×0.8 可判缩放系数 ⑤ VLM 小元素定性必须先 PIL 分段定位再问，否则幻觉
- 截图证据：.zscripts/shot-d29-{before,before-expanded,expanded,classic,classic-exp}.png + d29-after-btn-zoom10/d29-classic-tray/d29-after-tray{,-exp}.png（.zscripts 不入包）

Stage Summary:
- 托盘 « 展开钮像素级 1:1：单箭头白色细线 + 浅蓝光面小胶囊（Wikipedia 真 XP 图像素取证），Luna/Olive/Silver/经典 22 方案/HC 全适配
- 展开态无法折叠的功能 bug 连带闭环（» 翻转从死代码变真实交互 + 自动回收）
- 像素取证工具沉淀：任务栏结构分段器 / 细分类字符图 / DOM rect 精测——后续小元素 1:1 复刻可复用
