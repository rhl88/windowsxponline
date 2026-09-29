<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Admin;

use Illuminate\Routing\Controller;

/**
 * 后台空间管理页面控制器
 */
class SpaceController extends Controller
{
    /**
     * 空间管理页面
     */
    public function index()
    {
        return view('cmspro.windowsxponline::admin.spaces');
    }
}
