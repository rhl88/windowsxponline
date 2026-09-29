<?php

namespace App\Apps\CmsproWindowsxponline\Services;

/**
 * XP WebOS 响应辅助工具
 *
 * XP WebOS 前端使用的响应信封格式与 CMSPRO 不同：
 * 成功：{ "ok": true, "data": {...} }
 * 失败：{ "ok": false, "error": { "code": 404, "message": "..." } }
 */
class XpResponse
{
    /**
     * 成功响应
     *
     * @param mixed $data 业务数据
     * @param int $status HTTP 状态码
     */
    public static function success($data = null, int $status = 200)
    {
        return response()->json([
            'ok' => true,
            'data' => $data,
        ], $status);
    }

    /**
     * 失败响应
     *
     * @param int $code 错误码（与 HTTP 状态码同值）
     * @param string $message 错误信息
     * @param int $status HTTP 状态码
     */
    public static function error(int $code, string $message, int $status = 200)
    {
        return response()->json([
            'ok' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
            ],
        ], $status);
    }

    /**
     * 404 错误
     */
    public static function notFound(string $message = '资源不存在')
    {
        return self::error(404, $message, 404);
    }

    /**
     * 400 错误（参数错误）
     */
    public static function badRequest(string $message = '请求参数错误')
    {
        return self::error(400, $message, 400);
    }

    /**
     * 409 错误（冲突）
     */
    public static function conflict(string $message = '操作冲突')
    {
        return self::error(409, $message, 409);
    }

    /**
     * 500 错误（服务端异常）
     */
    public static function serverError(string $message = '服务端异常')
    {
        return self::error(500, $message, 500);
    }
}
