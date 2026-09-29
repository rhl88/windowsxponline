<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\AccountController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\StateController;
use App\Apps\CmsproWindowsxponline\Models\UserSpace;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\InitialStateProvider;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Windows XP 在线版 · XP 帐户认证与 Guest 只读测试
 *
 * 覆盖需求：
 * - Administrator 密码由后台应用设置（xp_admin_password）统一管理，
 *   配置后优先校验，未配置回退 state 种子密码；桌面内改密被拒绝
 * - Guest 为只读模式：可登录但所有写入不持久化
 * - 游客功能由后台 xp_guest_enabled 控制，出厂默认关闭时 Guest 既不下发也不受理登录
 */
class XpAccountAuthTest extends TestCase
{
    use WindowsxponlineSetup;
    use XpStateSandbox;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();
        $this->ensureUsersTable();
        $this->bootXpStateSandbox();
    }

    protected function tearDown(): void
    {
        $this->shutdownXpStateSandbox();
        parent::tearDown();
    }

    /**
     * 种入含 XP 帐户的完整初始状态（sandbox trait 的 seedXpState 不含 accounts）
     */
    private function seedFullState(): void
    {
        $state = InitialStateProvider::create($this->sandboxUsername);
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);
    }

    /**
     * 写入后台 xp_admin_password 配置（按加密字段口径存 Crypt 密文）
     */
    private function seedAdminPasswordConfig(string $plain): void
    {
        DB::table('config_items')->updateOrInsert(
            ['code' => 'app_cmspro_windowsxponline_xp_admin_password'],
            ['value' => Crypt::encryptString($plain)]
        );
        // 种子状态构建已读取过配置（快速启动默认项），写库后必须失效两级缓存
        Cache::flush();
        StorageManager::resetConfigCache();
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
     * 未配置后台密码时，Administrator 沿用 state 种子密码（2001）登录
     */
    public function test_Administrator未配置后台密码时回退种子密码(): void
    {
        $this->seedFullState();

        $data = $this->login('Administrator', '2001');
        $this->assertTrue($data['ok'] ?? false);

        $data = $this->login('Administrator', 'wrong');
        $this->assertFalse($data['ok'] ?? true);
    }

    /**
     * 配置后台密码后，Administrator 以配置值校验、种子密码失效
     */
    public function test_Administrator以后台配置密码登录(): void
    {
        $this->seedFullState();
        $this->seedAdminPasswordConfig('newpass');

        $data = $this->login('Administrator', '2001');
        $this->assertFalse($data['ok'] ?? true, '后台配置密码后种子密码应失效');

        $data = $this->login('Administrator', 'newpass');
        $this->assertTrue($data['ok'] ?? false, '后台配置密码应可登录');
    }

    /**
     * Guest 无密码可直接登录（需后台开启游客功能，出厂默认关闭）
     */
    public function test_Guest无密码登录成功(): void
    {
        $this->seedFullState();
        $this->seedXpConfig('xp_guest_enabled', '1');

        $data = $this->login('Guest', '');
        $this->assertTrue($data['ok'] ?? false);
    }

    /**
     * Guest 登录后服务端快照不落盘：session.user 保持登录前的持久值
     */
    public function test_Guest登录不持久化状态(): void
    {
        $this->seedFullState();
        $this->seedXpConfig('xp_guest_enabled', '1');
        $beforeUser = $this->readXpState()['session']['user'] ?? null;

        $this->login('Guest', '');

        $this->assertNotSame('Guest', $this->readXpState()['session']['user'] ?? null);
        $this->assertSame($beforeUser, $this->readXpState()['session']['user'] ?? null);
    }

    /**
     * 游客功能出厂默认关闭：帐户列表与快照均剔除 Guest，直接提交 Guest 登录亦被拒
     *
     * 覆盖前端隐藏之外的服务端裁决，防止绕过界面手工调用接口登录游客
     */
    public function test_游客功能默认关闭时Guest不可见且拒绝登录(): void
    {
        $this->seedFullState();
        $this->assertFalse(InitialStateProvider::guestEnabled(), '出厂默认应关闭游客功能');

        $payload = json_decode((new AccountController())->list()->getContent(), true);
        $names = array_column($payload['data'] ?? [], 'name');
        $this->assertNotContains('Guest', $names, '关闭时帐户列表不应下发 Guest');
        $this->assertContains('Administrator', $names, '其余帐户不受影响');

        $snapshot = json_decode((new StateController())->snapshot()->getContent(), true);
        $this->assertNotContains(
            'Guest',
            array_column($snapshot['data']['accounts'] ?? [], 'name'),
            '关闭时快照 accounts 不应下发 Guest'
        );

        $data = $this->login('Guest', '');
        $this->assertFalse($data['ok'] ?? true, '关闭时应拒绝 Guest 登录');
        $this->assertSame('no-user', $data['reason'] ?? '');
    }

    /**
     * 关闭期间快照仍保留 Guest 种子数据：后台重新开启即恢复，无需重建状态
     */
    public function test_游客功能重新开启后Guest恢复可见(): void
    {
        $this->seedFullState();
        StateService::getCurrentState();

        $this->seedXpConfig('xp_guest_enabled', '1');

        $payload = json_decode((new AccountController())->list()->getContent(), true);
        $this->assertContains('Guest', array_column($payload['data'] ?? [], 'name'));

        $data = $this->login('Guest', '');
        $this->assertTrue($data['ok'] ?? false, '开启后 Guest 应可登录');
    }

    /**
     * Guest 会话下保存桌面状态被静默跳过（不写入、不报错）
     */
    public function test_Guest状态下保存被跳过(): void
    {
        $this->seedFullState();
        $beforeTree = $this->readXpState()['fsTree'] ?? null;

        StateService::saveState(UserSpace::TYPE_ADMIN, $this->sandboxAdminId, [
            'fsTree' => ['name' => '临时改动', 'children' => []],
            'session' => ['user' => 'Guest'],
        ]);

        $this->assertSame($beforeTree, $this->readXpState()['fsTree'] ?? null, 'Guest 写入不应落盘');
    }

    /**
     * 桌面内修改 Administrator 密码被拒绝（统一由后台管理）
     */
    public function test_桌面内修改Administrator密码被拒绝(): void
    {
        $this->seedFullState();

        $request = Request::create('/api/v1/accounts', 'PATCH');
        $request->headers->set('Content-Type', 'application/json');
        $request->json()->set('name', 'Administrator');
        $request->json()->set('password', 'hacked');

        $payload = json_decode((new AccountController())->update($request)->getContent(), true);

        $this->assertSame(403, $payload['error']['code'] ?? ($payload['code'] ?? 0));
    }

    /**
     * 前端欢迎屏数据驱动契约：/accounts 与 /state 快照的 accounts
     * 必须按实际密码派生 hasPassword（Administrator=true 展开密码框、
     * Guest=false 单击即登录），且永不泄漏 password 字段
     */
    public function test_帐户列表与快照派生hasPassword(): void
    {
        $this->seedFullState();
        $this->seedXpConfig('xp_guest_enabled', '1');

        $payload = json_decode((new AccountController())->list()->getContent(), true);
        $byName = [];
        foreach ($payload['data'] ?? [] as $acc) {
            $byName[$acc['name']] = $acc;
        }

        $this->assertTrue($byName['Administrator']['hasPassword'] ?? false, 'Administrator 应派生 hasPassword=true');
        $this->assertFalse($byName['Guest']['hasPassword'] ?? true, 'Guest 应派生 hasPassword=false');
        $this->assertArrayNotHasKey('password', $byName['Administrator']);

        $snapshot = json_decode((new StateController())->snapshot()->getContent(), true);
        $this->assertNotEmpty($snapshot['data']['accounts'] ?? []);
        foreach ($snapshot['data']['accounts'] as $acc) {
            $this->assertArrayHasKey('hasPassword', $acc, '快照 accounts 缺少 hasPassword 派生');
            $this->assertArrayNotHasKey('password', $acc);
        }
        $snapshotByName = [];
        foreach ($snapshot['data']['accounts'] as $acc) {
            $snapshotByName[$acc['name']] = $acc;
        }
        $this->assertTrue($snapshotByName['Administrator']['hasPassword'] ?? false);
        $this->assertFalse($snapshotByName['Guest']['hasPassword'] ?? true);
    }

    /**
     * 最小 users 表兜底（框架迁移未含时自建，字段口径与框架一致）
     */
    private function ensureUsersTable(): void
    {
        if (Schema::hasTable('users')) {
            return;
        }
        Schema::create('users', function ($table) {
            $table->increments('id');
            $table->string('username', 50)->unique();
            $table->string('email', 100)->nullable();
            $table->string('password', 255)->default('');
            $table->tinyInteger('status')->default(1);
            $table->dateTime('create_time')->nullable();
            $table->dateTime('update_time')->nullable();
        });
    }

    /**
     * 创建 CMSPRO 前台注册用户
     */
    private function createCmsproUser(string $username, string $password, int $status = 1): void
    {
        DB::table('users')->insert([
            'username' => $username,
            'email' => $username . '@example.com',
            'password' => Hash::make($password),
            'status' => $status,
            'create_time' => now(),
            'update_time' => now(),
        ]);
    }

    /**
     * 在线版特判：CMSPRO 注册帐户按键入名查用户表校验 bcrypt 密码放行，
     * 回写 session.user 但不种入快照 accounts 列表
     */
    public function test_CMSPRO注册帐户特判登录成功(): void
    {
        $this->seedFullState();
        $this->createCmsproUser('xpuser', 'secret123');

        $data = $this->login('xpuser', 'secret123');
        $this->assertTrue($data['ok'] ?? false, 'CMSPRO 注册帐户应特判放行');
        $this->assertSame('xpuser', $this->readXpState()['session']['user'] ?? null);

        $names = array_column($this->readXpState()['accounts'] ?? [], 'name');
        $this->assertNotContains('xpuser', $names, 'CMSPRO 帐户不应进入快照 accounts');
    }

    /**
     * CMSPRO 帐户密码错误返回 bad-password（与 XP 帐户口径一致）
     */
    public function test_CMSPRO帐户密码错误返回bad_password(): void
    {
        $this->seedFullState();
        $this->createCmsproUser('xpuser2', 'secret123');

        $data = $this->login('xpuser2', 'wrong');
        $this->assertFalse($data['ok'] ?? true);
        $this->assertSame('bad-password', $data['reason'] ?? '');
    }

    /**
     * 未知帐户返回 no-user（前端欢迎屏「找不到用户」文案判定口径）
     */
    public function test_未知帐户返回no_user(): void
    {
        $this->seedFullState();

        $data = $this->login('Nobody', 'x');
        $this->assertFalse($data['ok'] ?? true);
        $this->assertSame('no-user', $data['reason'] ?? '');
    }

    /**
     * 禁用的 CMSPRO 帐户视同不存在（no-user），即使密码正确
     */
    public function test_禁用CMSPRO帐户返回no_user(): void
    {
        $this->seedFullState();
        $this->createCmsproUser('xpuser3', 'secret123', 0);

        $data = $this->login('xpuser3', 'secret123');
        $this->assertFalse($data['ok'] ?? true);
        $this->assertSame('no-user', $data['reason'] ?? '');
    }

    /**
     * CMSPRO 特判登录自愈：老快照无该帐户主目录时，下一次状态加载
     * （前端 hydrate 走 GET /state）自动补建主目录，
     * 其 Quick Launch 按后台配置种子（修复快速启动区空白）
     */
    public function test_CMSPRO登录后自动补建主目录与快速启动(): void
    {
        $this->seedFullState();
        $this->createCmsproUser('xpuser4', 'secret123');

        $data = $this->login('xpuser4', 'secret123');
        $this->assertTrue($data['ok'] ?? false);

        // 模拟登录后前端 hydrate：getCurrentState 触发迁移补建并落盘
        $loaded = StateService::getCurrentState();

        $home = &FsTreeService::findNode($loaded['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings', 'xpuser4']);
        $this->assertNotNull($home, '应自动补建登录帐户主目录');
        unset($home);

        $quickLaunch = &FsTreeService::findNode($loaded['fsTree'], [
            '本地磁盘 (D:)', 'xpuser4',
            'Application Data', 'Microsoft', 'Internet Explorer', 'Quick Launch',]);
        $this->assertNotNull($quickLaunch, 'D 盘帐户目录应含 Quick Launch 文件夹');
        $ids = array_map(fn($child) => $child['appId'] ?? '', $quickLaunch['children'] ?? []);
        $this->assertContains('showdesktop', $ids, 'Quick Launch 应含出厂默认项');
        unset($quickLaunch);

        $persisted = $this->readXpState();
        $homePersisted = &FsTreeService::findNode($persisted['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings', 'xpuser4']);
        $this->assertNotNull($homePersisted, '补建结果应落盘');
        unset($homePersisted);
    }

    /**
     * 精简 users 表补齐登录统计列（incrementLoginCount 依赖，真库迁移已含）
     */
    private function ensureLoginCountColumns(): void
    {
        if (!Schema::hasColumn('users', 'login_count')) {
            Schema::table('users', function ($table) {
                $table->integer('login_count')->default(0);
                $table->dateTime('last_login_at')->nullable();
                $table->string('last_login_ip', 50)->nullable();
            });
        }
    }

    /**
     * 手工注册在线版公开登录路由
     *
     * 测试库无 apps 表，框架 AppServiceProvider 不会 boot 应用 ServiceProvider，
     * 应用路由在测试环境整体缺失；此处按 ServiceProvider 同款定义注册，
     * 验证真实中间件栈 + 控制器行为（路由注册位置由 CLI route:list 与端到端验证）。
     */
    private function registerPublicLoginRoute(): void
    {
        Route::post(
            'api/user/cmspro/windowsxponline/v1/accounts/login',
            [AccountController::class, 'login']
        )->middleware(['web']);
    }

    /**
     * 在线版欢迎屏直登：未登录会话 POST 公开登录路由，校验通过建立 CMSPRO 会话、
     * 回写本人快照 session.user，响应携带 relogin=true（前端据此 reload）
     */
    public function test_未登录欢迎屏直登建立CMSPRO会话(): void
    {
        $this->ensureLoginCountColumns();
        $this->createCmsproUser('xpwelcome', 'secret123');
        $this->registerPublicLoginRoute();
        Auth::forgetGuards();

        $response = $this->postJson('/api/user/cmspro/windowsxponline/v1/accounts/login', [
            'name' => 'xpwelcome',
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.ok', true)
            ->assertJsonPath('data.relogin', true);

        $this->assertTrue(Auth::guard('web')->check(), '登录接口应建立 CMSPRO web 会话');

        $userId = (int) DB::table('users')->where('username', 'xpwelcome')->value('id');
        $saved = StateService::getState('user', $userId);
        $this->assertNotNull($saved, '登录后应初始化本人桌面快照');
        $this->assertSame('xpwelcome', $saved['session']['user'] ?? null);
    }

    /**
     * 未登录直登密码错误：bad-password 且不建立会话
     */
    public function test_未登录直登密码错误不建立会话(): void
    {
        $this->ensureLoginCountColumns();
        $this->createCmsproUser('xpwelcome2', 'secret123');
        $this->registerPublicLoginRoute();
        Auth::forgetGuards();

        $response = $this->postJson('/api/user/cmspro/windowsxponline/v1/accounts/login', [
            'name' => 'xpwelcome2',
            'password' => 'wrong',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.ok', false)
            ->assertJsonPath('data.reason', 'bad-password');

        $this->assertFalse(Auth::guard('web')->check(), '密码错误不应建立会话');
    }

    /**
     * 未登录时键入 XP 内置帐户（Administrator）：无会话可归属，返回 no-user
     */
    public function test_未登录直登XP内置帐户返回no_user(): void
    {
        $this->seedFullState();
        $this->registerPublicLoginRoute();
        Auth::forgetGuards();

        $response = $this->postJson('/api/user/cmspro/windowsxponline/v1/accounts/login', [
            'name' => 'Administrator',
            'password' => '2001',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.ok', false)
            ->assertJsonPath('data.reason', 'no-user');

        $this->assertFalse(Auth::guard('web')->check());
    }
}
