<?php

namespace App\Apps\CmsproWindowsxponline\Services;

use App\Apps\CmsproWindowsxponline\Exceptions\StateException;
use App\Apps\CmsproWindowsxponline\Models\UserSpace;
use Illuminate\Support\Facades\Auth;

/**
 * XP WebOS 状态管理服务
 *
 * 负责用户 XP 桌面状态的读取、保存、初始化和重置
 * 数据以整体 JSON 快照形式存储，每用户一个 state.json
 */
class StateService
{
    /**
     * 单份状态快照硬上限（字节，10MB）
     *
     * 正常 XP 桌面快照远小于该值，超限说明数据异常（如被恶意灌入超大状态），
     * 拒绝落盘以保护存储与配额，独立于用户 quota 兜底。
     */
    private const MAX_STATE_BYTES = 10485760;

    /**
     * 免登录版（anonymous）身份类型标识
     *
     * 该模式下桌面状态按 XP 帐户名隔离存储（anon/{帐户名}/state.json），
     * 不走 CMSPRO 登录态与 UserSpace 配额体系。
     */
    public const ANON_USER_TYPE = 'anon';

    /**
     * 空间记录请求内缓存（"类型:ID" => UserSpace|null）
     *
     * @var array<string, UserSpace|null>
     */
    private static array $spaceCache = [];

    /**
     * 当前访问模式是否为免登录版（anonymous）
     */
    public static function isAnonymousMode(): bool
    {
        return (string) StorageManager::getConfig('access_mode', 'online') === 'anonymous';
    }

    /**
     * 免登录版当前已登录的 XP 帐户名
     *
     * 身份来源为 Web 会话中的 xp_account（由 /accounts/login 验证帐户名+密码后写入），
     * 与 CMSPRO 用户登录态无关。
     *
     * @return string|null 未登录 XP 帐户时返回 null
     */
    public static function getAnonAccount(): ?string
    {
        $account = session('xp_account');

        return is_string($account) && $account !== '' ? $account : null;
    }

    /**
     * 获取当前登录用户类型
     *
     * @return string|null 'admin' | 'user' | null（未登录）
     */
    public static function getCurrentUserType(): ?string
    {
        if (Auth::guard('admin')->check()) {
            return UserSpace::TYPE_ADMIN;
        }
        if (Auth::guard('web')->check()) {
            return UserSpace::TYPE_USER;
        }
        return null;
    }

    /**
     * 获取当前登录用户 ID
     */
    public static function getCurrentUserId(): ?int
    {
        if (Auth::guard('admin')->check()) {
            return Auth::guard('admin')->id();
        }
        if (Auth::guard('web')->check()) {
            return Auth::guard('web')->id();
        }
        return null;
    }

    /**
     * 获取当前登录用户名
     *
     * 后台走 admin guard，前台走 web guard（框架未定义 user guard）
     */
    public static function getCurrentUsername(): string
    {
        $user = Auth::guard('admin')->user() ?? Auth::guard('web')->user();
        return $user->username ?? $user->name ?? 'Administrator';
    }

    /**
     * 获取用户状态存储键
     *
     * @param string $userType admin|user|anon
     * @param string|int $userId 用户 ID；anonymous 模式为 XP 帐户名
     * @return string 存储键路径
     */
    public static function getStorageKey(string $userType, string|int $userId): string
    {
        return $userType . '/' . $userId . '/state.json';
    }

    /**
     * 解析当前请求的身份三元组
     *
     * 与 getCurrentState() 的身份裁决口径完全一致，供 blob 存储层复用：
     * blob 键与快照键共用 `{userType}/{userId}/` 前缀，从而天然按身份隔离，
     * 无需在各控制器中重复解析身份与重复抛出未登录异常。
     *
     * @return array{userType: string, userId: string|int}
     * @throws StateException 未登录（not_logged_in，渲染为 401）
     */
    public static function getCurrentIdentity(): array
    {
        if (self::isAnonymousMode()) {
            $account = self::getAnonAccount();
            if ($account === null) {
                throw new StateException('请先登录 Windows 帐户', 'not_logged_in');
            }

            return ['userType' => self::ANON_USER_TYPE, 'userId' => $account];
        }

        $userType = self::getCurrentUserType();
        $userId = self::getCurrentUserId();

        if ($userType === null || $userId === null) {
            throw new StateException('登录状态已失效，请重新登录', 'not_logged_in');
        }

        return ['userType' => $userType, 'userId' => $userId];
    }

    /**
     * 判断当前会话是否为 Guest 只读（服务端一律不落盘）
     *
     * Guest 是 CMSPRO 访客的临时身份，桌面内创建的文件与操作记录均为临时数据，
     * 不占配额、不污染持久状态，接口照常返回成功。
     * 仅适用于在线版/单机版；anonymous 模式下 Guest 是独立 XP 帐户、
     * 状态按帐户隔离，正常持久化。
     *
     * blob 上传必须复用本判断：Guest 的快照不落盘，若仍允许上传，
     * blob 会真实占用存储却没有任何树节点引用它，成为永远无法回收的孤儿对象。
     *
     * @param array $state 完整状态快照
     */
    public static function isGuestReadonly(array $state): bool
    {
        return !self::isAnonymousMode() && ($state['session']['user'] ?? '') === 'Guest';
    }

    /**
     * 读取用户状态
     *
     * 不存在时返回 null（由调用方决定是否初始化）
     *
     * @param string $userType admin|user|anon
     * @param string|int $userId 用户 ID；anonymous 模式为 XP 帐户名
     * @return array|null MockStateDTO 或 null
     */
    public static function getState(string $userType, string|int $userId): ?array
    {
        $key = self::getStorageKey($userType, $userId);
        $driver = StorageManager::getDriver();

        if (!$driver->exists($key)) {
            return null;
        }

        $data = $driver->read($key);
        if ($data === null) {
            return null;
        }

        $state = json_decode($data, true);
        if (!is_array($state)) {
            return null;
        }

        return $state;
    }

    /**
     * 获取当前用户状态（自动初始化）
     *
     * 如果状态不存在，则使用 InitialStateProvider 创建初始状态并保存。
     * anonymous 模式按会话中的 XP 帐户名读取，未登录返回 401 语义异常。
     *
     * @return array MockStateDTO
     * @throws StateException 未登录，或初始状态落盘失败
     */
    public static function getCurrentState(): array
    {
        if (self::isAnonymousMode()) {
            return self::getCurrentAnonState();
        }

        $userType = self::getCurrentUserType();
        $userId = self::getCurrentUserId();

        if ($userType === null || $userId === null) {
            throw new StateException('登录状态已失效，请重新登录', 'not_logged_in');
        }

        $state = self::getState($userType, $userId);
        if ($state !== null) {
            return self::injectDriveQuota(self::applyStateMigrations($state, $userType, $userId), $userType, $userId);
        }

        $username = self::getCurrentUsername();
        $state = InitialStateProvider::create($username);

        // 必须先建配额记录再落盘：saveState 内部会校验配额，
        // 记录缺失会导致初始状态永远写不进去，每次请求都重新初始化。
        // used_mb 由 saveState 统一更新，此处不再重复计算
        self::ensureUserSpace($userType, $userId, $username);
        self::saveState($userType, $userId, $state);

        return self::injectDriveQuota($state, $userType, $userId);
    }

    /**
     * anonymous 模式：读取当前 XP 帐户状态（首次登录自动初始化）
     *
     * @throws StateException 未登录 XP 帐户（not_logged_in，渲染为 401）
     */
    private static function getCurrentAnonState(): array
    {
        $account = self::getAnonAccount();
        if ($account === null) {
            throw new StateException('请先登录 Windows 帐户', 'not_logged_in');
        }

        $state = self::getState(self::ANON_USER_TYPE, $account);
        if ($state !== null) {
            return self::injectDriveQuota(
                self::applyStateMigrations($state, self::ANON_USER_TYPE, $account),
                self::ANON_USER_TYPE,
                $account
            );
        }

        $state = self::createAnonState($account);
        self::saveState(self::ANON_USER_TYPE, $account, $state);

        return self::injectDriveQuota($state, self::ANON_USER_TYPE, $account);
    }

    /**
     * anonymous 模式：构建 XP 帐户初始状态
     *
     * InitialStateProvider::create 已按当前帐户种入本人主目录
     * （Documents and Settings/{帐户名}，仅系统配置类子目录）与
     * D 盘帐户目录（桌面/我的文档），保证首次登录后路径可寻址。
     *
     * @return array MockStateDTO
     */
    private static function createAnonState(string $account): array
    {
        return InitialStateProvider::create($account);
    }

    /**
     * 以当前身份保存状态（模式分发）
     *
     * anonymous 模式按会话 XP 帐户名落盘，不校验 UserSpace 配额；
     * 在线版/单机版按 admin/user 身份走原配额链路。
     *
     * @param array $state 完整 MockStateDTO
     * @throws StateException 未登录或写入失败
     */
    public static function saveCurrentState(array $state): void
    {
        if (self::isAnonymousMode()) {
            $account = self::getAnonAccount();
            if ($account === null) {
                throw new StateException('登录状态已失效，请重新登录', 'not_logged_in');
            }
            self::saveState(self::ANON_USER_TYPE, $account, $state);

            return;
        }

        $userType = self::getCurrentUserType();
        $userId = self::getCurrentUserId();

        if ($userType === null || $userId === null) {
            throw new StateException('登录状态已失效，请重新登录后再保存', 'not_logged_in');
        }

        self::saveState($userType, $userId, $state);
    }

    /**
     * 重置当前身份状态到出厂初始状态（模式分发）
     *
     * @return array 重置后的 MockStateDTO
     * @throws StateException 未登录
     */
    public static function resetCurrentState(): array
    {
        if (self::isAnonymousMode()) {
            $account = self::getAnonAccount();
            if ($account === null) {
                throw new StateException('请先登录 Windows 帐户', 'not_logged_in');
            }

            $state = self::createAnonState($account);
            self::saveState(self::ANON_USER_TYPE, $account, $state);

            return $state;
        }

        $userType = self::getCurrentUserType();
        $userId = self::getCurrentUserId();

        if ($userType === null || $userId === null) {
            throw new StateException('登录状态已失效，请重新登录', 'not_logged_in');
        }

        return self::resetState($userType, $userId, self::getCurrentUsername());
    }

    /**
     * anonymous 模式：帐户改名时迁移状态文件
     *
     * 同步快照内 session.user；旧帐户尚无状态文件时静默跳过。
     */
    public static function renameAnonState(string $oldName, string $newName): void
    {
        $driver = StorageManager::getDriver();
        $oldKey = self::getStorageKey(self::ANON_USER_TYPE, $oldName);
        $raw = $driver->read($oldKey);
        if ($raw === null) {
            return;
        }

        $state = json_decode($raw, true);
        if (is_array($state)) {
            $state['session']['user'] = $newName;
            $raw = (string) json_encode($state, JSON_UNESCAPED_UNICODE);
        }

        $driver->write(self::getStorageKey(self::ANON_USER_TYPE, $newName), $raw);
        $driver->delete($oldKey);
    }

    /**
     * anonymous 模式：删除帐户时移除其状态文件
     */
    public static function deleteAnonState(string $name): void
    {
        StorageManager::getDriver()->delete(self::getStorageKey(self::ANON_USER_TYPE, $name));
    }

    /**
     * 保存用户状态
     *
     * 写入前校验空间配额，写入后更新已用量。
     * 任一环节失败均抛出 StateException，由异常自带的 render() 渲染为错误响应，
     * 不再返回 false 造成「接口成功但数据已丢失」的静默失败。
     *
     * @param string $userType admin|user|anon
     * @param string|int $userId 用户 ID；anonymous 模式为 XP 帐户名
     * @param array $state 完整 MockStateDTO
     * @throws StateException 序列化失败、空间未开通/被停用、配额不足或写入失败
     */
    public static function saveState(string $userType, string|int $userId, array $state): void
    {
        $isAnon = $userType === self::ANON_USER_TYPE;

        // Guest 为只读模式：桌面内创建的文件与操作记录均为临时数据，
        // 服务端一律不落盘（不占配额、不污染持久状态），接口照常返回成功。
        // 判定口径统一收敛到 isGuestReadonly()，避免与 blob 上传的准入校验漂移
        if (self::isGuestReadonly($state)) {
            return;
        }

        // 剥离响应态注入的 D 盘配额字段（injectDriveQuota 写入），
        // 防止前端整表回传把瞬时容量固化进快照、后台改配额后不生效
        foreach ($state['fsTree']['children'] ?? [] as $i => $node) {
            if (($node['kind'] ?? '') === 'drive' && str_ends_with((string) ($node['name'] ?? ''), '(D:)')) {
                unset($state['fsTree']['children'][$i]['total'], $state['fsTree']['children'][$i]['used']);
                break;
            }
        }

        // 不使用 JSON_PRETTY_PRINT：快照为机器读写文件，缩进换行会使体积膨胀约一倍，
        // 白白占用用户配额并拖慢读写
        $json = json_encode($state, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new StateException('桌面状态序列化失败，请刷新后重试', 'serialize_failed');
        }

        $size = strlen($json);
        if ($size > self::MAX_STATE_BYTES) {
            throw new StateException(
                sprintf('桌面数据异常（已达 %d MB 上限），保存被拒绝', intdiv(self::MAX_STATE_BYTES, 1048576)),
                'state_too_large'
            );
        }

        // anonymous 模式不挂接 CMSPRO 用户体系，无 UserSpace 配额记录，
        // 仅保留上方 MAX_STATE_BYTES 兜底
        if (!$isAnon) {
            self::assertQuotaAvailable($userType, $userId, $size);
        }

        $key = self::getStorageKey($userType, $userId);
        if (!StorageManager::getDriver()->write($key, $json)) {
            throw new StateException('桌面状态保存失败，请稍后重试', 'write_failed');
        }

        if (!$isAnon) {
            self::updateUsedSpaceBySize($userType, $userId, $size);
        }
    }

    /**
     * 重置用户状态到出厂初始状态
     *
     * @param string $userType admin|user
     * @param int $userId 用户 ID
     * @param string $username 用户名
     * @return array 重置后的 MockStateDTO
     */
    public static function resetState(string $userType, int $userId, string $username = 'Administrator'): array
    {
        $state = InitialStateProvider::create($username);
        self::saveState($userType, $userId, $state);

        return $state;
    }

    /**
     * 校验空间配额是否允许写入
     *
     * 仅 StateService 内部使用，失败时抛出携带精确原因的 StateException，
     * 便于前端展示可操作的提示、后端日志按 reason 聚合。
     *
     * @param string $userType admin|user
     * @param int $userId 用户 ID
     * @param int $bytes 待写入字节数
     * @throws StateException 空间记录缺失、空间被停用或配额不足
     */
    private static function assertQuotaAvailable(string $userType, int $userId, int $bytes): void
    {
        $space = self::getUserSpace($userType, $userId);

        if (!$space) {
            throw new StateException('云空间尚未开通，请联系管理员', 'space_missing');
        }

        if ($space->status !== UserSpace::STATUS_ENABLED) {
            throw new StateException('云空间已被停用，无法保存桌面状态', 'space_disabled');
        }

        // quota_mb=0 表示不限制（与运维文档口径一致），仅正配额参与容量校验
        if ($space->quota_mb > 0 && $bytes > $space->quota_mb * 1024 * 1024) {
            throw new StateException(
                sprintf('云空间不足（上限 %d MB），无法保存桌面状态', $space->quota_mb),
                'quota_exceeded'
            );
        }
    }

    /**
     * 更新用户已用空间（按字节数）
     *
     * used_mb 口径为「快照字节 + blob 总量」，与 assertBlobFits() 的配额校验一致：
     * 只记快照会让上传大文件后后台「空间管理」的已用量严重失真（一个 50 MB 的
     * blob 在快照里只占几十字节的引用）。
     *
     * @param string $userType
     * @param int $userId
     * @param int $bytes 快照 JSON 字节数
     */
    public static function updateUsedSpaceBySize(string $userType, int $userId, int $bytes): void
    {
        $space = self::getUserSpace($userType, $userId);
        if (!$space) {
            return;
        }

        $total = $bytes + BlobService::totalBytes(['userType' => $userType, 'userId' => $userId]);
        $space->used_mb = (int) ceil($total / (1024 * 1024));
        $space->save();
    }

    /**
     * 校验 blob 上传是否仍有配额空间
     *
     * 配额口径为「快照字节 + 已存 blob 总量 + 本次新增字节 ≤ 配额」。
     *
     * 本校验只在上传初始化时执行，saveState() 的「单次快照 ≤ 配额」逻辑保持不变：
     * 若把 blob 总量也塞进 saveState 校验，blob 一旦占满配额，桌面将无法保存任何
     * 改动 —— 连删除那个大文件来自救都做不到，形成死锁。
     *
     * anonymous 模式不挂接 CMSPRO 用户体系、无 UserSpace 记录，
     * 与 saveState() 口径一致地跳过配额校验（仅受 MAX_STATE_BYTES 兜底）。
     *
     * @param array{userType: string, userId: string|int} $identity
     * @param int $incomingBytes 本次待写入的字节数
     * @throws StateException 空间记录缺失、空间被停用或配额不足
     */
    public static function assertBlobFits(array $identity, int $incomingBytes): void
    {
        $userType = (string) $identity['userType'];
        if ($userType === self::ANON_USER_TYPE) {
            return;
        }

        $userId = (int) $identity['userId'];
        $space = self::getUserSpace($userType, $userId);

        if (!$space) {
            throw new StateException('云空间尚未开通，请联系管理员', 'space_missing');
        }
        if ($space->status !== UserSpace::STATUS_ENABLED) {
            throw new StateException('云空间已被停用，无法上传文件', 'space_disabled');
        }

        // quota_mb=0 表示不限制（与 assertQuotaAvailable 口径一致）
        if ($space->quota_mb <= 0) {
            return;
        }

        $identity['userType'] = $userType;
        $used = self::snapshotBytes($userType, $userId) + BlobService::totalBytes($identity);
        $quotaBytes = $space->quota_mb * 1048576;

        if ($used + $incomingBytes > $quotaBytes) {
            throw new StateException(
                sprintf(
                    '云空间不足（上限 %d MB，已用 %d MB），无法上传该文件',
                    $space->quota_mb,
                    (int) ceil($used / 1048576)
                ),
                'quota_exceeded'
            );
        }
    }

    /**
     * 读取已落盘快照的原始字节数（无快照时为 0）
     *
     * 直接取存储对象的 strlen，不经过 json_decode/encode 往返，
     * 避免重编码造成的字节数漂移让配额口径失真。
     */
    public static function snapshotBytes(string $userType, string|int $userId): int
    {
        $raw = StorageManager::getDriver()->read(self::getStorageKey($userType, $userId));

        return $raw === null ? 0 : strlen($raw);
    }

    /**
     * 获取用户空间配额记录
     *
     * 同一次请求内配额记录会被配额校验、已用量更新等多处读取，
     * 这里做请求内记忆，避免重复查库；PHP-FPM 下静态属性随请求结束释放。
     */
    public static function getUserSpace(string $userType, int $userId): ?UserSpace
    {
        $cacheKey = $userType . ':' . $userId;

        if (array_key_exists($cacheKey, self::$spaceCache)) {
            return self::$spaceCache[$cacheKey];
        }

        $space = UserSpace::where('user_type', $userType)
            ->where('user_id', $userId)
            ->first();

        return self::$spaceCache[$cacheKey] = $space;
    }

    /**
     * 清空空间记录的请求内缓存
     *
     * 供测试用例在换库/重建数据前隔离状态使用。
     */
    public static function resetSpaceCache(): void
    {
        self::$spaceCache = [];
    }

    /**
     * 确保用户空间配额记录存在
     *
     * 不存在时创建默认配额记录
     */
    public static function ensureUserSpace(string $userType, int $userId, string $username): UserSpace
    {
        $space = self::getUserSpace($userType, $userId);
        if ($space) {
            return $space;
        }

        $space = UserSpace::create([
            'user_type' => $userType,
            'user_id' => $userId,
            'username' => $username,
            'quota_mb' => StorageManager::getDefaultQuotaMb(),
            'used_mb' => 0,
            'status' => UserSpace::STATUS_ENABLED,
        ]);

        self::$spaceCache[$userType . ':' . $userId] = $space;

        return $space;
    }

    /**
     * 递归合并源 children 到目标列表（按名称去重）
     *
     * 同名目标条目：双方均为文件夹时递归合并其 children，否则保留目标侧
     * （D 盘迁移态为权威数据）；目标不存在的条目追加到列表末尾
     *
     * @param array<int, array<string, mixed>> $dst 目标子节点列表（引用传入，就地修改）
     * @param array<int, array<string, mixed>> $src 源子节点列表
     */
    private static function mergeChildren(array &$dst, array $src): void
    {
        foreach ($src as $item) {
            $name = (string) ($item['name'] ?? '');
            $idx = null;
            foreach ($dst as $k => $exist) {
                if ((string) ($exist['name'] ?? '') === $name) {
                    $idx = $k;
                    break;
                }
            }
            if ($idx === null) {
                $dst[] = $item;
                continue;
            }
            if (($dst[$idx]['kind'] ?? '') === 'folder' && ($item['kind'] ?? '') === 'folder') {
                if (!isset($dst[$idx]['children']) || !is_array($dst[$idx]['children'])) {
                    $dst[$idx]['children'] = [];
                }
                self::mergeChildren($dst[$idx]['children'], $item['children'] ?? []);
            }
        }
    }

    /**
     * 对历史快照应用一次性迁移并落盘
     *
     * 当前包含五项：
     * - 驱动器布局：移除「3.5 软盘 (A:)」，「光盘驱动器/CD 驱动器 (D:)」替换为
     *   「本地磁盘 (D:)」（承载空间管理配额）；用户已改名/删除的盘符节点不触碰；
     * - 登录帐户主目录自动补建：session.user 在 Documents and Settings 下无同名
     *   主目录时（在线版/单机版 CMSPRO 特判登录仅回写显示名）补建标准主目录，
     *   新登录与自动登录（hydrate 走 GET /state）的老数据均自愈；
     * - 主目录 D 盘映射：C 盘主目录内的「桌面/My Documents/Favorites/Application Data」
     *   搬至 D:\{帐户}\ 对应目录（计入个人空间配额），C 盘主目录仅剩 NTUSER.DAT 空壳；
     *   Documents and Settings 过滤为仅当前登录帐户（隐私隔离，其他帐户目录不可见）；
     * - 快速启动默认项增量同步：后台勾选的默认项（xp_quicklaunch_defaults）缺失于
     *   老用户快照时补入并落盘，覆盖 D 盘每个 XP 帐户目录
     *   （Administrator/Guest 等）；每帐户每项仅同步一次（以快照顶层
     *   qlDefaultsApplied 按帐户名记录的标记映射），用户之后手动删除的不复活；
     *   用户删除整个 Quick Launch 文件夹则尊重其操作不再补
     * - 归一化旧种子写入的 tbTitles（quick/desktop/links 三键值恰为旧默认）为
     *   空对象，使任务栏快速启动区不再显示「快速启动」文字，与 XP 出厂态一致；
     *   用户自行开关过标题的快照不会命中该特征，不受影响
     * - IE 默认主页强制同步：后台 xp_ie_homepage 与快照 ieHomeApplied 标记不一致时
     *   覆盖 ie.home 并更新标记，实现「后台改一次、所有用户下次加载即生效」，
     *   同时保留用户在桌面「Internet 选项」中的后续自定义
     *
     * 落盘失败（如配额超限）不阻断本次读取，内存态照常返回、下次请求重试。
     *
     * @param array $state 已加载的用户状态
     * @param string $userType admin|user|anon
     * @param string|int $userId 用户 ID；anonymous 模式为 XP 帐户名
     * @return array 迁移后的状态
     */
    private static function applyStateMigrations(array $state, string $userType, string|int $userId): array
    {
        $changed = false;
        $user = (string) ($state['session']['user'] ?? '');

        // 驱动器布局迁移：软盘 (A:) 移除、光驱 (D:) 替换为本地磁盘 (D:)（承载配额空间）。
        // 仅处理出厂默认命名的节点；用户改名/删除的盘符视为其主动操作，不再触碰、不补建
        $driveChildren = $state['fsTree']['children'] ?? null;
        if (is_array($driveChildren)) {
            $normalized = [];
            foreach ($driveChildren as $node) {
                $name = (string) ($node['name'] ?? '');
                if (($node['kind'] ?? '') !== 'drive') {
                    $normalized[] = $node;
                    continue;
                }
                if ($name === '3.5 软盘 (A:)') {
                    $changed = true;
                    continue;
                }
                if ($name === '光盘驱动器 (D:)' || $name === 'CD 驱动器 (D:)') {
                    $normalized[] = InitialStateProvider::createLocalDriveD($user);
                    $changed = true;
                    continue;
                }
                $normalized[] = $node;
            }
            $state['fsTree']['children'] = $normalized;
        }

        // 增量同步覆盖 D 盘上所有 XP 帐户目录（Administrator / Guest 等），
        // 每个帐户独立记录同步标记
        $ids = InitialStateProvider::configuredQuickLaunchIds();
        // 兼容旧格式：顶层字符串标记视为当前登录帐户的同步记录
        $appliedRaw = $state['qlDefaultsApplied'] ?? '';
        $appliedMap = is_array($appliedRaw) ? $appliedRaw : [$user => (string) $appliedRaw];

        // 登录帐户主目录补建：CMSPRO 特判登录仅回写 session.user，
        // 老快照 Documents and Settings 下无该帐户主目录时快速启动区会空白；
        // 补建标准主目录（Quick Launch 按后台配置种子），后续循环自然为其记同步标记
        if ($user !== '') {
            $dsNode = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings']);
            if ($dsNode !== null) {
                $hasHome = false;
                foreach ($dsNode['children'] ?? [] as $home) {
                    if (($home['name'] ?? '') === $user) {
                        $hasHome = true;
                        break;
                    }
                }
                if (!$hasHome) {
                    $dsNode['children'][] = InitialStateProvider::createUserHome($user);
                    $changed = true;
                }
            }
            unset($dsNode);
        }

        // 主目录 D 盘映射迁移：登录帐户 C 盘主目录下的「桌面/My Documents/Favorites/Application Data」
        // 整体搬到 D:\{帐户}\ 对应目录（落 D 盘计入个人空间配额），并把
        // Documents and Settings 过滤为仅当前登录帐户（隐私隔离，其他帐户目录不可见）。
        // D 盘节点缺失（用户删除盘符）时跳过；迁移后特征自然消失，重复执行无副作用
        if ($user !== '') {
            $dnsNode = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings']);
            $dNode = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (D:)']);
            if ($dnsNode !== null && $dNode !== null && is_array($dnsNode['children'] ?? null)) {
                // D 盘帐户目录缺失时补种（种子即出厂映射态）
                $dHomeIdx = null;
                foreach ($dNode['children'] ?? [] as $k => $dh) {
                    if (($dh['name'] ?? '') === $user) {
                        $dHomeIdx = $k;
                        break;
                    }
                }
                if ($dHomeIdx === null) {
                    $dNode['children'][] = InitialStateProvider::createUserHomeOnD($user);
                    $dHomeIdx = array_key_last($dNode['children']);
                    $changed = true;
                }

                // 搬移 C 盘主目录内的桌面/My Documents/Favorites/Application Data（含用户文件并入 D 盘同名目录）
                $homeIdx = null;
                foreach ($dnsNode['children'] as $k => $home) {
                    if (($home['name'] ?? '') === $user) {
                        $homeIdx = $k;
                        break;
                    }
                }
                if ($homeIdx !== null) {
                    foreach (['桌面', 'My Documents', 'Favorites', 'Application Data'] as $dirName) {
                        $srcIdx = null;
                        foreach ($dnsNode['children'][$homeIdx]['children'] ?? [] as $k => $sub) {
                            if (($sub['name'] ?? '') === $dirName) {
                                $srcIdx = $k;
                                break;
                            }
                        }
                        if ($srcIdx === null) {
                            continue;
                        }
                        $srcNode = $dnsNode['children'][$homeIdx]['children'][$srcIdx];
                        $dstIdx = null;
                        foreach ($dNode['children'][$dHomeIdx]['children'] ?? [] as $k => $sub) {
                            if (($sub['name'] ?? '') === $dirName) {
                                $dstIdx = $k;
                                break;
                            }
                        }
                        if ($dstIdx === null) {
                            $dNode['children'][$dHomeIdx]['children'][] = $srcNode;
                        } else {
                            // 并入同名目录：递归按名称去重，D 盘同名条目优先（迁移态为权威数据）
                            $dstChildren = &$dNode['children'][$dHomeIdx]['children'][$dstIdx]['children'];
                            if (!is_array($dstChildren)) {
                                $dstChildren = [];
                            }
                            self::mergeChildren($dstChildren, $srcNode['children'] ?? []);
                            unset($dstChildren);
                        }
                        array_splice($dnsNode['children'][$homeIdx]['children'], $srcIdx, 1);
                        $changed = true;
                    }
                }

                // DNS 过滤：仅保留当前登录帐户主目录
                $kept = array_values(array_filter(
                    $dnsNode['children'],
                    static fn ($h): bool => ($h['name'] ?? '') === $user
                ));
                if (count($kept) !== count($dnsNode['children'])) {
                    $dnsNode['children'] = $kept;
                    $changed = true;
                }
            }
            unset($dnsNode, $dNode);
        }

        $homes = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (D:)']);
        foreach ($homes['children'] ?? [] as $home) {
            $homeName = (string) ($home['name'] ?? '');
            if ($homeName === '') {
                continue;
            }

            $quickLaunch = &FsTreeService::findNode($state['fsTree'], [
                '本地磁盘 (D:)', $homeName,
                'Application Data', 'Microsoft', 'Internet Explorer', 'Quick Launch',]);
            if ($quickLaunch === null) {
                continue;
            }

            // 仅补入「配置勾选、文件夹缺失、且该帐户未曾同步过」的项；
            // 用户删除已同步项不再复活
            $applied = array_values(array_filter(explode(',', (string) ($appliedMap[$homeName] ?? ''))));
            $children = $quickLaunch['children'] ?? [];

            $toAdd = [];
            foreach ($ids as $id) {
                if (in_array($id, $applied, true)) {
                    continue;
                }
                $exists = false;
                foreach ($children as $child) {
                    if (($child['appId'] ?? '') === $id
                        || ($child['name'] ?? '') === InitialStateProvider::QUICKLAUNCH_APPS[$id]['name']) {
                        $exists = true;
                        break;
                    }
                }
                if (!$exists) {
                    $toAdd[] = $id;
                }
            }

            foreach ($toAdd as $id) {
                $quickLaunch['children'][] = InitialStateProvider::buildQuickLaunchItem($id);
            }
            unset($quickLaunch);

            $marker = implode(',', $ids);
            if ($toAdd !== [] || $marker !== implode(',', $applied)) {
                $appliedMap[$homeName] = $marker;
                $changed = true;
            }
        }
        unset($homes);

        if (($state['qlDefaultsApplied'] ?? null) !== $appliedMap) {
            $state['qlDefaultsApplied'] = $appliedMap;
            $changed = true;
        }

        // 旧种子特征：恰为 quick=true、desktop=false、links=false 三键，
        // 归一化为空对象即回到前端 DEFAULT_SETTINGS 的 XP 出厂态
        $tbTitles = $state['settings']['tbTitles'] ?? null;
        if (is_array($tbTitles)
            && count($tbTitles) === 3
            && ($tbTitles['quick'] ?? null) === true
            && ($tbTitles['desktop'] ?? null) === false
            && ($tbTitles['links'] ?? null) === false
        ) {
            $state['settings']['tbTitles'] = [];
            $changed = true;
        }

        // IE 默认主页强制同步：后台 xp_ie_homepage 变更后覆盖所有用户快照的 ie.home。
        // 以 ieHomeApplied 记录「已生效的配置值」——配置未变时不再覆盖，
        // 用户在桌面「Internet 选项」自定义的主页得以保留（否则该功能形同虚设）
        $ieHome = InitialStateProvider::configuredIeHomepage();
        if (($state['ieHomeApplied'] ?? '') !== $ieHome) {
            if (!isset($state['ie']) || !is_array($state['ie'])) {
                $state['ie'] = ['favorites' => [], 'history' => []];
            }
            $state['ie']['home'] = $ieHome;
            $state['ieHomeApplied'] = $ieHome;
            $changed = true;
        }

        if ($changed) {
            try {
                self::saveState($userType, $userId, $state);
            } catch (\Throwable $e) {
                // 迁移落盘失败不影响读取（Guest 只读跳过亦属正常）
            }
        }

        return $state;
    }

    /**
     * 向本地磁盘 (D:) 节点注入配额容量（仅响应态，不落盘）
     *
     * D 盘承载后台「空间管理」分配的用户配额：total/used 为字节，
     * 前端磁盘属性对话框按 fsTree 节点该两字段动态渲染容量条。
     * quota_mb=0（不限制）与免登录版无 UserSpace 时显示标称 40 GiB；
     * saveState 落盘前剥离这两字段，防止前端整表回传把瞬时配额固化进快照
     */
    private static function injectDriveQuota(array $state, string $userType, string|int $userId): array
    {
        // 标称容量 40 GiB（与 C 盘同量级），用于「不限制」场景的展示兜底
        $nominal = 42949672960;

        if ($userType === self::ANON_USER_TYPE) {
            $total = $nominal;
            // 免登录版无 UserSpace 记录，已用量只能实时汇总：快照字节 + blob 总量
            $used = strlen((string) json_encode($state, JSON_UNESCAPED_UNICODE))
                + BlobService::totalBytes(['userType' => $userType, 'userId' => $userId]);
        } else {
            $space = self::getUserSpace($userType, (int) $userId);
            $quotaMb = (int) ($space->quota_mb ?? 0);
            $total = $quotaMb > 0 ? $quotaMb * 1048576 : $nominal;
            // used_mb 已由 updateUsedSpaceBySize() 按「快照 + blob」口径写入，此处不再叠加
            $used = (int) ($space->used_mb ?? 0) * 1048576;
        }

        // 注意：foreach 引用必须作用于可修改的直接表达式，
        // 用 `?? []` 会产生临时副本导致写入丢失
        if (isset($state['fsTree']['children']) && is_array($state['fsTree']['children'])) {
            foreach ($state['fsTree']['children'] as &$node) {
                if (($node['kind'] ?? '') === 'drive' && str_ends_with((string) ($node['name'] ?? ''), '(D:)')) {
                    $node['total'] = $total;
                    $node['used'] = $used;
                    break;
                }
            }
            unset($node);
        }

        return $state;
    }

    /**
     * 处理对外输出的帐户列表（API 响应前）
     *
     * - 按后台游客开关过滤：xp_guest_enabled 关闭（出厂默认）时剔除 Guest，
     *   登录页不再显示该帐户，快照与帐户列表接口均不下发，避免前端绕过；
     *   快照内仍保留 Guest 种子数据，管理员重新开启即恢复
     * - 移除 password 字段并派生 hasPassword，保护安全
     *
     * @param array $state 完整状态
     * @return array 处理后的状态
     */
    public static function stripAccounts(array $state): array
    {
        if (isset($state['accounts']) && is_array($state['accounts'])) {
            $state['accounts'] = array_map(function ($account) {
                // 前端契约：剥离 password 并派生 hasPassword，
                // 欢迎屏据此决定单击直接登录（Guest）还是展开密码框（Administrator）
                $account['hasPassword'] = ($account['password'] ?? '') !== '';
                unset($account['password']);
                return $account;
            }, InitialStateProvider::filterVisibleAccounts($state['accounts']));
        }

        return $state;
    }
}
