<?php

namespace App\Apps\CmsproWindowsxponline\Models;

use App\Models\BaseModel;

/**
 * 分片上传会话模型
 *
 * 承载一次分片上传的全部状态，使断点续传可跨页面刷新、跨浏览器会话进行：
 * 前端 init 时若命中同身份 + 同目标目录 + 同文件名 + 同大小的进行中会话，
 * 服务端直接返回既有 uploadId 与已接收片索引，客户端跳过已传分片。
 */
class XpUpload extends BaseModel
{
    /**
     * 表名
     */
    protected $table = 'app_cmspro_windowsxponline_uploads';

    /**
     * 时间字段名（遵循 CMSPRO 规范）
     */
    const CREATED_AT = 'create_time';
    const UPDATED_AT = 'update_time';

    /**
     * 可批量赋值的字段
     */
    protected $fillable = [
        'upload_id',
        'user_type',
        'user_id',
        'name',
        'parent_path',
        'size_bytes',
        'chunk_size',
        'chunk_total',
        'received_mask',
        'blob_id',
        'status',
    ];

    /**
     * 类型转换
     *
     * received_mask 以 JSON 数组形式存已接收的分片索引
     */
    protected $casts = [
        'size_bytes' => 'integer',
        'chunk_size' => 'integer',
        'chunk_total' => 'integer',
        'received_mask' => 'array',
        'status' => 'integer',
        'create_time' => 'datetime:Y-m-d H:i:s',
        'update_time' => 'datetime:Y-m-d H:i:s',
    ];

    /**
     * 状态常量
     */
    const STATUS_PENDING = 0;
    const STATUS_COMPLETED = 1;
    const STATUS_CANCELLED = 2;

    /**
     * 获取已接收的分片索引（升序、去重）
     *
     * @return array<int, int>
     */
    public function receivedIndexes(): array
    {
        $mask = $this->received_mask;
        if (!is_array($mask)) {
            return [];
        }

        $indexes = array_values(array_unique(array_map('intval', $mask)));
        sort($indexes);

        return $indexes;
    }

    /**
     * 标记指定分片为已接收
     */
    public function markReceived(int $index): void
    {
        $indexes = $this->receivedIndexes();
        if (!in_array($index, $indexes, true)) {
            $indexes[] = $index;
            sort($indexes);
        }

        $this->received_mask = $indexes;
    }

    /**
     * 判断是否所有分片均已接收
     */
    public function isFullyReceived(): bool
    {
        return $this->chunk_total > 0 && count($this->receivedIndexes()) >= $this->chunk_total;
    }

    /**
     * 获取下一个待传分片索引，全部接收完毕时返回 -1
     */
    public function nextMissingIndex(): int
    {
        $received = $this->receivedIndexes();
        for ($i = 0; $i < $this->chunk_total; $i++) {
            if (!in_array($i, $received, true)) {
                return $i;
            }
        }

        return -1;
    }
}
