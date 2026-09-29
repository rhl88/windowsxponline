<?php

namespace App\Apps\CmsproWindowsxponline\Exceptions;

use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * XP 桌面状态持久化异常
 *
 * 状态快照写入失败时抛出，替代原先「返回 false 但调用方全部忽略」的静默失败，
 * 避免前端收到 ok:true 却实际丢失数据。
 *
 * 本类自带 render() 方法，由 Laravel 默认异常处理器直接渲染为 XP 前端响应信封，
 * 无需注册异常处理器，也不改动框架代码。
 */
class StateException extends RuntimeException
{
    /**
     * @param string $message 面向用户的中文错误信息
     * @param string $reason 机器可读的失败原因标识，便于日志聚合与前端埋点
     */
    public function __construct(string $message, private readonly string $reason = 'write_failed')
    {
        parent::__construct($message);
    }

    /**
     * 获取失败原因标识
     *
     * 取值：not_logged_in | serialize_failed | state_too_large | space_missing | space_disabled | quota_exceeded | write_failed
     */
    public function getReason(): string
    {
        return $this->reason;
    }

    /**
     * 渲染为 XP 前端响应信封
     *
     * not_logged_in（anonymous 模式未登录 XP 帐户）返回 401，
     * 前端据此回到欢迎屏；其余服务端失败维持 500。
     */
    public function render(Request $request): JsonResponse
    {
        if ($this->reason === 'not_logged_in') {
            return XpResponse::error(401, $this->getMessage(), 401);
        }

        return XpResponse::serverError($this->getMessage());
    }
}
