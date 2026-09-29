<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\FileController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\FsController;
use App\Apps\CmsproWindowsxponline\Exceptions\BlobException;
use App\Apps\CmsproWindowsxponline\Exceptions\StateException;
use App\Apps\CmsproWindowsxponline\Models\UserSpace;
use App\Apps\CmsproWindowsxponline\Models\XpFile;
use App\Apps\CmsproWindowsxponline\Models\XpUpload;
use App\Apps\CmsproWindowsxponline\Services\BlobService;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 大文件（blob）分片上传与下载测试
 *
 * 覆盖上传协议四端点与下载端点的正常链路、断点续传、分片校验、配额口径、
 * 名称去重，以及三处安全防护（存储键穿越过滤、越权下载拦截、响应头注入过滤）。
 *
 * 与 ArchiveApiTest 的分工：后者验证压缩/解压如何生产与消费 blob，
 * 本用例验证 blob 自身的存取生命周期。
 */
class FileUploadApiTest extends TestCase
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
        StateService::resetSpaceCache();
        parent::tearDown();
    }

    /**
     * 构造 JSON 请求（init / complete / abort / 文件树接口共用）
     *
     * @param array<string, mixed> $payload
     */
    private function jsonRequest(array $payload = []): Request
    {
        $request = Request::create('/api/v1/fs/upload', 'POST');
        $request->headers->set('Content-Type', 'application/json');
        $request->setMethod('POST');

        foreach ($payload as $key => $value) {
            $request->json()->set($key, $value);
        }

        return $request;
    }

    /**
     * 构造裸二进制分片请求（uploadId 与 index 走查询参数，与前端 fetch 口径一致）
     */
    private function chunkRequest(string $uploadId, int $index, string $data): Request
    {
        $uri = '/api/v1/fs/upload/chunk?uploadId=' . rawurlencode($uploadId) . '&index=' . $index;

        return Request::create($uri, 'POST', [], [], [], [
            'CONTENT_TYPE' => 'application/octet-stream',
            'CONTENT_LENGTH' => (string) strlen($data),
        ], $data);
    }

    /**
     * 解析 XP 响应信封（兼容 JsonResponse 与二进制下载响应）
     *
     * @return array<string, mixed>
     */
    private function decodeAny(Response $response): array
    {
        $data = json_decode($response->getContent(), true);

        return is_array($data) ? $data : [];
    }

    /**
     * 当前沙箱身份二元组
     *
     * @return array{userType: string, userId: string|int}
     */
    private function identity(): array
    {
        return StateService::getCurrentIdentity();
    }

    /**
     * 发起上传会话，返回完整响应信封
     *
     * @param array<int, string>|null $parentPath
     * @return array<string, mixed>
     */
    private function initSession(string $name, int $sizeBytes, ?array $parentPath = null): array
    {
        return $this->decodeAny((new FileController())->initUpload($this->jsonRequest([
            'name' => $name,
            'parentPath' => $parentPath ?? $this->desktopPath,
            'sizeBytes' => $sizeBytes,
        ])));
    }

    /**
     * 上传单个分片，返回完整响应信封
     *
     * @return array<string, mixed>
     */
    private function sendChunk(string $uploadId, int $index, string $data): array
    {
        return $this->decodeAny((new FileController())->saveChunk($this->chunkRequest($uploadId, $index, $data)));
    }

    /**
     * 合并落地，返回完整响应信封
     *
     * @return array<string, mixed>
     */
    private function completeSession(string $uploadId): array
    {
        return $this->decodeAny((new FileController())->completeUpload($this->jsonRequest([
            'uploadId' => $uploadId,
        ])));
    }

    /**
     * 走完「init → 逐片 → complete」全流程
     *
     * @return array{uploadId: string, data: array<string, mixed>}
     */
    private function uploadFile(string $name, string $content): array
    {
        $init = $this->initSession($name, strlen($content));
        $this->assertTrue($init['ok'], json_encode($init, JSON_UNESCAPED_UNICODE));

        $uploadId = (string) $init['data']['uploadId'];
        $chunkSize = (int) $init['data']['chunkSize'];
        $chunkTotal = (int) $init['data']['chunkTotal'];

        for ($i = 0; $i < $chunkTotal; $i++) {
            $sent = $this->sendChunk($uploadId, $i, substr($content, $i * $chunkSize, $chunkSize));
            $this->assertTrue($sent['ok'], json_encode($sent, JSON_UNESCAPED_UNICODE));
        }

        $done = $this->completeSession($uploadId);
        $this->assertTrue($done['ok'], json_encode($done, JSON_UNESCAPED_UNICODE));

        return ['uploadId' => $uploadId, 'data' => $done['data']];
    }

    /**
     * 构造跨分片的文件内容：满片 + 余数尾片
     */
    private function twoChunkContent(int $tailBytes = 100): string
    {
        return str_repeat('X', BlobService::CHUNK_SIZE) . str_repeat('Y', $tailBytes);
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

    /**
     * 断言回调抛出指定 reason 的 BlobException
     */
    private function assertBlobFails(callable $action, string $reason, string $messagePart = ''): void
    {
        try {
            $action();
        } catch (BlobException $e) {
            $this->assertSame($reason, $e->getReason());
            if ($messagePart !== '') {
                $this->assertStringContainsString($messagePart, $e->getMessage());
            }

            return;
        }

        $this->fail('期望抛出 reason=' . $reason . ' 的 BlobException，实际未抛出');
    }

    public function test_初始化上传时校验必填字段(): void
    {
        $this->seedXpState();
        $controller = new FileController();

        $missingName = $this->decodeAny($controller->initUpload($this->jsonRequest([
            'parentPath' => $this->desktopPath,
            'sizeBytes' => 10,
        ])));
        $this->assertFalse($missingName['ok']);
        $this->assertSame(400, $missingName['error']['code']);
        $this->assertStringContainsString('name', $missingName['error']['message']);

        $badParent = $this->decodeAny($controller->initUpload($this->jsonRequest([
            'name' => 'a.bin',
            'parentPath' => '本地磁盘 (C:)/桌面',
            'sizeBytes' => 10,
        ])));
        $this->assertFalse($badParent['ok']);
        $this->assertStringContainsString('parentPath', $badParent['error']['message']);

        $badSize = $this->decodeAny($controller->initUpload($this->jsonRequest([
            'name' => 'a.bin',
            'parentPath' => $this->desktopPath,
            'sizeBytes' => 0,
        ])));
        $this->assertFalse($badSize['ok']);
        $this->assertStringContainsString('sizeBytes', $badSize['error']['message']);

        // 参数非法不得残留任何会话或对象
        $this->assertSame(0, XpUpload::query()->count());
        $this->assertSame(0, XpFile::query()->count());
    }

    public function test_父路径不存在时初始化返回未找到(): void
    {
        $this->seedXpState();

        $payload = $this->initSession('a.bin', 10, ['本地磁盘 (C:)', '不存在的目录']);

        $this->assertFalse($payload['ok']);
        $this->assertSame(404, $payload['error']['code']);
        $this->assertStringContainsString('父路径不存在', $payload['error']['message']);
        $this->assertSame(0, XpUpload::query()->count());
    }

    public function test_访客只读模式拒绝上传(): void
    {
        $this->seedXpState([$this->makeTextFile('笔记.txt')]);
        $state = $this->readXpState();
        $state['session']['user'] = 'Guest';
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        $payload = $this->initSession('a.bin', 10);

        $this->assertFalse($payload['ok']);
        $this->assertSame(409, $payload['error']['code']);
        $this->assertStringContainsString('访客模式为只读', $payload['error']['message']);

        // 入口即拒，不得产生「有对象无节点引用」的孤儿 blob
        $this->assertSame(0, XpUpload::query()->count());
        $this->assertSame(0, XpFile::query()->count());
    }

    public function test_超出配额时初始化被拒绝(): void
    {
        $this->seedXpState();
        UserSpace::query()
            ->where('user_type', UserSpace::TYPE_ADMIN)
            ->where('user_id', $this->sandboxAdminId)
            ->update(['quota_mb' => 1]);
        StateService::resetSpaceCache();

        try {
            $this->initSession('big.bin', 2 * 1048576);
            $this->fail('期望抛出 quota_exceeded 的 StateException');
        } catch (StateException $e) {
            $this->assertSame('quota_exceeded', $e->getReason());
            $this->assertStringContainsString('云空间不足', $e->getMessage());
        }

        $this->assertSame(0, XpUpload::query()->count());
    }

    public function test_完整分片上传后树节点携带blob引用且临时分片被清理(): void
    {
        $this->seedXpState();
        $content = $this->twoChunkContent();
        $identity = $this->identity();

        $result = $this->uploadFile('资料.bin', $content);
        $data = $result['data'];

        $this->assertSame('资料.bin', $data['name']);
        $this->assertSame(strlen($content), $data['bytes']);
        $this->assertSame(array_merge($this->desktopPath, ['资料.bin']), $data['path']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', $data['blobId']);

        // 树节点只留引用，内容不进快照
        $node = $this->desktopChild('资料.bin');
        $this->assertNotNull($node);
        $this->assertSame($data['blobId'], $node['blobId']);
        $this->assertSame(strlen($content), $node['bytes']);
        $this->assertSame(FsTreeService::formatBytes(strlen($content)), $node['size']);
        $this->assertSame('file', $node['kind']);
        $this->assertArrayNotHasKey('content', $node);

        // 会话收尾：状态置完成、回填 blobId、tmp 分片全部清理
        $upload = XpUpload::query()->where('upload_id', $result['uploadId'])->first();
        $this->assertNotNull($upload);
        $this->assertSame(XpUpload::STATUS_COMPLETED, (int) $upload->status);
        $this->assertSame($data['blobId'], $upload->blob_id);
        $this->assertFalse($this->memoryDriver->exists(BlobService::chunkKey($identity, $result['uploadId'], 0)));
        $this->assertFalse($this->memoryDriver->exists(BlobService::chunkKey($identity, $result['uploadId'], 1)));

        // 下载可原样取回二进制（跨分片拼接顺序正确）
        $response = (new FileController())->download($this->jsonRequest(), (string) $data['blobId']);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame($content, $response->getContent());
    }

    public function test_下载任意格式文件时强制二进制附件下发(): void
    {
        $this->seedXpState();
        $content = '<script>alert(1)</script>';

        $result = $this->uploadFile('页面.html', $content);
        $response = (new FileController())->download($this->jsonRequest(), (string) $result['data']['blobId']);

        // 按真实 MIME 回显会让用户存入的 HTML 在本应用源下执行脚本，形成存储型 XSS
        $this->assertSame('application/octet-stream', $response->headers->get('Content-Type'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        // Symfony 会在 Cache-Control 上自动追加 private，故只断言包含 no-store
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->assertSame((string) strlen($content), $response->headers->get('Content-Length'));
        $this->assertStringStartsWith('attachment;', (string) $response->headers->get('Content-Disposition'));
        $this->assertSame($content, $response->getContent());
    }

    public function test_下载不存在或越权的blob返回未找到(): void
    {
        $this->seedXpState();
        $controller = new FileController();

        // 归属他人身份的 blob：即使 blobId 猜中也不得读取
        $foreign = BlobService::store(
            ['userType' => UserSpace::TYPE_USER, 'userId' => 999],
            ['name' => '他人文件.txt', 'mime' => ''],
            'secret'
        );

        $foreignResponse = $controller->download($this->jsonRequest(), $foreign->blob_id);
        $this->assertSame(404, $foreignResponse->getStatusCode());
        $this->assertStringContainsString('文件不存在或无权访问', $this->decodeAny($foreignResponse)['error']['message']);

        $missingResponse = $controller->download($this->jsonRequest(), str_repeat('a', 32));
        $this->assertSame(404, $missingResponse->getStatusCode());
    }

    public function test_同名同目录同大小重新初始化时续传已接收分片(): void
    {
        $this->seedXpState();
        $content = $this->twoChunkContent();
        $chunkSize = BlobService::CHUNK_SIZE;

        $first = $this->initSession('大文件.bin', strlen($content));
        $this->assertTrue($first['ok']);
        $this->assertSame($chunkSize, $first['data']['chunkSize']);
        $this->assertSame(2, $first['data']['chunkTotal']);
        $this->assertSame([], $first['data']['received']);
        $this->assertSame(0, $first['data']['next']);
        $this->assertFalse($first['data']['resumed']);

        $uploadId = (string) $first['data']['uploadId'];
        $sent = $this->sendChunk($uploadId, 0, substr($content, 0, $chunkSize));
        $this->assertTrue($sent['ok']);
        $this->assertSame([0], $sent['data']['received']);
        $this->assertSame(1, $sent['data']['next']);

        // 断网重来：同名同目录同大小必须复用会话，而不是从零开始
        $resumed = $this->initSession('大文件.bin', strlen($content));
        $this->assertTrue($resumed['ok']);
        $this->assertSame($uploadId, $resumed['data']['uploadId']);
        $this->assertTrue($resumed['data']['resumed']);
        $this->assertSame([0], $resumed['data']['received']);
        $this->assertSame(1, $resumed['data']['next']);
        $this->assertSame(1, XpUpload::query()->count());

        // 只补传缺失的尾片即可完成合并
        $tail = $this->sendChunk($uploadId, 1, substr($content, $chunkSize));
        $this->assertTrue($tail['ok']);
        $done = $this->completeSession($uploadId);
        $this->assertTrue($done['ok'], json_encode($done, JSON_UNESCAPED_UNICODE));
        $this->assertSame(strlen($content), $done['data']['bytes']);

        $response = (new FileController())->download($this->jsonRequest(), (string) $done['data']['blobId']);
        $this->assertSame($content, $response->getContent());
    }

    public function test_续传时已丢失的分片会从位图中剔除(): void
    {
        $this->seedXpState();
        $content = $this->twoChunkContent();
        $identity = $this->identity();

        $first = $this->initSession('易失文件.bin', strlen($content));
        $uploadId = (string) $first['data']['uploadId'];
        $this->assertTrue($this->sendChunk($uploadId, 0, substr($content, 0, BlobService::CHUNK_SIZE))['ok']);

        // 模拟 tmp 对象被超时清理：位图若不修正，合并阶段才会暴露缺片
        $this->memoryDriver->delete(BlobService::chunkKey($identity, $uploadId, 0));

        $resumed = $this->initSession('易失文件.bin', strlen($content));
        $this->assertTrue($resumed['ok']);
        $this->assertSame($uploadId, $resumed['data']['uploadId']);
        $this->assertSame([], $resumed['data']['received']);
        $this->assertSame(0, $resumed['data']['next']);
        $this->assertFalse($resumed['data']['resumed']);
    }

    public function test_分片大小与序号不符时返回明确错误(): void
    {
        $this->seedXpState();
        $content = $this->twoChunkContent();

        $init = $this->initSession('校验.bin', strlen($content));
        $uploadId = (string) $init['data']['uploadId'];

        // 满片被截断：必须报出期望与实际字节数，客户端才能定位重传
        $this->assertBlobFails(
            fn () => $this->sendChunk($uploadId, 0, str_repeat('Z', 100)),
            'chunk_mismatch',
            '分片 1 大小应为 ' . BlobService::CHUNK_SIZE . ' 字节，实际 100 字节'
        );

        $this->assertBlobFails(
            fn () => $this->sendChunk($uploadId, 2, str_repeat('Z', 100)),
            'invalid_param',
            '分片序号超出范围'
        );

        $this->assertBlobFails(
            fn () => $this->sendChunk($uploadId, -1, str_repeat('Z', 100)),
            'invalid_param',
            '分片序号超出范围'
        );

        // 非法分片不得污染会话位图
        $upload = XpUpload::query()->where('upload_id', $uploadId)->first();
        $this->assertSame([], $upload->receivedIndexes());
        $this->assertSame(XpUpload::STATUS_PENDING, (int) $upload->status);
    }

    public function test_未知上传会话与非法标识被拒绝(): void
    {
        $this->seedXpState();
        $unknownId = str_repeat('b', 32);

        $this->assertBlobFails(
            fn () => $this->sendChunk($unknownId, 0, 'x'),
            'not_found',
            '上传会话不存在或已过期'
        );
        $this->assertBlobFails(
            fn () => $this->completeSession($unknownId),
            'not_found',
            '上传会话不存在或已过期'
        );
        $this->assertBlobFails(
            fn () => $this->decodeAny((new FileController())->abortUpload($this->jsonRequest(['uploadId' => $unknownId]))),
            'not_found',
            '上传会话不存在或已过期'
        );

        // index 缺失走参数校验而非异常（saveChunk 先解析会话再校验序号，故须用真实 uploadId）
        $init = $this->initSession('参数校验.bin', 10);
        $knownId = (string) $init['data']['uploadId'];
        $noIndex = Request::create('/api/v1/fs/upload/chunk?uploadId=' . $knownId, 'POST', [], [], [], [
            'CONTENT_TYPE' => 'application/octet-stream',
        ], 'x');
        $payload = $this->decodeAny((new FileController())->saveChunk($noIndex));
        $this->assertFalse($payload['ok']);
        $this->assertSame(400, $payload['error']['code']);
        $this->assertStringContainsString('index', $payload['error']['message']);
    }

    public function test_分片未收齐时拒绝合并(): void
    {
        $this->seedXpState();
        $content = $this->twoChunkContent();

        $init = $this->initSession('未完成.bin', strlen($content));
        $uploadId = (string) $init['data']['uploadId'];
        $this->assertTrue($this->sendChunk($uploadId, 0, substr($content, 0, BlobService::CHUNK_SIZE))['ok']);

        $this->assertBlobFails(
            fn () => $this->completeSession($uploadId),
            'conflict',
            '分片尚未接收完整，缺少第 2 片'
        );

        // 合并被拒时不得产出任何 blob 与树节点
        $this->assertSame(0, XpFile::query()->count());
        $this->assertNull($this->desktopChild('未完成.bin'));
    }

    public function test_取消上传后清理分片并禁止继续写入(): void
    {
        $this->seedXpState();
        $content = $this->twoChunkContent();
        $identity = $this->identity();

        $init = $this->initSession('取消.bin', strlen($content));
        $uploadId = (string) $init['data']['uploadId'];
        $this->assertTrue($this->sendChunk($uploadId, 0, substr($content, 0, BlobService::CHUNK_SIZE))['ok']);

        $aborted = $this->decodeAny((new FileController())->abortUpload($this->jsonRequest([
            'uploadId' => $uploadId,
        ])));
        $this->assertTrue($aborted['ok']);
        $this->assertTrue($aborted['data']['aborted']);

        $this->assertFalse($this->memoryDriver->exists(BlobService::chunkKey($identity, $uploadId, 0)));
        $upload = XpUpload::query()->where('upload_id', $uploadId)->first();
        $this->assertSame(XpUpload::STATUS_CANCELLED, (int) $upload->status);

        $this->assertBlobFails(
            fn () => $this->sendChunk($uploadId, 1, substr($content, BlobService::CHUNK_SIZE)),
            'conflict',
            '该上传会话已结束'
        );
        $this->assertSame(0, XpFile::query()->count());
    }

    public function test_重名文件自动去重且下载文件名同步(): void
    {
        $this->seedXpState([$this->makeTextFile('报告.txt', '旧内容')]);

        $result = $this->uploadFile('报告.txt', '新内容');

        $this->assertSame('报告 (2).txt', $result['data']['name']);
        $this->assertSame(
            array_merge($this->desktopPath, ['报告 (2).txt']),
            $result['data']['path']
        );

        // 原节点不被覆盖，新节点独立存在
        $this->assertNotNull($this->desktopChild('报告.txt'));
        $this->assertNotNull($this->desktopChild('报告 (2).txt'));

        // 元数据同步去重后的名称，否则下载得到的文件名与桌面所见不一致
        $meta = BlobService::findMeta($this->identity(), (string) $result['data']['blobId']);
        $this->assertNotNull($meta);
        $this->assertSame('报告 (2).txt', $meta->name);

        $disposition = (new FileController())
            ->download($this->jsonRequest(), (string) $result['data']['blobId'])
            ->headers->get('Content-Disposition');
        $this->assertStringContainsString('filename*=UTF-8\'\'', (string) $disposition);
        $this->assertStringContainsString(rawurlencode('报告 (2).txt'), (string) $disposition);
    }

    public function test_blob总量计入配额并在超额时拒绝后续上传(): void
    {
        $this->seedXpState();
        UserSpace::query()
            ->where('user_type', UserSpace::TYPE_ADMIN)
            ->where('user_id', $this->sandboxAdminId)
            ->update(['quota_mb' => 1]);
        StateService::resetSpaceCache();

        $first = $this->uploadFile('第一份.bin', str_repeat('A', 500000));
        $this->assertSame(500000, $first['data']['bytes']);
        $this->assertSame(500000, BlobService::totalBytes($this->identity()));

        // 已用 500000 + 待写 600000 > 1 MB 配额，必须在入口拒绝
        try {
            $this->initSession('第二份.bin', 600000);
            $this->fail('期望抛出 quota_exceeded 的 StateException');
        } catch (StateException $e) {
            $this->assertSame('quota_exceeded', $e->getReason());
            $this->assertStringContainsString('已用 1 MB', $e->getMessage());
        }

        // 恰好落在配额内仍应放行
        $ok = $this->initSession('第三份.bin', 500000);
        $this->assertTrue($ok['ok'], json_encode($ok, JSON_UNESCAPED_UNICODE));
    }

    public function test_彻底删除回收blob而进回收站保留blob(): void
    {
        $this->seedXpState();
        $identity = $this->identity();

        $kept = $this->uploadFile('待还原.bin', '还原用内容');
        $purged = $this->uploadFile('待清除.bin', '清除用内容');

        // 进回收站：还原依赖条目中保存的节点，提前删内容会让还原出的文件下载 404
        $soft = $this->decodeAny((new FsController())->delete($this->jsonRequest([
            'paths' => [$this->desktopFilePath('待还原.bin')],
        ])));
        $this->assertTrue($soft['ok'], json_encode($soft, JSON_UNESCAPED_UNICODE));
        $this->assertSame(1, $soft['data']['deleted']);
        $this->assertNotNull(BlobService::findMeta($identity, (string) $kept['data']['blobId']));
        $this->assertTrue($this->memoryDriver->exists(
            BlobService::blobKey($identity, (string) $kept['data']['blobId'])
        ));

        // 彻底删除：元数据与内容对象一并物理回收，空间即时释放
        $hard = $this->decodeAny((new FsController())->delete($this->jsonRequest([
            'paths' => [$this->desktopFilePath('待清除.bin')],
            'permanent' => true,
        ])));
        $this->assertTrue($hard['ok'], json_encode($hard, JSON_UNESCAPED_UNICODE));
        $this->assertSame(1, $hard['data']['deleted']);
        $this->assertNull(BlobService::findMeta($identity, (string) $purged['data']['blobId']));
        $this->assertFalse($this->memoryDriver->exists(
            BlobService::blobKey($identity, (string) $purged['data']['blobId'])
        ));
        $this->assertSame(0, XpFile::query()->where('blob_id', $purged['data']['blobId'])->count());
    }

    public function test_存储键片段过滤阻断路径穿越(): void
    {
        $identity = $this->identity();

        $this->assertBlobFails(
            fn () => BlobService::blobKey($identity, '../../admin/1/state.json'),
            'invalid_param',
            'blobId 非法'
        );
        $this->assertBlobFails(
            fn () => BlobService::chunkKey($identity, '..\\..\\admin', 0),
            'invalid_param',
            'uploadId 非法'
        );
        $this->assertBlobFails(
            fn () => BlobService::blobKey($identity, str_repeat('a', 65)),
            'invalid_param',
            'blobId 非法'
        );
        $this->assertBlobFails(
            fn () => BlobService::blobKey($identity, ''),
            'invalid_param',
            'blobId 非法'
        );

        // 查询入口同样受过滤保护，穿越串不得拼进 SQL 或存储键
        $this->assertBlobFails(
            fn () => BlobService::findMeta($identity, '../1/files/x'),
            'invalid_param',
            'blobId 非法'
        );
        $this->assertBlobFails(
            fn () => BlobService::findUpload($identity, '../1/tmp/x'),
            'invalid_param',
            'uploadId 非法'
        );

        // 合法键布局按身份隔离
        $this->assertSame(
            'admin/' . $this->sandboxAdminId . '/files/' . str_repeat('c', 32),
            BlobService::blobKey($identity, str_repeat('c', 32))
        );
        $this->assertSame(
            'admin/' . $this->sandboxAdminId . '/tmp/' . str_repeat('d', 32) . '/3',
            BlobService::chunkKey($identity, str_repeat('d', 32), 3)
        );
    }

    public function test_下载文件名中的控制字符与引号被过滤(): void
    {
        $this->seedXpState();
        $name = "脚本\r\nX-Injected: 1\".html";

        $result = $this->uploadFile($name, 'payload');
        $response = (new FileController())->download($this->jsonRequest(), (string) $result['data']['blobId']);
        $disposition = (string) $response->headers->get('Content-Disposition');

        // CRLF 可注入任意响应头（响应拆分），引号会截断 filename 值
        $this->assertStringNotContainsString("\r\n", $disposition);
        $this->assertNull($response->headers->get('X-Injected'));
        $this->assertStringStartsWith('attachment;', $disposition);
        $this->assertStringNotContainsString('"1"', $disposition);
        $this->assertStringContainsString('filename*=UTF-8\'\'' . rawurlencode($name), $disposition);
        $this->assertSame('payload', $response->getContent());
    }
}
