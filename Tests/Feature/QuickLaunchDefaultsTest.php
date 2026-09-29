<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Admin\Api\SettingApiController;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\InitialStateProvider;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 快速启动默认项测试
 *
 * 覆盖需求：
 * - 后台可配置快速启动默认快捷方式（xp_quicklaunch_defaults，逗号分隔 appId）
 * - showdesktop（显示桌面）为固定必选项：种子配置缺失时强制置顶补入，
 *   老用户快照缺失时加载自动补齐并落盘
 * - 老用户增量同步：后台新勾选的默认项补入历史快照（每项仅同步一次，
 *   用户手动删除后不复活；取消再勾选会再次同步）；Documents and Settings
 *   经隐私隔离迁移后仅保留当前登录帐户，标记按帐户记录
 * - 设置接口入库前拦截非法 appId
 */
class QuickLaunchDefaultsTest extends TestCase
{
    use WindowsxponlineSetup;
    use XpStateSandbox;

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
     * 写入后台 xp_quicklaunch_defaults 配置并刷新读取缓存
     *
     * resetConfigCache 会连带 resetDriver 清掉注入的内存驱动，必须重注入
     */
    private function seedQuickLaunchConfig(string $value): void
    {
        DB::table('config_items')->updateOrInsert(
            ['code' => 'app_cmspro_windowsxponline_xp_quicklaunch_defaults'],
            ['value' => $value]
        );
        Cache::flush();
        StorageManager::resetConfigCache();
        $this->injectStorageDriver($this->memoryDriver);
    }

    /**
     * 按路径提取状态快照中 Quick Launch 文件夹的 appId 列表
     *
     * @return array<int, string>|null 文件夹不存在返回 null
     */
    private function quickLaunchAppIds(array $state, string $user): ?array
    {
        $path = ['本地磁盘 (D:)', $user,
            'Application Data', 'Microsoft', 'Internet Explorer', 'Quick Launch'];

        $node = &FsTreeService::findNode($state['fsTree'], $path);
        if ($node === null) {
            return null;
        }

        return array_map(fn($child) => $child['appId'] ?? '', $node['children'] ?? []);
    }

    /**
     * 配置驱动种子：新用户初始状态的 Quick Launch 恰为配置项（有序）
     */
    public function test_初始状态按后台配置播种快捷方式(): void
    {
        $this->seedQuickLaunchConfig('showdesktop,ie,notepad');

        $state = InitialStateProvider::create('Administrator');

        $this->assertSame(
            ['showdesktop', 'ie', 'notepad'],
            $this->quickLaunchAppIds($state, 'Administrator')
        );
    }

    /**
     * 未配置时回退出厂默认值（与前端种子一致）
     */
    public function test_未配置时回退出厂默认项(): void
    {
        $state = InitialStateProvider::create('Administrator');

        $this->assertSame(
            ['showdesktop', 'ie', 'wmp'],
            $this->quickLaunchAppIds($state, 'Administrator')
        );
    }

    /**
     * 配置解析：showdesktop 缺失强制置顶、非法 appId 丢弃、去重、容错空白
     */
    public function test_配置解析强制必选项并过滤非法值(): void
    {
        $this->assertSame(
            ['showdesktop', 'ie', 'calc'],
            InitialStateProvider::parseQuickLaunchConfig('ie,calc')
        );
        $this->assertSame(
            ['showdesktop', 'ie'],
            InitialStateProvider::parseQuickLaunchConfig(' ie ,foo,,ie,')
        );
        $this->assertSame(
            ['showdesktop'],
            InitialStateProvider::parseQuickLaunchConfig('')
        );
    }

    /**
     * 老用户补齐：历史快照缺「显示桌面」时 getCurrentState 自动补入并落盘
     */
    public function test_老用户快照缺失显示桌面时自动补齐(): void
    {
        $state = InitialStateProvider::create('Administrator');

        // 模拟旧版本种子：Quick Launch 无 showdesktop 条目
        $path = ['本地磁盘 (D:)', 'Administrator',
            'Application Data', 'Microsoft', 'Internet Explorer', 'Quick Launch'];
        $node = &FsTreeService::findNode($state['fsTree'], $path);
        $node['children'] = array_values(array_filter(
            $node['children'],
            fn($child) => ($child['appId'] ?? '') !== 'showdesktop'
        ));
        unset($node);
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $loaded = StateService::getCurrentState();

        $this->assertContains('showdesktop', $this->quickLaunchAppIds($loaded, 'Administrator'), '内存态应补齐显示桌面');
        $persisted = $this->readXpState();
        $this->assertContains('showdesktop', $this->quickLaunchAppIds($persisted, 'Administrator'), '补齐结果应落盘');
    }

    /**
     * 已含显示桌面的快照不被重复补齐
     */
    public function test_已有显示桌面时不重复补齐(): void
    {
        $state = InitialStateProvider::create('Administrator');
        $before = $this->quickLaunchAppIds($state, 'Administrator');
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $loaded = StateService::getCurrentState();

        $this->assertSame($before, $this->quickLaunchAppIds($loaded, 'Administrator'));
    }

    /**
     * 老用户增量同步：后台新勾选的默认项自动补入历史快照并落盘（按配置顺序追加）
     */
    public function test_老用户增量同步新勾选默认项(): void
    {
        $state = InitialStateProvider::create('Administrator');
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        // 老用户初始化后，后台新勾选了 cmd 与 taskmgr
        $this->seedQuickLaunchConfig('showdesktop,ie,wmp,cmd,taskmgr');

        $loaded = StateService::getCurrentState();

        $this->assertSame(
            ['showdesktop', 'ie', 'wmp', 'cmd', 'taskmgr'],
            $this->quickLaunchAppIds($loaded, 'Administrator'),
            '新勾选项应补入内存态'
        );
        $persisted = $this->readXpState();
        $this->assertSame(
            ['showdesktop', 'ie', 'wmp', 'cmd', 'taskmgr'],
            $this->quickLaunchAppIds($persisted, 'Administrator'),
            '同步结果应落盘'
        );
        $this->assertSame(
            ['Administrator' => 'showdesktop,ie,wmp,cmd,taskmgr'],
            $persisted['qlDefaultsApplied'] ?? null,
            '标记仅记录当前登录帐户（其他帐户主目录已被隐私隔离迁移过滤）'
        );
    }

    /**
     * 隐私隔离：历史快照中其他帐户主目录（Guest 等）在迁移时被过滤，
     * Documents and Settings 仅保留当前登录帐户
     */
    public function test_DocumentsAndSettings仅保留登录帐户(): void
    {
        $state = InitialStateProvider::create('Administrator');

        // 模拟旧版本种子：DNS 下残留 Guest 主目录
        $dns = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings']);
        $dns['children'][] = InitialStateProvider::createUserHome('Guest');
        unset($dns);
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $loaded = StateService::getCurrentState();

        $dnsNode = &FsTreeService::findNode($loaded['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings']);
        $homes = array_column($dnsNode['children'] ?? [], 'name');
        unset($dnsNode);
        $this->assertSame(['Administrator'], $homes, '仅保留当前登录帐户主目录');

        $persisted = $this->readXpState();
        $dnsNode2 = &FsTreeService::findNode($persisted['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings']);
        $this->assertSame(
            ['Administrator'],
            array_column($dnsNode2['children'] ?? [], 'name'),
            '过滤结果应落盘'
        );
        unset($dnsNode2);
    }

    /**
     * 已同步过的项被用户手动删除后不再复活（增量同步仅一次语义）
     */
    public function test_已同步项被用户删除后不复活(): void
    {
        $state = InitialStateProvider::create('Administrator');

        // 模拟：ie 已同步过一次（标记含 ie），随后用户从快速启动删除了它
        $path = ['本地磁盘 (D:)', 'Administrator',
            'Application Data', 'Microsoft', 'Internet Explorer', 'Quick Launch'];
        $node = &FsTreeService::findNode($state['fsTree'], $path);
        $node['children'] = array_values(array_filter(
            $node['children'],
            fn($child) => ($child['appId'] ?? '') !== 'ie'
        ));
        unset($node);
        $state['qlDefaultsApplied'] = 'showdesktop,ie,wmp';
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $loaded = StateService::getCurrentState();

        $ids = $this->quickLaunchAppIds($loaded, 'Administrator');
        $this->assertNotContains('ie', $ids, '已同步后被用户删除的项不应复活');
        $this->assertContains('showdesktop', $ids, '其余项不受影响');
    }

    /**
     * 取消勾选后重新勾选，该项应再次被同步补入
     */
    public function test_取消勾选后重新勾选会再次同步(): void
    {
        $state = InitialStateProvider::create('Administrator');
        $state['qlDefaultsApplied'] = 'showdesktop,ie,wmp,cmd';
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        // 后台取消勾选 cmd：当前登录帐户标记随加载收缩为当前配置
        $this->seedQuickLaunchConfig('showdesktop,ie,wmp');
        StateService::getCurrentState();
        $this->assertSame(
            'showdesktop,ie,wmp',
            $this->readXpState()['qlDefaultsApplied']['Administrator'] ?? ''
        );

        // 重新勾选 cmd：不在标记集合内，应再次补入
        $this->seedQuickLaunchConfig('showdesktop,ie,wmp,cmd');
        $loaded = StateService::getCurrentState();
        $this->assertContains('cmd', $this->quickLaunchAppIds($loaded, 'Administrator'));
    }

    /**
     * 种子 settings 的 tbTitles 为空对象（XP 出厂态：快速启动不显示标题文字）
     */
    public function test_种子tbTitles默认为空对象(): void
    {
        $state = InitialStateProvider::create('Administrator');

        $this->assertSame([], $state['settings']['tbTitles'] ?? null);
    }

    /**
     * 老用户迁移：旧种子 tbTitles（quick=true 三键特征）归一化为空对象并落盘
     */
    public function test_老快照旧种子tbTitles被归一化(): void
    {
        $state = InitialStateProvider::create('Administrator');
        $state['settings']['tbTitles'] = ['quick' => true, 'desktop' => false, 'links' => false];
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $loaded = StateService::getCurrentState();

        $this->assertSame([], $loaded['settings']['tbTitles'] ?? null, '内存态应归一化 tbTitles');
        $this->assertSame([], $this->readXpState()['settings']['tbTitles'] ?? null, '归一化结果应落盘');
    }

    /**
     * 用户自行改过的 tbTitles（不命中旧种子特征）不被迁移覆盖
     */
    public function test_用户改过的tbTitles不被迁移覆盖(): void
    {
        $state = InitialStateProvider::create('Administrator');
        $state['settings']['tbTitles'] = ['quick' => true];
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $loaded = StateService::getCurrentState();

        $this->assertSame(['quick' => true], $loaded['settings']['tbTitles'] ?? null);
    }

    /**
     * 设置接口拒绝非法 appId（不入库）
     */
    public function test_设置接口拒绝非法快速启动项(): void
    {
        $request = Request::create('/admin/settings', 'PUT');
        $request->headers->set('Content-Type', 'application/json');
        $request->json()->set('xp_quicklaunch_defaults', 'ie,foo');

        $payload = json_decode((new SettingApiController())->update($request)->getContent(), true);

        $this->assertNotSame(0, $payload['code'] ?? null);
        $this->assertStringContainsString('不支持的程序', $payload['message'] ?? '');
    }

    /**
     * 设置接口接受合法配置并持久化
     */
    public function test_设置接口保存合法快速启动配置(): void
    {
        $request = Request::create('/admin/settings', 'PUT');
        $request->headers->set('Content-Type', 'application/json');
        $request->json()->set('xp_quicklaunch_defaults', 'showdesktop,cmd');

        $payload = json_decode((new SettingApiController())->update($request)->getContent(), true);

        $this->assertSame(0, $payload['code'] ?? null);
        // 清跨请求缓存，验证新值确实入库
        Cache::flush();
        StorageManager::resetConfigCache();
        $this->assertSame(
            'showdesktop,cmd',
            StorageManager::getConfig('xp_quicklaunch_defaults', '')
        );
    }
}
