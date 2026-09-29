<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\FsController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\RecycleController;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 文件删除接口测试
 *
 * 覆盖验收修复项：
 * - M-05：回收站条目不得采用客户端传入的 items（存储型投毒）
 */
class FsDeleteTest extends TestCase
{
    use WindowsxponlineSetup;
    use XpStateSandbox;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();
        $this->bootXpStateSandbox();
    }

    protected function tearDown(): void
    {
        $this->shutdownXpStateSandbox();
        parent::tearDown();
    }

    /**
     * 构造 DELETE /fs 请求
     *
     * @param array<string, mixed> $payload 请求体
     */
    private function makeDeleteRequest(array $payload): Request
    {
        $request = Request::create('/api/v1/fs', 'DELETE');
        $request->headers->set('Content-Type', 'application/json');
        $request->setMethod('DELETE');

        foreach ($payload as $key => $value) {
            $request->json()->set($key, $value);
        }

        return $request;
    }

    /**
     * 解析 XP 响应信封
     *
     * @return array<string, mixed>
     */
    private function decodeResponse(JsonResponse $response): array
    {
        $data = json_decode($response->getContent(), true);

        return is_array($data) ? $data : [];
    }

    public function test_删除文件时回收站条目由服务端自建(): void
    {
        $this->seedXpState([$this->makeTextFile('笔记.txt', 'hello')]);

        $response = (new FsController())->delete($this->makeDeleteRequest([
            'paths' => [$this->desktopFilePath('笔记.txt')],
        ]));

        $payload = $this->decodeResponse($response);
        $this->assertTrue($payload['ok']);
        $this->assertSame(1, $payload['data']['deleted']);

        $state = $this->readXpState();
        $this->assertCount(1, $state['recycleBin']);

        $entry = $state['recycleBin'][0];
        $this->assertSame('笔记.txt', $entry['name']);
        // origKey 为父目录路径（前端契约，不含被删文件名）
        $this->assertSame('本地磁盘 (C:)/Documents and Settings/tester/桌面', $entry['origKey']);
        $this->assertSame('hello', $entry['node']['content']);
        $this->assertGreaterThan(0, $entry['deletedAt']);
        $this->assertStringContainsString('笔记.txt#', $entry['key']);
    }

    public function test_删除文件时客户端伪造items不会进入回收站(): void
    {
        $this->seedXpState([$this->makeTextFile('笔记.txt', 'hello')]);

        $origKey = implode('/', $this->desktopFilePath('笔记.txt'));
        $forgedItem = [
            'key' => 'forged-key',
            'name' => '笔记.txt',
            'origKey' => $origKey,
            'node' => [
                'name' => '<img src=x onerror=alert(1)>',
                'kind' => 'file',
                'content' => '<script>alert("xss")</script>',
            ],
            'deletedAt' => 1,
        ];

        $response = (new FsController())->delete($this->makeDeleteRequest([
            'paths' => [$this->desktopFilePath('笔记.txt')],
            'items' => [$forgedItem],
        ]));

        $this->assertTrue($this->decodeResponse($response)['ok']);

        $entry = $this->readXpState()['recycleBin'][0];

        // 投毒载荷必须被完全丢弃，落盘的是服务端依据真实节点构造的条目
        $this->assertNotSame('forged-key', $entry['key']);
        $this->assertSame('笔记.txt', $entry['node']['name']);
        $this->assertSame('hello', $entry['node']['content']);
        $this->assertNotSame(1, $entry['deletedAt']);
        $this->assertStringNotContainsString('onerror', json_encode($entry, JSON_UNESCAPED_UNICODE));
    }

    public function test_永久删除时不产生回收站条目(): void
    {
        $this->seedXpState([$this->makeTextFile('笔记.txt', 'hello')]);

        $response = (new FsController())->delete($this->makeDeleteRequest([
            'paths' => [$this->desktopFilePath('笔记.txt')],
            'permanent' => true,
            'items' => [['key' => 'forged-key', 'origKey' => 'x', 'name' => '笔记.txt']],
        ]));

        $this->assertSame(1, $this->decodeResponse($response)['data']['deleted']);
        $this->assertSame([], $this->readXpState()['recycleBin']);
    }

    public function test_缺少paths时返回参数错误(): void
    {
        $this->seedXpState([]);

        $response = (new FsController())->delete($this->makeDeleteRequest([]));

        $payload = $this->decodeResponse($response);
        $this->assertFalse($payload['ok']);
        $this->assertStringContainsString('paths', $payload['error']['message']);
    }

    /**
     * 回收站 key 前后端一致性：服务端采纳前端生成的 key 标识，
     * 前端按其调用 POST /recycle 还原必须命中（restored=1）
     */
    public function test_前端生成的key被采纳且按其还原成功(): void
    {
        $this->seedXpState([$this->makeTextFile('笔记.txt', 'hello')]);

        // 前端 key 规则：`${被删节点完整路径}#${Date.now()}${随机4位}`
        $fullPath = implode('/', $this->desktopFilePath('笔记.txt'));
        $clientKey = $fullPath . '#1727316000000ab12';

        $response = (new FsController())->delete($this->makeDeleteRequest([
            'paths' => [$this->desktopFilePath('笔记.txt')],
            'items' => [[
                'key' => $clientKey,
                'name' => '伪造名',
                'origKey' => '伪造目录',
                'node' => ['name' => '伪造名', 'kind' => 'file', 'content' => 'evil'],
            ]],
        ]));
        $this->assertTrue($this->decodeResponse($response)['ok']);

        $entry = $this->readXpState()['recycleBin'][0];
        // key 采纳前端标识；node/name/origKey 等内容仍为服务端依据真实节点构造
        $this->assertSame($clientKey, $entry['key']);
        $this->assertSame('笔记.txt', $entry['name']);
        $this->assertSame('本地磁盘 (C:)/Documents and Settings/tester/桌面', $entry['origKey']);
        $this->assertSame('hello', $entry['node']['content']);

        // 前端以其本地 key 发起还原 → 必须命中并写回原目录
        $restoreRequest = Request::create('/api/v1/recycle', 'POST');
        $restoreRequest->headers->set('Content-Type', 'application/json');
        $restoreRequest->setMethod('POST');
        $restoreRequest->json()->set('key', $clientKey);

        $restorePayload = $this->decodeResponse((new RecycleController())->restore($restoreRequest));
        $this->assertTrue($restorePayload['ok']);
        $this->assertSame(1, $restorePayload['data']['restored']);

        $state = $this->readXpState();
        $this->assertSame([], $state['recycleBin']);

        $desktop = FsTreeService::findNode(
            $state['fsTree'],
            ['本地磁盘 (C:)', 'Documents and Settings', 'tester', '桌面']
        );
        $names = array_column($desktop['children'] ?? [], 'name');
        $this->assertContains('笔记.txt', $names);
    }

    /**
     * 存量旧格式兼容：历史回收站条目 origKey 为被删节点完整路径（含文件名），
     * 还原时须截去末段取父目录，文件仍写回桌面原位置
     */
    public function test_旧格式origKey条目还原兼容(): void
    {
        $this->seedXpState([]);

        $desktopPath = ['本地磁盘 (C:)', 'Documents and Settings', 'tester', '桌面'];
        $legacyKey = '本地磁盘 (C:)/Documents and Settings/tester/桌面/旧文件.txt#1700000000000zz99';

        $state = $this->readXpState();
        $state['recycleBin'][] = [
            'key' => $legacyKey,
            'name' => '旧文件.txt',
            'origKey' => implode('/', $desktopPath) . '/旧文件.txt',
            'node' => ['name' => '旧文件.txt', 'kind' => 'file', 'content' => 'legacy'],
            'deletedAt' => 1700000000000,
        ];
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $restoreRequest = Request::create('/api/v1/recycle', 'POST');
        $restoreRequest->headers->set('Content-Type', 'application/json');
        $restoreRequest->setMethod('POST');
        $restoreRequest->json()->set('key', $legacyKey);

        $payload = $this->decodeResponse((new RecycleController())->restore($restoreRequest));
        $this->assertSame(1, $payload['data']['restored']);

        $desktop = FsTreeService::findNode($this->readXpState()['fsTree'], $desktopPath);
        $names = array_column($desktop['children'] ?? [], 'name');
        $this->assertContains('旧文件.txt', $names);
    }
}
