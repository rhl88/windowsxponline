<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Admin;

use Illuminate\Routing\Controller;

/**
 * 后台设置页面控制器
 */
class SettingController extends Controller
{
    /**
     * 设置页面
     */
    public function index()
    {
        return view('cmspro.windowsxponline::admin.settings');
    }
}
