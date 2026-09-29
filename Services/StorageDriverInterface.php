<?php

namespace App\Apps\CmsproWindowsxponline\Services;

/**
 * 存储驱动接口
 *
 * 定义用户 XP 桌面状态数据的存储操作
 * 实现：LocalDriver（本地）、OssDriver（阿里云OSS）、CosDriver（腾讯云COS）
 */
interface StorageDriverInterface
{
    /**
     * 读取数据
     *
     * @param string $key 存储键（如 user/1/state.json）
     * @return string|null 数据内容，不存在返回 null
     */
    public function read(string $key): ?string;

    /**
     * 写入数据
     *
     * @param string $key 存储键
     * @param string $data 数据内容
     * @return bool 是否成功
     */
    public function write(string $key, string $data): bool;

    /**
     * 删除数据
     *
     * @param string $key 存储键
     * @return bool 是否成功
     */
    public function delete(string $key): bool;

    /**
     * 检查数据是否存在
     *
     * @param string $key 存储键
     * @return bool 是否存在
     */
    public function exists(string $key): bool;

    /**
     * 获取数据大小（字节）
     *
     * @param string $key 存储键
     * @return int 字节数，不存在返回 0
     */
    public function getSize(string $key): int;

    /**
     * 获取驱动名称
     *
     * @return string 驱动标识（local/oss/cos）
     */
    public function getName(): string;
}
