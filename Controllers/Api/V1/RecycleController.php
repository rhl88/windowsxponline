<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 回收站端点
 *
 * GET /recycle - 列表
 * POST /recycle - 还原（key 缺省=全部）
 * DELETE /recycle - 彻底删除（key 缺省=清空）
 */
class RecycleController extends BaseController
{
    /**
     * 回收站列表
     */
    public function list()
    {
        $state = $this->getState();

        return XpResponse::success($state['recycleBin'] ?? []);
    }

    /**
     * 还原（原位置失效回退桌面）
     */
    public function restore(Request $request)
    {
        $body = $this->jsonBody($request);
        $key = $body['key'] ?? null;

        $state = $this->getState();
        $restored = 0;

        if ($key === null) {
            foreach ($state['recycleBin'] as $item) {
                $this->restoreItem($state, $item);
                $restored++;
            }
            $state['recycleBin'] = [];
        } else {
            foreach ($state['recycleBin'] as $i => $item) {
                if (($item['key'] ?? '') === $key) {
                    $this->restoreItem($state, $item);
                    array_splice($state['recycleBin'], $i, 1);
                    $restored++;
                    break;
                }
            }
        }

        if ($restored > 0) {
            $this->saveState($state);
        }

        return XpResponse::success(['restored' => $restored]);
    }

    /**
     * 彻底删除
     */
    public function delete(Request $request)
    {
        $body = $this->jsonBody($request);
        $key = $body['key'] ?? null;

        $state = $this->getState();
        $purgeBlobIds = [];

        if ($key === null) {
            $cleared = count($state['recycleBin'] ?? []);
            foreach ($state['recycleBin'] ?? [] as $item) {
                $node = is_array($item) ? ($item['node'] ?? null) : null;
                if (is_array($node)) {
                    foreach (FsTreeService::collectBlobIds($node) as $blobId) {
                        $purgeBlobIds[] = $blobId;
                    }
                }
            }
            $state['recycleBin'] = [];
        } else {
            $cleared = 0;
            foreach ($state['recycleBin'] ?? [] as $i => $item) {
                if (($item['key'] ?? '') === $key) {
                    $node = is_array($item) ? ($item['node'] ?? null) : null;
                    if (is_array($node)) {
                        foreach (FsTreeService::collectBlobIds($node) as $blobId) {
                            $purgeBlobIds[] = $blobId;
                        }
                    }
                    array_splice($state['recycleBin'], $i, 1);
                    $cleared++;
                    break;
                }
            }
        }

        if ($cleared > 0) {
            $this->saveState($state);
            // 快照落盘成功后才回收 blob，避免「节点还在而内容已删」的数据丢失
            $this->purgeUnreferencedBlobs($state, $purgeBlobIds);
        }

        return XpResponse::success(['cleared' => $cleared]);
    }

    /**
     * 将回收站条目还原到原位置
     * 原位置失效时回退到桌面
     */
    private function restoreItem(array &$state, array $item): void
    {
        $node = $item['node'] ?? null;
        if (!is_array($node)) {
            return;
        }

        $origKey = $item['origKey'] ?? '';
        $parentPath = $origKey === '' ? [] : explode('/', $origKey);

        // 兼容存量旧格式：历史版本 origKey 为被删节点完整路径（含文件名），
        // 新格式为父目录路径。末段恰等于条目文件名时视为旧格式，截去末段。
        // （新格式下目录与文件同名的极端场景会被误判上移一级，属可接受的历史兼容代价）
        if ($parentPath && end($parentPath) === ($node['name'] ?? null)) {
            $parentPath = array_slice($parentPath, 0, -1);
        }

        $parent = &FsTreeService::findNode($state['fsTree'], $parentPath);
        if ($parent !== null && isset($parent['children']) && is_array($parent['children'])) {
            $finalName = FsTreeService::dedupeName($parent['children'], $node['name'] ?? '');
            $node['name'] = $finalName;
            $node['modified'] = now()->toIso8601String();
            $parent['children'][] = $node;
            $parent['modified'] = now()->toIso8601String();
        } else {
            $desktopPath = ['本地磁盘 (D:)', $state['session']['user'] ?? 'Administrator', '桌面'];
            $desktop = &FsTreeService::findNode($state['fsTree'], $desktopPath);
            if ($desktop !== null) {
                if (!isset($desktop['children']) || !is_array($desktop['children'])) {
                    $desktop['children'] = [];
                }
                $finalName = FsTreeService::dedupeName($desktop['children'], $node['name'] ?? '');
                $node['name'] = $finalName;
                $node['modified'] = now()->toIso8601String();
                $desktop['children'][] = $node;
                $desktop['modified'] = now()->toIso8601String();
            }
        }
    }
}
