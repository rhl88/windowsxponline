<?php

namespace App\Apps\CmsproWindowsxponline\Services;

use Illuminate\Support\Facades\Log;

/**
 * 腾讯云 COS 存储驱动
 *
 * 使用腾讯云 COS PHP SDK 存储用户 XP 桌面状态数据
 * 需要安装 SDK：composer require qcloud/cos-sdk-v5
 */
class CosDriver implements StorageDriverInterface
{
    /**
     * COS 客户端实例
     */
    private $client = null;

    /**
     * COS 配置
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
     * 延迟初始化 COS 客户端
     */
    private function getClient(): ?object
    {
        if ($this->client !== null) {
            return $this->client;
        }

        if (!class_exists(\Qcloud\Cos\Client::class)) {
            throw new \RuntimeException('腾讯云 COS SDK 未安装，请执行：composer require qcloud/cos-sdk-v5');
        }

        $this->client = new \Qcloud\Cos\Client([
            'region' => $this->config['cos_region'] ?? '',
            'credentials' => [
                'secretId' => $this->config['cos_secret_id'] ?? '',
                'secretKey' => $this->config['cos_secret_key'] ?? '',
            ],
        ]);

        return $this->client;
    }

    public function read(string $key): ?string
    {
        try {
            $result = $this->getClient()->getObject([
                'Bucket' => $this->config['cos_bucket'] ?? '',
                'Key' => $key,
            ]);

            return (string) $result['Body'];
        } catch (\Throwable $e) {
            // 对象不存在时不记错误日志，仅返回 null
            if (strpos($e->getMessage(), 'NoSuchKey') === false) {
                Log::error('COS 读取失败', ['key' => $key, 'error' => $e->getMessage()]);
            }
            return null;
        }
    }

    public function write(string $key, string $data): bool
    {
        try {
            $this->getClient()->putObject([
                'Bucket' => $this->config['cos_bucket'] ?? '',
                'Key' => $key,
                'Body' => $data,
            ]);
            return true;
        } catch (\Throwable $e) {
            Log::error('COS 写入失败', ['key' => $key, 'error' => $e->getMessage()]);
            return false;
        }
    }

    public function delete(string $key): bool
    {
        try {
            $this->getClient()->deleteObject([
                'Bucket' => $this->config['cos_bucket'] ?? '',
                'Key' => $key,
            ]);
            return true;
        } catch (\Throwable $e) {
            Log::error('COS 删除失败', ['key' => $key, 'error' => $e->getMessage()]);
            return false;
        }
    }

    public function exists(string $key): bool
    {
        try {
            $this->getClient()->headObject([
                'Bucket' => $this->config['cos_bucket'] ?? '',
                'Key' => $key,
            ]);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function getSize(string $key): int
    {
        try {
            $result = $this->getClient()->headObject([
                'Bucket' => $this->config['cos_bucket'] ?? '',
                'Key' => $key,
            ]);
            return (int) ($result['ContentLength'] ?? 0);
        } catch (\Throwable $e) {
            return 0;
        }
    }

    public function getName(): string
    {
        return 'cos';
    }
}
