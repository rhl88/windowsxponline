<?php

namespace App\Apps\CmsproWindowsxponline\Middleware;

use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * XP 在线版后台权限校验中间件
 *
 * 框架 CheckPermission 按 URI 模板推导权限码，规则为 admin.{首段}.{余下命名段}，
 * 对本应用推导结果是 admin.cmspro.windowsxponline.settings 之类，
 * 与 manifest.json 声明并已写入 admin_permissions 表的 cmspro.windowsxponline.settings 不一致。
 * 推导码在库中查不到时框架中间件直接放行，导致后台敏感接口
 * （云存储密钥、访问入口路径、用户空间配额、重置出厂）实际只受 auth:admin 保护。
 *
 * 本中间件在应用侧按 manifest 声明的权限码做显式校验，超级管理员自动放行，
 * 与框架 CheckPermission 的响应格式（40101 + HTTP 403）保持一致。
 *
 * 用法（$action 取 manifest permissions 中 code 的最后一段）：
 *   ->middleware(EnsureXpAdminPermission::class . ':settings')
 */
class EnsureXpAdminPermission
{
    /**
     * 权限码前缀，与 manifest.json permissions 声明保持一致
     */
    private const CODE_PREFIX = 'cmspro.windowsxponline.';

    /**
     * 无权限时返回的错误码，对齐框架 CheckPermission
     */
    private const ERROR_CODE = 40101;

    /**
     * 处理请求
     *
     * @param Request $request 当前请求
     * @param Closure $next 下一中间件
     * @param string $action 权限动作段：access|settings|spaces
     */
    public function handle(Request $request, Closure $next, string $action = 'access')
    {
        $admin = Auth::guard('admin')->user();

        if ($admin !== null && $admin->hasPermission(self::CODE_PREFIX . $action)) {
            return $next($request);
        }

        if (self::wantsJsonResponse($request)) {
            return response()->json(ApiResponse::error(self::ERROR_CODE, '无访问权限'), 403);
        }

        abort(403, '无访问权限');
    }

    /**
     * 判断是否应返回 JSON 错误响应
     *
     * API 路由（api/ 前缀）与显式声明 Accept: application/json 的请求返回 JSON，
     * 后台页面路由返回框架标准 403 页面
     */
    private static function wantsJsonResponse(Request $request): bool
    {
        return $request->is('api/*') || $request->expectsJson();
    }
}
