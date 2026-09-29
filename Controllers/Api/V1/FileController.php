<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Exceptions\BlobException;
use App\Apps\CmsproWindowsxponline\Models\XpUpload;
use App\Apps\CmsproWindowsxponline\Services\BlobService;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 大文件（blob）分片上传与下载端点
 *
 * 与 FsController 的分工：FsController 处理「内容内嵌在快照 JSON 中」的文本与
 * 图片节点；本控制器处理「内容存于独立对象存储、快照只留 blobId 引用」的任意
 * 格式文件。前者受 10 MB 快照硬上限与 base64 膨胀制约，后者只受用户配额约束。
 *
 * 上传协议（分片 + 真断点续传，会话落库）：
 *   POST /fs/upload/init      建立或复用上传会话，返回 uploadId/chunkSize/chunkTotal/received
 *   POST /fs/upload/chunk     逐片上传，请求体为裸二进制，uploadId 与 index 走查询参数
 *   POST /fs/upload/complete  合并分片落地为 blob，并写入文件树节点
 *   POST /fs/upload/abort     取消上传，清理已写入的分片
 *   GET  /fs/blob/{blobId}    下载文件内容
 *
 * 分片采用裸二进制请求体而非 multipart：省去表单解析与临时文件落盘，
 * 且 PHP 字符串二进制安全，$request->getContent() 可原样取回字节。
 */
class FileController extends BaseController
{
    /**
     * 初始化分片上传会话
     *
     * 命中同名、同目录、同大小的进行中会话时直接复用（断点续传），
     * 并返回服务端已确认接收的分片索引，客户端只需补传缺失部分。
     */
    public function initUpload(Request $request)
    {
        $body = $this->jsonBody($request);
        $name = $body['name'] ?? null;
        $parentPath = $body['parentPath'] ?? null;
        $sizeBytes = $body['sizeBytes'] ?? null;

        if (!is_string($name) || $name === '') {
            return XpResponse::badRequest('缺少必填字段: name');
        }
        if (!is_array($parentPath)) {
            return XpResponse::badRequest('缺少必填字段: parentPath（路径段数组）');
        }
        if (!is_numeric($sizeBytes) || (int) $sizeBytes <= 0) {
            return XpResponse::badRequest('缺少必填字段: sizeBytes（正整数）');
        }

        $identity = StateService::getCurrentIdentity();
        $state = $this->getState();

        // Guest 的快照不落盘，若仍允许上传，blob 会真实占用存储却没有任何
        // 树节点引用它，成为永远无法回收的孤儿对象，故在入口处直接拒绝
        if (StateService::isGuestReadonly($state)) {
            return XpResponse::conflict('访客模式为只读，不支持上传文件');
        }

        // 目录校验前置到 init：避免客户端传完整个大文件后才发现目标目录不存在
        if (FsTreeService::findNode($state['fsTree'], $parentPath) === null) {
            return XpResponse::notFound('父路径不存在: ' . implode('/', $parentPath));
        }

        $size = (int) $sizeBytes;

        // 配额校验只在上传入口执行，saveState 的快照校验口径保持不变，
        // 否则 blob 占满配额后桌面将无法保存任何改动（连删除大文件自救都做不到）
        StateService::assertBlobFits($identity, $size);

        $upload = BlobService::initUpload($identity, [
            'name' => $name,
            'parentPath' => (string) json_encode($parentPath, JSON_UNESCAPED_UNICODE),
            'sizeBytes' => $size,
        ]);

        return XpResponse::success($this->uploadPayload($upload));
    }

    /**
     * 写入单个分片
     *
     * 幂等：重复上传同一片直接覆盖并原样返回已接收列表，
     * 客户端网络抖动后无需感知服务端是否已收到该片。
     */
    public function saveChunk(Request $request)
    {
        $upload = $this->requireUpload((string) $request->query('uploadId', ''));
        $index = $request->query('index');

        if (!is_numeric($index)) {
            return XpResponse::badRequest('缺少必填查询参数: index（分片序号，从 0 开始）');
        }

        $upload = BlobService::saveChunk($upload, (int) $index, (string) $request->getContent());

        return XpResponse::success($this->uploadPayload($upload));
    }

    /**
     * 合并分片并写入文件树
     *
     * 落地顺序为「先合并 blob → 再写树 → 再存快照」，后两步任一失败都回滚 blob：
     * 反向顺序会出现「树里有节点但下载 404」的更坏结果，且无法自动修复。
     */
    public function completeUpload(Request $request)
    {
        $upload = $this->requireUpload((string) $request->input('uploadId', ''));
        $identity = StateService::getCurrentIdentity();
        $parentPath = $this->decodeParentPath($upload);

        $state = $this->getState();
        if (StateService::isGuestReadonly($state)) {
            BlobService::abortUpload($upload);

            return XpResponse::conflict('访客模式为只读，不支持上传文件');
        }
        if (FsTreeService::findNode($state['fsTree'], $parentPath) === null) {
            BlobService::abortUpload($upload);

            return XpResponse::notFound('父路径不存在: ' . implode('/', $parentPath));
        }

        $file = BlobService::completeUpload($upload);

        try {
            $finalName = $this->attachNode($state, $parentPath, $file->name, $file->blob_id, $file->size_bytes);
            $this->saveState($state);
        } catch (\Throwable $e) {
            // 快照写入失败（如触发 10 MB 硬上限）时回收已落地的 blob，避免孤儿对象占配额
            BlobService::remove($identity, $file->blob_id);

            throw $e;
        }

        // 名称去重后同步元数据，保证下载文件名与桌面所见一致
        if ($finalName !== $file->name) {
            $file->name = $finalName;
            $file->save();
        }

        return XpResponse::success([
            'name' => $finalName,
            'blobId' => $file->blob_id,
            'bytes' => $file->size_bytes,
            'path' => array_merge($parentPath, [$finalName]),
        ]);
    }

    /**
     * 取消上传并清理分片
     */
    public function abortUpload(Request $request)
    {
        $upload = $this->requireUpload((string) $request->input('uploadId', ''));
        BlobService::abortUpload($upload);

        return XpResponse::success(['aborted' => true]);
    }

    /**
     * 下载 blob 内容
     *
     * 一律以 application/octet-stream + attachment 下发，并带 nosniff：
     * 若按上传时的真实 MIME 回显，用户存入的 HTML/SVG 会在本应用源下执行脚本，
     * 形成存储型 XSS。强制下载可彻底阻断该路径。
     */
    public function download(Request $request, string $blobId)
    {
        $identity = StateService::getCurrentIdentity();
        $meta = BlobService::findMeta($identity, $blobId);

        if ($meta === null) {
            return XpResponse::notFound('文件不存在或无权访问');
        }

        $data = BlobService::read($identity, $meta->blob_id);
        if ($data === null) {
            return XpResponse::notFound('文件内容已丢失，请重新上传');
        }

        return response()->make($data, 200, [
            'Content-Type' => 'application/octet-stream',
            'Content-Length' => (string) strlen($data),
            'Content-Disposition' => $this->contentDisposition((string) $meta->name),
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * 查找当前身份名下的上传会话，不存在则抛 404
     *
     * @throws BlobException 会话不存在或不属于当前身份
     */
    private function requireUpload(string $uploadId): XpUpload
    {
        $upload = BlobService::findUpload(StateService::getCurrentIdentity(), $uploadId);
        if ($upload === null) {
            throw new BlobException('上传会话不存在或已过期，请重新发起上传', 'not_found');
        }

        return $upload;
    }

    /**
     * 还原会话中记录的目标目录路径段
     *
     * @return array<int, string>
     */
    private function decodeParentPath(XpUpload $upload): array
    {
        $decoded = json_decode((string) $upload->parent_path, true);

        return is_array($decoded) ? array_values($decoded) : [];
    }

    /**
     * 组装上传会话响应体（init 与 chunk 共用，客户端据此决定续传起点）
     *
     * @return array<string, mixed>
     */
    private function uploadPayload(XpUpload $upload): array
    {
        $received = $upload->receivedIndexes();

        return [
            'uploadId' => $upload->upload_id,
            'chunkSize' => $upload->chunk_size,
            'chunkTotal' => $upload->chunk_total,
            'received' => $received,
            'next' => $upload->nextMissingIndex(),
            'resumed' => count($received) > 0,
        ];
    }

    /**
     * 构造 Content-Disposition 头
     *
     * 文件名来自用户输入，必须剔除控制字符与引号：
     * 混入 CRLF 可注入任意响应头（响应拆分），混入引号会截断 filename 值。
     * 非 ASCII 名称通过 RFC 5987 的 filename* 传递，兼容各浏览器。
     */
    private function contentDisposition(string $name): string
    {
        $ascii = str_replace(['\\', '"'], '_', (string) preg_replace('/[\x00-\x1F\x7F]/', '_', $name));
        if (trim($ascii) === '') {
            $ascii = 'download.bin';
        }

        return sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s", $ascii, rawurlencode($name));
    }
}
