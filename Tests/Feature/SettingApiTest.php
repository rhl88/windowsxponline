<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Admin\Api\SettingApiController;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 后台设置接口测试
 *
 * 覆盖验收修复项：
 * - M-02：更新已存在配置项时不得破坏框架播种的结构字段
 *   （group_id / name / type / tips 由 AppInstallerService::registerConfigGroups 维护）
 * - M-04：access_mode / storage_driver 枚举校验、default_space_quota 范围校验
 * - 游客功能开关 xp_guest_enabled 枚举校验（仅 0/1）
 */
class SettingApiTest extends TestCase
{
    use WindowsxponlineSetup;

    /**
     * 配置组 code（与 manifest.json config_groups 一致）
     */
    private const GROUP_CODE = 'app_cmspro_windowsxponline_general';

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();
    }

    /**
     * 构造 PUT /settings 请求
     *
     * @param array<string, mixed> $payload 请求体
     */
    private function putSettings(array $payload): \Illuminate\Http\JsonResponse
    {
        $request = Request::create('/api/admin/cmspro/windowsxponline/settings', 'PUT');
        $request->headers->set('Content-Type', 'application/json');
        $request->setMethod('PUT');

        foreach ($payload as $key => $value) {
            $request->json()->set($key, $value);
        }

        return (new SettingApiController())->update($request);
    }

    /**
     * 预置一条由框架播种的配置项（结构字段完整）
     */
    private function seedExistingConfigItem(): void
    {
        DB::table('config_groups')->insert([
            'name' => '基础设置',
            'code' => self::GROUP_CODE,
            'app_id' => 'cmspro.windowsxponline',
            'sort' => 0,
            'status' => 1,
        ]);

        $groupId = DB::table('config_groups')->where('code', self::GROUP_CODE)->value('id');

        DB::table('config_items')->insert([
            'group_id' => $groupId,
            'name' => '访问路径',
            'code' => 'app_cmspro_windowsxponline_access_path',
            'value' => '/origin',
            'type' => 'text',
            'tips' => '自定义桌面访问入口路径',
            'sort' => 1,
            'status' => 1,
        ]);
    }

    /**
     * 测试更新已存在配置项时只改 value，结构字段保持不变
     */
    public function test_更新已存在配置项时不破坏结构字段(): void
    {
        $this->seedExistingConfigItem();
        $before = DB::table('config_items')
            ->where('code', 'app_cmspro_windowsxponline_access_path')
            ->first();

        $this->putSettings(['access_path' => '/xpos']);

        $after = DB::table('config_items')
            ->where('code', 'app_cmspro_windowsxponline_access_path')
            ->first();

        $this->assertSame('/xpos', $after->value);
        $this->assertSame($before->group_id, $after->group_id);
        $this->assertSame('访问路径', $after->name);
        $this->assertSame('自定义桌面访问入口路径', $after->tips);
        $this->assertSame($before->sort, $after->sort);
        $this->assertNotSame(0, (int) $after->group_id);
    }

    /**
     * 测试新建配置项时从 manifest 补全分组与中文标题
     */
    public function test_新建配置项时补全分组与标题(): void
    {
        DB::table('config_groups')->insert([
            'name' => '存储设置',
            'code' => 'app_cmspro_windowsxponline_storage',
            'app_id' => 'cmspro.windowsxponline',
            'sort' => 0,
            'status' => 1,
        ]);

        $this->putSettings(['oss_bucket' => 'my-bucket']);

        $item = DB::table('config_items')
            ->where('code', 'app_cmspro_windowsxponline_oss_bucket')
            ->first();

        $this->assertNotNull($item);
        $this->assertSame('my-bucket', $item->value);
        // manifest 路径正确时可解析出真实 group_id 与中文标题，而非兜底的 0 与英文键名
        $this->assertNotSame(0, (int) $item->group_id);
        $this->assertSame('OSS Bucket', $item->name);
    }

    /**
     * 测试 access_mode 非法值被拒绝
     */
    public function test_access_mode非法值被拒绝(): void
    {
        $response = $this->putSettings(['access_mode' => 'hacked']);
        $data = json_decode($response->getContent(), true);

        $this->assertNotSame(0, $data['code']);
        $this->assertNull(
            DB::table('config_items')
                ->where('code', 'app_cmspro_windowsxponline_access_mode')
                ->value('value')
        );
    }

    /**
     * 测试 storage_driver 非法值被拒绝
     */
    public function test_storage_driver非法值被拒绝(): void
    {
        $response = $this->putSettings(['storage_driver' => 'ftp']);
        $data = json_decode($response->getContent(), true);

        $this->assertNotSame(0, $data['code']);
    }

    /**
     * 测试游客功能开关非法值被拒绝（仅接受 0/1）
     */
    public function test_游客开关非法值被拒绝(): void
    {
        foreach (['2', 'yes', ''] as $invalid) {
            $response = $this->putSettings(['xp_guest_enabled' => $invalid]);
            $data = json_decode($response->getContent(), true);

            $this->assertNotSame(0, $data['code'], "游客开关 '{$invalid}' 应被拒绝");
        }
        $this->assertNull(
            DB::table('config_items')
                ->where('code', 'app_cmspro_windowsxponline_xp_guest_enabled')
                ->value('value'),
            '非法值不应写库'
        );
    }

    /**
     * 测试游客功能开关合法值可保存（1 开启 / 0 关闭）
     */
    public function test_游客开关合法值可保存(): void
    {
        foreach (['1', '0'] as $valid) {
            $response = $this->putSettings(['xp_guest_enabled' => $valid]);
            $data = json_decode($response->getContent(), true);

            $this->assertSame(0, $data['code'], $data['message'] ?? '');
            $this->assertSame(
                $valid,
                DB::table('config_items')
                    ->where('code', 'app_cmspro_windowsxponline_xp_guest_enabled')
                    ->value('value')
            );
        }
    }

    /**
     * 测试 default_space_quota 超出允许范围被拒绝
     */
    public function test_默认配额超出范围被拒绝(): void
    {
        foreach ([0, -1, 1048577] as $invalidQuota) {
            $response = $this->putSettings(['default_space_quota' => $invalidQuota]);
            $data = json_decode($response->getContent(), true);

            $this->assertNotSame(0, $data['code'], "配额 {$invalidQuota} 应被拒绝");
        }
    }

    /**
     * 测试 default_space_quota 为非数字字符串时被拒绝（类型校验）
     */
    public function test_默认配额非数字字符串被拒绝(): void
    {
        $response = $this->putSettings(['default_space_quota' => 'abc']);
        $data = json_decode($response->getContent(), true);

        $this->assertNotSame(0, $data['code'], '非数字配额应被拒绝');
        $this->assertNull(
            DB::table('config_items')
                ->where('code', 'app_cmspro_windowsxponline_default_space_quota')
                ->value('value')
        );
    }

    /**
     * 测试绑定域名按纯域名格式接受并原样入库
     */
    public function test_绑定域名纯域名格式被接受(): void
    {
        $response = $this->putSettings(['bind_domain' => 'xp.example.com']);
        $data = json_decode($response->getContent(), true);

        $this->assertSame(0, $data['code'], '纯域名应通过校验');
        $this->assertSame(
            'xp.example.com',
            DB::table('config_items')
                ->where('code', 'app_cmspro_windowsxponline_bind_domain')
                ->value('value')
        );
    }

    /**
     * 测试绑定域名误带协议前缀时归一化为纯域名入库
     */
    public function test_绑定域名带协议前缀被归一化(): void
    {
        $response = $this->putSettings(['bind_domain' => 'https://xp.example.com/']);
        $data = json_decode($response->getContent(), true);

        $this->assertSame(0, $data['code']);
        $this->assertSame(
            'xp.example.com',
            DB::table('config_items')
                ->where('code', 'app_cmspro_windowsxponline_bind_domain')
                ->value('value')
        );
    }

    /**
     * 测试非法域名格式被拒绝
     */
    public function test_绑定域名非法格式被拒绝(): void
    {
        foreach (['xp', 'xp_example.com', '-xp.example.com', 'xp..com', 'xp.example_path'] as $invalid) {
            $response = $this->putSettings(['bind_domain' => $invalid]);
            $data = json_decode($response->getContent(), true);

            $this->assertNotSame(0, $data['code'], "非法域名 {$invalid} 应被拒绝");
        }
    }

    /**
     * 测试白名单之外的键被忽略，不会写入配置表（防注入任意配置项）
     */
    public function test_非白名单键被忽略不写库(): void
    {
        $response = $this->putSettings(['evil_key' => 'payload']);
        $data = json_decode($response->getContent(), true);

        $this->assertSame(0, $data['code'], '未知键应被静默忽略而非报错');
        $this->assertNull(
            DB::table('config_items')->where('code', 'app_cmspro_windowsxponline_evil_key')->value('value')
        );
        $this->assertNull(
            DB::table('config_items')->where('code', 'evil_key')->value('value')
        );
    }
}
