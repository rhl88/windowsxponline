<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 任务计划端点
 *
 * GET /sched-tasks - 列表
 * PUT /sched-tasks - 整表替换
 * POST /sched-tasks - 添加（同名覆盖）
 * DELETE /sched-tasks - 删除
 */
class SchedTaskController extends BaseController
{
    /**
     * 任务计划列表
     */
    public function list()
    {
        $state = $this->getState();
        return XpResponse::success($state['schedTasks'] ?? []);
    }

    /**
     * 整表替换
     */
    public function replace(Request $request)
    {
        $body = $this->jsonBody($request);
        $items = $body['items'] ?? $body;

        if (!is_array($items)) {
            return XpResponse::badRequest('请求体必须是数组');
        }

        $state = $this->getState();
        $state['schedTasks'] = $items;
        $this->saveState($state);

        return XpResponse::success($state['schedTasks']);
    }

    /**
     * 添加任务（同名覆盖）
     */
    public function create(Request $request)
    {
        $body = $this->jsonBody($request);
        $task = $body['task'] ?? null;

        if (!is_array($task) || !isset($task['name'])) {
            return XpResponse::badRequest('缺少 task 字段或 task.name');
        }

        $state = $this->getState();
        if (!isset($state['schedTasks']) || !is_array($state['schedTasks'])) {
            $state['schedTasks'] = [];
        }

        $replaced = false;
        foreach ($state['schedTasks'] as $i => $existing) {
            if (($existing['name'] ?? '') === $task['name']) {
                $state['schedTasks'][$i] = $task;
                $replaced = true;
                break;
            }
        }

        if (!$replaced) {
            $state['schedTasks'][] = $task;
        }

        $this->saveState($state);

        return XpResponse::success($task);
    }

    /**
     * 删除任务
     */
    public function delete(Request $request)
    {
        $body = $this->jsonBody($request);
        $name = $body['name'] ?? '';

        if ($name === '') {
            return XpResponse::badRequest('缺少 name 字段');
        }

        $state = $this->getState();
        $before = count($state['schedTasks'] ?? []);
        $state['schedTasks'] = array_values(array_filter(
            $state['schedTasks'] ?? [],
            fn($t) => ($t['name'] ?? '') !== $name
        ));

        if (count($state['schedTasks']) !== $before) {
            $this->saveState($state);
            return XpResponse::success(['removed' => $name]);
        }

        return XpResponse::notFound("任务不存在: {$name}");
    }
}
