<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Support;

use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Windows XP 在线版 · 测试公共基建
 *
 * - 创建 config_items / config_groups 最小表（框架迁移不含时兜底）
 * - 运行应用迁移创建 user_spaces 表
 * - 清理缓存确保测试隔离
 */
trait WindowsxponlineSetup
{
    /**
     * 在 setUp() 中调用：建表 + 迁移
     */
    protected function setUpWindowsxponline(): void
    {
        Cache::flush();
        StorageManager::resetConfigCache();
        StateService::resetSpaceCache();
        $this->ensureConfigItemsTable();
        $this->ensureConfigGroupsTable();
        $this->artisan('migrate', ['--path' => 'app/Apps/CmsproWindowsxponline/Migrations']);
    }

    /**
     * 创建 config_items 最小表结构
     */
    protected function ensureConfigItemsTable(): void
    {
        if (!Schema::hasTable('config_items')) {
            Schema::create('config_items', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('group_id')->default(0);
                $table->string('name', 100)->default('');
                $table->string('code', 255)->default('');
                $table->text('value')->nullable();
                $table->string('type', 50)->default('text');
                $table->json('options')->nullable();
                $table->string('tips', 255)->nullable();
                $table->integer('sort')->default(0);
                $table->tinyInteger('status')->default(1);
                $table->dateTime('create_time')->nullable();
                $table->dateTime('update_time')->nullable();
            });
        }
    }

    /**
     * 创建 config_groups 最小表结构
     *
     * SettingApiController::getConfigMeta() 需按组 code 查询 group_id，
     * 缺表会导致新建配置项的测试用例抛 SQLSTATE[HY000] no such table
     */
    protected function ensureConfigGroupsTable(): void
    {
        if (!Schema::hasTable('config_groups')) {
            Schema::create('config_groups', function (Blueprint $table) {
                $table->increments('id');
                $table->string('name', 50);
                $table->string('code', 50)->unique();
                $table->string('app_id', 50)->nullable();
                $table->integer('sort')->default(0);
                $table->tinyInteger('status')->default(1);
                $table->dateTime('create_time')->nullable();
                $table->dateTime('update_time')->nullable();
            });
        }
    }
}
