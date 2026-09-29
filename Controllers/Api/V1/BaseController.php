<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\BlobService;
use App\Apps\CmsproWindowsxponline\Services\FsTreeService;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * XP WebOS API 控制器基类
 *
 * 封装通用的状态获取、保存和请求参数解析方法
 */
abstract class BaseController extends Controller
{
    /**
     * 获取当前用户的完整状态（自动初始化）
     */
    protected function getState(): array
    {
        return StateService::getCurrentState();
    }

    /**
     * 保存当前用户状态
     *
     * 保存失败时抛出 StateException，由异常自带的 render() 渲染为错误响应，
     * 避免调用方忽略返回值造成「接口成功但数据已丢失」的静默失败。
     * 身份分发（在线版/单机版按 CMSPRO 用户、免登录版按 XP 帐户）由 StateService 统一处理。
     *
     * @param array $state 完整状态快照
     * @throws StateException 未登录、配额校验未通过或写入失败
     */
    protected function saveState(array $state): void
    {
        StateService::saveCurrentState($state);
    }

    /**
     * 获取请求 JSON body
     */
    protected function jsonBody(Request $request): array
    {
        $data = $request->json()->all();
        return is_array($data) ? $data : [];
    }

    /**
     * 解析路径段数组
     *
     * GET 查询参数中以 / 分隔的路径
     */
    protected function parsePath(Request $request): array
    {
        $pathStr = $request->query('path', '');
        if ($pathStr === '') {
            return [];
        }
        return explode('/', $pathStr);
    }

    /**
     * 构造文件树节点并挂载到目标目录
     *
     * 上传完成、压缩产出、解压落盘三处都要把「已入库的 blob」呈现为文件树节点，
     * 节点字段口径必须完全一致，否则前端在体积统计与下载入口上会出现分歧。
     *
     * @param array $state 完整状态快照（引用修改）
     * @param array<int, string> $parentPath 目标目录路径段
     * @return string 去重后的最终文件名，空字符串表示挂载失败
     */
    protected function attachNode(array &$state, array $parentPath, string $name, string $blobId, int $bytes): string
    {
        $fileType = FsTreeService::inferFileType($name);
        // 树内时间戳统一 ISO 8601（与 InitialStateProvider 及前端产物一致），
        // 缺失会让资源管理器的「修改日期」列空白
        $now = now()->toISOString();

        return FsTreeService::createNode($state['fsTree'], $parentPath, [
            'name' => $name,
            'kind' => 'file',
            'icon' => $fileType['icon'],
            'type' => $fileType['type'],
            // size 为 XP 风格展示文本（与既有节点口径一致），bytes 为机器可读真实字节数；
            // blob 内容不在快照中，前端无法再从 content 反推长度，必须由服务端下发
            'size' => FsTreeService::formatBytes($bytes),
            'bytes' => $bytes,
            'blobId' => $blobId,
            'created' => $now,
            'modified' => $now,
        ]);
    }

    /**
     * 回收不再被引用的 blob 内容对象
     *
     * 彻底删除节点或清空回收站后调用。仅删除「文件树与回收站中都已无任何节点
     * 引用」的 blobId：历史数据的复制可能让多个节点共享同一 blobId，
     * 无条件删除会连带摧毁仍在使用的文件内容。
     *
     * 必须在 saveState() 成功后调用：反向顺序下一旦快照写入失败（如触发 10 MB
     * 硬上限），树里的节点仍在而内容已被物理删除，形成无法自愈的数据丢失。
     *
     * @param array $state 已落盘的最新状态快照
     * @param array<int, string> $blobIds 本次删除涉及的 blobId 清单
     * @return int 实际清理的对象数
     */
    protected function purgeUnreferencedBlobs(array $state, array $blobIds): int
    {
        if ($blobIds === []) {
            return 0;
        }

        $referenced = [];
        foreach (FsTreeService::collectBlobIds($state['fsTree'] ?? []) as $id) {
            $referenced[$id] = true;
        }
        foreach ($state['recycleBin'] ?? [] as $item) {
            $node = is_array($item) ? ($item['node'] ?? null) : null;
            if (is_array($node)) {
                foreach (FsTreeService::collectBlobIds($node) as $id) {
                    $referenced[$id] = true;
                }
            }
        }

        $orphans = array_values(array_filter($blobIds, static fn ($id) => !isset($referenced[$id])));

        return $orphans === [] ? 0 : BlobService::removeMany(StateService::getCurrentIdentity(), $orphans);
    }
}
