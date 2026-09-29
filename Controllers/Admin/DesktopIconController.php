<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Admin;

use Illuminate\Routing\Controller;

/**
 * 后台桌面图标管理页面控制器
 */
class DesktopIconController extends Controller
{
    /**
     * 桌面图标管理页面
     */
    public function index()
    {
        return view('cmspro.windowsxponline::admin.deskicons');
    }
}