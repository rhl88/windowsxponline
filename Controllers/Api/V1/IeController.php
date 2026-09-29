<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\InitialStateProvider;
use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS Internet Explorer 数据端点
 *
 * GET /ie - 获取 IE 数据
 * PUT /ie - 更新 IE 数据（提交哪些字段就更新哪些）
 * DELETE /ie - 清空历史记录（上限 60 条）
 */
class IeController extends BaseController
{
    /**
     * 获取 IE 数据
     */
    public function show()
    {
        $state = $this->getState();

        return XpResponse::success($this->iePayload(is_array($state['ie'] ?? null) ? $state['ie'] : []));
    }

    /**
     * 更新 IE 数据
     */
    public function update(Request $request)
    {
        $body = $this->jsonBody($request);
        if (empty($body)) {
            return XpResponse::badRequest('请求体为空');
        }

        $state = $this->getState();

        if (!isset($state['ie']) || !is_array($state['ie'])) {
            $state['ie'] = [
                'home' => InitialStateProvider::configuredIeHomepage(),
                'favorites' => [],
                'history' => [],
            ];
        }

        foreach (['home', 'favorites', 'history'] as $field) {
            if (array_key_exists($field, $body)) {
                $state['ie'][$field] = $body[$field];
            }
        }

        $this->saveState($state);

        return XpResponse::success($this->iePayload($state['ie']));
    }

    /**
     * 组装对外输出的 IE 数据结构
     *
     * defaultHome 为后台 xp_ie_homepage 配置的出厂默认主页，
     * 供前端「Internet 选项 → 使用默认页」按钮取值；
     * 其余字段按空值兜底，避免老快照结构不全导致前端解构异常。
     *
     * @param array $ie 快照中的 ie 节点
     * @return array 输出结构
     */
    private function iePayload(array $ie): array
    {
        $defaultHome = InitialStateProvider::configuredIeHomepage();

        return [
            'home' => $ie['home'] ?? $defaultHome,
            'favorites' => $ie['favorites'] ?? [],
            'history' => $ie['history'] ?? [],
            'defaultHome' => $defaultHome,
        ];
    }

    /**
     * 清空历史记录（上限 60 条）
     */
    public function clearHistory()
    {
        $state = $this->getState();

        if (!isset($state['ie']['history'])) {
            $state['ie']['history'] = [];
        }

        $state['ie']['history'] = [];
        $this->saveState($state);

        return XpResponse::success(['cleared' => true]);
    }
}
