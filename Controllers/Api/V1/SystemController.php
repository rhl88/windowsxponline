<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 系统端点
 *
 * GET /system - 连接测试/关于信息
 * POST /system - 重置出厂状态
 */
class SystemController extends BaseController
{
    /**
     * 连接测试/关于
     */
    public function show()
    {
        $state = $this->getState();

        return XpResponse::success([
            'product' => 'Windows XP WebOS',
            'edition' => 'Professional',
            'version' => '2002',
            'servicePack' => 'SP3',
            'apiVersion' => 'v1',
            'mockServer' => false,
            'computer' => $state['session']['computer'] ?? 'XP-STATION',
            'user' => $state['session']['user'] ?? 'Administrator',
            'time' => now()->toIso8601String(),
        ]);
    }

    /**
     * 重置出厂
     */
    public function reset(Request $request)
    {
        $body = $this->jsonBody($request);
        $action = $body['action'] ?? '';

        if ($action !== 'reset') {
            return XpResponse::badRequest('仅支持 action=reset');
        }

        // 身份分发：在线版/单机版按 CMSPRO 用户重置，免登录版按当前 XP 帐户重置；
        // 未登录抛 not_logged_in 渲染为 401
        $state = StateService::resetCurrentState();

        return XpResponse::success([
            'reset' => true,
            'version' => $state['version'],
        ]);
    }
}
