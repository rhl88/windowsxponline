<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Admin;

use App\Apps\CmsproWindowsxponline\Models\DesktopIcon;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use Illuminate\Routing\Controller;

/**
 * 后台桌面入口控制器
 *
 * 单机版模式：直接展示 XP 桌面
 * 在线版模式：显示管理概览
 */
class DashboardController extends Controller
{
    /**
     * 桌面入口
     */
    public function index()
    {
        $accessMode = StorageManager::getConfig('access_mode', 'standalone');
        $storageDriver = StorageManager::getDriverName();

        // 前端静态资源与 API 始终使用相对路径：
        // - 浏览器按当前访问域名自动解析，默认/自定义路径/绑定域名三种方式均同源可用
        // - 同源保证 iframe 与父页面共享 localStorage，前端可正常读取 apiBase
        $staticUrl = '/apps/cmspro.windowsxponline/index.html';
        $apiBase = '/api/admin/cmspro/windowsxponline/v1';

        return view('cmspro.windowsxponline::admin.dashboard', [
            'accessMode' => $accessMode,
            'storageDriver' => $storageDriver,
            'staticUrl' => $staticUrl,
            'apiBase' => $apiBase,
            'desktopIcons' => DesktopIcon::getDesktopItems(),
        ]);
    }
}
