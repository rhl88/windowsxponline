<?php

/**
 * 后台 API 路由
 * 前缀：api/admin/cmspro/windowsxponline
 * 中间件：web, auth:admin, permission（组级） + EnsureXpAdminPermission（逐条指定权限码）
 */

use App\Apps\CmsproWindowsxponline\Controllers\Admin\Api\DesktopIconApiController;
use App\Apps\CmsproWindowsxponline\Controllers\Admin\Api\SettingApiController;
use App\Apps\CmsproWindowsxponline\Controllers\Admin\Api\SpaceApiController;
use App\Apps\CmsproWindowsxponline\Middleware\EnsureXpAdminPermission;
use Illuminate\Support\Facades\Route;

// 应用设置管理
Route::get('/settings', [SettingApiController::class, 'getSettings'])
    ->middleware(EnsureXpAdminPermission::class . ':settings');
Route::put('/settings', [SettingApiController::class, 'update'])
    ->middleware(EnsureXpAdminPermission::class . ':settings');

// 用户空间管理（{id} 限定为正整数，非法 ID 直接 404）
Route::get('/spaces', [SpaceApiController::class, 'list'])
    ->middleware(EnsureXpAdminPermission::class . ':spaces');
Route::get('/spaces/{id}', [SpaceApiController::class, 'detail'])
    ->whereNumber('id')
    ->middleware(EnsureXpAdminPermission::class . ':spaces');
Route::put('/spaces/{id}', [SpaceApiController::class, 'update'])
    ->whereNumber('id')
    ->middleware(EnsureXpAdminPermission::class . ':spaces');
Route::post('/spaces', [SpaceApiController::class, 'create'])
    ->middleware(EnsureXpAdminPermission::class . ':spaces');

// 桌面图标管理（{id} 限定为正整数，非法 ID 直接 404）
Route::get('/deskicons', [DesktopIconApiController::class, 'list'])
    ->middleware(EnsureXpAdminPermission::class . ':deskicons');
Route::post('/deskicons', [DesktopIconApiController::class, 'create'])
    ->middleware(EnsureXpAdminPermission::class . ':deskicons');
Route::post('/deskicons/icon', [DesktopIconApiController::class, 'uploadIcon'])
    ->middleware(EnsureXpAdminPermission::class . ':deskicons');
Route::put('/deskicons/{id}', [DesktopIconApiController::class, 'update'])
    ->whereNumber('id')
    ->middleware(EnsureXpAdminPermission::class . ':deskicons');
Route::delete('/deskicons/{id}', [DesktopIconApiController::class, 'delete'])
    ->whereNumber('id')
    ->middleware(EnsureXpAdminPermission::class . ':deskicons');
