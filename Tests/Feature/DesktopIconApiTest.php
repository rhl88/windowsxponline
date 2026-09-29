<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Admin\Api\DesktopIconApiController;
use App\Apps\CmsproWindowsxponline\Models\DesktopIcon;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 后台桌面图标 API 测试
 *
 * 覆盖：
 * - CRUD：创建 / 更新 / 删除 / 列表
 * - 校验：类型枚举、必填、target 协议防护、窗口尺寸范围
 * - 模型：getDesktopItems() 仅返回启用图标、toDesktopItem() 字段格式
 * - 上传：合法文件、非法扩展名、超大文件
 */
class DesktopIconApiTest extends TestCase
{
    use WindowsxponlineSetup;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();
    }

    protected function tearDown(): void
    {
        DesktopIcon::query()->delete();
        parent::tearDown();
    }

    // ── 请求构造辅助 ──

    /**
     * 构造 POST /deskicons 创建请求
     *
     * @param array<string, mixed> $payload
     */
    private function createIcon(array $payload): \Illuminate\Http\JsonResponse
    {
        $request = Request::create('/api/admin/cmspro/windowsxponline/deskicons', 'POST');
        $request->headers->set('Content-Type', 'application/json');
        foreach ($payload as $key => $value) {
            $request->json()->set($key, $value);
        }

        return (new DesktopIconApiController())->create($request);
    }

    /**
     * 构造 PUT /deskicons/{id} 更新请求
     *
     * @param array<string, mixed> $payload
     */
    private function updateIcon(int $id, array $payload): \Illuminate\Http\JsonResponse
    {
        $request = Request::create('/api/admin/cmspro/windowsxponline/deskicons/' . $id, 'PUT');
        $request->headers->set('Content-Type', 'application/json');
        foreach ($payload as $key => $value) {
            $request->json()->set($key, $value);
        }

        return (new DesktopIconApiController())->update($request, $id);
    }

    /**
     * 构造 GET /deskicons 列表请求
     */
    private function listIcon(array $params = []): \Illuminate\Http\JsonResponse
    {
        $request = Request::create('/api/admin/cmspro/windowsxponline/deskicons?' . http_build_query($params), 'GET');

        return (new DesktopIconApiController())->list($request);
    }

    /**
     * 构造上传图标请求
     */
    private function uploadIconFile(UploadedFile $file): \Illuminate\Http\JsonResponse
    {
        $request = Request::create('/api/admin/cmspro/windowsxponline/deskicons/icon', 'POST');
        $request->files->add(['icon' => $file]);

        return (new DesktopIconApiController())->uploadIcon($request);
    }

    /**
     * 解码 JSON 响应体
     *
     * @return array<string, mixed>
     */
    private function decode(\Illuminate\Http\JsonResponse $response): array
    {
        return json_decode($response->getContent(), true);
    }

    // ── 创建测试 ──

    /**
     * 测试创建 frame 类型桌面图标
     */
    public function test_创建frame类型桌面图标(): void
    {
        $response = $this->createIcon([
            'name' => '游戏',
            'type' => 'frame',
            'target' => 'https://game.example.com/',
            'icon_url' => '/uploads/test/icon.ico',
            'window_width' => 1024,
            'window_height' => 720,
            'sort' => 100,
            'status' => 1,
        ]);
        $data = $this->decode($response);

        $this->assertSame(0, $data['code'], $data['message'] ?? '');
        $this->assertSame('游戏', $data['data']['name']);
        $this->assertSame('frame', $data['data']['type']);
        $this->assertSame('https://game.example.com/', $data['data']['target']);
    }

    /**
     * 测试创建 web 类型桌面图标
     */
    public function test_创建web类型桌面图标(): void
    {
        $data = $this->decode($this->createIcon([
            'name' => '搜索引擎',
            'type' => 'web',
            'target' => 'https://www.example.com/',
        ]));

        $this->assertSame(0, $data['code']);
        $this->assertSame('web', $data['data']['type']);
    }

    /**
     * 测试创建 path 类型桌面图标
     */
    public function test_创建path类型桌面图标(): void
    {
        $data = $this->decode($this->createIcon([
            'name' => '我的文档',
            'type' => 'path',
            'target' => '/home/user/documents',
        ]));

        $this->assertSame(0, $data['code']);
        $this->assertSame('path', $data['data']['type']);
        $this->assertSame('/home/user/documents', $data['data']['target']);
    }

    // ── 校验测试 ──

    /**
     * 测试非法 type 被拒绝
     */
    public function test_非法type被拒绝(): void
    {
        $data = $this->decode($this->createIcon([
            'name' => '测试',
            'type' => 'evil',
            'target' => 'https://example.com/',
        ]));

        $this->assertNotSame(0, $data['code']);
    }

    /**
     * 测试缺少 name 被拒绝
     */
    public function test_缺少name被拒绝(): void
    {
        $data = $this->decode($this->createIcon([
            'type' => 'web',
            'target' => 'https://example.com/',
        ]));

        $this->assertNotSame(0, $data['code']);
    }

    /**
     * 测试缺少 target 被拒绝
     */
    public function test_缺少target被拒绝(): void
    {
        $data = $this->decode($this->createIcon([
            'name' => '测试',
            'type' => 'web',
        ]));

        $this->assertNotSame(0, $data['code']);
    }

    /**
     * 测试 frame/web 类型 target 非法协议（javascript:）被拒绝
     */
    public function test_frame类型target非法协议被拒绝(): void
    {
        $data = $this->decode($this->createIcon([
            'name' => '测试',
            'type' => 'frame',
            'target' => 'javascript:alert(1)',
        ]));

        $this->assertNotSame(0, $data['code']);
        $this->assertSame(0, DesktopIcon::where('target', 'javascript:alert(1)')->count());
    }

    /**
     * 测试 path 类型 target 必须以 / 开头
     */
    public function test_path类型target不以斜杠开头被拒绝(): void
    {
        $data = $this->decode($this->createIcon([
            'name' => '测试',
            'type' => 'path',
            'target' => 'https://example.com/',
        ]));

        $this->assertNotSame(0, $data['code']);
    }

    /**
     * 测试窗口尺寸超出范围被拒绝
     */
    public function test_窗口尺寸超出范围被拒绝(): void
    {
        // 低于下限
        $data = $this->decode($this->createIcon([
            'name' => '测试',
            'type' => 'frame',
            'target' => 'https://example.com/',
            'window_width' => 100,
        ]));
        $this->assertNotSame(0, $data['code']);

        // 超出上限
        $data = $this->decode($this->createIcon([
            'name' => '测试',
            'type' => 'frame',
            'target' => 'https://example.com/',
            'window_height' => 99999,
        ]));
        $this->assertNotSame(0, $data['code']);
    }

    // ── 更新测试 ──

    /**
     * 测试正常更新桌面图标
     */
    public function test_更新桌面图标(): void
    {
        $icon = DesktopIcon::create([
            'name' => '原名',
            'type' => 'web',
            'target' => 'https://old.example.com/',
            'icon_url' => '',
            'window_width' => 800,
            'window_height' => 600,
            'sort' => 0,
            'status' => 1,
        ]);

        $data = $this->decode($this->updateIcon($icon->id, [
            'name' => '新名',
            'type' => 'frame',
            'target' => 'https://new.example.com/',
            'icon_url' => '',
            'window_width' => 1024,
            'window_height' => 768,
            'sort' => 50,
            'status' => 1,
        ]));

        $this->assertSame(0, $data['code']);
        $this->assertSame('新名', $data['data']['name']);
        $this->assertSame('frame', $data['data']['type']);
        $this->assertSame('https://new.example.com/', $data['data']['target']);
    }

    /**
     * 测试更新不存在的图标返回 404
     */
    public function test_更新不存在的图标返回404(): void
    {
        $data = $this->decode($this->updateIcon(99999, [
            'name' => '测试',
            'type' => 'web',
            'target' => 'https://example.com/',
            'icon_url' => '',
            'window_width' => 1024,
            'window_height' => 720,
            'sort' => 0,
            'status' => 1,
        ]));

        $this->assertSame(404, $data['code']);
    }

    // ── 删除测试 ──

    /**
     * 测试正常删除桌面图标
     */
    public function test_删除桌面图标(): void
    {
        $icon = DesktopIcon::create([
            'name' => '待删除',
            'type' => 'web',
            'target' => 'https://example.com/',
            'icon_url' => '',
            'window_width' => 1024,
            'window_height' => 720,
            'sort' => 0,
            'status' => 1,
        ]);

        $response = (new DesktopIconApiController())->delete($icon->id);
        $data = $this->decode($response);

        $this->assertSame(0, $data['code']);
        $this->assertNull(DesktopIcon::find($icon->id));
    }

    /**
     * 测试删除不存在的图标返回 404
     */
    public function test_删除不存在的图标返回404(): void
    {
        $data = $this->decode((new DesktopIconApiController())->delete(99999));

        $this->assertSame(404, $data['code']);
    }

    // ── 列表测试 ──

    /**
     * 测试列表按关键字搜索
     */
    public function test_列表按关键字搜索(): void
    {
        DesktopIcon::create([
            'name' => '游戏大厅',
            'type' => 'frame',
            'target' => 'https://game.example.com/',
            'icon_url' => '',
            'window_width' => 1024,
            'window_height' => 720,
            'sort' => 0,
            'status' => 1,
        ]);
        DesktopIcon::create([
            'name' => '搜索引擎',
            'type' => 'web',
            'target' => 'https://search.example.com/',
            'icon_url' => '',
            'window_width' => 1024,
            'window_height' => 720,
            'sort' => 0,
            'status' => 1,
        ]);

        $data = $this->decode($this->listIcon(['keyword' => '游戏']));

        $this->assertSame(0, $data['code']);
        $this->assertSame(1, $data['data']['pagination']['total']);
        $this->assertSame('游戏大厅', $data['data']['items'][0]['name']);
    }

    /**
     * 测试列表按类型筛选
     */
    public function test_列表按类型筛选(): void
    {
        DesktopIcon::create([
            'name' => '游戏',
            'type' => 'frame',
            'target' => 'https://game.example.com/',
            'icon_url' => '',
            'window_width' => 1024,
            'window_height' => 720,
            'sort' => 0,
            'status' => 1,
        ]);
        DesktopIcon::create([
            'name' => '搜索',
            'type' => 'web',
            'target' => 'https://search.example.com/',
            'icon_url' => '',
            'window_width' => 1024,
            'window_height' => 720,
            'sort' => 0,
            'status' => 1,
        ]);

        $data = $this->decode($this->listIcon(['type' => 'web']));

        $this->assertSame(0, $data['code']);
        $this->assertSame(1, $data['data']['pagination']['total']);
        $this->assertSame('web', $data['data']['items'][0]['type']);
    }

    // ── 模型测试 ──

    /**
     * 测试 getDesktopItems() 只返回启用图标
     */
    public function test_getDesktopItems只返回启用图标(): void
    {
        DesktopIcon::create([
            'name' => '启用图标',
            'type' => 'frame',
            'target' => 'https://enabled.example.com/',
            'icon_url' => '/uploads/enabled.ico',
            'window_width' => 1024,
            'window_height' => 720,
            'sort' => 10,
            'status' => 1,
        ]);
        DesktopIcon::create([
            'name' => '禁用图标',
            'type' => 'web',
            'target' => 'https://disabled.example.com/',
            'icon_url' => '/uploads/disabled.ico',
            'window_width' => 1024,
            'window_height' => 720,
            'sort' => 20,
            'status' => 0,
        ]);

        $items = DesktopIcon::getDesktopItems();

        $this->assertCount(1, $items);
        $this->assertSame('启用图标', $items[0]['name']);
    }

    /**
     * 测试 toDesktopItem() 返回正确字段格式
     */
    public function test_toDesktopItem字段格式正确(): void
    {
        $icon = DesktopIcon::create([
            'name' => '测试图标',
            'type' => 'frame',
            'target' => 'https://example.com/',
            'icon_url' => '/uploads/icon.ico',
            'window_width' => 1280,
            'window_height' => 800,
            'sort' => 0,
            'status' => 1,
        ]);

        $item = $icon->toDesktopItem();

        $this->assertSame('xpicon_' . $icon->id, $item['key']);
        $this->assertSame($icon->id, $item['id']);
        $this->assertSame('测试图标', $item['name']);
        $this->assertSame('frame', $item['type']);
        $this->assertSame('https://example.com/', $item['target']);
        $this->assertSame('/uploads/icon.ico', $item['icon_url']);
        $this->assertSame(1280, $item['window_width']);
        $this->assertSame(800, $item['window_height']);
    }

    // ── 上传测试 ──

    /**
     * 测试上传合法图标文件
     */
    public function test_上传合法图标文件(): void
    {
        Storage::fake('public_uploads');

        $file = UploadedFile::fake()->create('icon.ico', 100, 'image/x-icon');

        $data = $this->decode($this->uploadIconFile($file));

        $this->assertSame(0, $data['code'], $data['message'] ?? '');
        $this->assertNotEmpty($data['data']['url']);
        $this->assertStringStartsWith('/uploads/cmspro.windowsxponline/desktop_icons/', $data['data']['url']);
    }

    /**
     * 测试上传非法扩展名被拒绝
     */
    public function test_上传非法扩展名被拒绝(): void
    {
        Storage::fake('public_uploads');

        $file = UploadedFile::fake()->create('malware.exe', 100, 'application/octet-stream');

        $data = $this->decode($this->uploadIconFile($file));

        $this->assertNotSame(0, $data['code']);
    }

    /**
     * 测试上传超大文件被拒绝（超过 2048 KB）
     */
    public function test_上传超大文件被拒绝(): void
    {
        Storage::fake('public_uploads');

        // 2049 KB 的假文件
        $file = UploadedFile::fake()->create('big.png', 2049, 'image/png');

        $data = $this->decode($this->uploadIconFile($file));

        $this->assertNotSame(0, $data['code']);
    }
}
