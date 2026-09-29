<?php

namespace App\Apps\CmsproWindowsxponline\Models;

use App\Models\BaseModel;

/**
 * 用户空间配额模型
 *
 * 记录每个用户（admin/user）的 XP 桌面空间配额和已用量
 */
class UserSpace extends BaseModel
{
    /**
     * 表名
     */
    protected $table = 'app_cmspro_windowsxponline_user_spaces';

    /**
     * 时间字段名（遵循 CMSPRO 规范）
     */
    const CREATED_AT = 'create_time';
    const UPDATED_AT = 'update_time';

    /**
     * 可批量赋值的字段
     */
    protected $fillable = [
        'user_type',
        'user_id',
        'username',
        'quota_mb',
        'used_mb',
        'status',
    ];

    /**
     * 类型转换
     */
    protected $casts = [
        'user_id' => 'integer',
        'quota_mb' => 'integer',
        'used_mb' => 'integer',
        'status' => 'integer',
        'create_time' => 'datetime:Y-m-d H:i:s',
        'update_time' => 'datetime:Y-m-d H:i:s',
    ];

    /**
     * 状态常量
     */
    const STATUS_DISABLED = 0;
    const STATUS_ENABLED = 1;

    /**
     * 用户类型常量
     */
    const TYPE_ADMIN = 'admin';
    const TYPE_USER = 'user';

    /**
     * 检查空间是否已满
     */
    public function isFull(): bool
    {
        return $this->used_mb >= $this->quota_mb;
    }

    /**
     * 获取剩余空间（MB）
     */
    public function getRemainingMb(): int
    {
        return max(0, $this->quota_mb - $this->used_mb);
    }

    /**
     * 获取使用率百分比
     */
    public function getUsagePercent(): float
    {
        if ($this->quota_mb <= 0) {
            return 0;
        }
        return round(($this->used_mb / $this->quota_mb) * 100, 2);
    }
}
