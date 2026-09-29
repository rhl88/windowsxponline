<?php

namespace App\Apps\CmsproWindowsxponline\Models;

use App\Models\BaseModel;

/**
 * 文件二进制对象（blob）元数据模型
 *
 * 二进制内容本体不在数据库中，存于存储驱动（键：{userType}/{userId}/files/{blobId}），
 * 本模型只承载元数据，供下载响应头、配额汇总与 blob 清理使用。
 *
 * 注意 user_id 不做 integer 转换：免登录（anon）模式下它是 XP 帐户名字符串。
 */
class XpFile extends BaseModel
{
    /**
     * 表名
     */
    protected $table = 'app_cmspro_windowsxponline_files';

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
        'blob_id',
        'name',
        'mime',
        'size_bytes',
        'status',
    ];

    /**
     * 类型转换
     */
    protected $casts = [
        'size_bytes' => 'integer',
        'status' => 'integer',
        'create_time' => 'datetime:Y-m-d H:i:s',
        'update_time' => 'datetime:Y-m-d H:i:s',
    ];

    /**
     * 状态常量
     */
    const STATUS_DELETED = 0;
    const STATUS_NORMAL = 1;

    /**
     * 获取文件大小（MB，向上取整）
     */
    public function getSizeMb(): int
    {
        return (int) ceil($this->size_bytes / (1024 * 1024));
    }
}
