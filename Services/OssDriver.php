<?php

namespace App\Apps\CmsproWindowsxponline\Services;

use Illuminate\Support\Facades\Log;

/**
 * 阿里云 OSS 存储驱动
 *
 * 使用阿里云 OSS PHP SDK 存储用户 XP 桌面状态数据
 * 需要安装 SDK：composer require aliyuncs/oss-php-sdk
 */
class OssDriver implements StorageDriverInterface
{
    /**
     * OSS 客户端实例
     */
    private $client = null;

    /**
     * OSS 配置
     */
    private array $config;

    /**
     * 构造函数
     */
    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * 延迟初始化 OSS 客户端
     */
    private function getClient(): ?object
    {
        if ($this->client !== null) {
            return $this->client;
        }

        if (!class_exists(\OSS\OssClient::class)) {
            throw new \RuntimeException('阿里云 OSS SDK 未安装，请执行：composer require aliyuncs/oss-php-sdk');
        }

        $this->client = new \OSS\OssClient(
            $this->config['oss_access_key'] ?? '',
            $this->config['oss_access_secret'] ?? '',
            $this->config['oss_endpoint'] ?? ''
        );

        return $this->client;
    }

    public function read(string $key): ?string
    {
        try {
            $exists = $this->getClient()->doesObjectExist(
                $this->config['oss_bucket'] ?? '',
                $key
            );

            if (!$exists) {
                return null;
            }

            $result = $this->getClient()->getObject(
                $this->config['oss_bucket'] ?? '',
                $key
            );

            // OSS SDK 返回数组，对象内容在 content 键中；
            // 直接返回数组会让 read() 的 string 返回类型失效，
            // 导致快照与 blob 读取全部损坏（与 CosDriver::read() 口径对齐）
            return (string) $result['content'];
        } catch (\Throwable $e) {
            Log::error('OSS 读取失败', ['key' => $key, 'error' => $e->getMessage()]);
            return null;
        }
    }

    public function write(string $key, string $data): bool
    {
        try {
            $this->getClient()->putObject(
                $this->config['oss_bucket'] ?? '',
                $key,
                $data
            );
            return true;
        } catch (\Throwable $e) {
            Log::error('OSS 写入失败', ['key' => $key, 'error' => $e->getMessage()]);
            return false;
        }
    }

    public function delete(string $key): bool
    {
        try {
            $this->getClient()->deleteObject(
                $this->config['oss_bucket'] ?? '',
                $key
            );
            return true;
        } catch (\Throwable $e) {
            Log::error('OSS 删除失败', ['key' => $key, 'error' => $e->getMessage()]);
            return false;
        }
    }

    public function exists(string $key): bool
    {
        try {
            return $this->getClient()->doesObjectExist(
                $this->config['oss_bucket'] ?? '',
                $key
            );
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function getSize(string $key): int
    {
        try {
            $info = $this->getClient()->getObjectMeta(
                $this->config['oss_bucket'] ?? '',
                $key
            );
            return (int) ($info['content-length'] ?? 0);
        } catch (\Throwable $e) {
            return 0;
        }
    }

    public function getName(): string
    {
        return 'oss';
    }
}
