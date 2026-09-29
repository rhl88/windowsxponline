<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Support;

use App\Apps\CmsproWindowsxponline\Models\UserSpace;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use Illuminate\Auth\GenericUser;
use Illuminate\Support\Facades\Auth;

/**
 * XP 桌面状态测试沙箱
 *
 * 提供内存存储驱动、后台用户登录态与初始 fsTree 快照，
 * 使 V1 API 控制器可在无路由、无中间件、无真实磁盘的情况下被直接调用。
 */
trait XpStateSandbox
{
    private InMemoryStorageDriver $memoryDriver;

    private int $sandboxAdminId = 7;

    private string $sandboxUsername = 'tester';

    /**
     * 桌面目录路径段
     *
     * fsTree 根节点为「我的电脑」，路径段自根节点起逐级寻址
     *
     * @var array<int, string>
     */
    private array $desktopPath = ['本地磁盘 (C:)', 'Documents and Settings', 'tester', '桌面'];

    /**
     * 初始化沙箱：注入内存驱动 + 伪造后台登录态 + 建配额记录
     *
     * 注意：方法名不可为 setUpXxx，否则会被 Laravel setUpTraits() 在建表前自动调用
     */
    protected function bootXpStateSandbox(): void
    {
        $this->memoryDriver = new InMemoryStorageDriver();
        $this->injectStorageDriver($this->memoryDriver);

        Auth::guard('admin')->setUser(new GenericUser([
            'id' => $this->sandboxAdminId,
            'username' => $this->sandboxUsername,
        ]));

        UserSpace::create([
            'user_type' => UserSpace::TYPE_ADMIN,
            'user_id' => $this->sandboxAdminId,
            'username' => $this->sandboxUsername,
            'quota_mb' => 100,
            'used_mb' => 0,
            'status' => UserSpace::STATUS_ENABLED,
        ]);
    }

    /**
     * 释放沙箱：还原存储驱动与登录态
     */
    protected function shutdownXpStateSandbox(): void
    {
        StorageManager::resetDriver();
        Auth::forgetGuards();
    }

    /**
     * 通过反射将驱动实例注入 StorageManager 的静态缓存
     */
    private function injectStorageDriver(InMemoryStorageDriver $driver): void
    {
        $property = new \ReflectionProperty(StorageManager::class, 'driver');
        $property->setAccessible(true);
        $property->setValue(null, $driver);
    }

    /**
     * 写入应用配置项（明文）并失效配置缓存
     *
     * xp_guest_enabled / xp_ie_homepage 等出厂默认值不满足用例前置时调用；
     * resetConfigCache() 会连带重置存储驱动，故随后重新注入内存驱动。
     * 需加密存储的字段（如 xp_admin_password）由用例自行按 Crypt 口径写入
     */
    protected function seedXpConfig(string $key, string $value): void
    {
        \Illuminate\Support\Facades\DB::table('config_items')->updateOrInsert(
            ['code' => 'app_cmspro_windowsxponline_' . $key],
            ['value' => $value]
        );
        \Illuminate\Support\Facades\Cache::flush();
        StorageManager::resetConfigCache();
        $this->injectStorageDriver($this->memoryDriver);
    }

    /**
     * 播种一份包含桌面文件的初始状态快照
     *
     * @param array<int, array<string, mixed>> $desktopFiles 桌面上的文件节点
     * @param array<int, array<string, mixed>> $recycleBin 预置的回收站条目
     */
    protected function seedXpState(array $desktopFiles = [], array $recycleBin = []): void
    {
        $now = '2026-09-26T10:00:00+08:00';

        $desktop = [
            'name' => '桌面',
            'kind' => 'folder',
            'icon' => 'folder',
            'type' => '文件夹',
            'created' => $now,
            'modified' => $now,
            'children' => $desktopFiles,
        ];

        $driveC = [
            'name' => '本地磁盘 (C:)',
            'kind' => 'drive',
            'icon' => 'hd',
            'created' => $now,
            'modified' => $now,
            'children' => [[
                'name' => 'Documents and Settings',
                'kind' => 'folder',
                'icon' => 'folder',
                'created' => $now,
                'modified' => $now,
                'children' => [[
                    'name' => $this->sandboxUsername,
                    'kind' => 'folder',
                    'icon' => 'folder',
                    'created' => $now,
                    'modified' => $now,
                    'children' => [$desktop],
                ]],
            ]],
        ];

        $tree = [
            'name' => '我的电脑',
            'kind' => 'folder',
            'icon' => 'folder',
            'created' => $now,
            'modified' => $now,
            'children' => [$driveC],
        ];

        $this->memoryDriver->seedState($this->stateStorageKey(), [
            'fsTree' => $tree,
            'recycleBin' => $recycleBin,
            'session' => ['user' => $this->sandboxUsername],
        ]);
    }

    /**
     * 构造桌面文本文件节点
     *
     * @return array<string, mixed>
     */
    protected function makeTextFile(string $name, string $content = 'hello'): array
    {
        $now = '2026-09-26T10:00:00+08:00';

        return [
            'name' => $name,
            'kind' => 'file',
            'icon' => 'text',
            'type' => '文本文档',
            'size' => strlen($content) . ' 字节',
            'content' => $content,
            'created' => $now,
            'modified' => $now,
        ];
    }

    /**
     * 桌面文件的完整路径段
     *
     * @return array<int, string>
     */
    protected function desktopFilePath(string $name): array
    {
        return array_merge($this->desktopPath, [$name]);
    }

    /**
     * 读取当前沙箱用户落盘后的状态快照
     *
     * @return array<string, mixed>|null
     */
    protected function readXpState(): ?array
    {
        return $this->memoryDriver->readState($this->stateStorageKey());
    }

    /**
     * 当前沙箱用户的状态存储键
     */
    protected function stateStorageKey(): string
    {
        return 'admin/' . $this->sandboxAdminId . '/state.json';
    }
}
