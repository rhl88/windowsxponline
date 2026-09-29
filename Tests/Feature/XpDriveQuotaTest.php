<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Models\UserSpace;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\InitialStateProvider;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Illuminate\Database\Eloquent\Builder;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 本地磁盘 (D:) 承载空间管理配额测试
 *
 * 覆盖需求：
 * - 种子驱动器布局：仅「本地磁盘 (C:)」+「本地磁盘 (D:)」，无软盘/光驱
 * - 老快照迁移：软盘 (A:) 移除、光盘驱动器 (D:) 替换为本地磁盘 (D:) 并落盘
 * - D 盘容量按后台空间管理配额动态注入（total=quota_mb、used=used_mb，字节），
 *   仅存在于响应态、saveState 剥离不落盘（防前端整表回传固化瞬时配额）
 * - quota_mb=0 表示不限制：写入不被拒，D 盘显示标称 40 GiB
 * - anonymous 模式无 UserSpace：D 盘同样显示标称容量
 */
class XpDriveQuotaTest extends TestCase
{
    use WindowsxponlineSetup;
    use XpStateSandbox;

    /** 标称容量 40 GiB（字节），与 StateService::injectDriveQuota 口径一致 */
    private const NOMINAL_BYTES = 42949672960;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();
        $this->bootXpStateSandbox();
    }

    protected function tearDown(): void
    {
        session()->forget('xp_account');
        StateService::resetSpaceCache();
        $this->shutdownXpStateSandbox();
        parent::tearDown();
    }

    /**
     * 沙箱 admin 的空间配额记录查询
     */
    private function sandboxSpace(): Builder
    {
        return UserSpace::where('user_type', UserSpace::TYPE_ADMIN)
            ->where('user_id', $this->sandboxAdminId);
    }

    /**
     * 按路径取状态快照中的节点（引用返回，与 FsTreeService 口径一致）
     */
    private function &findNode(array $state, array $path): array|null
    {
        $node = &FsTreeService::findNode($state['fsTree'], $path);
        return $node;
    }

    /**
     * 种入含完整驱动器布局（C/D）的初始状态快照
     *
     * sandbox trait 的 seedXpState 仅含精简 C 盘树，无法覆盖 D 盘场景
     */
    private function seedFullState(): void
    {
        $state = InitialStateProvider::create($this->sandboxUsername);
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);
    }

    /**
     * 构造含旧驱动器布局（软盘 A + 光驱 D）的历史快照
     */
    private function legacyState(): array
    {
        $state = InitialStateProvider::create($this->sandboxUsername);

        $state['fsTree']['children'] = [
            $state['fsTree']['children'][0],
            [
                'name' => '3.5 软盘 (A:)',
                'kind' => 'drive',
                'icon' => 'floppy',
                'error' => '请将磁盘插入驱动器 A:',
                'children' => [],
            ],
            [
                'name' => '光盘驱动器 (D:)',
                'kind' => 'drive',
                'icon' => 'cd',
                'error' => '请将磁盘插入驱动器 D:',
                'children' => [],
            ],
        ];

        return $state;
    }

    /**
     * 种子布局：仅 C/D 两个本地磁盘，无软盘与光驱
     */
    public function test_种子驱动器仅含C盘与D盘(): void
    {
        $state = InitialStateProvider::create('tester');
        $names = array_column($state['fsTree']['children'] ?? [], 'name');

        $this->assertSame(['本地磁盘 (C:)', '本地磁盘 (D:)'], $names);

        $driveD = &FsTreeService::findNode($state['fsTree'], ['本地磁盘 (D:)']);
        $this->assertNotNull($driveD);
        $this->assertSame('drive', $driveD['kind'] ?? '');
        $this->assertSame('hd', $driveD['icon'] ?? '');
        unset($driveD);
    }

    /**
     * 老快照迁移：软盘移除、光驱替换为本地磁盘 (D:)，结果落盘
     */
    public function test_老快照驱动器布局自动迁移(): void
    {
        $this->memoryDriver->seedState($this->stateStorageKey(), $this->legacyState());

        $loaded = StateService::getCurrentState();
        $names = array_column($loaded['fsTree']['children'] ?? [], 'name');
        $this->assertSame(['本地磁盘 (C:)', '本地磁盘 (D:)'], $names, '内存态应完成驱动器布局迁移');

        $persistedNames = array_column($this->readXpState()['fsTree']['children'] ?? [], 'name');
        $this->assertSame(['本地磁盘 (C:)', '本地磁盘 (D:)'], $persistedNames, '迁移结果应落盘');
    }

    /**
     * 用户改名/删除过的盘符节点不被迁移触碰
     */
    public function test_用户改名的盘符节点不被迁移触碰(): void
    {
        $state = InitialStateProvider::create($this->sandboxUsername);
        $state['fsTree']['children'][1]['name'] = '数据盘 (D:)';
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $loaded = StateService::getCurrentState();

        $names = array_column($loaded['fsTree']['children'] ?? [], 'name');
        $this->assertContains('数据盘 (D:)', $names, '用户改名的盘符应保持原样');
    }

    /**
     * D 盘容量按后台配额注入：total=quota_mb、used=used_mb（字节）
     */
    public function test_D盘容量按配额注入响应态(): void
    {
        $this->seedFullState();
        // 先加载一次触发迁移落盘（落盘会按真实体积重算 used_mb），
        // 再设定配额与已用量，二次读取验证注入值
        StateService::getCurrentState();
        $this->sandboxSpace()->update(['quota_mb' => 50, 'used_mb' => 7]);
        StateService::resetSpaceCache();

        $loaded = StateService::getCurrentState();
        $driveD = &$this->findNode($loaded, ['本地磁盘 (D:)']);

        $this->assertNotNull($driveD);
        $this->assertSame(50 * 1048576, $driveD['total'] ?? null);
        $this->assertSame(7 * 1048576, $driveD['used'] ?? null);
        unset($driveD);
    }

    /**
     * 防回写：注入后的状态整表保存时剥离 total/used，不落盘
     */
    public function test_配额字段不随状态保存落盘(): void
    {
        $this->seedFullState();
        $this->sandboxSpace()->update(['quota_mb' => 50]);
        StateService::resetSpaceCache();

        $loaded = StateService::getCurrentState();
        StateService::saveCurrentState($loaded);

        $driveD = &$this->findNode($this->readXpState(), ['本地磁盘 (D:)']);
        $this->assertNotNull($driveD);
        $this->assertArrayNotHasKey('total', $driveD, '瞬时配额不应固化进快照');
        $this->assertArrayNotHasKey('used', $driveD);
        unset($driveD);
    }

    /**
     * quota_mb=0 不限制：保存不被拒，D 盘显示标称容量
     */
    public function test_配额为零时不限制且显示标称容量(): void
    {
        $this->seedFullState();
        $this->sandboxSpace()->update(['quota_mb' => 0]);
        StateService::resetSpaceCache();

        $loaded = StateService::getCurrentState();
        StateService::saveCurrentState($loaded);

        $this->assertNotNull($this->readXpState(), 'quota_mb=0 时保存应成功');

        $driveD = &$this->findNode(StateService::getCurrentState(), ['本地磁盘 (D:)']);
        $this->assertSame(self::NOMINAL_BYTES, $driveD['total'] ?? null);
        unset($driveD);
    }

    /**
     * anonymous 模式无 UserSpace：D 盘显示标称容量、已用为快照体积
     */
    public function test_免登录版D盘显示标称容量(): void
    {
        config(['apps.cmspro.windowsxponline.access_mode' => 'anonymous']);
        session(['xp_account' => 'Administrator']);

        $loaded = StateService::getCurrentState();
        $driveD = &$this->findNode($loaded, ['本地磁盘 (D:)']);

        $this->assertNotNull($driveD);
        $this->assertSame(self::NOMINAL_BYTES, $driveD['total'] ?? null);
        $this->assertIsInt($driveD['used'] ?? null);
        unset($driveD);
    }
}
