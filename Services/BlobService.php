<?php

namespace App\Apps\CmsproWindowsxponline\Services;

use App\Apps\CmsproWindowsxponline\Exceptions\BlobException;
use App\Apps\CmsproWindowsxponline\Models\XpFile;
use App\Apps\CmsproWindowsxponline\Models\XpUpload;
use Illuminate\Support\Facades\Log;

/**
 * 文件二进制对象（blob）与分片上传服务
 *
 * 存储层复用既有 StorageDriverInterface：PHP 字符串是二进制安全的，
 * LocalDriver(Storage::put) / OssDriver(putObject Body) / CosDriver(putObject Body)
 * 三者均可正确存取二进制内容，故本服务不引入任何新的驱动接口或实现。
 *
 * 键布局（与快照键 `{userType}/{userId}/state.json` 共用前缀，天然按身份隔离）：
 * - 正式 blob：`{userType}/{userId}/files/{blobId}`
 * - 上传分片：`{userType}/{userId}/tmp/{uploadId}/{index}`
 *
 * 安全约定：所有来自客户端的键片段（blobId / uploadId）在拼键前必须经
 * sanitizeSegment() 过滤，否则 `../../` 可穿越读取他人快照或其他 blob。
 */
class BlobService
{
    /**
     * 分片大小（字节）：4 MB
     *
     * 远小于 PHP post_max_size（实测 50M），单片失败只需重传该片
     */
    public const CHUNK_SIZE = 4194304;

    /**
     * 合并阶段允许的最大文件字节数：200 MB
     *
     * 拼接采用增量 append，峰值内存约为文件大小的 2 倍，
     * 200 MB 对应约 400 MB 峰值，在 memory_limit=512M 下安全
     */
    public const MAX_MERGE_BYTES = 209715200;

    /**
     * 进行中的上传会话保留时长（小时）
     *
     * 超时未完成的会话由 cleanExpired() 惰性回收其 tmp 分片
     */
    private const UPLOAD_TTL_HOURS = 24;

    private const FILES_DIR = 'files';

    private const TMP_DIR = 'tmp';

    /**
     * 构造正式 blob 存储键
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    public static function blobKey(array $identity, string $blobId): string
    {
        return self::ownerPrefix($identity) . '/' . self::FILES_DIR . '/' . self::sanitizeSegment($blobId, 'blobId', 64);
    }

    /**
     * 构造上传分片存储键
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    public static function chunkKey(array $identity, string $uploadId, int $index): string
    {
        $safeId = self::sanitizeSegment($uploadId, 'uploadId', 64);

        return self::ownerPrefix($identity) . '/' . self::TMP_DIR . '/' . $safeId . '/' . $index;
    }

    /**
     * 生成全局唯一标识（32 位十六进制，URL 安全）
     */
    public static function generateId(): string
    {
        return bin2hex(random_bytes(16));
    }

    /**
     * 汇总某身份下所有正常状态 blob 的字节总量
     *
     * 配额口径的 blob 部分：已用空间 = 快照字节 + 本方法返回值
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    public static function totalBytes(array $identity): int
    {
        return (int) XpFile::query()
            ->where('user_type', $identity['userType'])
            ->where('user_id', (string) $identity['userId'])
            ->where('status', XpFile::STATUS_NORMAL)
            ->sum('size_bytes');
    }

    /**
     * 按 blobId 查询元数据（校验归属，越权或不存在均返回 null）
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    public static function findMeta(array $identity, string $blobId): ?XpFile
    {
        return XpFile::query()
            ->where('blob_id', self::sanitizeSegment($blobId, 'blobId', 64))
            ->where('user_type', $identity['userType'])
            ->where('user_id', (string) $identity['userId'])
            ->where('status', XpFile::STATUS_NORMAL)
            ->first();
    }

    /**
     * 读取 blob 内容（先校验归属，防止越权下载他人文件）
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    public static function read(array $identity, string $blobId): ?string
    {
        $meta = self::findMeta($identity, $blobId);
        if ($meta === null) {
            return null;
        }

        return StorageManager::getDriver()->read(self::blobKey($identity, $meta->blob_id));
    }

    /**
     * 写入 blob 并登记元数据
     *
     * 先落 blob 再建元数据：元数据登记失败时回滚已写入的 blob，避免产生无法被
     * 统计与清理的孤儿对象（反向顺序则会出现「有元数据但下载 404」的更坏结果）。
     *
     * @param array{userType: string, userId: string|int} $identity
     * @param array{name?: string, mime?: string} $meta
     */
    public static function store(array $identity, array $meta, string $data): XpFile
    {
        $blobId = self::generateId();
        $key = self::blobKey($identity, $blobId);

        if (!StorageManager::getDriver()->write($key, $data)) {
            Log::error('XP blob 写入失败', ['key' => $key, 'size' => strlen($data)]);
            throw new BlobException('文件写入云空间失败，请稍后重试', 'write_failed');
        }

        try {
            return XpFile::create([
                'user_type' => $identity['userType'],
                'user_id' => (string) $identity['userId'],
                'blob_id' => $blobId,
                'name' => (string) ($meta['name'] ?? ''),
                'mime' => (string) ($meta['mime'] ?? ''),
                'size_bytes' => strlen($data),
                'status' => XpFile::STATUS_NORMAL,
            ]);
        } catch (\Throwable $e) {
            StorageManager::getDriver()->delete($key);
            Log::error('XP blob 元数据登记失败，已回滚 blob', ['key' => $key, 'error' => $e->getMessage()]);
            throw new BlobException('文件登记失败，请稍后重试', 'write_failed');
        }
    }

    /**
     * 复制一份 blob，返回新 blobId
     *
     * 文件树复制操作（FsController::copy）必须调用本方法而非直接复用 blobId：
     * FsTreeService::copyNode() 是浅拷贝，两个节点指向同一 blobId 时，
     * 删除其一会连带摧毁另一个节点的数据。
     *
     * 不采用引用计数：用户配额仅百 MB 量级，复制开销可接受，
     * 换来的是零误删风险与直观的配额口径（每份副本各计一次）。
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    public static function duplicate(array $identity, string $blobId): ?string
    {
        $meta = self::findMeta($identity, $blobId);
        if ($meta === null) {
            return null;
        }

        $data = StorageManager::getDriver()->read(self::blobKey($identity, $meta->blob_id));
        if ($data === null) {
            Log::error('XP blob 复制失败：源内容不存在', ['blobId' => $meta->blob_id]);

            return null;
        }

        return self::store($identity, ['name' => $meta->name, 'mime' => $meta->mime], $data)->blob_id;
    }

    /**
     * 删除 blob 及其元数据（校验归属）
     *
     * 元数据采用物理删除而非软删：软删会让 blob 继续占用磁盘与配额，
     * 用户删除文件却看不到空间释放，与「在线电脑」的直觉相悖。
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    public static function remove(array $identity, string $blobId): bool
    {
        $meta = self::findMeta($identity, $blobId);
        if ($meta === null) {
            return false;
        }

        StorageManager::getDriver()->delete(self::blobKey($identity, $meta->blob_id));
        $meta->delete();

        return true;
    }

    /**
     * 批量删除 blob
     *
     * 用于彻底删除文件与清空回收站：需递归收集子树内全部 blobId 后一次性清理。
     *
     * @param array{userType: string, userId: string|int} $identity
     * @param array<int, string> $blobIds
     */
    public static function removeMany(array $identity, array $blobIds): int
    {
        $removed = 0;
        foreach (array_unique($blobIds) as $blobId) {
            if (!is_string($blobId) || $blobId === '') {
                continue;
            }
            if (self::remove($identity, $blobId)) {
                $removed++;
            }
        }

        return $removed;
    }

    /**
     * 初始化分片上传会话（支持断点续传命中既有会话）
     *
     * @param array{userType: string, userId: string|int} $identity
     * @param array{name: string, parentPath: string, sizeBytes: int} $spec
     */
    public static function initUpload(array $identity, array $spec): XpUpload
    {
        $name = trim((string) ($spec['name'] ?? ''));
        $size = (int) ($spec['sizeBytes'] ?? 0);
        $parentPath = (string) ($spec['parentPath'] ?? '');

        if ($name === '' || str_contains($name, '/') || str_contains($name, '\\')) {
            throw new BlobException('文件名不能为空且不得包含路径分隔符', 'invalid_param');
        }
        if ($size <= 0) {
            throw new BlobException('文件大小必须大于 0', 'invalid_param');
        }
        if ($size > self::MAX_MERGE_BYTES) {
            throw new BlobException('文件过大，超出服务端可合并上限', 'too_large');
        }

        self::cleanExpired();

        $resumed = self::resumeCandidate($identity, $name, $parentPath, $size);
        if ($resumed !== null) {
            return $resumed;
        }

        return XpUpload::create([
            'upload_id' => self::generateId(),
            'user_type' => $identity['userType'],
            'user_id' => (string) $identity['userId'],
            'name' => $name,
            'parent_path' => $parentPath,
            'size_bytes' => $size,
            'chunk_size' => self::CHUNK_SIZE,
            'chunk_total' => (int) ceil($size / self::CHUNK_SIZE),
            'received_mask' => [],
            'status' => XpUpload::STATUS_PENDING,
        ]);
    }

    /**
     * 查找当前身份的进行中上传会话
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    public static function findUpload(array $identity, string $uploadId): ?XpUpload
    {
        return XpUpload::query()
            ->where('upload_id', self::sanitizeSegment($uploadId, 'uploadId', 64))
            ->where('user_type', $identity['userType'])
            ->where('user_id', (string) $identity['userId'])
            ->first();
    }

    /**
     * 写入单个分片（幂等：重复上传同一片直接覆盖）
     */
    public static function saveChunk(XpUpload $upload, int $index, string $data): XpUpload
    {
        if ($upload->status !== XpUpload::STATUS_PENDING) {
            throw new BlobException('该上传会话已结束，请重新发起上传', 'conflict');
        }
        if ($index < 0 || $index >= $upload->chunk_total) {
            throw new BlobException('分片序号超出范围', 'invalid_param');
        }

        $expected = self::expectedChunkSize($upload, $index);
        if (strlen($data) !== $expected) {
            throw new BlobException(sprintf('分片 %d 大小应为 %d 字节，实际 %d 字节', $index + 1, $expected, strlen($data)), 'chunk_mismatch');
        }

        $identity = self::identityOf($upload);
        $key = self::chunkKey($identity, $upload->upload_id, $index);
        if (!StorageManager::getDriver()->write($key, $data)) {
            Log::error('XP 上传分片写入失败', ['key' => $key, 'size' => strlen($data)]);
            throw new BlobException('分片写入云空间失败，请重试该分片', 'write_failed');
        }

        $upload->markReceived($index);
        $upload->save();

        return $upload;
    }

    /**
     * 合并分片并落地为正式 blob
     *
     * @throws BlobException 分片未收齐、分片丢失、合并后大小与声明不符
     */
    public static function completeUpload(XpUpload $upload): XpFile
    {
        if ($upload->status !== XpUpload::STATUS_PENDING) {
            throw new BlobException('该上传会话已结束，请重新发起上传', 'conflict');
        }
        if (!$upload->isFullyReceived()) {
            $missing = $upload->nextMissingIndex();
            throw new BlobException(sprintf('分片尚未接收完整，缺少第 %d 片', $missing + 1), 'conflict');
        }

        $identity = self::identityOf($upload);
        $merged = self::mergeChunks($upload, $identity);

        if (strlen($merged) !== $upload->size_bytes) {
            Log::error('XP 上传合并大小不符', [
                'uploadId' => $upload->upload_id,
                'declared' => $upload->size_bytes,
                'actual' => strlen($merged),
            ]);
            throw new BlobException('文件合并后大小与声明不一致，请重新上传', 'conflict');
        }

        $file = self::store($identity, ['name' => $upload->name], $merged);
        unset($merged);

        self::purgeChunks($upload);
        $upload->status = XpUpload::STATUS_COMPLETED;
        $upload->blob_id = $file->blob_id;
        $upload->save();

        return $file;
    }

    /**
     * 取消上传：清理已写入的分片并置会话为已取消
     */
    public static function abortUpload(XpUpload $upload): bool
    {
        self::purgeChunks($upload);
        $upload->status = XpUpload::STATUS_CANCELLED;
        $upload->save();

        return true;
    }

    /**
     * 惰性清理超时未完成的上传会话，返回清理数量
     *
     * 会话落库使本清理可以精准定位归属，无需扫描整个 tmp 前缀
     */
    public static function cleanExpired(): int
    {
        $deadline = now()->subHours(self::UPLOAD_TTL_HOURS);
        $stale = XpUpload::query()
            ->where('status', XpUpload::STATUS_PENDING)
            ->where('create_time', '<', $deadline)
            ->get();

        foreach ($stale as $upload) {
            self::abortUpload($upload);
        }

        return $stale->count();
    }

    /**
     * 查找可续传的既有会话，并按分片实际存在性修正已接收位图
     *
     * tmp 分片可能因超时清理而丢失，若不修正位图，completeUpload
     * 会在合并阶段才发现缺片，白等一次完整上传。
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    private static function resumeCandidate(array $identity, string $name, string $parentPath, int $size): ?XpUpload
    {
        $upload = XpUpload::query()
            ->where('user_type', $identity['userType'])
            ->where('user_id', (string) $identity['userId'])
            ->where('status', XpUpload::STATUS_PENDING)
            ->where('name', $name)
            ->where('parent_path', $parentPath)
            ->where('size_bytes', $size)
            ->first();

        if ($upload === null) {
            return null;
        }

        $driver = StorageManager::getDriver();
        $valid = [];
        foreach ($upload->receivedIndexes() as $index) {
            if ($driver->exists(self::chunkKey($identity, $upload->upload_id, $index))) {
                $valid[] = $index;
            }
        }

        if (count($valid) !== count($upload->receivedIndexes())) {
            $upload->received_mask = $valid;
            $upload->save();
        }

        return $upload;
    }

    /**
     * 按序读取并拼接全部分片
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    private static function mergeChunks(XpUpload $upload, array $identity): string
    {
        $driver = StorageManager::getDriver();
        $merged = '';

        for ($i = 0; $i < $upload->chunk_total; $i++) {
            $chunk = $driver->read(self::chunkKey($identity, $upload->upload_id, $i));
            if ($chunk === null) {
                throw new BlobException(sprintf('分片 %d 已丢失，请重新上传该文件', $i + 1), 'conflict');
            }
            $merged .= $chunk;
        }

        return $merged;
    }

    /**
     * 删除会话名下的全部分片（合并成功、取消、超时三种路径共用）
     */
    private static function purgeChunks(XpUpload $upload): void
    {
        $driver = StorageManager::getDriver();
        $identity = self::identityOf($upload);

        for ($i = 0; $i < $upload->chunk_total; $i++) {
            $driver->delete(self::chunkKey($identity, $upload->upload_id, $i));
        }
    }

    /**
     * 计算指定分片应有的字节数：末片为余数，其余为满片
     */
    private static function expectedChunkSize(XpUpload $upload, int $index): int
    {
        if ($index === $upload->chunk_total - 1) {
            $remainder = $upload->size_bytes - ($index * $upload->chunk_size);

            return $remainder > 0 ? $remainder : $upload->chunk_size;
        }

        return $upload->chunk_size;
    }

    /**
     * 从上传会话反解身份二元组
     *
     * @return array{userType: string, userId: string}
     */
    private static function identityOf(XpUpload $upload): array
    {
        return ['userType' => (string) $upload->user_type, 'userId' => (string) $upload->user_id];
    }

    /**
     * 构造身份前缀并校验各段合法性
     *
     * @param array{userType: string, userId: string|int} $identity
     */
    private static function ownerPrefix(array $identity): string
    {
        $userType = self::sanitizeSegment((string) ($identity['userType'] ?? ''), 'userType', 20);
        $userId = self::sanitizeSegment((string) ($identity['userId'] ?? ''), 'userId', 100);

        return $userType . '/' . $userId;
    }

    /**
     * 过滤存储键片段，阻断路径穿越
     *
     * 键片段中若混入 `/`、`\` 或 `..`，即可越出本人目录读取他人快照与文件
     */
    private static function sanitizeSegment(string $segment, string $label, int $maxLength): string
    {
        $invalid = $segment === ''
            || strlen($segment) > $maxLength
            || str_contains($segment, '/')
            || str_contains($segment, '\\')
            || str_contains($segment, '..');

        if ($invalid) {
            throw new BlobException($label . ' 非法', 'invalid_param');
        }

        return $segment;
    }
}
