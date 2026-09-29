<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\InitialStateProvider;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use App\Apps\CmsproWindowsxponline\Services\XpAccountStore;
use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use App\Enums\Status;
use App\Models\User;
use App\Services\HookManager;
use App\Services\LoginSecurityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/**
 * XP WebOS 用户帐户端点
 *
 * 密码仅存于服务端，所有 API 响应一律剥离密码，只返回 hasPassword
 * 主目录联动：创建帐户同步种子主目录；改名同步重命名主目录；删除同步移除主目录
 *
 * GET /accounts - 帐户列表
 * POST /accounts/login - 登录验证
 * POST /accounts - 创建帐户
 * PATCH /accounts - 更改密码/提示/头像/名称
 * DELETE /accounts - 删除帐户
 */
class AccountController extends BaseController
{
    /**
     * 帐户列表（剥离密码，添加 hasPassword）
     *
     * anonymous 模式数据源为全局帐户注册表（登录前即可访问，不依赖桌面状态）；
     * 在线版/单机版读当前用户状态快照内的 accounts；
     * 后台游客功能关闭时统一剔除 Guest，登录页不再显示该帐户
     */
    public function list()
    {
        $accounts = StateService::isAnonymousMode()
            ? XpAccountStore::all()
            : ($this->getState()['accounts'] ?? []);

        $accounts = array_map(function ($account) {
            // Guest 等空密码帐户派生 false，前端保持单击即登录；有密码派生 true 展开密码框
            $account['hasPassword'] = ($account['password'] ?? '') !== '';
            unset($account['password']);
            return $account;
        }, InitialStateProvider::filterVisibleAccounts(is_array($accounts) ? $accounts : []));

        return XpResponse::success($accounts);
    }

    /**
     * 登录验证
     */
    public function login(Request $request)
    {
        $body = $this->jsonBody($request);
        $name = $body['name'] ?? '';
        $password = $body['password'] ?? '';

        if ($name === '') {
            return XpResponse::badRequest('缺少必填字段: name');
        }

        // 游客功能关闭时拒绝 Guest 登录（防绕过前端手工调用接口）
        if ($this->isGuestBlocked((string) $name)) {
            return XpResponse::success(['ok' => false, 'reason' => 'no-user']);
        }

        // anonymous 模式：验证全局注册表中的 XP 帐户名+密码，成功后写入 Web 会话
        if (StateService::isAnonymousMode()) {
            return $this->loginAnonymous($name, $password);
        }

        // 在线版欢迎屏直接登录：无 CMSPRO 会话时登录接口对未认证访问开放
        // （路由注册见 ServiceProvider），仅受理框架帐户，校验通过即建立会话
        if (StateService::getCurrentUserType() === null) {
            return $this->loginWithCmsproSession($request, $name, $password);
        }

        $state = $this->getState();

        $account = null;
        foreach ($state['accounts'] ?? [] as &$acc) {
            if (($acc['name'] ?? '') === $name) {
                $account = &$acc;
                break;
            }
        }

        if ($account === null) {
            // 在线版/单机版特判：CMSPRO 前台注册帐户不在桌面快照 accounts 内；
            // 按键入名查框架用户表（username），命中即按 bcrypt 校验密码放行。
            // 桌面数据仍属当前会话用户的快照，此处仅回写 session.user 显示名；
            // 禁用帐户视同不存在（no-user）
            $cmsproUser = User::where('username', $name)->first();

            if ($cmsproUser !== null && $cmsproUser->status === Status::ENABLED) {
                if (!Hash::check($password, (string) $cmsproUser->password)) {
                    return XpResponse::success(['ok' => false, 'reason' => 'bad-password']);
                }

                $state['session']['user'] = $name;
                $this->saveState($state);

                return XpResponse::success([
                    'ok' => true,
                    'account' => [
                        'name' => $name,
                        'type' => 'user',
                        'avatar' => 'avatar-admin',
                        'hint' => '',
                        'hasPassword' => true,
                    ],
                ]);
            }

            // reason 用 no-user 与前端欢迎屏文案判定对齐（not-found 会被误判为密码错误）
            return XpResponse::success(['ok' => false, 'reason' => 'no-user']);
        }

        // Administrator 密码以后台应用设置为准（xp_admin_password 配置后优先校验，
        // 未配置时回退 state 种子密码）；其余帐户沿用 state 内哈希
        if (!$this->verifyAccountPassword($name, $password, (string) ($account['password'] ?? ''))) {
            return XpResponse::success(['ok' => false, 'reason' => 'bad-password']);
        }

        $state['session']['user'] = $name;
        $this->saveState($state);

        $account['hasPassword'] = ($account['password'] ?? '') !== '';
        unset($account['password']);

        return XpResponse::success([
            'ok' => true,
            'account' => $account,
        ]);
    }

    /**
     * anonymous 模式登录：验证帐户名+密码，成功后写入 Web 会话
     *
     * Administrator 密码仍以后台 xp_admin_password 配置优先；
     * 登录即绑定该 XP 帐户的桌面状态（anon/{帐户名}/state.json），首次登录自动初始化
     */
    private function loginAnonymous(string $name, string $password)
    {
        $account = XpAccountStore::find($name);
        if ($account === null) {
            return XpResponse::success(['ok' => false, 'reason' => 'no-user']);
        }

        // 注册表中的游客类帐户同样受后台开关约束
        if ($this->isGuestBlocked($name, $account)) {
            return XpResponse::success(['ok' => false, 'reason' => 'no-user']);
        }

        if (!$this->verifyAccountPassword($name, $password, (string) ($account['password'] ?? ''))) {
            return XpResponse::success(['ok' => false, 'reason' => 'bad-password']);
        }

        session(['xp_account' => $name]);

        // 初始化/回写该帐户桌面状态中的当前登录用户（与在线版 login 语义一致）
        $state = $this->getState();
        $state['session']['user'] = $name;
        $this->saveState($state);

        $account['hasPassword'] = ($account['password'] ?? '') !== '';
        unset($account['password']);

        return XpResponse::success([
            'ok' => true,
            'account' => $account,
        ]);
    }

    /**
     * 在线版欢迎屏直接登录：未登录时为框架帐户建立 CMSPRO 会话
     *
     * 仅受理 users 表帐户（禁用视同不存在 no-user）；暴力防护复用框架
     * LoginSecurityService 失败锁定（scene=user，与前台登录页同一套规则）。
     * 会话建立流程对齐框架 UserAuthController::completeUserLogin
     * （登录统计 + user.after_login 钩子 + session regenerate 防固定），
     * 随后走与已登录特判相同的尾部：回写快照 session.user 并落盘。
     * 响应携带 relogin=true，前端据此 reload 重新 hydrate 后自动进入桌面。
     */
    private function loginWithCmsproSession(Request $request, string $name, string $password)
    {
        $loginSecurity = app(LoginSecurityService::class);

        if ($loginSecurity->isLocked('user', $name)) {
            return XpResponse::success(['ok' => false, 'reason' => 'locked']);
        }

        $cmsproUser = User::where('username', $name)->first();
        if ($cmsproUser === null || $cmsproUser->status !== Status::ENABLED) {
            return XpResponse::success(['ok' => false, 'reason' => 'no-user']);
        }

        if (!Hash::check($password, (string) $cmsproUser->password)) {
            $loginSecurity->recordFailure('user', $name);
            return XpResponse::success(['ok' => false, 'reason' => 'bad-password']);
        }

        $loginSecurity->clearFailures('user', $name);
        Auth::guard('web')->login($cmsproUser);
        $cmsproUser->incrementLoginCount((string) $request->ip());
        app(HookManager::class)->doAction('user.after_login', $cmsproUser);
        $request->session()->regenerate();

        $state = $this->getState();
        $state['session']['user'] = $name;
        $this->saveState($state);

        return XpResponse::success([
            'ok' => true,
            'relogin' => true,
            'account' => [
                'name' => $name,
                'type' => 'user',
                'avatar' => 'avatar-admin',
                'hint' => '',
                'hasPassword' => true,
            ],
        ]);
    }

    /**
     * 创建帐户
     */
    public function create(Request $request)
    {
        $body = $this->jsonBody($request);
        $name = $body['name'] ?? '';
        $password = $body['password'] ?? '';
        $hint = $body['hint'] ?? '';
        $type = $body['type'] ?? 'user';
        $avatar = $body['avatar'] ?? 'avatar-fish';

        if ($name === '') {
            return XpResponse::badRequest('缺少必填字段: name');
        }

        // anonymous 模式：帐户写入全局注册表，主目录联动仅作用于当前桌面快照
        if (StateService::isAnonymousMode()) {
            if (XpAccountStore::exists($name)) {
                return XpResponse::conflict("目标已存在同名的 \"{$name}\"");
            }

            XpAccountStore::add([
                'name' => $name,
                'type' => $type,
                'avatar' => $avatar,
                'hint' => $hint,
                'password' => $password !== '' ? $this->hashPassword($password) : '',
            ]);

            $state = $this->getState();
            $this->createUserHome($state, $name);
            $this->saveState($state);

            return XpResponse::success([
                'name' => $name,
                'type' => $type,
                'avatar' => $avatar,
                'hint' => $hint,
                'hasPassword' => $password !== '',
            ]);
        }

        $state = $this->getState();

        foreach ($state['accounts'] ?? [] as $acc) {
            if (($acc['name'] ?? '') === $name) {
                return XpResponse::conflict("目标已存在同名的 \"{$name}\"");
            }
        }

        $hashedPassword = $password !== '' ? $this->hashPassword($password) : '';

        $state['accounts'][] = [
            'name' => $name,
            'type' => $type,
            'avatar' => $avatar,
            'hint' => $hint,
            'password' => $hashedPassword,
        ];

        $this->createUserHome($state, $name);

        $this->saveState($state);

        return XpResponse::success([
            'name' => $name,
            'type' => $type,
            'avatar' => $avatar,
            'hint' => $hint,
            'hasPassword' => $password !== '',
        ]);
    }

    /**
     * 更改密码/提示/头像/名称
     */
    public function update(Request $request)
    {
        $body = $this->jsonBody($request);
        $name = $body['name'] ?? '';
        $newName = $body['newName'] ?? null;
        $password = $body['password'] ?? null;
        $hint = $body['hint'] ?? null;
        $avatar = $body['avatar'] ?? null;

        if ($name === '') {
            return XpResponse::badRequest('缺少必填字段: name');
        }

        if (in_array($name, ['Administrator', 'Guest'], true) && $newName !== null && $newName !== $name) {
            return XpResponse::error(403, '内置帐户不可重命名', 403);
        }

        // Administrator 密码由后台应用设置统一管理，防止桌面内改密后与后台口径撕裂
        if ($name === 'Administrator' && $password !== null) {
            return XpResponse::error(403, 'Administrator 密码请在后台应用设置中修改', 403);
        }

        // anonymous 模式：帐户数据写全局注册表，改名同步迁移该帐户状态文件
        if (StateService::isAnonymousMode()) {
            return $this->updateAnonymous($name, $newName, $password, $hint, $avatar);
        }

        $state = $this->getState();

        $account = null;
        $index = -1;
        foreach ($state['accounts'] ?? [] as $i => &$acc) {
            if (($acc['name'] ?? '') === $name) {
                $account = &$acc;
                $index = $i;
                break;
            }
        }

        if ($account === null) {
            return XpResponse::notFound("帐户不存在: {$name}");
        }

        if ($newName !== null && $newName !== $name) {
            foreach ($state['accounts'] as $other) {
                if (($other['name'] ?? '') === $newName) {
                    return XpResponse::conflict("目标已存在同名的 \"{$newName}\"");
                }
            }
            $account['name'] = $newName;
            $this->renameUserHome($state, $name, $newName);
        }

        if ($password !== null) {
            $account['password'] = $password !== '' ? $this->hashPassword($password) : '';
        }

        if ($hint !== null) {
            $account['hint'] = $hint;
        }

        if ($avatar !== null) {
            $account['avatar'] = $avatar;
        }

        $this->saveState($state);

        $account['hasPassword'] = ($account['password'] ?? '') !== '';
        unset($account['password']);

        return XpResponse::success($account);
    }

    /**
     * anonymous 模式更改帐户字段
     *
     * 数据写全局注册表；改名时迁移该帐户状态文件，
     * 若改的是当前登录帐户则会话身份同步为新名；主目录改名联动作用于当前桌面快照
     */
    private function updateAnonymous(string $name, ?string $newName, ?string $password, ?string $hint, ?string $avatar)
    {
        if (!XpAccountStore::exists($name)) {
            return XpResponse::notFound("帐户不存在: {$name}");
        }

        $changes = [];
        if ($password !== null) {
            $changes['password'] = $password !== '' ? $this->hashPassword($password) : '';
        }
        if ($hint !== null) {
            $changes['hint'] = $hint;
        }
        if ($avatar !== null) {
            $changes['avatar'] = $avatar;
        }

        if ($newName !== null && $newName !== $name) {
            if (XpAccountStore::exists($newName)) {
                return XpResponse::conflict("目标已存在同名的 \"{$newName}\"");
            }

            XpAccountStore::patch($name, $changes, $newName);
            StateService::renameAnonState($name, $newName);

            if (StateService::getAnonAccount() === $name) {
                session(['xp_account' => $newName]);
            }

            $state = $this->getState();
            $this->renameUserHome($state, $name, $newName);
            $this->saveState($state);

            $updatedName = $newName;
        } else {
            XpAccountStore::patch($name, $changes);
            $updatedName = $name;
        }

        $updated = XpAccountStore::find($updatedName) ?? [];
        $updated['hasPassword'] = ($updated['password'] ?? '') !== '';
        unset($updated['password']);

        return XpResponse::success($updated);
    }

    /**
     * 删除帐户
     */
    public function delete(Request $request)
    {
        $body = $this->jsonBody($request);
        $name = $body['name'] ?? '';

        if ($name === '') {
            return XpResponse::badRequest('缺少必填字段: name');
        }

        if (in_array($name, ['Administrator', 'Guest'], true)) {
            return XpResponse::error(403, '内置帐户不可删除', 403);
        }

        // anonymous 模式：主目录联动作用于当前桌面快照，再删注册表条目与帐户状态文件；
        // 状态文件必须最后删——若先删，当前登录的就是被删帐户时 getState 会重新初始化该文件
        if (StateService::isAnonymousMode()) {
            if (!XpAccountStore::exists($name)) {
                return XpResponse::notFound("帐户不存在: {$name}");
            }

            $state = $this->getState();
            $this->removeUserHome($state, $name);
            $this->saveState($state);

            XpAccountStore::remove($name);
            StateService::deleteAnonState($name);

            return XpResponse::success(['removed' => $name]);
        }

        $state = $this->getState();

        $removed = false;
        foreach ($state['accounts'] ?? [] as $i => $acc) {
            if (($acc['name'] ?? '') === $name) {
                array_splice($state['accounts'], $i, 1);
                $removed = true;
                break;
            }
        }

        if (!$removed) {
            return XpResponse::notFound("帐户不存在: {$name}");
        }

        $this->removeUserHome($state, $name);

        $this->saveState($state);

        return XpResponse::success(['removed' => $name]);
    }

    /**
     * 校验帐户密码
     *
     * Administrator 优先使用后台应用设置的 xp_admin_password（明文比对，
     * 配置为 Crypt 加密存储、getConfig 读取时已解密）；未配置时回退
     * state 内种子哈希。其余帐户一律按 state 内哈希校验。
     */
    private function verifyAccountPassword(string $name, string $input, string $storedHash): bool
    {
        if ($name === 'Administrator') {
            $configured = (string) StorageManager::getConfig('xp_admin_password', '');
            if ($configured !== '') {
                return hash_equals($configured, $input);
            }
        }

        return InitialStateProvider::verifyPassword($input, $storedHash);
    }

    /**
     * 判断游客帐户是否应被拒绝登录
     *
     * 后台 xp_guest_enabled 关闭（出厂默认）时，Guest 既不在登录页展示，
     * 也不受理直接提交的登录请求，防止绕过前端手工调用接口。
     *
     * @param string $name 请求的帐户名
     * @param array $account 已查得的帐户数据，未查得时传空数组
     * @return bool true 表示应拒绝（按 no-user 返回）
     */
    private function isGuestBlocked(string $name, array $account = []): bool
    {
        if (InitialStateProvider::guestEnabled()) {
            return false;
        }

        return $name === InitialStateProvider::GUEST_ACCOUNT
            || ($account['type'] ?? '') === 'guest';
    }

    /**
     * SHA-256 加盐哈希
     */
    private function hashPassword(string $password): string
    {
        $salt = bin2hex(random_bytes(8));
        $hash = hash('sha256', $salt . $password);
        return 'sha256$' . $salt . '$' . $hash;
    }

    /**
     * 创建用户主目录（C 盘空壳 + D 盘映射目录）
     *
     * C 盘只读策略：Documents and Settings 下仅建空壳主目录（NTUSER.DAT），
     * 桌面/我的文档/收藏夹/快速启动落在 D 盘帐户目录（计入个人空间配额）
     */
    private function createUserHome(array &$state, string $name): void
    {
        $this->ensureLocalDriveD($state);
        $this->addChildToNode(
            $state['fsTree'],
            ['本地磁盘 (C:)', 'Documents and Settings'],
            InitialStateProvider::createUserHome($name)
        );
        $this->addChildToNode(
            $state['fsTree'],
            ['本地磁盘 (D:)'],
            InitialStateProvider::createUserHomeOnD($name)
        );
    }

    /**
     * 确保 fsTree 存在「本地磁盘 (D:)」节点（用户删除盘符时补建）
     */
    private function ensureLocalDriveD(array &$state): void
    {
        $node = &\App\Apps\CmsproWindowsxponline\Services\FsTreeService::findNode(
            $state['fsTree'],
            ['本地磁盘 (D:)']
        );
        if ($node === null) {
            $state['fsTree']['children'][] = InitialStateProvider::createLocalDriveD();
        }
        unset($node);
    }

    /**
     * 重命名用户主目录（C 盘空壳与 D 盘映射目录同步改名）
     */
    private function renameUserHome(array &$state, string $oldName, string $newName): void
    {
        $paths = [
            ['本地磁盘 (C:)', 'Documents and Settings', $oldName],
            ['本地磁盘 (D:)', $oldName],
        ];
        foreach ($paths as $path) {
            $node = &\App\Apps\CmsproWindowsxponline\Services\FsTreeService::findNode(
                $state['fsTree'],
                $path
            );
            if ($node !== null) {
                $node['name'] = $newName;
                $node['modified'] = now()->toIso8601String();
            }
            unset($node);
        }
    }

    /**
     * 移除用户主目录（C 盘空壳与 D 盘映射目录一并删除）
     */
    private function removeUserHome(array &$state, string $name): void
    {
        \App\Apps\CmsproWindowsxponline\Services\FsTreeService::deleteNode(
            $state['fsTree'],
            ['本地磁盘 (C:)', 'Documents and Settings', $name]
        );
        \App\Apps\CmsproWindowsxponline\Services\FsTreeService::deleteNode(
            $state['fsTree'],
            ['本地磁盘 (D:)', $name]
        );
    }

    /**
     * 向指定路径节点添加子节点
     */
    private function addChildToNode(array &$tree, array $path, array $child): void
    {
        $node = &\App\Apps\CmsproWindowsxponline\Services\FsTreeService::findNode($tree, $path);
        if ($node !== null) {
            if (!isset($node['children']) || !is_array($node['children'])) {
                $node['children'] = [];
            }
            $node['children'][] = $child;
            $node['modified'] = now()->toIso8601String();
        }
    }
}
