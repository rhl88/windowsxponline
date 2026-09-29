<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Admin\Api\SpaceApiController;
use App\Apps\CmsproWindowsxponline\Models\UserSpace;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 后台空间管理接口测试
 *
 * 覆盖验收修复项：
 * - M-03：写接口入参校验（status 枚举、username 非空与长度、quota_mb 上限）
 * - M-07：列表 keyword 改右模糊前缀匹配（可命中 username 索引）
 * - M-08：分页参数兼容 per_page / limit，超大值钳制
 */
class SpaceApiTest extends TestCase
{
    use WindowsxponlineSetup;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();
    }

    /**
     * 构造带 JSON 请求体的 Request
     *
     * @param array<string, mixed> $payload 请求体
     */
    private function makeJsonRequest(string $uri, string $method, array $payload): Request
    {
        $request = Request::create($uri, $method);
        $request->headers->set('Content-Type', 'application/json');
        $request->setMethod($method);

        foreach ($payload as $key => $value) {
            $request->json()->set($key, $value);
        }

        return $request;
    }

    /**
     * 创建一条已存在的空间记录
     */
    private function seedSpace(array $attributes = []): UserSpace
    {
        return UserSpace::create(array_merge([
            'user_type' => UserSpace::TYPE_USER,
            'user_id' => 1001,
            'username' => 'tester',
            'quota_mb' => 100,
            'used_mb' => 0,
            'status' => UserSpace::STATUS_ENABLED,
        ], $attributes));
    }

    /**
     * 断言响应为业务错误（code 非 0）
     */
    private function assertBusinessError(\Illuminate\Http\JsonResponse $response, string $message = ''): void
    {
        $data = json_decode($response->getContent(), true);
        $this->assertNotSame(0, $data['code'], $message);
    }

    /** 测试 status 非枚举值被拒绝，且原记录未被修改 */
    public function test_更新空间时status非法值被拒绝(): void
    {
        $space = $this->seedSpace();

        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces/' . $space->id,
            'PUT',
            ['status' => 9]
        );
        $response = (new SpaceApiController())->update($request, $space->id);

        $this->assertBusinessError($response, 'status=9 应被拒绝');
        $this->assertSame(
            UserSpace::STATUS_ENABLED,
            (int) UserSpace::find($space->id)->status,
            '校验失败时不得写入数据库'
        );
    }

    /** 测试 status 合法枚举值可正常更新 */
    public function test_更新空间时status合法值可保存(): void
    {
        $space = $this->seedSpace();

        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces/' . $space->id,
            'PUT',
            ['status' => UserSpace::STATUS_DISABLED, 'quota_mb' => 200]
        );
        $response = (new SpaceApiController())->update($request, $space->id);

        $data = json_decode($response->getContent(), true);
        $this->assertSame(0, $data['code']);
        $this->assertSame(UserSpace::STATUS_DISABLED, (int) UserSpace::find($space->id)->status);
        $this->assertSame(200, (int) UserSpace::find($space->id)->quota_mb);
    }

    /** 测试 quota_mb 超出上限被拒绝 */
    public function test_更新空间时配额超上限被拒绝(): void
    {
        $space = $this->seedSpace();

        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces/' . $space->id,
            'PUT',
            ['quota_mb' => 1048577]
        );
        $response = (new SpaceApiController())->update($request, $space->id);

        $this->assertBusinessError($response, 'quota_mb=1048577 应被拒绝');
        $this->assertSame(100, (int) UserSpace::find($space->id)->quota_mb);
    }

    /** 测试创建空间时 username 为空被拒绝 */
    public function test_创建空间时用户名为空被拒绝(): void
    {
        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces',
            'POST',
            ['user_type' => UserSpace::TYPE_USER, 'user_id' => 2001, 'username' => '   ']
        );
        $response = (new SpaceApiController())->create($request);

        $this->assertBusinessError($response, '空白用户名应被拒绝');
        $this->assertNull(UserSpace::where('user_id', 2001)->first());
    }

    /** 测试创建空间时 username 超长被拒绝 */
    public function test_创建空间时用户名超长被拒绝(): void
    {
        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces',
            'POST',
            [
                'user_type' => UserSpace::TYPE_USER,
                'user_id' => 2002,
                'username' => str_repeat('长', 101),
            ]
        );
        $response = (new SpaceApiController())->create($request);

        $this->assertBusinessError($response, '101 字符用户名应被拒绝');
        $this->assertNull(UserSpace::where('user_id', 2002)->first());
    }

    /** 测试创建空间时 quota_mb 超上限被拒绝 */
    public function test_创建空间时配额超上限被拒绝(): void
    {
        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces',
            'POST',
            [
                'user_type' => UserSpace::TYPE_ADMIN,
                'user_id' => 2003,
                'username' => 'admin2003',
                'quota_mb' => 99999999,
            ]
        );
        $response = (new SpaceApiController())->create($request);

        $this->assertBusinessError($response, 'quota_mb=99999999 应被拒绝');
        $this->assertNull(UserSpace::where('user_id', 2003)->first());
    }

    /** 测试创建空间时 user_type 非枚举值被拒绝 */
    public function test_创建空间时用户类型非法被拒绝(): void
    {
        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces',
            'POST',
            ['user_type' => 'guest', 'user_id' => 2004, 'username' => 'guest2004']
        );
        $response = (new SpaceApiController())->create($request);

        $this->assertBusinessError($response, 'user_type=guest 应被拒绝');
        $this->assertNull(UserSpace::where('user_id', 2004)->first());
    }

    /** 测试创建空间时 user_id 缺失（0）被拒绝 */
    public function test_创建空间时用户ID缺失被拒绝(): void
    {
        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces',
            'POST',
            ['user_type' => UserSpace::TYPE_USER, 'username' => 'noid']
        );
        $response = (new SpaceApiController())->create($request);

        $this->assertBusinessError($response, 'user_id 缺失应被拒绝');
        $this->assertNull(UserSpace::where('username', 'noid')->first());
    }

    /** 测试同一用户重复创建空间被拒绝（409） */
    public function test_创建空间时重复记录被拒绝(): void
    {
        $this->seedSpace(['user_id' => 5001, 'username' => 'dup']);

        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces',
            'POST',
            ['user_type' => UserSpace::TYPE_USER, 'user_id' => 5001, 'username' => 'dup']
        );
        $response = (new SpaceApiController())->create($request);

        $this->assertBusinessError($response, '重复创建应被拒绝');
        $this->assertSame(1, UserSpace::where('user_id', 5001)->count());
    }

    /** 测试更新空间时 quota_mb 为负数被拒绝 */
    public function test_更新空间时配额为负数被拒绝(): void
    {
        $space = $this->seedSpace();

        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces/' . $space->id,
            'PUT',
            ['quota_mb' => -5]
        );
        $response = (new SpaceApiController())->update($request, $space->id);

        $this->assertBusinessError($response, 'quota_mb=-5 应被拒绝');
        $this->assertSame(100, (int) UserSpace::find($space->id)->quota_mb);
    }

    /** 测试更新不存在的空间记录返回业务错误（404） */
    public function test_更新不存在的空间返回错误(): void
    {
        $request = $this->makeJsonRequest(
            '/api/admin/cmspro/windowsxponline/spaces/999999',
            'PUT',
            ['quota_mb' => 200]
        );
        $response = (new SpaceApiController())->update($request, '999999');

        $this->assertBusinessError($response, '不存在的记录应返回错误');
    }

    /** 解析列表响应为 username 数组 */
    private function listUsernames(\Illuminate\Http\JsonResponse $response): array
    {
        $data = json_decode($response->getContent(), true);
        $this->assertSame(0, $data['code'], '列表接口应返回成功');

        return array_column($data['data']['items'], 'username');
    }

    /** 测试 M-07：keyword 前缀匹配命中 */
    public function test_列表搜索按前缀匹配命中(): void
    {
        $this->seedSpace(['user_id' => 3001, 'username' => 'alice']);
        $this->seedSpace(['user_id' => 3002, 'username' => 'bob']);

        $request = Request::create('/spaces', 'GET', ['keyword' => 'ali']);
        $usernames = $this->listUsernames((new SpaceApiController())->list($request));

        $this->assertSame(['alice'], $usernames);
    }

    /** 测试 M-07：中间子串不再匹配（右模糊语义，全模糊会命中） */
    public function test_列表搜索中间子串不命中(): void
    {
        $this->seedSpace(['user_id' => 3003, 'username' => 'alice']);

        $request = Request::create('/spaces', 'GET', ['keyword' => 'lic']);
        $usernames = $this->listUsernames((new SpaceApiController())->list($request));

        $this->assertSame([], $usernames, '右模糊查询下中间子串不应命中');
    }

    /** 测试 M-07：keyword 含 LIKE 通配符时按字面量处理，不放行全量数据 */
    public function test_列表搜索通配符被转义(): void
    {
        $this->seedSpace(['user_id' => 3004, 'username' => 'alice']);
        $this->seedSpace(['user_id' => 3005, 'username' => 'bob']);

        $request = Request::create('/spaces', 'GET', ['keyword' => '%']);
        $usernames = $this->listUsernames((new SpaceApiController())->list($request));

        $this->assertSame([], $usernames, 'keyword=% 不应匹配全部记录');
    }

    /** 测试 M-08：limit 参数（Layui 默认参数名）可作为每页条数生效 */
    public function test_列表limit参数分页生效(): void
    {
        $this->seedSpace(['user_id' => 4001, 'username' => 'user_a']);
        $this->seedSpace(['user_id' => 4002, 'username' => 'user_b']);
        $this->seedSpace(['user_id' => 4003, 'username' => 'user_c']);

        $request = Request::create('/spaces', 'GET', ['limit' => 2]);
        $response = (new SpaceApiController())->list($request);
        $data = json_decode($response->getContent(), true);

        $this->assertSame(0, $data['code']);
        $this->assertCount(2, $data['data']['items'], 'limit=2 应只返回 2 条');
        $this->assertSame(3, $data['data']['pagination']['total']);
    }

    /** 测试 M-08：per_page 优先于 limit，超大值被钳制到上限 */
    public function test_列表per_page优先且超大值被钳制(): void
    {
        $request = Request::create('/spaces', 'GET', ['per_page' => 50, 'limit' => 10]);
        $data = json_decode((new SpaceApiController())->list($request)->getContent(), true);
        $this->assertSame(50, $data['data']['pagination']['per_page'], 'per_page 应优先于 limit');

        $request = Request::create('/spaces', 'GET', ['per_page' => 999999]);
        $data = json_decode((new SpaceApiController())->list($request)->getContent(), true);
        $this->assertSame(100, $data['data']['pagination']['per_page'], '超大 per_page 应钳制到 100');
    }
}
