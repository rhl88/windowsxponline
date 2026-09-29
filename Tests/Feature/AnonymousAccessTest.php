<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\AccountController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\SessionController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\StateController;
use App\Apps\CmsproWindowsxponline\Exceptions\StateException;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use App\Apps\CmsproWindowsxponline\Services\XpAccountStore;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 免登录版（anonymous）访问模式测试
 *
 * 覆盖需求：
 * - 前端访问不校验 CMSPRO 登录态，桌面身份按 XP 帐户（会话 xp_account）裁决
 * - 登录验证帐户名+密码；Administrator 密码后台配置优先
 * - 桌面状态按 XP 帐户隔离（anon/{帐户名}/state.json），Guest 正常持久化
 * - 游客功能开关 xp_guest_enabled 出厂默认关闭：Guest 不下发、不受理登录
 * - 帐户管理读写全局注册表 anon/accounts.json；改名/删除联动迁移状态文件
 * - 注销/关机清除会话身份；未登录访问状态接口返回 401
 */
class AnonymousAccessTest extends TestCase
{
    use WindowsxponlineSetup;
    use XpStateSandbox;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();

        // anonymous 模式经配置回退链生效（库中无 access_mode 行 → Config 默认值）
        config(['apps.cmspro.windowsxponline.access_mode' => 'anonymous']);

        $this->bootXpStateSandbox();
    }

    protected function tearDown(): void
    {
        session()->forget('xp_account');
        $this->shutdownXpStateSandbox();
        parent::tearDown();
    }

    /**
     * 调用 XP 登录接口并返回解析后的 data
     */
    private function login(string $name, string $password): array
    {
        $request = Request::create('/api/v1/accounts/login', 'POST');
        $request->headers->set('Content-Type', 'application/json');
        $request->json()->set('name', $name);
        $request->json()->set('password', $password);

        $payload = json_decode((new AccountController())->login($request)->getContent(), true);

        return $payload['data'] ?? [];
    }

    /**
     * 登录并断言成功（后续状态操作的前置）
     */
    private function loginOrFail(string $name, string $password): void
    {
        $data = $this->login($name, $password);
        $this->assertTrue($data['ok'] ?? false, "帐户 {$name} 应登录成功");
        $this->assertSame($name, session('xp_account'));
    }

    /**
     * 构造 JSON 请求
     */
    private function jsonRequest(string $uri, string $method, array $body): Request
    {
        $request = Request::create($uri, $method);
        $request->headers->set('Content-Type', 'application/json');
        foreach ($body as $key => $value) {
            $request->json()->set($key, $value);
        }

        return $request;
    }

    /**
     * 写入后台 xp_admin_password 配置（重注入内存驱动，避免 resetConfigCache 连带重置）
     */
    private function seedAdminPasswordConfig(string $plain): void
    {
        DB::table('config_items')->updateOrInsert(
            ['code' => 'app_cmspro_windowsxponline_xp_admin_password'],
            ['value' => Crypt::encryptString($plain)]
        );
        Cache::flush();
        StorageManager::resetConfigCache();
        $this->injectStorageDriver($this->memoryDriver);
    }

    /**
     * 未登录 XP 帐户访问状态接口：抛 not_logged_in 并渲染为 401
     */
    public function test_未登录访问状态接口返回401(): void
    {
        try {
            (new StateController())->snapshot();
            $this->fail('未登录应抛出 StateException');
        } catch (StateException $e) {
            $this->assertSame('not_logged_in', $e->getReason());
            $response = $e->render(Request::create('/api/v1/state', 'GET'));
            $this->assertSame(401, $response->getStatusCode());
        }
    }

    /**
     * /accounts 列表免登录可访问：返回注册表种子帐户（Administrator+Guest）且剥离密码
     *
     * Guest 需后台开启游客功能才随列表下发（出厂默认关闭）
     */
    public function test_帐户列表免登录可访问(): void
    {
        $this->seedXpConfig('xp_guest_enabled', '1');

        $payload = json_decode((new AccountController())->list()->getContent(), true);

        $names = array_column($payload['data'] ?? [], 'name');
        $this->assertContains('Administrator', $names);
        $this->assertContains('Guest', $names);
        foreach ($payload['data'] as $acc) {
            $this->assertArrayNotHasKey('password', $acc);
        }
    }

    /**
     * 游客功能出厂默认关闭（anonymous 模式）：注册表仍存 Guest 种子，
     * 但列表不下发、登录被拒，避免免登录站点被游客滥用
     */
    public function test_游客功能默认关闭时不下发Guest(): void
    {
        $this->assertTrue(XpAccountStore::exists('Guest'), '注册表应保留 Guest 种子数据');

        $payload = json_decode((new AccountController())->list()->getContent(), true);
        $names = array_column($payload['data'] ?? [], 'name');
        $this->assertNotContains('Guest', $names, '关闭时登录页不应显示 Guest');
        $this->assertContains('Administrator', $names);

        $data = $this->login('Guest', '');
        $this->assertFalse($data['ok'] ?? true, '关闭时应拒绝 Guest 登录');
        $this->assertSame('no-user', $data['reason'] ?? '');
        $this->assertNull(session('xp_account'), '被拒的登录不应写入会话');
    }

    /**
     * 登录验证帐户名+密码：错误密码/不存在帐户拒绝，正确凭据写入会话并初始化帐户状态
     */
    public function test_登录验证帐户名与密码(): void
    {
        $data = $this->login('Administrator', 'wrong');
        $this->assertFalse($data['ok'] ?? true);
        $this->assertSame('bad-password', $data['reason'] ?? '');
        $this->assertNull(session('xp_account'), '密码错误不应写入会话');

        $data = $this->login('Nonexistent', 'x');
        $this->assertFalse($data['ok'] ?? true);
        $this->assertSame('no-user', $data['reason'] ?? '');

        $this->loginOrFail('Administrator', '2001');

        // 首次登录自动初始化该帐户桌面状态
        $state = $this->memoryDriver->readState('anon/Administrator/state.json');
        $this->assertNotNull($state, '登录后应生成 anon/Administrator/state.json');
        $this->assertSame('Administrator', $state['session']['user'] ?? '');
    }

    /**
     * Administrator 密码以后台 xp_admin_password 配置优先（anonymous 模式）
     */
    public function test_Administrator密码后台配置优先(): void
    {
        $this->seedAdminPasswordConfig('newpass');

        $data = $this->login('Administrator', '2001');
        $this->assertFalse($data['ok'] ?? true, '后台配置密码后种子密码应失效');

        $this->loginOrFail('Administrator', 'newpass');
    }

    /**
     * 桌面状态按 XP 帐户隔离：各帐户互不可见，切回原帐户数据仍在
     */
    public function test_桌面状态按帐户隔离(): void
    {
        $this->seedXpConfig('xp_guest_enabled', '1');
        $this->loginOrFail('Administrator', '2001');
        $state = StateService::getCurrentState();
        $state['settings']['wallpaper'] = 'autumn';
        StateService::saveCurrentState($state);

        $this->loginOrFail('Guest', '');
        $guestState = StateService::getCurrentState();
        $this->assertSame('bliss', $guestState['settings']['wallpaper'] ?? '', 'Guest 不应看到 Administrator 的改动');
        $this->assertSame('Guest', $guestState['session']['user'] ?? '');

        $this->loginOrFail('Administrator', '2001');
        $this->assertSame('autumn', StateService::getCurrentState()['settings']['wallpaper'] ?? '');
    }

    /**
     * anonymous 模式 Guest 为独立帐户，状态正常持久化（不适用在线版只读语义）
     */
    public function test_Guest匿名模式可持久化(): void
    {
        $this->seedXpConfig('xp_guest_enabled', '1');
        $this->loginOrFail('Guest', '');
        $state = StateService::getCurrentState();
        $state['settings']['wallpaper'] = 'rose';
        StateService::saveCurrentState($state);

        $persisted = $this->memoryDriver->readState('anon/Guest/state.json');
        $this->assertSame('rose', $persisted['settings']['wallpaper'] ?? '');
    }

    /**
     * 帐户管理走全局注册表：创建/改名/删除联动注册表与帐户状态文件
     */
    public function test_帐户管理读写全局注册表(): void
    {
        $this->loginOrFail('Administrator', '2001');

        // 创建
        $payload = json_decode(
            (new AccountController())->create(
                $this->jsonRequest('/api/v1/accounts', 'POST', ['name' => 'Bob', 'password' => 'bobpw'])
            )->getContent(),
            true
        );
        $this->assertTrue($payload['data']['hasPassword'] ?? false);
        $this->assertTrue(XpAccountStore::exists('Bob'), '注册表应包含新帐户');

        // 新帐户首次登录：状态含本人主目录
        session()->forget('xp_account');
        $this->loginOrFail('Bob', 'bobpw');
        $snapshot = $this->memoryDriver->readState('anon/Bob/state.json');
        $dsNode = &FsTreeService::findNode($snapshot['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings']);
        $homes = $dsNode['children'] ?? [];
        unset($dsNode);
        $this->assertContains('Bob', array_column($homes, 'name'), '新帐户状态应种入本人主目录');

        // 改名：注册表 + 状态文件 + 会话身份同步
        $payload = json_decode(
            (new AccountController())->update(
                $this->jsonRequest('/api/v1/accounts', 'PATCH', ['name' => 'Bob', 'newName' => 'Bobby'])
            )->getContent(),
            true
        );
        $this->assertSame('Bobby', $payload['data']['name'] ?? '');
        $this->assertFalse(XpAccountStore::exists('Bob'));
        $this->assertTrue(XpAccountStore::exists('Bobby'));
        $this->assertNull($this->memoryDriver->readState('anon/Bob/state.json'), '旧名状态文件应被移除');
        $this->assertNotNull($this->memoryDriver->readState('anon/Bobby/state.json'), '状态文件应迁移到新名');
        $this->assertSame('Bobby', session('xp_account'), '当前登录帐户改名后会话身份应同步');

        // 删除：注册表 + 状态文件移除
        $payload = json_decode(
            (new AccountController())->delete(
                $this->jsonRequest('/api/v1/accounts', 'DELETE', ['name' => 'Bobby'])
            )->getContent(),
            true
        );
        $this->assertSame('Bobby', $payload['data']['removed'] ?? '');
        $this->assertFalse(XpAccountStore::exists('Bobby'));
        $this->assertNull($this->memoryDriver->readState('anon/Bobby/state.json'));
    }

    /**
     * 内置帐户保护规则在 anonymous 模式同样生效
     */
    public function test_内置帐户保护(): void
    {
        $this->loginOrFail('Administrator', '2001');

        $payload = json_decode(
            (new AccountController())->delete(
                $this->jsonRequest('/api/v1/accounts', 'DELETE', ['name' => 'Guest'])
            )->getContent(),
            true
        );
        $this->assertSame(403, $payload['error']['code'] ?? 0, '内置帐户不可删除');

        $payload = json_decode(
            (new AccountController())->update(
                $this->jsonRequest('/api/v1/accounts', 'PATCH', ['name' => 'Administrator', 'password' => 'hacked'])
            )->getContent(),
            true
        );
        $this->assertSame(403, $payload['error']['code'] ?? 0, 'Administrator 密码桌面内不可修改');
    }

    /**
     * 快照 accounts 以注册表为准（替换状态内置出厂种子）
     */
    public function test_快照帐户以注册表为准(): void
    {
        $this->loginOrFail('Administrator', '2001');
        XpAccountStore::add([
            'name' => 'Alice',
            'type' => 'user',
            'avatar' => 'avatar-fish',
            'hint' => '',
            'password' => '',
        ]);

        $snapshot = json_decode((new StateController())->snapshot()->getContent(), true);
        $names = array_column($snapshot['data']['accounts'] ?? [], 'name');
        $this->assertContains('Alice', $names);
        foreach ($snapshot['data']['accounts'] as $acc) {
            $this->assertArrayNotHasKey('password', $acc);
            $this->assertArrayHasKey('hasPassword', $acc);
        }
    }

    /**
     * 注销/关机清除 XP 帐户会话身份，重启保留
     */
    public function test_注销与关机清除会话(): void
    {
        $this->loginOrFail('Administrator', '2001');

        (new SessionController())->action(
            $this->jsonRequest('/api/v1/session', 'POST', ['action' => 'restart'])
        );
        $this->assertSame('Administrator', session('xp_account'), '重启应保留会话身份');

        (new SessionController())->action(
            $this->jsonRequest('/api/v1/session', 'POST', ['action' => 'logoff'])
        );
        $this->assertNull(session('xp_account'), '注销应清除会话身份');

        $this->expectException(StateException::class);
        StateService::getCurrentState();
    }

    /**
     * 回归：online 模式不受影响，仍按 CMSPRO 登录身份读写状态
     */
    public function test_在线模式行为不变(): void
    {
        config(['apps.cmspro.windowsxponline.access_mode' => 'online']);

        $this->assertFalse(StateService::isAnonymousMode());

        // 沙箱 admin 登录态即可读取状态，无需 xp_account 会话
        $state = StateService::getCurrentState();
        $this->assertSame('tester', $state['session']['user'] ?? '');
    }
}
