<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Admin\Api\SettingApiController;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 敏感字段加密存储测试
 *
 * 覆盖修复项 #10 S6：
 * - 敏感字段（oss_access_secret, cos_secret_key）保存时 Crypt::encryptString() 加密
 * - 读取时 Crypt::decryptString() 解密
 * - 兼容旧明文数据（解密失败返回原始值）
 * - getSettings 接口脱敏为 ******
 * - 值为 ****** 时跳过不覆盖
 */
class SettingEncryptionTest extends TestCase
{
    use WindowsxponlineSetup;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();
    }

    /**
     * 测试读取加密字段时自动解密返回明文
     */
    public function test_读取加密字段时解密返回明文(): void
    {
        $plainValue = 'my-secret-key-123';
        $encrypted = Crypt::encryptString($plainValue);

        DB::table('config_items')->insert([
            'code' => 'app_cmspro_windowsxponline_oss_access_secret',
            'value' => $encrypted,
        ]);

        $result = StorageManager::getConfig('oss_access_secret', '');
        $this->assertSame($plainValue, $result);
    }

    /**
     * 测试兼容旧明文数据（解密失败返回原始值）
     */
    public function test_兼容旧明文数据(): void
    {
        $plainValue = 'old-plain-secret';

        DB::table('config_items')->insert([
            'code' => 'app_cmspro_windowsxponline_cos_secret_key',
            'value' => $plainValue,
        ]);

        $result = StorageManager::getConfig('cos_secret_key', '');
        $this->assertSame($plainValue, $result);
    }

    /**
     * 测试保存敏感字段时加密存储到数据库
     */
    public function test_保存敏感字段时加密存储(): void
    {
        $controller = new SettingApiController();
        $request = Request::create(
            '/api/admin/cmspro/windowsxponline/settings',
            'PUT'
        );
        $request->headers->set('Content-Type', 'application/json');
        $request->setMethod('PUT');
        $request->json()->set('oss_access_secret', 'test-secret-456');

        $controller->update($request);

        $dbValue = DB::table('config_items')
            ->where('code', 'app_cmspro_windowsxponline_oss_access_secret')
            ->value('value');

        // 数据库中存储的不是明文
        $this->assertNotSame('test-secret-456', $dbValue);
        // 解密后等于明文
        $this->assertSame('test-secret-456', Crypt::decryptString($dbValue));
    }

    /**
     * 测试 getSettings 接口对敏感字段脱敏
     */
    public function test_getSettings接口敏感字段脱敏(): void
    {
        $encrypted = Crypt::encryptString('secret-value');
        DB::table('config_items')->insert([
            'code' => 'app_cmspro_windowsxponline_oss_access_secret',
            'value' => $encrypted,
        ]);

        $controller = new SettingApiController();
        $response = $controller->getSettings();
        $data = json_decode($response->getContent(), true);

        $this->assertSame('******', $data['data']['oss_access_secret']);
    }

    /**
     * 测试值为 ****** 时跳过不覆盖已有值
     */
    public function test_值为星号时跳过不覆盖(): void
    {
        $encrypted = Crypt::encryptString('original-secret');
        DB::table('config_items')->insert([
            'code' => 'app_cmspro_windowsxponline_oss_access_secret',
            'value' => $encrypted,
        ]);

        $controller = new SettingApiController();
        $request = Request::create(
            '/api/admin/cmspro/windowsxponline/settings',
            'PUT'
        );
        $request->headers->set('Content-Type', 'application/json');
        $request->setMethod('PUT');
        $request->json()->set('oss_access_secret', '******');

        $controller->update($request);

        $dbValue = DB::table('config_items')
            ->where('code', 'app_cmspro_windowsxponline_oss_access_secret')
            ->value('value');

        // 原始加密值未被覆盖
        $this->assertSame('original-secret', Crypt::decryptString($dbValue));
    }

    /**
     * 测试非敏感字段不加密存储
     */
    public function test_非敏感字段不加密存储(): void
    {
        $controller = new SettingApiController();
        $request = Request::create(
            '/api/admin/cmspro/windowsxponline/settings',
            'PUT'
        );
        $request->headers->set('Content-Type', 'application/json');
        $request->setMethod('PUT');
        $request->json()->set('oss_bucket', 'my-bucket-name');

        $controller->update($request);

        $dbValue = DB::table('config_items')
            ->where('code', 'app_cmspro_windowsxponline_oss_bucket')
            ->value('value');

        // 非敏感字段明文存储
        $this->assertSame('my-bucket-name', $dbValue);
    }
}
