<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\ArchiveController;
use App\Apps\CmsproWindowsxponline\Exceptions\BlobException;
use App\Apps\CmsproWindowsxponline\Exceptions\StateException;
use App\Apps\CmsproWindowsxponline\Models\UserSpace;
use App\Apps\CmsproWindowsxponline\Services\ArchiveService;
use App\Apps\CmsproWindowsxponline\Services\BlobService;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Tests\TestCase;
use ZipArchive;

/**
 * Windows XP 在线版 · 压缩包接口测试（WinRAR 复刻）
 *
 * 覆盖三条内容来源的归一打包（blobId / src dataURL / 内嵌 content）、
 * 解压落盘、GBK 条目名转码、zip slip 拦截、同名冲突显式拒绝与配额校验。
 */
class ArchiveApiTest extends TestCase
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
     * 构造 JSON 请求
     *
     * @param array<string, mixed> $payload
     */
    private function makeRequest(string $method, array $payload = [], array $query = []): Request
    {
        $request = Request::create('/api/v1/fs', $method, $query);
        $request->headers->set('Content-Type', 'application/json');
        $request->setMethod($method);

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

    /**
     * 由「条目名 => 内容」构造 ZIP 二进制
     *
     * @param array<string, string> $entries
     */
    private function buildZip(array $entries): string
    {
        $path = tempnam(sys_get_temp_dir(), 'xpzip_');
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($entries as $name => $content) {
            $zip->addFromString((string) $name, (string) $content);
        }
        $zip->close();

        $data = (string) file_get_contents($path);
        unlink($path);

        return $data;
    }

    /**
     * 将内容存为 blob 并构造对应的文件树节点
     *
     * @return array<string, mixed>
     */
    private function makeBlobFile(string $name, string $content): array
    {
        $file = BlobService::store(StateService::getCurrentIdentity(), ['name' => $name, 'mime' => ''], $content);

        return [
            'name' => $name,
            'kind' => 'file',
            'icon' => 'text',
            'type' => '文本文档',
            'size' => FsTreeService::formatBytes($file->size_bytes),
            'bytes' => (int) $file->size_bytes,
            'blobId' => $file->blob_id,
        ];
    }

    /**
     * 取得桌面下指定名称的子节点
     *
     * @return array<string, mixed>|null
     */
    private function desktopChild(string $name, ?array $state = null): ?array
    {
        $state = $state ?? $this->readXpState();
        $desktop = FsTreeService::findNode($state['fsTree'], $this->desktopPath);

        foreach ($desktop['children'] ?? [] as $child) {
            if (($child['name'] ?? '') === $name) {
                return $child;
            }
        }

        return null;
    }

    public function test_压缩桌面文本文件产出zip节点并入库blob(): void
    {
        $this->seedXpState([$this->makeTextFile('笔记.txt', 'hello')]);

        $payload = $this->decodeResponse((new ArchiveController())->create($this->makeRequest('POST', [
            'paths' => [$this->desktopFilePath('笔记.txt')],
        ])));

        $this->assertTrue($payload['ok'], json_encode($payload, JSON_UNESCAPED_UNICODE));
        $this->assertSame('笔记.zip', $payload['data']['name']);
        $this->assertSame(1, $payload['data']['entries']);
        $this->assertGreaterThan(0, $payload['data']['bytes']);

        // 产物节点必须带 blobId（内容不内嵌快照）并挂在压缩包所在目录
        $node = $this->desktopChild('笔记.zip');
        $this->assertNotNull($node);
        $this->assertSame($payload['data']['blobId'], $node['blobId']);
        $this->assertSame('zip', $node['icon']);
        $this->assertArrayNotHasKey('content', $node);
    }

    public function test_压缩时三种内容来源全部被还原为原始字节(): void
    {
        // src：早期导入的图片以 dataURL 内嵌，压缩时必须解码回字节而非存 base64 文本
        $raw = str_repeat("\x89PNG", 16);
        $imageNode = [
            'name' => '图片.png',
            'kind' => 'file',
            'icon' => 'image',
            'type' => 'PNG 图像',
            'src' => 'data:image/png;base64,' . base64_encode($raw),
        ];

        $this->seedXpState([
            $imageNode,
            $this->makeTextFile('笔记.txt', 'hello'),
            $this->makeBlobFile('数据.bin', str_repeat('A', 300)),
        ]);

        $payload = $this->decodeResponse((new ArchiveController())->create($this->makeRequest('POST', [
            'paths' => [
                $this->desktopFilePath('图片.png'),
                $this->desktopFilePath('笔记.txt'),
                $this->desktopFilePath('数据.bin'),
            ],
        ])));

        $this->assertSame(3, $payload['data']['entries']);

        $zipPath = array_merge($this->desktopPath, [$payload['data']['name']]);
        $listPayload = $this->decodeResponse((new ArchiveController())->entries(
            $this->makeRequest('GET', [], ['path' => implode('/', $zipPath)])
        ));

        $this->assertTrue($listPayload['ok'], json_encode($listPayload, JSON_UNESCAPED_UNICODE));
        $sizes = array_column($listPayload['data']['entries'], 'bytes', 'name');

        $this->assertSame(64, $sizes['图片.png'], 'dataURL 应还原为原始字节');
        $this->assertSame(5, $sizes['笔记.txt'], '内嵌 content 应原样打包');
        $this->assertSame(300, $sizes['数据.bin'], 'blob 内容应完整打包');
    }

    public function test_解压到以压缩包名命名的子目录且内容可读回(): void
    {
        $this->seedXpState([$this->makeBlobFile('资料.zip', $this->buildZip([
            'readme.txt' => 'hello',
            'sub/deep.txt' => 'world',
        ]))]);

        $payload = $this->decodeResponse((new ArchiveController())->extract($this->makeRequest('POST', [
            'path' => $this->desktopFilePath('资料.zip'),
        ])));

        $this->assertTrue($payload['ok'], json_encode($payload, JSON_UNESCAPED_UNICODE));
        $this->assertSame(2, $payload['data']['extracted']);
        $this->assertSame(array_merge($this->desktopPath, ['资料']), $payload['data']['path']);

        $state = $this->readXpState();
        $folder = FsTreeService::findNode($state['fsTree'], array_merge($this->desktopPath, ['资料']));
        $this->assertSame('folder', $folder['kind']);

        // 层级必须按条目相对路径重建
        $deep = FsTreeService::findNode($state['fsTree'], array_merge($this->desktopPath, ['资料', 'sub', 'deep.txt']));
        $this->assertNotNull($deep);
        $this->assertSame('world', BlobService::read(StateService::getCurrentIdentity(), $deep['blobId']));

        $readme = FsTreeService::findNode($state['fsTree'], array_merge($this->desktopPath, ['资料', 'readme.txt']));
        $this->assertSame(5, $readme['bytes']);
        $this->assertSame('5 字节', $readme['size']);
    }

    public function test_解压时GBK条目名被转为UTF8(): void
    {
        // 中文版 WinRAR 与 Windows 内置压缩产出的条目名多为 GBK 且不带 UTF-8 标志位
        $gbkName = mb_convert_encoding('中文文档.txt', 'GBK', 'UTF-8');
        $this->seedXpState([$this->makeBlobFile('中文包.zip', $this->buildZip([$gbkName => '内容']))]);

        $listPayload = $this->decodeResponse((new ArchiveController())->entries(
            $this->makeRequest('GET', [], ['path' => implode('/', $this->desktopFilePath('中文包.zip'))])
        ));
        $this->assertSame('中文文档.txt', $listPayload['data']['entries'][0]['name']);

        $this->decodeResponse((new ArchiveController())->extract($this->makeRequest('POST', [
            'path' => $this->desktopFilePath('中文包.zip'),
        ])));

        $node = FsTreeService::findNode(
            $this->readXpState()['fsTree'],
            array_merge($this->desktopPath, ['中文包', '中文文档.txt'])
        );
        $this->assertNotNull($node, '解压后的文件名不应是乱码');
    }

    public function test_条目名归一化拦截路径穿越与绝对路径(): void
    {
        // zip slip：条目名来自压缩包内部，属完全不可信输入
        $this->assertNull(ArchiveService::normalizeEntryName('../evil.txt'));
        $this->assertNull(ArchiveService::normalizeEntryName('sub/../../evil.txt'));
        $this->assertNull(ArchiveService::normalizeEntryName('C:\\Windows\\system.ini'));
        $this->assertNull(ArchiveService::normalizeEntryName("a\x00b.txt"));
        $this->assertNull(ArchiveService::normalizeEntryName(''));

        $this->assertSame('a/b.txt', ArchiveService::normalizeEntryName('\\a\\b.txt'));
        $this->assertSame('a/b.txt', ArchiveService::normalizeEntryName('/a/./b.txt/'));
        // 打包工具常见形式，必须能解出而不是整包被丢弃
        $this->assertSame('file.txt', ArchiveService::normalizeEntryName('./file.txt'));
        $this->assertSame('a/b.txt', ArchiveService::normalizeEntryName('a//b.txt'));
        // Unix 绝对路径不含穿越段，剥根后安全落在目标目录内（与 WinRAR 处理一致），
        // 故不拒绝而是转相对路径；Windows 盘符则视为越界意图，直接拒绝
        $this->assertSame('etc/passwd', ArchiveService::normalizeEntryName('/etc/passwd'));
    }

    public function test_解压含穿越条目的压缩包不会逃出目标目录(): void
    {
        $this->seedXpState([$this->makeBlobFile('恶意.zip', $this->buildZip([
            '../../evil.txt' => 'pwned',
            'ok.txt' => 'safe',
        ]))]);

        $payload = $this->decodeResponse((new ArchiveController())->extract($this->makeRequest('POST', [
            'path' => $this->desktopFilePath('恶意.zip'),
        ])));

        $this->assertTrue($payload['ok']);
        $this->assertSame(1, $payload['data']['extracted'], '穿越条目必须被丢弃');

        // 整棵树中不得出现任何越界节点
        $encoded = json_encode($this->readXpState()['fsTree'], JSON_UNESCAPED_UNICODE);
        $this->assertStringNotContainsString('evil', $encoded);
        $this->assertStringNotContainsString('pwned', $encoded);
    }

    public function test_跨目录同名文件压缩被显式拒绝而非静默覆盖(): void
    {
        $this->seedXpState([
            $this->makeTextFile('a.txt', 'A'),
            [
                'name' => 'sub',
                'kind' => 'folder',
                'icon' => 'folder',
                'type' => '文件夹',
                'children' => [$this->makeTextFile('a.txt', 'B')],
            ],
        ]);

        try {
            (new ArchiveController())->create($this->makeRequest('POST', [
                'paths' => [
                    $this->desktopFilePath('a.txt'),
                    array_merge($this->desktopPath, ['sub', 'a.txt']),
                ],
            ]));
            $this->fail('同名冲突应抛出 BlobException');
        } catch (BlobException $e) {
            $this->assertSame('conflict', $e->getReason());
            $this->assertStringContainsString('a.txt', $e->getMessage());
        }

        // 冲突发生在归档创建之前，不得留下任何产物
        $this->assertNull($this->desktopChild('a.zip'));
    }

    public function test_压缩产物计入配额且超额时不落盘(): void
    {
        UserSpace::where('user_id', $this->sandboxAdminId)->update(['quota_mb' => 1]);
        StateService::resetSpaceCache();

        $this->seedXpState([$this->makeBlobFile('大文件.bin', str_repeat('B', 2 * 1024 * 1024))]);

        try {
            (new ArchiveController())->create($this->makeRequest('POST', [
                'paths' => [$this->desktopFilePath('大文件.bin')],
            ]));
            $this->fail('超出配额应抛出 StateException');
        } catch (StateException $e) {
            $this->assertSame('quota_exceeded', $e->getReason());
        }

        // 配额校验发生在 store 之前，文件树与 blob 总量都不得有产物残留
        $this->assertNull($this->desktopChild('大文件.zip'));
        $this->assertSame(2 * 1024 * 1024, BlobService::totalBytes(StateService::getCurrentIdentity()));
    }

    public function test_访客只读时拒绝压缩与解压(): void
    {
        $this->seedXpState([$this->makeTextFile('笔记.txt', 'hello')]);

        $state = $this->readXpState();
        $state['session']['user'] = 'Guest';
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $createPayload = $this->decodeResponse((new ArchiveController())->create($this->makeRequest('POST', [
            'paths' => [$this->desktopFilePath('笔记.txt')],
        ])));
        $this->assertFalse($createPayload['ok']);
        $this->assertStringContainsString('访客', $createPayload['error']['message']);

        $extractPayload = $this->decodeResponse((new ArchiveController())->extract($this->makeRequest('POST', [
            'path' => $this->desktopFilePath('笔记.txt'),
        ])));
        $this->assertFalse($extractPayload['ok']);
    }

    public function test_参数缺失或目标不存在时返回明确错误(): void
    {
        $this->seedXpState([$this->makeTextFile('笔记.txt', 'hello')]);

        $noPaths = $this->decodeResponse((new ArchiveController())->create($this->makeRequest('POST', [])));
        $this->assertFalse($noPaths['ok']);
        $this->assertStringContainsString('paths', $noPaths['error']['message']);

        $missingNode = $this->decodeResponse((new ArchiveController())->create($this->makeRequest('POST', [
            'paths' => [$this->desktopFilePath('不存在.txt')],
        ])));
        $this->assertFalse($missingNode['ok']);

        // 文件夹不是压缩包，不得当作归档打开
        $notFile = $this->decodeResponse((new ArchiveController())->entries(
            $this->makeRequest('GET', [], ['path' => implode('/', $this->desktopPath)])
        ));
        $this->assertFalse($notFile['ok']);
        $this->assertStringContainsString('不是文件', $notFile['error']['message']);

        // 非 ZIP 内容不得被当成压缩包
        $this->seedXpState([$this->makeBlobFile('假包.zip', 'not a zip')]);
        try {
            (new ArchiveController())->entries(
                $this->makeRequest('GET', [], ['path' => implode('/', $this->desktopFilePath('假包.zip'))])
            );
            $this->fail('无效归档应抛出 BlobException');
        } catch (BlobException $e) {
            $this->assertSame('invalid_param', $e->getReason());
        }
    }
}
