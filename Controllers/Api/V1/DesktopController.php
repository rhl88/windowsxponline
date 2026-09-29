<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 桌面布局端点
 *
 * GET /desktop - 获取桌面图标位置
 * PUT /desktop - 更新桌面图标位置
 */
class DesktopController extends BaseController
{
    /**
     * 获取桌面布局
     */
    public function show()
    {
        $state = $this->getState();

        return XpResponse::success([
            'positions' => $state['desktopPos'] ?? new \stdClass(),
        ]);
    }

    /**
     * 更新桌面布局
     */
    public function update(Request $request)
    {
        $body = $this->jsonBody($request);
        $positions = $body['positions'] ?? null;

        if (!is_array($positions)) {
            return XpResponse::badRequest('缺少 positions 字段');
        }

        $state = $this->getState();
        $state['desktopPos'] = $positions;
        $this->saveState($state);

        return XpResponse::success(['positions' => $positions]);
    }
}
