<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\User;

use App\Apps\CmsproWindowsxponline\Models\DesktopIcon;
use Illuminate\Routing\Controller;

/**
 * 用户端桌面入口控制器
 *
 * 在线版模式：所有注册 user 登录后进入 XP 桌面
 */
class DesktopController extends Controller
{
    /**
     * 在线版 XP 桌面入口
     */
    public function index()
    {
        // 前端静态资源与 API 始终使用相对路径：
        // - 浏览器按当前访问域名自动解析，默认/自定义路径/绑定域名三种方式均同源可用
        // - 同源保证 iframe 与父页面共享 localStorage，前端可正常读取 apiBase
        $staticUrl = '/apps/cmspro.windowsxponline/index.html';
        $apiBase = '/api/user/cmspro/windowsxponline/v1';

        return view('cmspro.windowsxponline::user.desktop', [
            'staticUrl' => $staticUrl,
            'apiBase' => $apiBase,
            'desktopIcons' => DesktopIcon::getDesktopItems(),
        ]);
    }
}
