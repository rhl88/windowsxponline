<?php

/**
 * 迁移文件：创建用户空间表
 *
 * 表名：app_cmspro_windowsxponline_user_spaces
 * 用途：记录每个用户（admin/user）的 XP 桌面空间配额和已用量
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 表名
     */
    private const TABLE = 'app_cmspro_windowsxponline_user_spaces';

    public function up(): void
    {
        if (Schema::hasTable(self::TABLE)) {
            return;
        }

        Schema::create(self::TABLE, function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键ID');
            $table->string('user_type', 20)->default('user')->comment('用户类型：admin=管理员, user=普通用户');
            $table->unsignedBigInteger('user_id')->default(0)->comment('用户ID，关联 users 或 admins 表');
            $table->string('username', 100)->default('')->comment('用户名（冗余字段，便于查询）');
            $table->unsignedInteger('quota_mb')->default(100)->comment('空间配额（MB）');
            $table->unsignedInteger('used_mb')->default(0)->comment('已用空间（MB）');
            $table->tinyInteger('status')->default(1)->comment('状态：0=禁用, 1=启用');
            $table->dateTime('create_time')->nullable()->comment('创建时间');
            $table->dateTime('update_time')->nullable()->comment('更新时间');

            // 索引
            $table->unique(['user_type', 'user_id'], 'uk_user_type_id');
            $table->index('username', 'idx_username');
        });

        // 添加表备注（仅 MySQL，SQLite 不支持 COMMENT 语法）
        if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            \Illuminate\Support\Facades\DB::statement(
                'ALTER TABLE `' . self::TABLE . '` COMMENT = "XP在线版-用户空间配额表"'
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists(self::TABLE);
    }
};
