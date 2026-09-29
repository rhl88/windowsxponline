<?php

namespace App\Apps\CmsproWindowsxponline\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * XP 桌面前台用户认证中间件（动态访问入口专用）
 *
 * 框架全局未认证跳转按路径前缀判定（user/boxcode 开头 → /user/login，否则 /admin/login），
 * 自定义路径 / 绑定域名入口无法命中前缀，未登录会被断头跳到后台登录页，
 * 故在应用内自行校验 web guard 登录态并跳转前台登录页（参考 CmsproDemo 同类中间件）。
 *
 * 仅用于页面路由（registerAccessRoutes 动态入口）；API 路由仍使用 auth:web，
 * 保证未登录返回 401 JSON。
 */
class EnsureXpUserAuthenticated
{
    /**
     * 处理请求
     */
    public function handle(Request $request, Closure $next)
    {
        if (Auth::guard('web')->check()) {
            return $next($request);
        }

        return redirect()->guest('/user/login');
    }
}
