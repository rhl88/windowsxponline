<?php

/**
 * 后台页面路由
 * 前缀：admin/cmspro/windowsxponline
 * 中间件：web, auth:admin, permission（组级） + EnsureXpAdminPermission（逐条指定权限码）
 */

use App\Apps\CmsproWindowsxponline\Controllers\Admin\DashboardController;
use App\Apps\CmsproWindowsxponline\Controllers\Admin\DesktopIconController;
use App\Apps\CmsproWindowsxponline\Controllers\Admin\SettingController;
use App\Apps\CmsproWindowsxponline\Controllers\Admin\SpaceController;
use App\Apps\CmsproWindowsxponline\Middleware\EnsureXpAdminPermission;
use Illuminate\Support\Facades\Route;

// XP 桌面入口（单机版模式直接打开桌面）
Route::get('/', [DashboardController::class, 'index'])
    ->middleware(EnsureXpAdminPermission::class . ':access')
    ->name('admin.cmspro.windowsxponline');

// 应用设置
Route::get('/settings', [SettingController::class, 'index'])
    ->middleware(EnsureXpAdminPermission::class . ':settings')
    ->name('admin.cmspro.windowsxponline.settings');

// 用户空间管理
Route::get('/spaces', [SpaceController::class, 'index'])
    ->middleware(EnsureXpAdminPermission::class . ':spaces')
    ->name('admin.cmspro.windowsxponline.spaces');

// 桌面图标管理
Route::get('/deskicons', [DesktopIconController::class, 'index'])
    ->middleware(EnsureXpAdminPermission::class . ':deskicons')
    ->name('admin.cmspro.windowsxponline.deskicons');
