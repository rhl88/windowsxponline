<?php

/**
 * 迁移文件：用户空间表新增 create_time 索引
 *
 * 表名：app_cmspro_windowsxponline_user_spaces
 * 用途：后台空间列表按 create_time 倒序分页，缺索引导致全表扫描 + filesort
 * 对应验收项：M-07（索引与模糊查询优化）
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 表名
     */
    private const TABLE = 'app_cmspro_windowsxponline_user_spaces';

    /**
     * 索引名
     */
    private const INDEX = 'idx_create_time';

    public function up(): void
    {
        if (!Schema::hasTable(self::TABLE)) {
            return;
        }

        if (self::indexExists()) {
            return;
        }

        Schema::table(self::TABLE, function ($table) {
            $table->index('create_time', self::INDEX);
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable(self::TABLE)) {
            return;
        }

        if (!self::indexExists()) {
            return;
        }

        Schema::table(self::TABLE, function ($table) {
            $table->dropIndex(self::INDEX);
        });
    }

    /**
     * 检查索引是否已存在（跨 MySQL / SQLite 幂等判断）
     */
    private static function indexExists(): bool
    {
        if (DB::getDriverName() === 'sqlite') {
            $rows = DB::select(
                "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND name = ?",
                [self::TABLE, self::INDEX]
            );
            return count($rows) > 0;
        }

        return Schema::hasIndex(self::TABLE, self::INDEX);
    }
};
