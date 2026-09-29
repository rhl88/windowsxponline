<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Admin\Api\SettingApiController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\IeController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\StateController;
use App\Apps\CmsproWindowsxponline\Services\InitialStateProvider;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Windows XP 在线版 · IE 默认主页测试
 *
 * 覆盖需求：
 * - 出厂默认主页为 www.cmspro.cn（统一补全 https:// 协议，避免 HTTPS 站点混合内容白屏）
 * - 后台可配置 xp_ie_homepage：域名或完整网址，留空恢复出厂默认
 * - 后台改一次即强制覆盖所有用户：快照 ieHomeApplied 标记与配置不一致时覆盖 ie.home，
 *   配置未变时保留用户在桌面「Internet 选项」中的自定义
 * - 快照与 /ie 接口均下发 defaultHome，供前端「使用默认页」按钮取值
 * - 设置接口入库前拦截非法主页格式
 */
class IeHomepageTest extends TestCase
{
    use WindowsxponlineSetup;
    use XpStateSandbox;

    /**
     * 出厂默认主页（与 InitialStateProvider::IE_HOMEPAGE_DEFAULT 一致）
     */
    private const FACTORY_HOME = 'https://www.cmspro.cn/';

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();
        $this->bootXpStateSandbox();
    }

    protected function tearDown(): void
    {
        $this->shutdownXpStateSandbox();
        parent::tearDown();
    }

    /**
     * 种入初始状态快照（可覆写 ie 节点与同步标记）
     *
     * @param array<string, mixed> $ie           快照 ie 节点
     * @param array<string, mixed> $extraTopKeys 需一并写入的顶层键（如 ieHomeApplied）
     */
    private function seedStateWithIe(array $ie, array $extraTopKeys = []): void
    {
        $state = InitialStateProvider::create($this->sandboxUsername);
        $state['ie'] = $ie;
        foreach ($extraTopKeys as $key => $value) {
            $state[$key] = $value;
        }
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);
    }

    /**
     * 构造后台设置 PUT 请求
     */
    private function settingRequest(array $body): Request
    {
        $request = Request::create('/admin/settings', 'PUT');
        $request->headers->set('Content-Type', 'application/json');
        foreach ($body as $key => $value) {
            $request->json()->set($key, $value);
        }

        return $request;
    }

    /**
     * 出厂默认：未配置 xp_ie_homepage 时主页与收藏夹首项均为 www.cmspro.cn
     */
    public function test_出厂默认IE主页为cmspro(): void
    {
        $this->assertSame(self::FACTORY_HOME, InitialStateProvider::configuredIeHomepage());

        $ie = InitialStateProvider::create($this->sandboxUsername)['ie'];
        $this->assertSame(self::FACTORY_HOME, $ie['home']);
        $this->assertSame(self::FACTORY_HOME, $ie['favorites'][0]['url'] ?? '');
        $this->assertSame('www.cmspro.cn', $ie['favorites'][0]['title'] ?? '');
    }

    /**
     * 主页归一化：缺协议补 https://，空值回退出厂默认，已有协议与首尾空白按原样处理
     */
    public function test_主页地址归一化补全协议(): void
    {
        $this->assertSame(
            'https://www.example.cn',
            InitialStateProvider::normalizeIeHomepage('www.example.cn')
        );
        $this->assertSame(self::FACTORY_HOME, InitialStateProvider::normalizeIeHomepage('   '));
        $this->assertSame(
            'http://www.example.cn/',
            InitialStateProvider::normalizeIeHomepage('http://www.example.cn/')
        );
        $this->assertSame(
            'https://www.example.cn/ie',
            InitialStateProvider::normalizeIeHomepage("  https://www.example.cn/ie  \n")
        );
    }

    /**
     * 后台配置后新用户初始状态即取配置值（域名自动补全 https）
     */
    public function test_后台配置主页对新用户生效(): void
    {
        $this->seedXpConfig('xp_ie_homepage', 'www.example.cn');

        $this->assertSame('https://www.example.cn', InitialStateProvider::configuredIeHomepage());

        $ie = InitialStateProvider::create($this->sandboxUsername)['ie'];
        $this->assertSame('https://www.example.cn', $ie['home']);
        $this->assertSame('www.example.cn', $ie['favorites'][0]['title'] ?? '');
    }

    /**
     * 快照下发 defaultHome，且加载时把老用户主页强制同步为后台配置值并落盘
     */
    public function test_后台改主页强制覆盖老用户快照(): void
    {
        // 老快照：主页与标记均为旧值（曾经生效过的出厂默认）
        $this->seedStateWithIe(
            ['home' => self::FACTORY_HOME, 'favorites' => [], 'history' => []],
            ['ieHomeApplied' => self::FACTORY_HOME]
        );

        // 后台改为新主页
        $this->seedXpConfig('xp_ie_homepage', 'https://www.example.cn/');

        $loaded = StateService::getCurrentState();
        $this->assertSame('https://www.example.cn/', $loaded['ie']['home'] ?? '', '内存态应被覆盖');
        $this->assertSame('https://www.example.cn/', $loaded['ieHomeApplied'] ?? '', '同步标记应更新');

        $persisted = $this->readXpState();
        $this->assertSame('https://www.example.cn/', $persisted['ie']['home'] ?? '', '覆盖结果应落盘');
        $this->assertSame('https://www.example.cn/', $persisted['ieHomeApplied'] ?? '');

        $snapshot = json_decode((new StateController())->snapshot()->getContent(), true);
        $this->assertSame('https://www.example.cn/', $snapshot['data']['ie']['defaultHome'] ?? '');
    }

    /**
     * 配置未变时不覆盖：用户在桌面「Internet 选项」自定义的主页得以保留
     */
    public function test_配置未变时保留用户自定义主页(): void
    {
        $this->seedStateWithIe(
            ['home' => 'https://user.example.com/', 'favorites' => [], 'history' => []],
            ['ieHomeApplied' => self::FACTORY_HOME]
        );

        $loaded = StateService::getCurrentState();

        $this->assertSame('https://user.example.com/', $loaded['ie']['home'] ?? '');
        $this->assertSame('https://user.example.com/', $this->readXpState()['ie']['home'] ?? '');
    }

    /**
     * /ie 接口：home 取快照值，defaultHome 恒为后台配置值
     */
    public function test_IE接口下发默认主页(): void
    {
        $this->seedXpConfig('xp_ie_homepage', 'www.example.cn');

        // 同步标记与后台配置一致 → 加载不覆盖，用户在桌面自定义的主页得以保留
        $this->seedStateWithIe(
            ['home' => 'https://user.example.com/', 'favorites' => [], 'history' => []],
            ['ieHomeApplied' => 'https://www.example.cn']
        );

        $payload = json_decode((new IeController())->show()->getContent(), true);

        $this->assertSame('https://user.example.com/', $payload['data']['home'] ?? '');
        $this->assertSame('https://www.example.cn', $payload['data']['defaultHome'] ?? '');
    }

    /**
     * 设置接口拒绝非法主页（不入库）
     */
    public function test_设置接口拒绝非法主页(): void
    {
        $payload = json_decode(
            (new SettingApiController())->update($this->settingRequest(['xp_ie_homepage' => 'ht tp://bad host']))
                ->getContent(),
            true
        );

        $this->assertNotSame(0, $payload['code'] ?? null);
        $this->assertStringContainsString('IE 默认主页格式不正确', $payload['message'] ?? '');
    }

    /**
     * 设置接口接受含路径与锚点的主页（回归：正则分隔符与字符类内 # 冲突曾导致 500）
     */
    public function test_设置接口接受含路径与锚点的主页(): void
    {
        $payload = json_decode(
            (new SettingApiController())->update(
                $this->settingRequest(['xp_ie_homepage' => 'https://www.example.cn/ie#top'])
            )->getContent(),
            true
        );

        $this->assertSame(0, $payload['code'] ?? null, $payload['message'] ?? '');

        Cache::flush();
        StorageManager::resetConfigCache();
        $this->assertSame(
            'https://www.example.cn/ie#top',
            InitialStateProvider::configuredIeHomepage()
        );
    }

    /**
     * 设置接口保存合法主页（原始输入入库，协议补全在读取侧完成），留空恢复出厂默认
     */
    public function test_设置接口保存合法主页并可留空(): void
    {
        $payload = json_decode(
            (new SettingApiController())->update($this->settingRequest(['xp_ie_homepage' => 'www.example.cn']))
                ->getContent(),
            true
        );
        $this->assertSame(0, $payload['code'] ?? null);

        Cache::flush();
        StorageManager::resetConfigCache();
        $this->assertSame('www.example.cn', StorageManager::getConfig('xp_ie_homepage', ''));
        $this->assertSame('https://www.example.cn', InitialStateProvider::configuredIeHomepage());

        // 留空：入库空串，读取侧回退出厂默认
        $payload = json_decode(
            (new SettingApiController())->update($this->settingRequest(['xp_ie_homepage' => '  ']))
                ->getContent(),
            true
        );
        $this->assertSame(0, $payload['code'] ?? null);

        Cache::flush();
        StorageManager::resetConfigCache();
        $this->assertSame(self::FACTORY_HOME, InitialStateProvider::configuredIeHomepage());
    }
}
