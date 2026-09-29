<?php

namespace App\Apps\CmsproWindowsxponline\Services;

use Illuminate\Support\Facades\Storage;

/**
 * 本地存储驱动
 *
 * 使用 Laravel Storage facade 的 local 磁盘存储用户 XP 桌面状态数据
 * 存储路径：storage/app/windowsxponline/{user_type}/{user_id}/state.json
 */
class LocalDriver implements StorageDriverInterface
{
    /**
     * Laravel Storage 磁盘名称
     */
    private const DISK = 'local';

    /**
     * 存储根目录
     */
    private const ROOT_DIR = 'windowsxponline';

    /**
     * 读取数据
     */
    public function read(string $key): ?string
    {
        $path = $this->resolvePath($key);

        if (!Storage::disk(self::DISK)->exists($path)) {
            return null;
        }

        return Storage::disk(self::DISK)->get($path);
    }

    /**
     * 写入数据
     */
    public function write(string $key, string $data): bool
    {
        $path = $this->resolvePath($key);

        // 确保目录存在
        $dir = dirname($path);
        if (!Storage::disk(self::DISK)->exists($dir)) {
            Storage::disk(self::DISK)->makeDirectory($dir);
        }

        return Storage::disk(self::DISK)->put($path, $data);
    }

    /**
     * 删除数据
     */
    public function delete(string $key): bool
    {
        $path = $this->resolvePath($key);

        if (!Storage::disk(self::DISK)->exists($path)) {
            return true;
        }

        return Storage::disk(self::DISK)->delete($path);
    }

    /**
     * 检查数据是否存在
     */
    public function exists(string $key): bool
    {
        $path = $this->resolvePath($key);

        return Storage::disk(self::DISK)->exists($path);
    }

    /**
     * 获取数据大小（字节）
     */
    public function getSize(string $key): int
    {
        $path = $this->resolvePath($key);

        if (!Storage::disk(self::DISK)->exists($path)) {
            return 0;
        }

        return Storage::disk(self::DISK)->size($path);
    }

    /**
     * 获取驱动名称
     */
    public function getName(): string
    {
        return 'local';
    }

    /**
     * 解析存储键到实际路径
     *
     * @param string $key 存储键（如 user/1/state.json）
     * @return string 完整路径（windowsxponline/user/1/state.json）
     */
    private function resolvePath(string $key): string
    {
        return self::ROOT_DIR . '/' . ltrim($key, '/');
    }
}
