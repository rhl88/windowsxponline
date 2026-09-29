<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Admin\Api\SettingApiController;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use ReflectionClass;
use ReflectionProperty;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 配置读取缓存测试
 *
 * 覆盖验收修复项：
 * - M-01：boot() 阶段读取 access_* 配置不得每请求直连数据库
 * - M-09：getAllConfig() 逐项查库的 N+1
 */
class StorageConfigCacheTest extends TestCase
{
    use WindowsxponlineSetup;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();
    }

    /**
     * 批量读取存储配置只产生一次查询
     */
    public function test_批量读取配置只查询一次数据库(): void
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        $config = StorageManager::getAllConfig();

        // 以 CONFIG_KEYS 白名单为准，避免新增配置项时反复修改本用例的期望值
        $expected = (new ReflectionClass(StorageManager::class))->getConstant('CONFIG_KEYS');
        $this->assertSame(array_values($expected), array_keys($config));
        $this->assertCount(1, DB::getQueryLog(), 'getAllConfig 仍在逐项查库，存在 N+1');
    }

    /**
     * 同一请求内重复读取配置不再查库
     */
    public function test_请求内重复读取配置不再查库(): void
    {
        StorageManager::getConfig('storage_driver', '');

        DB::flushQueryLog();
        DB::enableQueryLog();

        StorageManager::getDefaultQuotaMb();
        StorageManager::getDriverName();
        StorageManager::buildUrl('/api/v1/state');

        $this->assertCount(0, DB::getQueryLog(), '请求内静态缓存未生效');
    }

    /**
     * 跨请求缓存命中时 boot 阶段零查询
     */
    public function test_跨请求缓存命中时不再查询数据库(): void
    {
        DB::table('config_items')->insert([
            'code' => 'app_cmspro_windowsxponline_access_mode',
            'value' => 'standalone',
        ]);

        $this->assertSame('standalone', StorageManager::getConfig('access_mode', ''));

        $this->simulateNewRequest();
        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->assertSame('standalone', StorageManager::getConfig('access_mode', ''));
        $this->assertCount(0, DB::getQueryLog(), '跨请求缓存未生效，仍会每请求查库');
    }

    /**
     * 保存设置后配置缓存必须立即失效
     *
     * 否则管理员改完访问模式，后台仍按旧配置注册动态入口与选择存储驱动。
     */
    public function test_保存设置后配置缓存立即失效(): void
    {
        DB::table('config_items')->insert([
            'code' => 'app_cmspro_windowsxponline_access_mode',
            'value' => 'online',
        ]);

        $this->assertSame('online', StorageManager::getConfig('access_mode', ''));

        $this->updateSettings(['access_mode' => 'standalone']);

        $this->assertSame('standalone', StorageManager::getConfig('access_mode', ''));
    }

    /**
     * 提交设置更新请求
     *
     * @param array<string, mixed> $payload 待保存的配置项
     */
    private function updateSettings(array $payload): void
    {
        $request = Request::create('/api/admin/cmspro/windowsxponline/settings', 'PUT');
        $request->headers->set('Content-Type', 'application/json');
        $request->setMethod('PUT');
        foreach ($payload as $key => $value) {
            $request->json()->set($key, $value);
        }

        (new SettingApiController())->update($request);
    }

    /**
     * 模拟新请求：仅清空请求内静态缓存，保留跨请求缓存
     */
    private function simulateNewRequest(): void
    {
        $property = new ReflectionProperty(StorageManager::class, 'configItems');
        $property->setAccessible(true);
        $property->setValue(null, null);
    }
}
