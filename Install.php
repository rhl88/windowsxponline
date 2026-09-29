<?php

namespace App\Apps\CmsproWindowsxponline;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Windows XP 在线版应用安装脚本
 *
 * 执行顺序：
 * - 安装：Install::install() → 数据库迁移 → 清理遗留配置 → 绑定菜单权限码
 * - 卸载：Install::uninstall() → 回滚迁移 → 删除菜单/配置/权限
 * - 升级：Install::upgrade() → 增量迁移 → 清理遗留配置 → 绑定菜单权限码
 *
 * 说明：manifest.json 中的 config_groups / permissions / menus 由框架
 * AppInstallerService 统一注册（registerConfigGroups / registerPermissions /
 * registerMenus），本脚本不重复播种，只处理框架未覆盖的两件事：
 * 1. 清理本应用早期版本误用点号前缀写入的遗留配置数据
 * 2. 绑定后台菜单的 permission_code（框架 registerMenus 不写该字段）
 */
class Install
{
    /**
     * 应用 ID
     */
    private const APP_ID = 'cmspro.windowsxponline';

    /**
     * 遗留配置 code 前缀（含点号）
     *
     * 本应用早期版本的 seedDefaultConfigs() 直接用 app_id 原值拼接 code，
     * 而框架 registerConfigGroups() 与 StorageManager::CONFIG_PREFIX 均使用
     * 点号转下划线的形式，导致这套数据写入后永远读不到，属无效残留。
     */
    private const LEGACY_CONFIG_PREFIX = 'app_cmspro.windowsxponline_';

    /**
     * 后台菜单 code → 权限码映射
     *
     * 与 manifest.json 的 permissions 声明一一对应。框架菜单树不按
     * permission_code 过滤可见性（可见性由角色-菜单关联控制），此绑定
     * 仅用于在后台菜单管理界面呈现「菜单 ↔ 权限码」对应关系，便于授权维护；
     * 实际接口拦截由 Middleware\EnsureXpAdminPermission 完成。
     */
    private const MENU_PERMISSIONS = [
        'windowsxponline' => 'cmspro.windowsxponline.access',
        'windowsxponline_desktop' => 'cmspro.windowsxponline.access',
        'windowsxponline_settings' => 'cmspro.windowsxponline.settings',
        'windowsxponline_spaces' => 'cmspro.windowsxponline.spaces',
        'windowsxponline_deskicons' => 'cmspro.windowsxponline.deskicons',
    ];

    /**
     * 安装时执行
     */
    public function install(): void
    {
        $this->runMigrations();
        $this->cleanupLegacyConfigs();
        $this->syncMenuPermissionCodes();
    }

    /**
     * 卸载时执行（仅非数据库清理，表删除交给系统 rollbackMigrations）
     */
    public function uninstall(): void
    {
        $this->rollbackMigrations();
        Cache::flush();
    }

    /**
     * 升级时执行
     *
     * 当前仅有单一版本，无按版本区间分支的增量迁移；迁移、遗留清理与菜单
     * 权限码绑定三者均幂等，故升级等价于重跑安装流程。后续新增迁移文件时，
     * runMigrations() 会依据 migrations 表记录自动跳过已执行项。
     */
    public function upgrade(string $fromVersion, string $toVersion): void
    {
        $this->install();
    }

    /**
     * 迁移兜底机制：直接 require 迁移文件并执行 up()
     * 避免Windows路径分隔符导致 Artisan::call('migrate') 失败
     */
    protected function runMigrations(): void
    {
        $migrationsPath = __DIR__ . '/Migrations';
        $migrationFiles = glob($migrationsPath . '/*.php');

        foreach ($migrationFiles as $file) {
            $migrationName = pathinfo($file, PATHINFO_FILENAME);

            if (DB::table('migrations')->where('migration', $migrationName)->exists()) {
                continue;
            }

            $migration = require $file;
            if (method_exists($migration, 'up')) {
                try {
                    $migration->up();

                    DB::table('migrations')->insert([
                        'migration' => $migrationName,
                        'batch' => DB::table('migrations')->max('batch') + 1,
                    ]);
                } catch (\Throwable $e) {
                    Log::error('XP在线版应用迁移执行失败', [
                        'app' => self::APP_ID,
                        'file' => basename($file),
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }
    }

    /**
     * 迁移回滚兜底：逆序 require 迁移文件并执行 down()
     */
    protected function rollbackMigrations(): void
    {
        $migrationsPath = __DIR__ . '/Migrations';
        $migrationFiles = glob($migrationsPath . '/*.php');

        foreach (array_reverse($migrationFiles) as $file) {
            $migrationName = pathinfo($file, PATHINFO_FILENAME);

            if (!DB::table('migrations')->where('migration', $migrationName)->exists()) {
                continue;
            }

            $migration = require $file;
            if (method_exists($migration, 'down')) {
                try {
                    $migration->down();

                    DB::table('migrations')->where('migration', $migrationName)->delete();
                } catch (\Throwable $e) {
                    Log::error('XP在线版应用迁移回滚失败', [
                        'app' => self::APP_ID,
                        'file' => basename($file),
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }
    }

    /**
     * 清理早期版本误用点号前缀写入的遗留配置数据
     *
     * 遗留的 config_groups（app_cmspro.windowsxponline_general / _storage）及其
     * 下属 config_items 从未被任何业务代码读取（读取方一律使用点号转下划线前缀），
     * 且与框架播种的正式配置在后台「系统设置」界面重复显示，故直接删除。
     *
     * 正式生效的下划线版配置由框架 registerConfigGroups() 播种与维护，本方法不触碰。
     * 幂等：无遗留数据时删除 0 行。
     */
    protected function cleanupLegacyConfigs(): void
    {
        if (!class_exists(\App\Models\ConfigGroup::class) || !class_exists(\App\Models\ConfigItem::class)) {
            return;
        }

        $legacyPattern = self::LEGACY_CONFIG_PREFIX . '%';

        // 先删配置项再删配置组，避免组删除后子项失去归属无法定位
        \App\Models\ConfigItem::where('code', 'like', $legacyPattern)->delete();
        \App\Models\ConfigGroup::where('code', 'like', $legacyPattern)->delete();
    }

    /**
     * 绑定后台菜单的权限码
     *
     * 框架 AppInstallerService::upsertMenuByCode() 的 manifest 属性白名单不含
     * permission_code，manifest.json 中声明也无法生效，故在应用侧显式回写。
     * 仅处理 admin 端菜单；用户端菜单（my_windowsxp*）不涉及后台权限体系。
     * 幂等：重复执行为同值覆盖。
     */
    protected function syncMenuPermissionCodes(): void
    {
        if (!class_exists(\App\Models\AdminMenu::class)) {
            return;
        }

        foreach (self::MENU_PERMISSIONS as $menuCode => $permissionCode) {
            \App\Models\AdminMenu::where('app_id', self::APP_ID)
                ->where('code', $menuCode)
                ->update(['permission_code' => $permissionCode]);
        }
    }
}
