<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * XP在线版 - 文件二进制对象（blob）元数据表
 *
 * 二进制内容本体存于存储驱动（键：{userType}/{userId}/files/{blobId}），
 * 本表只存元数据，用于：
 * 1. 按 blobId 反查原始文件名与 MIME（下载响应头需要）
 * 2. 汇总 Σsize_bytes 参与配额口径（快照字节 + blob 总量）
 * 3. 彻底删除文件/清空回收站时定位待清理的 blob
 *
 * user_id 采用 varchar：免登录（anon）模式下身份是 XP 帐户名字符串而非自增整数，
 * 与 user_spaces 表的 unsignedBigInteger 口径不同，不可照搬。
 */
return new class extends Migration
{
    /**
     * 表名
     */
    private const TABLE = 'app_cmspro_windowsxponline_files';

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
            $table->string('user_type', 20)->default('user')->comment('用户类型：admin=管理员, user=普通用户, anon=免登录帐户');
            $table->string('user_id', 100)->default('')->comment('用户标识，anon 模式为 XP 帐户名');
            $table->string('blob_id', 64)->default('')->comment('blob 存储键后缀，全局唯一');
            $table->string('name', 255)->default('')->comment('原始文件名（含扩展名）');
            $table->string('mime', 128)->default('')->comment('MIME 类型，未知时为空');
            $table->unsignedBigInteger('size_bytes')->default(0)->comment('文件字节数');
            $table->tinyInteger('status')->default(1)->comment('状态：0=已删除, 1=正常');
            $table->dateTime('create_time')->nullable()->comment('创建时间');
            $table->dateTime('update_time')->nullable()->comment('更新时间');

            // 索引名一律带表义前缀：MySQL 的索引名只在表内唯一，
            // 而 SQLite（测试用内存库）是全库唯一，重名会直接建表失败
            $table->unique('blob_id', 'uk_files_blob_id');
            $table->index(['user_type', 'user_id', 'status'], 'idx_files_owner_status');
        });

        if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            \Illuminate\Support\Facades\DB::statement(
                'ALTER TABLE `' . self::TABLE . '` COMMENT = "XP在线版-文件二进制对象元数据表"'
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
