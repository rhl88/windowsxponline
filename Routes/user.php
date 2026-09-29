<?php

/**
 * 用户端页面路由
 * 前缀：user/cmspro/windowsxponline
 * 中间件：web, auth:web, front_user_status
 */

use App\Apps\CmsproWindowsxponline\Controllers\User\DesktopController;
use Illuminate\Support\Facades\Route;

// 在线版 XP 桌面入口
Route::get('/', [DesktopController::class, 'index'])
    ->name('user.cmspro.windowsxponline');
