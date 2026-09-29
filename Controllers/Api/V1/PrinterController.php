<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 打印机端点
 *
 * GET /printers - 列表
 * PUT /printers - 整表替换
 * POST /printers - 添加打印机
 * DELETE /printers - 删除（连带清其作业）
 */
class PrinterController extends BaseController
{
    /**
     * 打印机列表
     */
    public function list()
    {
        $state = $this->getState();
        return XpResponse::success($state['printers'] ?? []);
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
        $state['printers'] = $items;
        $this->saveState($state);

        return XpResponse::success($state['printers']);
    }

    /**
     * 添加打印机
     */
    public function create(Request $request)
    {
        $body = $this->jsonBody($request);
        $name = $body['name'] ?? '';
        $model = $body['model'] ?? '';
        $def = $body['def'] ?? false;

        if ($name === '') {
            return XpResponse::badRequest('缺少 name 字段');
        }

        $state = $this->getState();
        if (!isset($state['printers']) || !is_array($state['printers'])) {
            $state['printers'] = [];
        }

        foreach ($state['printers'] as $printer) {
            if (($printer['name'] ?? '') === $name) {
                return XpResponse::conflict("打印机已存在: {$name}");
            }
        }

        if ($def) {
            foreach ($state['printers'] as &$printer) {
                $printer['def'] = false;
            }
            unset($printer);
        }

        $state['printers'][] = ['name' => $name, 'model' => $model, 'def' => $def];
        $this->saveState($state);

        return XpResponse::success(['name' => $name, 'model' => $model, 'def' => $def]);
    }

    /**
     * 删除打印机（连带清其作业）
     */
    public function delete(Request $request)
    {
        $body = $this->jsonBody($request);
        $name = $body['name'] ?? '';

        if ($name === '') {
            return XpResponse::badRequest('缺少 name 字段');
        }

        $state = $this->getState();

        $before = count($state['printers'] ?? []);
        $state['printers'] = array_values(array_filter(
            $state['printers'] ?? [],
            fn($p) => ($p['name'] ?? '') !== $name
        ));

        if (isset($state['printJobs']) && is_array($state['printJobs'])) {
            $state['printJobs'] = array_values(array_filter(
                $state['printJobs'],
                fn($j) => ($j['printer'] ?? '') !== $name
            ));
        }

        if (count($state['printers']) !== $before) {
            $this->saveState($state);
            return XpResponse::success(['removed' => $name]);
        }

        return XpResponse::notFound("打印机不存在: {$name}");
    }
}
