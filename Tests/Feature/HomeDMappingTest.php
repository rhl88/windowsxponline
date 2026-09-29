<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\InitialStateProvider;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 主目录 D 盘映射与隐私隔离测试
 *
 * 覆盖需求：
 * - 桌面/我的文档/收藏夹/快速启动默认映射到 D 盘：D:\{帐户}\{桌面, My Documents,
 *   Favorites, Application Data}，落 D 盘计入个人空间配额；
 *   C 盘主目录为只读空壳，仅保留 NTUSER.DAT 系统文件
 * - 隐私隔离：Documents and Settings 仅保留当前登录帐户主目录，
 *   其他帐户（Guest 等）在迁移时被过滤、资源管理器不可见
 * - 存量快照自动搬移：C 盘主目录内的桌面/My Documents/Favorites/Application Data
 *   （含用户文件）并入 D 盘同名目录，迁移幂等
 * - D 盘节点缺失（用户删除盘符）时跳过，不触碰 C 盘结构
 */
class HomeDMappingTest extends TestCase
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
     * 按路径提取节点 children 的名称列表（节点不存在返回 null）
     *
     * @param array<int, string> $path
     * @return array<int, string>|null
     */
    private function childNames(array $state, array $path): ?array
    {
        $node = &FsTreeService::findNode($state['fsTree'], $path);
        if ($node === null) {
            return null;
        }

        return array_column($node['children'] ?? [], 'name');
    }

    /**
     * 构造带文件的文本节点（简化版）
     *
     * @return array<string, mixed>
     */
    private function fileNode(string $name): array
    {
        return [
            'name' => $name,
            'kind' => 'file',
            'icon' => 'text',
            'type' => '文本文档',
            'size' => '1 KB',
            'content' => $name,
            'created' => '2026-09-26T10:00:00+08:00',
            'modified' => '2026-09-26T10:00:00+08:00',
        ];
    }

    /**
     * 构造文件夹节点
     *
     * @param array<int, array<string, mixed>> $children
     * @return array<string, mixed>
     */
    private function folderNode(string $name, array $children): array
    {
        return [
            'name' => $name,
            'kind' => 'folder',
            'icon' => 'folder',
            'type' => '文件夹',
            'created' => '2026-09-26T10:00:00+08:00',
            'modified' => '2026-09-26T10:00:00+08:00',
            'children' => $children,
        ];
    }

    /**
     * 出厂种子：DNS 仅当前帐户、C 主目录无桌面/我的文档、D 盘含帐户映射目录
     */
    public function test_种子状态桌面与我的文档映射到D盘(): void
    {
        $state = InitialStateProvider::create('tester');

        $this->assertSame(
            ['tester'],
            $this->childNames($state, ['本地磁盘 (C:)', 'Documents and Settings']),
            'DNS 仅种当前登录帐户'
        );
        $this->assertSame(
            ['NTUSER.DAT'],
            $this->childNames($state, ['本地磁盘 (C:)', 'Documents and Settings', 'tester']),
            'C 盘主目录为只读空壳，仅保留 NTUSER.DAT'
        );
        $this->assertSame(
            ['tester'],
            $this->childNames($state, ['本地磁盘 (D:)']),
            'D 盘种入当前帐户目录'
        );
        $this->assertSame(
            ['桌面', 'My Documents', 'Favorites', 'Application Data'],
            $this->childNames($state, ['本地磁盘 (D:)', 'tester']),
            'D 盘帐户目录含桌面/My Documents/Favorites/Application Data'
        );
        $this->assertSame(
            ['readme.txt'],
            $this->childNames($state, ['本地磁盘 (D:)', 'tester', '桌面'])
        );
        $this->assertContains(
            '欢迎.txt',
            $this->childNames($state, ['本地磁盘 (D:)', 'tester', 'My Documents']) ?? []
        );
    }

    /**
     * 存量快照迁移：C 主目录桌面/我的文档（含用户文件）搬入 D 盘同名目录，
     * DNS 过滤其他帐户，结果落盘
     */
    public function test_老快照桌面与我的文档自动搬移到D盘(): void
    {
        $state = InitialStateProvider::create('tester');

        // 模拟旧种子：C 主目录含桌面/My Documents/Favorites/Application Data 与用户文件，
        // DNS 残留 Guest 主目录，D 盘空
        $home = &FsTreeService::findNode($state['fsTree'], [
            '本地磁盘 (C:)', 'Documents and Settings', 'tester',
        ]);
        $home['children'][] = $this->folderNode('桌面', [
            $this->fileNode('readme.txt'),
            $this->fileNode('我的文件.txt'),
        ]);
        $home['children'][] = $this->folderNode('My Documents', [
            $this->fileNode('旧文档.txt'),
        ]);
        $home['children'][] = $this->folderNode('Favorites', [
            $this->folderNode('链接', [$this->fileNode('站点.url')]),
        ]);
        $home['children'][] = $this->folderNode('Application Data', [
            $this->folderNode('Microsoft', []),
        ]);
        unset($home);

        $dns = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings']);
        $dns['children'][] = $this->folderNode('Guest', []);
        unset($dns);

        $dNode = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (D:)']);
        $dNode['children'] = [];
        unset($dNode);

        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $loaded = StateService::getCurrentState();

        $this->assertEqualsCanonicalizing(
            ['readme.txt', '我的文件.txt'],
            $this->childNames($loaded, ['本地磁盘 (D:)', 'tester', '桌面']) ?? [],
            'C 盘桌面用户文件应并入 D 盘'
        );
        $this->assertContains(
            '旧文档.txt',
            $this->childNames($loaded, ['本地磁盘 (D:)', 'tester', 'My Documents']) ?? [],
            'C 盘我的文档用户文件应并入 D 盘种子目录'
        );
        $this->assertSame(
            ['NTUSER.DAT'],
            $this->childNames($loaded, ['本地磁盘 (C:)', 'Documents and Settings', 'tester']) ?? [],
            'C 盘主目录搬移后仅剩 NTUSER.DAT 空壳'
        );
        $this->assertContains(
            '站点.url',
            $this->childNames($loaded, ['本地磁盘 (D:)', 'tester', 'Favorites', '链接']) ?? [],
            'C 盘收藏夹用户内容应并入 D 盘'
        );
        $this->assertSame(
            ['tester'],
            $this->childNames($loaded, ['本地磁盘 (C:)', 'Documents and Settings']),
            'DNS 仅保留当前登录帐户'
        );

        $persisted = $this->readXpState();
        $this->assertEqualsCanonicalizing(
            ['readme.txt', '我的文件.txt'],
            $this->childNames($persisted ?? [], ['本地磁盘 (D:)', 'tester', '桌面']) ?? [],
            '搬移结果应落盘'
        );
    }

    /**
     * 迁移幂等：二次加载不重复搬移、不产生重名副本
     */
    public function test_迁移重复执行无副作用(): void
    {
        $state = InitialStateProvider::create('tester');
        $home = &FsTreeService::findNode($state['fsTree'], [
            '本地磁盘 (C:)', 'Documents and Settings', 'tester',
        ]);
        $home['children'][] = $this->folderNode('桌面', [$this->fileNode('a.txt')]);
        unset($home);
        $dns = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings']);
        $dns['children'][] = $this->folderNode('Guest', []);
        unset($dns);
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        StateService::getCurrentState();
        $first = $this->readXpState();
        StateService::getCurrentState();
        $second = $this->readXpState();

        $this->assertSame(
            $this->childNames($first ?? [], ['本地磁盘 (D:)', 'tester', '桌面']) ?? [],
            $this->childNames($second ?? [], ['本地磁盘 (D:)', 'tester', '桌面']) ?? [],
            '二次迁移不应产生重复条目'
        );
    }

    /**
     * D 盘节点缺失（用户删除盘符）：跳过映射迁移，不触碰 C 盘结构
     */
    public function test_D盘缺失时跳过迁移(): void
    {
        $this->seedXpState([$this->makeTextFile('b.txt')]);

        $loaded = StateService::getCurrentState();

        $this->assertSame(
            ['b.txt'],
            $this->childNames($loaded, ['本地磁盘 (C:)', 'Documents and Settings', 'tester', '桌面']) ?? [],
            '无 D 盘时 C 盘桌面保持原样'
        );
    }

    /**
     * 登录帐户主目录缺失：补建 C 系统配置目录并种入 D 盘映射目录
     */
    public function test_帐户主目录缺失时自愈补建(): void
    {
        $state = InitialStateProvider::create('tester');
        $dns = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (C:)', 'Documents and Settings']);
        $dns['children'] = [];
        unset($dns);
        $dNode = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (D:)']);
        $dNode['children'] = [];
        unset($dNode);
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $loaded = StateService::getCurrentState();

        $this->assertSame(
            ['tester'],
            $this->childNames($loaded, ['本地磁盘 (C:)', 'Documents and Settings']),
            'C 盘主目录应补建'
        );
        $this->assertSame(
            ['NTUSER.DAT'],
            $this->childNames($loaded, ['本地磁盘 (C:)', 'Documents and Settings', 'tester']) ?? [],
            'C 盘补建主目录为只读空壳'
        );
        $this->assertSame(
            ['桌面', 'My Documents', 'Favorites', 'Application Data'],
            $this->childNames($loaded, ['本地磁盘 (D:)', 'tester']) ?? [],
            'D 盘帐户目录应补种'
        );
    }
}
