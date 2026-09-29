<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Exceptions\BlobException;
use App\Apps\CmsproWindowsxponline\Services\ArchiveService;
use App\Apps\CmsproWindowsxponline\Services\BlobService;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * 压缩包控制器（WinRAR 复刻）
 *
 * 三个端点对应 WinRAR 的三个动作：查看压缩包内容、压缩选中项、解压到目录。
 * 压缩解压的实际格式为 ZIP（PHP 无法生成 RAR），窗口视觉由前端 1:1 仿制。
 *
 * 内容一律走 blob 独立存储：解压可能一次产出上百个文件，若沿用「内嵌 content」
 * 的老口径，快照会迅速撞上 10 MB 硬上限而整次失败。
 *
 * 写入遵循与上传接口相同的两段式：先创建内容对象，再落盘快照；快照失败则回滚
 * 已创建的对象。blob 入库即计入配额，残留的孤儿对象既占空间又无法从界面删除。
 */
class ArchiveController extends BaseController
{
    /**
     * 列出压缩包条目
     *
     * GET /fs/archive/entries?path=本地磁盘 (D:)/用户/桌面/包.zip
     */
    public function entries(Request $request)
    {
        $path = $this->parsePath($request);
        if ($path === []) {
            return XpResponse::badRequest('缺少必填查询参数: path');
        }

        $state = $this->getState();
        $node = FsTreeService::findNode($state['fsTree'], $path);
        if ($node === null) {
            return XpResponse::notFound('文件不存在或已被移动');
        }
        if (($node['kind'] ?? 'file') !== 'file') {
            return XpResponse::badRequest('目标不是文件');
        }

        $data = ArchiveService::readNodeContent(StateService::getCurrentIdentity(), $node);
        if ($data === null) {
            return XpResponse::notFound('文件内容已丢失，请重新上传');
        }

        return XpResponse::success([
            'name' => (string) ($node['name'] ?? ''),
            'entries' => ArchiveService::listEntries($data),
        ]);
    }

    /**
     * 压缩选中的文件/文件夹
     *
     * POST /fs/archive
     * body: { paths: string[][], destPath?: string[], name?: string }
     *
     * @throws BlobException 内容收集或归档写入失败
     * @throws StateException 配额不足或快照写入失败
     */
    public function create(Request $request)
    {
        $body = $this->jsonBody($request);
        $paths = $this->nodePaths($body['paths'] ?? null);
        if ($paths === []) {
            return XpResponse::badRequest('缺少必填字段: paths');
        }

        $state = $this->getState();
        if (StateService::isGuestReadonly($state)) {
            return XpResponse::conflict('访客模式为只读，不支持压缩文件');
        }

        $nodes = $this->resolveNodes($state, $paths);
        if ($nodes === null) {
            return XpResponse::notFound('所选文件不存在或已被移动');
        }

        $destPath = $this->destPath($body['destPath'] ?? null, $paths[0], $state);
        if ($destPath === null) {
            return XpResponse::notFound('目标目录不存在');
        }

        $identity = StateService::getCurrentIdentity();
        $files = $this->collectAll($identity, $nodes);
        if ($files === []) {
            return XpResponse::badRequest('所选内容中没有可压缩的文件');
        }

        $name = $this->archiveName((string) ($body['name'] ?? ''), $nodes);
        $data = ArchiveService::build($files);

        // 按压缩后的真实字节数校验配额：未压缩总量会大幅高估，误拒合法请求
        StateService::assertBlobFits($identity, strlen($data));
        $file = BlobService::store($identity, ['name' => $name, 'mime' => 'application/zip'], $data);

        try {
            $finalName = $this->attachNode($state, $destPath, $name, $file->blob_id, (int) $file->size_bytes);
            if ($finalName === '') {
                throw new BlobException('目标目录不存在', 'not_found');
            }
            $this->saveState($state);
        } catch (\Throwable $e) {
            BlobService::remove($identity, $file->blob_id);
            throw $e;
        }

        if ($finalName !== $name) {
            // 重名去重后同步元数据名，否则下载到本地得到的是去重前的文件名
            $file->name = $finalName;
            $file->save();
        }

        return XpResponse::success([
            'name' => $finalName,
            'blobId' => $file->blob_id,
            'bytes' => (int) $file->size_bytes,
            'path' => array_merge($destPath, [$finalName]),
            'entries' => count($files),
        ]);
    }

    /**
     * 解压压缩包到目标目录
     *
     * POST /fs/extract
     * body: { path: string[], destPath?: string[] }
     *
     * @throws BlobException 归档无效、超出规模上限或写入失败
     * @throws StateException 配额不足或快照写入失败
     */
    public function extract(Request $request)
    {
        $body = $this->jsonBody($request);
        $path = $body['path'] ?? null;
        if (!is_array($path) || $path === []) {
            return XpResponse::badRequest('缺少必填字段: path');
        }

        $state = $this->getState();
        if (StateService::isGuestReadonly($state)) {
            return XpResponse::conflict('访客模式为只读，不支持解压文件');
        }

        $node = FsTreeService::findNode($state['fsTree'], $path);
        if ($node === null) {
            return XpResponse::notFound('文件不存在或已被移动');
        }
        if (($node['kind'] ?? 'file') !== 'file') {
            return XpResponse::badRequest('目标不是文件');
        }

        $identity = StateService::getCurrentIdentity();
        $data = ArchiveService::readNodeContent($identity, $node);
        if ($data === null) {
            return XpResponse::notFound('文件内容已丢失，请重新上传');
        }

        $files = ArchiveService::unpack($data);
        if ($files === []) {
            return XpResponse::badRequest('压缩包内没有可解压的文件');
        }

        StateService::assertBlobFits($identity, array_sum(array_map('strlen', $files)));

        $destPath = $this->destPath($body['destPath'] ?? null, $path, $state);
        if ($destPath === null) {
            return XpResponse::notFound('目标目录不存在');
        }

        // WinRAR「解压到 <名称>\」默认行为：以压缩包名建子目录，避免内容散落到当前目录
        $target = FsTreeService::ensureFolderPath($state['fsTree'], $destPath, [$this->folderName($node)]);
        if ($target === null) {
            return XpResponse::conflict('无法创建目标目录，请确认同名的不是文件');
        }

        return $this->writeExtracted($state, $target, $files);
    }

    /**
     * 将解出的文件逐个入库并挂载到目标目录
     *
     * @param array $state 完整状态快照（引用修改）
     * @param array<int, string> $target 解压根目录路径段
     * @param array<string, string> $files 包内相对路径 => 文件内容
     * @throws BlobException 条目写入失败
     * @throws StateException 配额不足或快照写入失败
     */
    private function writeExtracted(array &$state, array $target, array $files)
    {
        $identity = StateService::getCurrentIdentity();
        $created = [];

        try {
            foreach ($files as $relative => $content) {
                $split = $this->splitEntry((string) $relative);
                if ($split === null) {
                    continue;
                }

                $blobId = $this->storeEntry($state, $target, $split, (string) $content);
                if ($blobId !== null) {
                    $created[] = $blobId;
                }
            }

            $this->saveState($state);
        } catch (\Throwable $e) {
            BlobService::removeMany($identity, $created);
            throw $e;
        }

        return XpResponse::success(['extracted' => count($created), 'path' => $target]);
    }

    /**
     * 将单个解压条目写入 blob 并挂到文件树
     *
     * @param array $state 完整状态快照（引用修改）
     * @param array<int, string> $target 解压根目录路径段
     * @param array{0: array<int, string>, 1: string} $split 父目录段序列与文件名
     * @return string|null 创建出的 blobId，条目被跳过时返回 null
     * @throws BlobException 目录创建或挂载失败
     */
    private function storeEntry(array &$state, array $target, array $split, string $content): ?string
    {
        $dirPath = FsTreeService::ensureFolderPath($state['fsTree'], $target, $split[0]);
        if ($dirPath === null) {
            // 同名文件挡路时无从建目录：跳过该条目而非整体失败，与 WinRAR 的「跳过」一致
            return null;
        }

        $fileName = $split[1];
        $blob = BlobService::store(StateService::getCurrentIdentity(), ['name' => $fileName, 'mime' => ''], $content);

        $finalName = $this->attachNode($state, $dirPath, $fileName, $blob->blob_id, (int) $blob->size_bytes);
        if ($finalName === '') {
            throw new BlobException('解压失败：目标目录不存在', 'write_failed');
        }

        if ($finalName !== $fileName) {
            $blob->name = $finalName;
            $blob->save();
        }

        return (string) $blob->blob_id;
    }

    /**
     * 归一化请求中的路径列表
     *
     * @return array<int, array<int, string>> 过滤掉非数组与空项后的路径段列表
     */
    private function nodePaths(mixed $raw): array
    {
        if (!is_array($raw)) {
            return [];
        }

        $paths = [];
        foreach ($raw as $item) {
            if (is_array($item) && $item !== []) {
                $paths[] = array_values(array_map('strval', $item));
            }
        }

        return $paths;
    }

    /**
     * 按路径取出全部所选节点
     *
     * 任一路径失效即整体失败：只压出部分内容会让用户误以为压缩已完整完成。
     *
     * @param array<int, array<int, string>> $paths
     * @return array<int, array>|null 全部节点，存在失效路径时返回 null
     */
    private function resolveNodes(array $state, array $paths): ?array
    {
        $nodes = [];
        foreach ($paths as $path) {
            $node = FsTreeService::findNode($state['fsTree'], $path);
            if ($node === null) {
                return null;
            }
            $nodes[] = $node;
        }

        return $nodes;
    }

    /**
     * 确定产物落地目录：未显式指定时取源条目的父目录（WinRAR 默认行为）
     *
     * @param array<int, string> $source 源条目路径段
     * @return array<int, string>|null 目录不存在或路径指向文件时返回 null
     */
    private function destPath(mixed $raw, array $source, array $state): ?array
    {
        $dest = is_array($raw) && $raw !== []
            ? array_values(array_map('strval', $raw))
            : array_slice($source, 0, -1);

        $node = FsTreeService::findNode($state['fsTree'], $dest);
        if ($node === null || !in_array($node['kind'] ?? '', ['folder', 'drive'], true)) {
            return null;
        }

        return $dest;
    }

    /**
     * 递归收集全部所选子树的文件内容，并校验未压缩总量
     *
     * @param array{userType: string, userId: string|int} $identity
     * @param array<int, array> $nodes 所选节点
     * @return array<string, string> 包内相对路径 => 文件内容
     * @throws BlobException 超出单次压缩上限或存在同名冲突
     */
    private function collectAll(array $identity, array $nodes): array
    {
        $files = [];
        $total = 0;

        foreach ($nodes as $node) {
            foreach (ArchiveService::collect($identity, $node) as $relative => $content) {
                if (isset($files[$relative])) {
                    // 跨目录选中同名文件时包内路径会撞车，静默覆盖等于丢文件，必须显式拒绝
                    throw new BlobException(
                        sprintf('所选内容中存在同名文件「%s」，请分次压缩或先重命名', $relative),
                        'conflict'
                    );
                }

                $total += strlen($content);
                if ($total > ArchiveService::MAX_TOTAL_BYTES) {
                    throw new BlobException(
                        sprintf('所选内容共约 %d MB，超过单次压缩 %d MB 上限', (int) ceil($total / 1048576), 200),
                        'too_large'
                    );
                }

                $files[$relative] = $content;
            }
        }

        return $files;
    }

    /**
     * 拆分条目相对路径为「父目录段序列 + 文件名」
     *
     * ArchiveService 已完成归一化（无 ..、无绝对路径、无空段），此处只做切分。
     *
     * @return array{0: array<int, string>, 1: string}|null 无有效文件名时返回 null
     */
    private function splitEntry(string $relative): ?array
    {
        $segments = explode('/', $relative);
        $fileName = trim((string) array_pop($segments));

        return $fileName === '' ? null : [$segments, $fileName];
    }

    /**
     * 消毒并补全压缩包名
     *
     * 未指定名称时按 WinRAR 口径推导：选中单个条目用其名称（去扩展名），
     * 多选用通用名。
     *
     * @param array<int, array> $nodes 所选节点
     */
    private function archiveName(string $requested, array $nodes): string
    {
        $name = $this->sanitizeFileName($requested);

        if ($name === '') {
            $only = count($nodes) === 1 ? (string) ($nodes[0]['name'] ?? '') : '';
            $name = $this->sanitizeFileName(pathinfo($only, PATHINFO_FILENAME));
        }

        if ($name === '') {
            $name = '新建压缩文件';
        }

        return strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'zip' ? $name : $name . '.zip';
    }

    /**
     * 由压缩包节点推导解压子目录名
     */
    private function folderName(array $node): string
    {
        $base = $this->sanitizeFileName(pathinfo((string) ($node['name'] ?? ''), PATHINFO_FILENAME));

        return $base === '' ? '解压文件' : $base;
    }

    /**
     * 消毒用户提供的文件/目录名
     *
     * 名称既作为路径段参与文件树寻址，也会写入 blob 元数据并出现在
     * Content-Disposition 中。路径分隔符与穿越段会破坏树寻址，控制字符可注入
     * 响应头，末尾的点与空格在 Windows 语义下不合法。
     */
    private function sanitizeFileName(string $raw): string
    {
        $name = str_replace(['\\', '/'], '_', trim($raw));
        $name = (string) preg_replace('/[\x00-\x1F\x7F]/', '', $name);
        $name = rtrim($name, '. ');

        return in_array($name, ['.', '..'], true) ? '' : $name;
    }
}
