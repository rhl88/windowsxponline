<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 打印队列端点
 *
 * GET /print-jobs - 队列列表
 * PUT /print-jobs - 整表替换
 * POST /print-jobs - 入队（id 服务端分配）
 * PATCH /print-jobs - 暂停/恢复
 * DELETE /print-jobs - 取消单个或整台打印机的全部
 */
class PrintJobController extends BaseController
{
    /**
     * 队列列表
     */
    public function list()
    {
        $state = $this->getState();
        return XpResponse::success($state['printJobs'] ?? []);
    }

    /**
     * 整表替换
     */
    public function replace(Request $request)
    {
        $body = $this->jsonBody($request);
        $jobs = $body['jobs'] ?? null;

        if (!is_array($jobs)) {
            return XpResponse::badRequest('缺少 jobs 字段');
        }

        $state = $this->getState();
        $state['printJobs'] = $jobs;
        $this->saveState($state);

        return XpResponse::success($state['printJobs']);
    }

    /**
     * 入队（id 服务端分配）
     */
    public function create(Request $request)
    {
        $body = $this->jsonBody($request);
        $printer = $body['printer'] ?? '';
        $doc = $body['doc'] ?? '';
        $pages = $body['pages'] ?? 1;
        $size = $body['size'] ?? '';

        if ($printer === '' || $doc === '') {
            return XpResponse::badRequest('缺少必填字段: printer, doc');
        }

        $state = $this->getState();
        if (!isset($state['printJobs']) || !is_array($state['printJobs'])) {
            $state['printJobs'] = [];
        }

        $maxId = 0;
        foreach ($state['printJobs'] as $job) {
            if (($job['id'] ?? 0) > $maxId) {
                $maxId = $job['id'];
            }
        }

        $now = now()->timestamp * 1000;
        $user = $state['session']['user'] ?? 'Administrator';

        if ($size === '') {
            $size = ceil($pages * 50) . ' KB';
        }

        $newJob = [
            'id' => $maxId + 1,
            'printer' => $printer,
            'doc' => $doc,
            'pages' => (int) $pages,
            'size' => $size,
            'owner' => $user,
            'submitted' => $now,
            'status' => 'printing',
        ];

        $state['printJobs'][] = $newJob;
        $this->saveState($state);

        return XpResponse::success($newJob);
    }

    /**
     * 暂停/恢复
     */
    public function patch(Request $request)
    {
        $body = $this->jsonBody($request);
        $id = $body['id'] ?? null;
        $status = $body['status'] ?? '';

        if ($id === null || !in_array($status, ['printing', 'paused'], true)) {
            return XpResponse::badRequest('缺少 id 或 status 无效');
        }

        $state = $this->getState();
        $updated = false;

        foreach ($state['printJobs'] ?? [] as &$job) {
            if (($job['id'] ?? 0) === (int) $id) {
                $job['status'] = $status;
                $updated = true;
                break;
            }
        }

        if ($updated) {
            $this->saveState($state);
            return XpResponse::success(['id' => (int) $id, 'status' => $status]);
        }

        return XpResponse::notFound("打印作业不存在: id={$id}");
    }

    /**
     * 取消单个或整台打印机的全部
     */
    public function delete(Request $request)
    {
        $body = $this->jsonBody($request);
        $id = $body['id'] ?? null;
        $printer = $body['printer'] ?? null;

        $state = $this->getState();
        $before = count($state['printJobs'] ?? []);

        if ($id !== null) {
            $state['printJobs'] = array_values(array_filter(
                $state['printJobs'] ?? [],
                fn($j) => ($j['id'] ?? 0) !== (int) $id
            ));
        } elseif ($printer !== null) {
            $state['printJobs'] = array_values(array_filter(
                $state['printJobs'] ?? [],
                fn($j) => ($j['printer'] ?? '') !== $printer
            ));
        } else {
            $state['printJobs'] = [];
        }

        $cancelled = $before - count($state['printJobs']);

        if ($cancelled > 0) {
            $this->saveState($state);
        }

        return XpResponse::success(['cancelled' => $cancelled]);
    }
}
