<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Exceptions\BlobException;
use App\Apps\CmsproWindowsxponline\Services\BlobService;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 文件系统 CRUD 端点
 *
 * 路径寻址：路径段数组 string[]
 * GET /fs - 全树根或按路径取节点
 * POST /fs - 新建文件/文件夹
 * POST /fs/write - 写文件内容
 * PATCH /fs - 重命名/属性补丁
 * DELETE /fs - 删除（默认进回收站）
 * POST /fs/move - 移动
 * POST /fs/copy - 复制
 */
class FsController extends BaseController
{
    /**
     * 全树根节点或按路径取节点
     */
    public function read(Request $request)
    {
        $state = $this->getState();
        $path = $this->parsePath($request);

        if (empty($path)) {
            return XpResponse::success($state['fsTree']);
        }

        $node = FsTreeService::findNode($state['fsTree'], $path);
        if ($node === null) {
            return XpResponse::notFound('路径不存在: ' . implode('/', $path));
        }

        return XpResponse::success($node);
    }

    /**
     * 新建文件/文件夹
     */
    public function create(Request $request)
    {
        $body = $this->jsonBody($request);
        $parentPath = $body['parentPath'] ?? null;
        $node = $body['node'] ?? null;

        if (!is_array($parentPath) || !is_array($node)) {
            return XpResponse::badRequest('缺少必填字段: parentPath, node');
        }
        if (!isset($node['name']) || !isset($node['kind'])) {
            return XpResponse::badRequest('node 必须包含 name 和 kind');
        }

        $state = $this->getState();

        $parent = FsTreeService::findNode($state['fsTree'], $parentPath);
        if ($parent === null) {
            return XpResponse::notFound('父路径不存在: ' . implode('/', $parentPath));
        }

        $finalName = FsTreeService::createNode($state['fsTree'], $parentPath, $node);
        if ($finalName === '') {
            return XpResponse::serverError('创建节点失败');
        }

        $this->saveState($state);

        return XpResponse::success(['name' => $finalName]);
    }

    /**
     * 写文件内容（存在则更新，不存在则创建）
     */
    public function write(Request $request)
    {
        $body = $this->jsonBody($request);
        $parentPath = $body['parentPath'] ?? null;
        $name = $body['name'] ?? null;
        $content = $body['content'] ?? null;

        if (!is_array($parentPath) || $name === null || $content === null) {
            return XpResponse::badRequest('缺少必填字段: parentPath, name, content');
        }

        $state = $this->getState();

        $parent = FsTreeService::findNode($state['fsTree'], $parentPath);
        if ($parent === null) {
            return XpResponse::notFound('父路径不存在: ' . implode('/', $parentPath));
        }

        $created = FsTreeService::writeFile($state['fsTree'], $parentPath, $name, $content);
        $this->saveState($state);

        return XpResponse::success(['created' => $created, 'name' => $name]);
    }

    /**
     * 重命名/属性补丁
     */
    public function patch(Request $request)
    {
        $body = $this->jsonBody($request);
        $path = $body['path'] ?? null;
        $newName = $body['newName'] ?? null;
        $patch = $body['patch'] ?? null;

        if (!is_array($path)) {
            return XpResponse::badRequest('缺少必填字段: path');
        }

        $state = $this->getState();

        if ($newName !== null) {
            $finalName = FsTreeService::renameNode($state['fsTree'], $path, $newName);
            if ($finalName === '') {
                return XpResponse::notFound('路径不存在: ' . implode('/', $path));
            }
            $this->saveState($state);

            return XpResponse::success(['name' => $finalName]);
        }

        if (is_array($patch)) {
            $ok = FsTreeService::patchNode($state['fsTree'], $path, $patch);
            if (!$ok) {
                return XpResponse::notFound('路径不存在: ' . implode('/', $path));
            }
            $this->saveState($state);

            return XpResponse::success(['applied' => array_keys($patch)]);
        }

        return XpResponse::badRequest('需指定 newName 或 patch');
    }

    /**
     * 删除（默认进回收站）
     */
    public function delete(Request $request)
    {
        $body = $this->jsonBody($request);
        $paths = $body['paths'] ?? null;
        $permanent = $body['permanent'] ?? false;

        if (!is_array($paths) || empty($paths)) {
            return XpResponse::badRequest('缺少必填字段: paths');
        }

        $state = $this->getState();
        $now = now()->timestamp * 1000;
        $deleted = 0;
        $purgeBlobIds = [];
        $clientKeys = $this->collectClientRecycleKeys($body['items'] ?? null);

        foreach ($paths as $path) {
            if (!is_array($path) || empty($path)) {
                continue;
            }

            $fullPathStr = FsTreeService::pathToString($path);
            $node = FsTreeService::deleteNode($state['fsTree'], $path);
            if ($node === null) {
                continue;
            }
            $deleted++;

            if ($permanent) {
                // 彻底删除才回收内容对象；进回收站必须保留 blob ——
                // 还原依赖条目中保存的 node，提前删内容会让还原出的文件下载 404
                foreach (FsTreeService::collectBlobIds($node) as $blobId) {
                    $purgeBlobIds[] = $blobId;
                }
            } else {
                // key 采纳前端 items 中的同路径标识（前端本地以「路径#时间戳+随机」
                // 生成 key，还原/彻底删除按其匹配；服务端自建 key 与之必然不一致，
                // 会导致 restore 永远命中不了）。node 内容一律由服务端依据被删
                // 真实节点构造，不接受客户端 node，避免存储型 XSS（M-05 语义不变）
                $key = FsTreeService::generateRecycleKey($fullPathStr, (string) $node['name']);
                if (!empty($clientKeys[$fullPathStr])) {
                    $key = array_shift($clientKeys[$fullPathStr]);
                }

                // origKey 为被删节点的父目录路径（前端契约：回收站窗口「原位置」
                // 列直接展示该值，不应含文件名；还原时整段作为目标父目录）
                $state['recycleBin'][] = [
                    'key' => $key,
                    'name' => $node['name'],
                    'origKey' => FsTreeService::pathToString(array_slice($path, 0, -1)),
                    'node' => $node,
                    'deletedAt' => $now,
                ];
            }
        }

        if ($deleted > 0) {
            $this->saveState($state);
            // 快照落盘成功后才回收 blob，避免「节点还在而内容已删」的数据丢失
            $this->purgeUnreferencedBlobs($state, $purgeBlobIds);
        }

        return XpResponse::success(['deleted' => $deleted]);
    }

    /**
     * 移动
     */
    public function move(Request $request)
    {
        $body = $this->jsonBody($request);
        $paths = $body['paths'] ?? null;
        $destPath = $body['destPath'] ?? null;

        if (!is_array($paths) || empty($paths) || !is_array($destPath)) {
            return XpResponse::badRequest('缺少必填字段: paths, destPath');
        }

        $state = $this->getState();
        $moved = 0;

        foreach ($paths as $path) {
            if (!is_array($path) || empty($path)) {
                continue;
            }
            if (FsTreeService::moveNode($state['fsTree'], $path, $destPath)) {
                $moved++;
            }
        }

        if ($moved > 0) {
            $this->saveState($state);
        }

        return XpResponse::success(['moved' => $moved]);
    }

    /**
     * 复制
     *
     * 内容存于独立对象存储的文件会一并复制出新对象，副本与源互不影响。
     */
    public function copy(Request $request)
    {
        $body = $this->jsonBody($request);
        $paths = $body['paths'] ?? null;
        $destPath = $body['destPath'] ?? null;

        if (!is_array($paths) || empty($paths) || !is_array($destPath)) {
            return XpResponse::badRequest('缺少必填字段: paths, destPath');
        }

        $state = $this->getState();
        $identity = StateService::getCurrentIdentity();
        $copied = 0;
        $duplicated = [];

        try {
            foreach ($paths as $path) {
                if (!is_array($path) || empty($path)) {
                    continue;
                }

                $blobMap = $this->duplicateSubtreeBlobs($identity, $state['fsTree'], $path, $duplicated);
                if (FsTreeService::copyNode($state['fsTree'], $path, $destPath, $blobMap)) {
                    $copied++;
                }
            }

            if ($copied > 0) {
                $this->saveState($state);
            }
        } catch (\Throwable $e) {
            // 快照未落盘时本次复制出的内容对象已无人引用，必须回收，否则永久占用配额
            BlobService::removeMany($identity, $duplicated);

            throw $e;
        }

        return XpResponse::success(['copied' => $copied]);
    }

    /**
     * 为待复制子树生成独立的 blob 副本
     *
     * copyNode() 是浅拷贝，副本若继续引用源 blobId，删除任一方都会摧毁另一方的
     * 文件内容，故逐个复制内容对象并返回「旧 ID → 新 ID」映射交给树操作改写。
     *
     * 配额按副本各计一次，新增字节在复制前一次性校验，避免复制一半才因超额失败。
     *
     * @param array{userType: string, userId: string|int} $identity
     * @param array &$tree fsTree（引用传递，findNode 需要）
     * @param array $path 源节点路径段
     * @param array<int, string> &$duplicated 本次请求已复制出的新 blobId（供调用方失败回滚）
     * @return array<string, string> 旧 blobId → 新 blobId
     * @throws StateException 配额不足
     * @throws BlobException 内容对象复制失败
     */
    private function duplicateSubtreeBlobs(array $identity, array &$tree, array $path, array &$duplicated): array
    {
        $srcNode = FsTreeService::findNode($tree, $path);
        if ($srcNode === null) {
            return [];
        }

        $blobIds = FsTreeService::collectBlobIds($srcNode);
        if ($blobIds === []) {
            return [];
        }

        $incoming = 0;
        foreach ($blobIds as $blobId) {
            $meta = BlobService::findMeta($identity, $blobId);
            $incoming += $meta === null ? 0 : (int) $meta->size_bytes;
        }
        StateService::assertBlobFits($identity, $incoming);

        $blobMap = [];
        foreach ($blobIds as $blobId) {
            $newId = BlobService::duplicate($identity, $blobId);
            if ($newId === null) {
                throw new BlobException('文件内容复制失败，请稍后重试', 'write_failed');
            }
            $blobMap[$blobId] = $newId;
            $duplicated[] = $newId;
        }

        return $blobMap;
    }

    /**
     * 从客户端 items 中收集「被删节点完整路径 → 回收站 key」映射
     *
     * 前端本地删除按 `${完整路径}#${Date.now()}${随机4位}` 生成 key 并随请求
     * 传入 items；服务端仅采纳 key 标识符（还原时按 key 匹配），node/name/origKey
     * 等内容一律服务端依据真实被删节点构造，防伪造 node 注入 fsTree（M-05）。
     *
     * key 白名单：字符串、非空、≤512 字节、无控制字符、含 '#' 分隔符
     * （'#' 前缀须等于被删节点完整路径才可命中映射）。
     *
     * @param mixed $items 客户端传入的 items（可能缺失/畸形）
     * @return array<string, array<int, string>> 路径 → 候选 key 列表（按序消费）
     */
    private function collectClientRecycleKeys($items): array
    {
        $map = [];
        if (!is_array($items)) {
            return $map;
        }

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $key = $item['key'] ?? null;
            if (!is_string($key) || $key === '' || strlen($key) > 512 || preg_match('/[\x00-\x1F\x7F]/', $key)) {
                continue;
            }
            $hashPos = strrpos($key, '#');
            if ($hashPos === false || $hashPos === 0) {
                continue;
            }
            $map[substr($key, 0, $hashPos)][] = $key;
        }

        return $map;
    }
}
