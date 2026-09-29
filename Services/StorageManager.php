<?php

namespace App\Apps\CmsproWindowsxponline\Services;

use App\Models\ConfigItem;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

/**
 * 存储管理器
 *
 * 根据应用配置选择合适的存储驱动
 * 支持的驱动：local（本地）、oss（阿里云OSS）、cos（腾讯云COS）
 */
class StorageManager
{
    /**
     * 配置前缀
     */
    private const CONFIG_PREFIX = 'app_cmspro_windowsxponline_';

    /**
     * 需要加密存储的敏感字段
     */
    private const ENCRYPTED_KEYS = [
        'oss_access_secret',
        'cos_secret_key',
        'xp_admin_password',
    ];

    /**
     * 配置项跨请求缓存键
     */
    private const CONFIG_CACHE_KEY = 'app_cmspro_windowsxponline_config_items';

    /**
     * 配置项跨请求缓存有效期（秒）
     */
    private const CONFIG_CACHE_TTL = 60;

    /**
     * 存储相关配置键（getAllConfig 一次性返回的字段）
     */
    private const CONFIG_KEYS = [
        'storage_driver',
        'default_space_quota',
        'oss_access_key',
        'oss_access_secret',
        'oss_bucket',
        'oss_endpoint',
        'cos_secret_id',
        'cos_secret_key',
        'cos_bucket',
        'cos_region',
        'xp_admin_password',
        'xp_quicklaunch_defaults',
        'xp_ie_homepage',
        'xp_guest_enabled',
    ];

    /**
     * 当前驱动实例缓存
     */
    private static ?StorageDriverInterface $driver = null;

    /**
     * 本应用配置项请求内缓存（键为去掉 CONFIG_PREFIX 后的短名，值为库中原始值）
     *
     * null 表示尚未加载；数组表示已加载完成（空数组代表库中无本应用配置）。
     * PHP-FPM 下静态属性随请求结束释放，缓存生命周期即单请求，不存在跨请求脏读。
     */
    private static ?array $configItems = null;

    /**
     * 获取存储驱动实例
     */
    public static function getDriver(): StorageDriverInterface
    {
        if (self::$driver !== null) {
            return self::$driver;
        }

        $driverName = self::getConfig('storage_driver', 'local');

        return self::$driver = self::createDriver($driverName);
    }

    /**
     * 重置驱动实例（配置变更后调用）
     */
    public static function resetDriver(): void
    {
        self::$driver = null;
    }

    /**
     * 创建存储驱动
     */
    public static function createDriver(string $driverName): StorageDriverInterface
    {
        $config = self::getAllConfig();

        return match ($driverName) {
            'oss' => new OssDriver($config),
            'cos' => new CosDriver($config),
            default => new LocalDriver(),
        };
    }

    /**
     * 获取当前存储驱动名称
     */
    public static function getDriverName(): string
    {
        return self::getConfig('storage_driver', 'local');
    }

    /**
     * 获取配置值
     *
     * 优先从数据库 config_items 表读取，回退到 Config/windowsxponline.php 默认值
     * 敏感字段（密钥）以加密形式存储，读取时自动解密
     *
     * 库中本应用全部配置项由 loadConfigItems() 一次查询载入请求内缓存，
     * 避免逐项查库（设置页读取 14 项、boot 阶段读取 3 项均为同一批数据）。
     */
    public static function getConfig(string $key, $default = null)
    {
        $items = self::loadConfigItems();

        if (array_key_exists($key, $items)) {
            return self::resolveValue($key, $items[$key]);
        }

        return config('apps.cmspro.windowsxponline.' . $key, $default);
    }

    /**
     * 一次性加载本应用全部配置项（请求内缓存）
     *
     * @return array<string, mixed> 短名 => 库中原始值
     */
    private static function loadConfigItems(): array
    {
        if (self::$configItems !== null) {
            return self::$configItems;
        }

        self::$configItems = self::fetchConfigItems();

        return self::$configItems;
    }

    /**
     * 读取本应用配置项（跨请求缓存兜底）
     *
     * ServiceProvider::boot() 每次请求都要读 access_* 配置，直连数据库会让全站
     * 所有页面平白多一次查询，故加 60 秒缓存；应用设置保存时由 resetConfigCache()
     * 主动失效，最坏陈旧窗口仅 60 秒。
     * 缓存内容为库中原始值（密钥仍是密文），不改变敏感数据的存储形态。
     *
     * @return array<string, mixed>
     */
    private static function fetchConfigItems(): array
    {
        try {
            $items = Cache::remember(
                self::CONFIG_CACHE_KEY,
                self::CONFIG_CACHE_TTL,
                fn (): array => self::queryConfigItems()
            );
        } catch (\Throwable $e) {
            // 数据库未就绪（安装/迁移阶段）或缓存不可用时按空配置处理，
            // 由 getConfig() 回退到 Config/windowsxponline.php 默认值
            return [];
        }

        return is_array($items) ? $items : [];
    }

    /**
     * 查询库中本应用全部配置项
     *
     * @return array<string, mixed> 短名 => 库中原始值
     */
    public static function queryConfigItems(): array
    {
        $items = [];
        $prefixLength = strlen(self::CONFIG_PREFIX);

        $rows = ConfigItem::where('code', 'like', self::CONFIG_PREFIX . '%')->get();
        foreach ($rows as $row) {
            $items[substr($row->code, $prefixLength)] = $row->value;
        }

        return $items;
    }

    /**
     * 解析配置项原始值：敏感字段解密，兼容历史明文数据
     *
     * @param string $key 配置短名
     * @param mixed $value 库中原始值
     * @return mixed 解密后的值
     */
    private static function resolveValue(string $key, $value)
    {
        if (!in_array($key, self::ENCRYPTED_KEYS, true) || $value === null || $value === '') {
            return $value;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable $e) {
            // 兼容旧明文数据：解密失败则返回原始值
            return $value;
        }
    }

    /**
     * 清空配置与驱动缓存（配置变更后必须调用）
     *
     * 驱动实例持有创建时读取的配置（如 OSS 密钥），配置变更后需一并重建，
     * 否则会出现「设置已保存但存储仍走旧配置」。
     */
    public static function resetConfigCache(): void
    {
        self::$configItems = null;
        self::resetDriver();

        try {
            Cache::forget(self::CONFIG_CACHE_KEY);
        } catch (\Throwable $e) {
            // 缓存存储不可用时最坏退化为 60 秒陈旧读取，不影响功能正确性
        }
    }

    /**
     * 获取所有存储相关配置
     */
    public static function getAllConfig(): array
    {
        $config = [];
        foreach (self::CONFIG_KEYS as $key) {
            $config[$key] = self::getConfig($key, '');
        }

        return $config;
    }

    /**
     * 获取默认空间配额（MB）
     */
    public static function getDefaultQuotaMb(): int
    {
        return (int) self::getConfig('default_space_quota', 100);
    }

    /**
     * 根据绑定域名拼接完整 URL
     *
     * 配置了 bind_domain 时拼接域名前缀，否则返回相对路径
     *
     * @param string $path 相对路径，如 /api/admin/cmspro/windowsxponline/v1
     * @return string 完整 URL 或相对路径
     */
    public static function buildUrl(string $path): string
    {
        $bindDomain = rtrim(self::getConfig('bind_domain', ''), '/');
        if ($bindDomain !== '') {
            // bind_domain 为纯域名契约，拼接完整 URL 时补 https 协议
            if (!preg_match('#^https?://#i', $bindDomain)) {
                $bindDomain = 'https://' . $bindDomain;
            }
            return $bindDomain . '/' . ltrim($path, '/');
        }
        return $path;
    }
}
