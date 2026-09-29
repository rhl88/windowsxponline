<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 会话端点
 *
 * GET /session - 会话信息与事件流水
 * POST /session - 登录/解锁/锁定/注销/关机/重启事件上报
 */
class SessionController extends BaseController
{
    /**
     * 事件流水保留上限（A-02）
     *
     * events 随登录/注销等动作无限追加会持续膨胀 state 快照体积，
     * 超出后仅保留最近 N 条（前端事件流水仅展示用途，历史可丢弃）。
     */
    private const MAX_EVENTS = 200;

    /**
     * 会话信息
     */
    public function show()
    {
        $state = $this->getState();

        return XpResponse::success($state['session']);
    }

    /**
     * 会话事件上报
     */
    public function action(Request $request)
    {
        $body = $this->jsonBody($request);
        $action = $body['action'] ?? '';
        $user = $body['user'] ?? '';

        $validActions = ['login', 'logoff', 'lock', 'unlock', 'shutdown', 'restart'];
        if (!in_array($action, $validActions, true)) {
            return XpResponse::badRequest('无效的会话动作: ' . $action);
        }

        $state = $this->getState();
        $now = now()->timestamp * 1000;

        if ($user === '') {
            $user = $state['session']['user'] ?? 'Administrator';
        }

        $event = [
            'action' => $action,
            'at' => $now,
            'user' => $user,
        ];

        $events = $state['session']['events'] ?? [];
        $events[] = $event;
        if (count($events) > self::MAX_EVENTS) {
            $events = array_slice($events, -self::MAX_EVENTS);
        }
        $state['session']['events'] = $events;

        if (in_array($action, ['login', 'unlock'], true)) {
            $state['session']['user'] = $user;
        }

        $this->saveState($state);

        // anonymous 模式：注销/关机清除 XP 帐户会话身份，下次访问需重新登录；
        // 重启保留会话（对应真实 XP 重启后回到原用户）
        if (StateService::isAnonymousMode() && in_array($action, ['logoff', 'shutdown'], true)) {
            session()->forget('xp_account');
        }

        return XpResponse::success([
            'action' => $action,
            'at' => $now,
            'user' => $user,
        ]);
    }
}
