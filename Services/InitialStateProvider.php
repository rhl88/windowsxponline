<?php

namespace App\Apps\CmsproWindowsxponline\Services;

/**
 * XP WebOS 初始状态数据提供者
 *
 * 提供用户首次访问时的种子数据（出厂状态）
 * 数据结构遵循 MockStateDTO 规范
 */
class InitialStateProvider
{
    /**
     * MockState 版本
     */
    private const STATE_VERSION = 2;

    /**
     * 快速启动可选程序映射（appId => 快捷文件名/类型）
     *
     * appId 必须与前端任务栏应用注册表一致，否则点击无法启动应用；
     * showdesktop 为固定必选项（前端按 appId 或文件名含「显示桌面」识别）
     */
    public const QUICKLAUNCH_APPS = [
        'showdesktop' => ['name' => '显示桌面.scf', 'type' => 'Explorer 命令'],
        'ie'          => ['name' => 'Internet Explorer.lnk', 'type' => '快捷方式'],
        'wmp'         => ['name' => 'Windows Media Player.lnk', 'type' => '快捷方式'],
        'notepad'     => ['name' => '记事本.lnk', 'type' => '快捷方式'],
        'calc'        => ['name' => '计算器.lnk', 'type' => '快捷方式'],
        'cmd'         => ['name' => '命令提示符.lnk', 'type' => '快捷方式'],
        'taskmgr'     => ['name' => '任务管理器.lnk', 'type' => '快捷方式'],
    ];

    /**
     * 快速启动默认项（后台未配置时的出厂值，与前端种子一致）
     */
    public const QUICKLAUNCH_DEFAULT = 'showdesktop,ie,wmp';

    /**
     * IE 默认主页（后台未配置 xp_ie_homepage 时的出厂值）
     *
     * 必须带 https:// 协议前缀：前端 XP 桌面以 iframe 承载真实网页，
     * 站点部署在 HTTPS 下时 http 主页会被浏览器混合内容策略拦截而白屏
     */
    public const IE_HOMEPAGE_DEFAULT = 'https://www.cmspro.cn/';

    /**
     * 内置游客帐户名（type=guest，由 xp_guest_enabled 控制是否对外开放）
     */
    public const GUEST_ACCOUNT = 'Guest';

    /**
     * 构建快速启动快捷方式节点（前端契约：kind=file + icon=shortcut + appId）
     */
    public static function buildQuickLaunchItem(string $appId): array
    {
        return [
            'name'  => self::QUICKLAUNCH_APPS[$appId]['name'],
            'kind'  => 'file',
            'icon'  => 'shortcut',
            'appId' => $appId,
            'size'  => '1 KB',
            'type'  => self::QUICKLAUNCH_APPS[$appId]['type'],
        ];
    }

    /**
     * 解析后台配置为合法 appId 列表
     *
     * 逗号分隔；未知 appId 丢弃、去重；showdesktop 缺失时强制置顶补入（必选项）
     *
     * @return array<string> 有序 appId 列表
     */
    public static function parseQuickLaunchConfig(string $raw): array
    {
        $ids = [];
        foreach (explode(',', $raw) as $id) {
            $id = trim($id);
            if (isset(self::QUICKLAUNCH_APPS[$id]) && !in_array($id, $ids, true)) {
                $ids[] = $id;
            }
        }

        if (!in_array('showdesktop', $ids, true)) {
            array_unshift($ids, 'showdesktop');
        }

        return $ids;
    }

    /**
     * 读取后台配置并解析为合法 appId 列表（含 showdesktop 必选项兜底）
     *
     * @return array<string> 有序 appId 列表
     */
    public static function configuredQuickLaunchIds(): array
    {
        $raw = (string) StorageManager::getConfig('xp_quicklaunch_defaults', self::QUICKLAUNCH_DEFAULT);

        return self::parseQuickLaunchConfig($raw);
    }

    /**
     * 读取后台配置并生成 Quick Launch 文件夹初始 children
     */
    public static function quickLaunchChildren(): array
    {
        return array_map(
            fn (string $appId) => self::buildQuickLaunchItem($appId),
            self::configuredQuickLaunchIds()
        );
    }

    /**
     * 归一化 IE 主页地址
     *
     * 管理员通常直接填域名（www.cmspro.cn），此处统一补全为 https 绝对地址：
     * 缺失协议时前端会自行补 http://，在 HTTPS 站点下将被混合内容策略拦截。
     * 空值回退出厂默认主页。
     *
     * @param string $raw 后台配置原始值
     * @return string 带协议的完整主页地址
     */
    public static function normalizeIeHomepage(string $raw): string
    {
        $url = trim($raw);
        if ($url === '') {
            return self::IE_HOMEPAGE_DEFAULT;
        }

        if (!preg_match('#^https?://#i', $url)) {
            $url = 'https://' . $url;
        }

        return $url;
    }

    /**
     * 读取后台配置的 IE 默认主页（已归一化）
     */
    public static function configuredIeHomepage(): string
    {
        return self::normalizeIeHomepage(
            (string) StorageManager::getConfig('xp_ie_homepage', self::IE_HOMEPAGE_DEFAULT)
        );
    }

    /**
     * 游客功能是否开启
     *
     * 出厂默认关闭：Guest 为只读体验帐户，其写入均为临时数据，
     * 面向公网开放时易被滥用，需管理员在后台显式开启
     */
    public static function guestEnabled(): bool
    {
        return (string) StorageManager::getConfig('xp_guest_enabled', '0') === '1';
    }

    /**
     * 按游客开关过滤对外可见的帐户列表
     *
     * 关闭时剔除 Guest（type=guest）：登录页不显示该头像，
     * 快照与帐户列表接口均不下发，避免前端绕过。
     * 快照中仍保留 Guest 种子数据，管理员重新开启即恢复，无需重建状态。
     *
     * @param array $accounts 帐户列表
     * @return array 过滤后的帐户列表
     */
    public static function filterVisibleAccounts(array $accounts): array
    {
        if (self::guestEnabled()) {
            return $accounts;
        }

        return array_values(array_filter(
            $accounts,
            fn ($account) => ($account['type'] ?? '') !== 'guest'
                && ($account['name'] ?? '') !== self::GUEST_ACCOUNT
        ));
    }

    /**
     * 生成完整初始状态
     *
     * @param string $username 当前用户名（用于会话）
     * @return array MockStateDTO
     */
    public static function create(string $username = 'Administrator'): array
    {
        $now = now()->toISOString();

        return [
            'version' => self::STATE_VERSION,
            'fsTree' => self::createFsTree($username),
            'recycleBin' => [],
            'settings' => self::createSettings(),
            'recentDocs' => [],
            'runHistory' => [],
            'printers' => self::createPrinters(),
            'printJobs' => [],
            'schedTasks' => [],
            // 不预置图标位置：前端对无位置图标按枚举序号取网格位自动排布（单列等距），
            // 预置部分位置会使未预置图标的序号回退位与预置位碰撞，导致图标堆叠错乱
            'desktopPos' => [],
            'ie' => self::createIeData(),
            'netDrives' => [],
            'audioBlobs' => [],
            'session' => [
                'user' => $username,
                'computer' => 'XP-STATION',
                'events' => [
                    [
                        'action' => 'login',
                        'at' => now()->timestamp * 1000,
                        'user' => $username,
                    ],
                ],
            ],
            'accounts' => self::createAccounts(),
        ];
    }

    /**
     * 创建初始文件系统树
     *
     * Documents and Settings 仅种当前登录帐户主目录（隐私隔离：
     * 其他 XP 帐户目录对当前用户不可见）；桌面/我的文档映射到 D 盘
     * （承载个人空间配额），C 盘主目录仅保留系统配置类子目录
     */
    private static function createFsTree(string $username): array
    {
        $now = now()->toISOString();

        return [
            'name' => '我的电脑',
            'kind' => 'folder',
            'icon' => 'folder',
            'children' => [
                [
                    'name' => '本地磁盘 (C:)',
                    'kind' => 'drive',
                    'icon' => 'hd',
                    'children' => [
                        [
                            'name' => 'Documents and Settings',
                            'kind' => 'folder',
                            'icon' => 'folder',
                            'created' => $now,
                            'modified' => $now,
                            'children' => [self::createUserHome($username)],
                        ],
                        [
                            'name' => 'WINDOWS',
                            'kind' => 'folder',
                            'icon' => 'folder',
                            'created' => $now,
                            'modified' => $now,
                            'children' => [
                                [
                                    'name' => 'system32',
                                    'kind' => 'folder',
                                    'icon' => 'folder',
                                    'created' => $now,
                                    'modified' => $now,
                                    'children' => [],
                                ],
                                [
                                    'name' => 'Resources',
                                    'kind' => 'folder',
                                    'icon' => 'folder',
                                    'created' => $now,
                                    'modified' => $now,
                                    'children' => [],
                                ],
                            ],
                        ],
                        [
                            'name' => 'Program Files',
                            'kind' => 'folder',
                            'icon' => 'folder',
                            'created' => $now,
                            'modified' => $now,
                            'children' => [
                                [
                                    'name' => 'Internet Explorer',
                                    'kind' => 'folder',
                                    'icon' => 'folder',
                                    'created' => $now,
                                    'modified' => $now,
                                    'children' => [],
                                ],
                            ],
                        ],
                    ],
                ],
                self::createLocalDriveD($username),
            ],
        ];
    }

    /**
     * 创建本地磁盘 (D:) 驱动器节点
     *
     * 承载后台「空间管理」分配给用户的配额空间，容量/已用（total/used，字节）
     * 由 StateService 在读取响应时动态注入、不落盘；
     * 传入用户名时同步种入该帐户的桌面/我的文档目录（默认映射到 D 盘）；
     * 公开供状态迁移替换历史快照中的光盘驱动器
     */
    public static function createLocalDriveD(string $username = ''): array
    {
        $now = now()->toISOString();

        return [
            'name' => '本地磁盘 (D:)',
            'kind' => 'drive',
            'icon' => 'hd',
            'created' => $now,
            'modified' => $now,
            'children' => $username !== '' ? [self::createUserHomeOnD($username)] : [],
        ];
    }

    /**
     * 创建 D 盘上的帐户目录（桌面 + My Documents）
     *
     * 桌面/我的文档默认映射到 D 盘，落盘计入个人空间配额；
     * C 盘主目录仅保留系统配置类子目录（快速启动/开始菜单/收藏夹等）
     */
    public static function createUserHomeOnD(string $name): array
    {
        $now = now()->toISOString();

        $myDocsChildren = [
            [
                'name' => '欢迎.txt',
                'kind' => 'file',
                'icon' => 'text',
                'type' => '文本文档',
                'size' => '1 KB',
                'content' => "欢迎使用 Windows XP WebOS！\n\n这是您的个人文档目录（已映射到本地磁盘 D:，占用个人空间配额）。\n",
                'created' => $now,
                'modified' => $now,
            ],
            [
                'name' => '图片收藏',
                'kind' => 'folder',
                'icon' => 'pictures',
                'created' => $now,
                'modified' => $now,
                'children' => [],
            ],
            [
                'name' => 'My Music',
                'kind' => 'folder',
                'icon' => 'music',
                'created' => $now,
                'modified' => $now,
                'children' => [],
            ],
        ];

        if ($name === 'Administrator') {
            $myDocsChildren[] = [
                'name' => 'My Videos',
                'kind' => 'folder',
                'icon' => 'folder',
                'created' => $now,
                'modified' => $now,
                'children' => [],
            ];
        }

        return [
            'name' => $name,
            'kind' => 'folder',
            'icon' => 'folder',
            'created' => $now,
            'modified' => $now,
            'children' => [
                [
                    'name' => '桌面',
                    'kind' => 'folder',
                    'icon' => 'folder',
                    'created' => $now,
                    'modified' => $now,
                    'children' => [
                        [
                            'name' => 'readme.txt',
                            'kind' => 'file',
                            'icon' => 'text',
                            'type' => '文本文档',
                            'size' => '1 KB',
                            'content' => "Windows XP WebOS 在线版\n\n双击桌面图标开始使用。\n",
                            'created' => $now,
                            'modified' => $now,
                        ],
                    ],
                ],
                [
                    'name' => 'My Documents',
                    'kind' => 'folder',
                    'icon' => 'folder',
                    'created' => $now,
                    'modified' => $now,
                    'children' => $myDocsChildren,
                ],
                [
                    'name' => 'Favorites',
                    'kind' => 'folder',
                    'icon' => 'folder',
                    'created' => $now,
                    'modified' => $now,
                    'children' => [
                        [
                            'name' => '链接',
                            'kind' => 'folder',
                            'icon' => 'folder',
                            'created' => $now,
                            'modified' => $now,
                            'children' => [],
                        ],
                    ],
                ],
                [
                    'name' => 'Application Data',
                    'kind' => 'folder',
                    'icon' => 'folder',
                    'hidden' => true,
                    'created' => $now,
                    'modified' => $now,
                    'children' => [
                        [
                            'name' => 'Microsoft',
                            'kind' => 'folder',
                            'icon' => 'folder',
                            'created' => $now,
                            'modified' => $now,
                            'children' => [
                                [
                                    'name' => 'Internet Explorer',
                                    'kind' => 'folder',
                                    'icon' => 'folder',
                                    'created' => $now,
                                    'modified' => $now,
                                    'children' => [
                                        [
                                            'name' => 'Quick Launch',
                                            'kind' => 'folder',
                                            'icon' => 'folder',
                                            'created' => $now,
                                            'modified' => $now,
                                            // 任务栏快速启动区数据源：按后台配置播种默认快捷方式，
                                            // 用户拖拽/删除经 /fs 接口持久化到此处
                                            'children' => self::quickLaunchChildren(),
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * 创建单个用户主目录（C 盘 Documents and Settings 下）
     *
     * C 盘只读策略下主目录为空壳：仅保留 NTUSER.DAT 系统配置文件；
     * 桌面/My Documents/收藏夹/快速启动全部映射到 D 盘（见 createUserHomeOnD），
     * 公开供 anonymous 模式与非内置帐户补种本人主目录（StateService）
     */
    public static function createUserHome(string $name): array
    {
        $now = now()->toISOString();

        $home = [
            'name' => $name,
            'kind' => 'folder',
            'icon' => 'folder',
            'created' => $now,
            'modified' => $now,
            'children' => [
                [
                    'name' => 'NTUSER.DAT',
                    'kind' => 'file',
                    'icon' => 'exe',
                    'type' => '系统文件',
                    'size' => '1,024 KB',
                    'hidden' => true,
                    'system' => true,
                    'created' => $now,
                    'modified' => $now,
                ],
            ],
        ];

        return $home;
    }

    /**
     * 创建默认设置
     */
    private static function createSettings(): array
    {
        return [
            'wallpaper' => 'bliss',
            'wallpaperPos' => 'stretch',
            'bgColor' => '#3a6ea5',
            'customWallpaper' => null,
            'customWallpaperName' => '',
            'deskIcons' => [
                'ie' => true,
                'mycomputer' => true,
                'mydocs' => true,
                'recycle' => true,
            ],
            'deskIconOverrides' => [],
            'iconSize' => 32,
            'soundsEnabled' => true,
            'masterVolume' => 50,
            'volumeMuted' => false,
            'screensaver' => 'none',
            'saverWait' => 15,
            'theme' => 'blue',
            'classicScheme' => 'windows-standard',
            'taskbarLocked' => true,
            'taskbarPos' => 'bottom',
            'taskbarH' => 30,
            'showQuickLaunch' => true,
            'taskbarAutoHide' => false,
            'taskbarOnTop' => true,
            'taskbarGroup' => true,
            'showClock' => true,
            'hideInactiveIcons' => true,
            'notifPrefs' => [],
            'tbDesktop' => false,
            'tbLinks' => false,
            'tbCustom' => [],
            // 必须与前端 DEFAULT_SETTINGS 一致：空对象=XP 出厂态（快速启动/桌面不显示标题、
            // 链接/自定义显示），写入 quick:true 会导致任务栏快速启动区多出「快速启动」文字
            'tbTitles' => [],
            'startClassic' => false,
            'classicOpts' => [
                'myDocs' => true, 'recentDocs' => true, 'search' => true,
                'help' => true, 'run' => true, 'allPrograms' => true,
                'logoff' => true, 'shutdown' => true,
            ],
            'startOpts' => ['bigIcons' => true, 'progCount' => 6, 'itemMode' => []],
            // 必须与前端 DEFAULT_SETTINGS 一致：autoArrange 为 true 时前端图标的
            // draggable 会被置为 false，desktopSort 非 none 时会强制排序并清空
            // desktopPos，两者任一开启都会导致桌面图标无法拖动
            'autoArrange' => false,
            'alignGrid' => true,
            'desktopSort' => 'none',
            'solitaireBack' => 0,
            'solitaireOpts' => ['draw' => 1, 'scoring' => 'none', 'timed' => false],
            'startPinned' => [
                ['key' => 'ie', 'label' => 'Internet Explorer'],
                ['key' => 'outlook', 'label' => 'Outlook Express'],
            ],
            'clockOffsetMin' => 0,
            'tzOffsetH' => 8,
            'tzName' => '(GMT+08:00) 北京，重庆，香港',
            'stickyKeys' => false,
            'hideFileExt' => true,
            'showHiddenFiles' => false,
            'showSystemFiles' => false,
            'showCommonTasks' => true,
            'clickToOpen' => false,
            'folderMisc' => [],
            'programUse' => [],
            'extAssoc' => [],
            'visualFX' => [
                'dragWindowContents' => true, 'winAnim' => true, 'smoothScroll' => true,
                'menuFade' => true, 'slideCombo' => true, 'menuShadow' => true,
                'cursorShadow' => false, 'visualStyles' => true,
            ],
            'regTree' => [
                'name' => '我的电脑',
                'children' => [
                    ['name' => 'HKEY_CLASSES_ROOT', 'children' => [], 'values' => []],
                    ['name' => 'HKEY_CURRENT_USER', 'children' => [], 'values' => []],
                    ['name' => 'HKEY_LOCAL_MACHINE', 'children' => [], 'values' => []],
                    ['name' => 'HKEY_USERS', 'children' => [], 'values' => []],
                    ['name' => 'HKEY_CURRENT_CONFIG', 'children' => [], 'values' => []],
                ],
                'values' => [],
            ],
            'inputLang' => 'ch',
            'langBarOn' => true,
        ];
    }

    /**
     * 创建打印机列表
     */
    private static function createPrinters(): array
    {
        return [
            ['name' => 'HP LaserJet', 'model' => 'HP LaserJet 1010', 'def' => true],
        ];
    }

    /**
     * 创建 IE 数据
     *
     * 主页取后台 xp_ie_homepage 配置，收藏夹首项与主页保持一致
     */
    private static function createIeData(): array
    {
        $home = self::configuredIeHomepage();

        return [
            'home' => $home,
            'favorites' => [
                ['url' => $home, 'title' => self::homepageTitle($home)],
            ],
            'history' => [],
        ];
    }

    /**
     * 由主页地址推导收藏夹显示标题（取主机名，解析失败回退完整地址）
     */
    private static function homepageTitle(string $home): string
    {
        $host = parse_url($home, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : $home;
    }

    /**
     * 创建种子帐户
     *
     * 密码使用 SHA-256 加盐哈希存储
     * Administrator 密码：2001
     * Guest：无密码
     * 公开供 anonymous 模式帐户注册表（XpAccountStore）种子复用
     */
    public static function createAccounts(): array
    {
        $adminPassword = self::hashPassword('2001');

        return [
            [
                'name' => 'Administrator',
                'type' => 'admin',
                'avatar' => 'avatar-admin',
                'hint' => 'Windows XP 的发布年份',
                'password' => $adminPassword,
            ],
            [
                'name' => 'Guest',
                'type' => 'guest',
                'avatar' => 'avatar-guest',
                'hint' => '',
                'password' => '',
            ],
        ];
    }

    /**
     * SHA-256 加盐哈希
     *
     * @param string $password 明文密码
     * @return string 哈希字符串（sha256$salt$hash）
     */
    private static function hashPassword(string $password): string
    {
        $salt = bin2hex(random_bytes(8));
        $hash = hash('sha256', $salt . $password);

        return 'sha256$' . $salt . '$' . $hash;
    }

    /**
     * 验证密码
     *
     * @param string $password 明文密码
     * @param string $stored 存储的哈希值
     * @return bool 是否匹配
     */
    public static function verifyPassword(string $password, string $stored): bool
    {
        // 空密码
        if ($stored === '') {
            return $password === '';
        }

        // SHA-256 加盐哈希格式
        if (str_starts_with($stored, 'sha256$')) {
            $parts = explode('$', $stored, 3);
            if (count($parts) === 3) {
                $salt = $parts[1];
                $hash = $parts[2];
                return hash('sha256', $salt . $password) === $hash;
            }
        }

        // 兼容旧明文格式
        return $password === $stored;
    }
}
