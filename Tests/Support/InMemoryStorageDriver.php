<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Support;

use App\Apps\CmsproWindowsxponline\Services\StorageDriverInterface;

/**
 * 内存存储驱动（测试专用）
 *
 * 以数组模拟 state.json 的读写，避免测试污染真实磁盘/对象存储，
 * 同时便于直接断言落盘后的状态快照内容。
 */
class InMemoryStorageDriver implements StorageDriverInterface
{
    /**
     * 存储数据：key => JSON 字符串
     *
     * @var array<string, string>
     */
    private array $store = [];

    public function read(string $key): ?string
    {
        return $this->store[$key] ?? null;
    }

    public function write(string $key, string $data): bool
    {
        $this->store[$key] = $data;

        return true;
    }

    public function delete(string $key): bool
    {
        unset($this->store[$key]);

        return true;
    }

    public function exists(string $key): bool
    {
        return isset($this->store[$key]);
    }

    public function getSize(string $key): int
    {
        return isset($this->store[$key]) ? strlen($this->store[$key]) : 0;
    }

    public function getName(): string
    {
        return 'memory';
    }

    /**
     * 读取并解码状态快照
     *
     * @return array<string, mixed>|null 不存在或非法 JSON 时返回 null
     */
    public function readState(string $key): ?array
    {
        $raw = $this->read($key);
        if ($raw === null) {
            return null;
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * 写入状态快照（编码为 JSON 后存储）
     *
     * @param array<string, mixed> $state
     */
    public function seedState(string $key, array $state): void
    {
        $json = json_encode($state, JSON_UNESCAPED_UNICODE);
        $this->store[$key] = $json !== false ? $json : '';
    }
}
