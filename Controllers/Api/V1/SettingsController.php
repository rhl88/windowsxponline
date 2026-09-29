<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 系统设置端点
 *
 * GET /settings - 获取完整设置
 * PATCH /settings - 部分合并更新设置
 */
class SettingsController extends BaseController
{
    /**
     * 获取设置
     */
    public function show()
    {
        $state = $this->getState();

        return XpResponse::success($state['settings']);
    }

    /**
     * 更新设置（部分合并，仅接受已知字段）
     */
    public function update(Request $request)
    {
        $body = $this->jsonBody($request);
        if (empty($body)) {
            return XpResponse::badRequest('请求体为空');
        }

        $state = $this->getState();
        $applied = [];

        foreach ($body as $key => $value) {
            if (array_key_exists($key, $state['settings'])) {
                $state['settings'][$key] = $value;
                $applied[] = $key;
            }
        }

        $this->saveState($state);

        return XpResponse::success(['applied' => $applied]);
    }
}
