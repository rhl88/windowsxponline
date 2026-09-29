<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * XP在线版 - 桌面图标表
 *
 * 后台可管理的桌面图标：新增/修改图标无需重新编译前端产物。
 * type 区分三类图标：
 * - web   网页快捷方式：双击以 IE 打开 target 指定的网址
 * - frame 框架页面：双击打开无边框窗口（保留标题栏拖动/最大化/最小化/关闭），内容为 target 指定的页面
 * - path  路径快捷方式：双击以资源管理器打开 target 指定的桌面路径
 *
 * 图标文件由后台表单上传，icon_url 存 /uploads/{appId}/{Y/m/d}/{name} 相对路径。
 */
return new class extends Migration
{
    /**
     * 表名
     */
    private const TABLE = 'app_cmspro_windowsxponline_desktop_icons';

    /**
     * 建表（幂等：已存在则跳过）
     */
    public function up(): void
    {
        if (Schema::hasTable(self::TABLE)) {
            return;
        }

        Schema::create(self::TABLE, function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键ID');
            $table->string('name', 100)->default('')->comment('图标名称（桌面显示文字）');
            $table->string('type', 20)->default('web')->comment('图标类型：web=网页快捷方式, frame=框架页面, path=路径快捷方式');
            $table->string('target', 1024)->default('')->comment('目标：网址 / 页面地址 / 桌面路径');
            $table->string('icon_url', 500)->default('')->comment('图标图片地址（相对路径）');
            $table->unsignedInteger('window_width')->default(1024)->comment('框架窗口宽度（px）');
            $table->unsignedInteger('window_height')->default(720)->comment('框架窗口高度（px）');
            $table->integer('sort')->default(0)->comment('排序值（升序，越小越靠前）');
            $table->tinyInteger('status')->default(1)->comment('状态：0=禁用, 1=启用');
            $table->dateTime('create_time')->nullable()->comment('创建时间');
            $table->dateTime('update_time')->nullable()->comment('更新时间');

            // 索引名一律带表义前缀：MySQL 的索引名只在表内唯一，
            // 而 SQLite（测试用内存库）是全库唯一，重名会直接建表失败
            $table->index(['status', 'sort'], 'idx_desktop_icons_status_sort');
        });

        if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            \Illuminate\Support\Facades\DB::statement(
                'ALTER TABLE `' . self::TABLE . '` COMMENT = "XP在线版-桌面图标表"'
            );
        }
    }

    /**
     * 回滚
     */
    public function down(): void
    {
        Schema::dropIfExists(self::TABLE);
    }
};