<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * XP在线版 - 分片上传会话表
 *
 * 分片上传用于绕开 PHP post_max_size 限制并支持真断点续传：
 * init 建会话 → 逐片写入 tmp 键 → complete 按序拼接后落正式 blob。
 *
 * 会话落库使「关浏览器/断网/隔天回来继续传」成为可能，
 * 同时为 tmp 分片的超时清理提供精准的会话归属依据。
 *
 * received_mask 存已接收片索引的 JSON 数组（如 "[0,1,2]"），
 * 前端 init 时据此得知应从哪片续传。
 */
return new class extends Migration
{
    /**
     * 表名
     */
    private const TABLE = 'app_cmspro_windowsxponline_uploads';

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
            $table->string('upload_id', 64)->default('')->comment('上传会话标识，全局唯一');
            $table->string('user_type', 20)->default('user')->comment('用户类型：admin=管理员, user=普通用户, anon=免登录帐户');
            $table->string('user_id', 100)->default('')->comment('用户标识，anon 模式为 XP 帐户名');
            $table->string('name', 255)->default('')->comment('原始文件名（含扩展名）');
            $table->string('parent_path', 1024)->default('')->comment('目标目录，路径段数组的 JSON 字符串');
            $table->unsignedBigInteger('size_bytes')->default(0)->comment('客户端声明的文件总字节数');
            $table->unsignedInteger('chunk_size')->default(0)->comment('分片大小（字节）');
            $table->unsignedInteger('chunk_total')->default(0)->comment('分片总数');
            $table->text('received_mask')->nullable()->comment('已接收分片索引的 JSON 数组');
            $table->string('blob_id', 64)->default('')->comment('合并完成后生成的 blobId');
            $table->tinyInteger('status')->default(0)->comment('状态：0=进行中, 1=已完成, 2=已取消');
            $table->dateTime('create_time')->nullable()->comment('创建时间');
            $table->dateTime('update_time')->nullable()->comment('更新时间');

            // 索引名一律带表义前缀：MySQL 的索引名只在表内唯一，
            // 而 SQLite（测试用内存库）是全库唯一，重名会直接建表失败
            $table->unique('upload_id', 'uk_uploads_upload_id');
            $table->index(['user_type', 'user_id', 'status'], 'idx_uploads_owner_status');
            $table->index('create_time', 'idx_uploads_create_time');
        });

        if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            \Illuminate\Support\Facades\DB::statement(
                'ALTER TABLE `' . self::TABLE . '` COMMENT = "XP在线版-分片上传会话表"'
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
