<?php

/**
 * XP WebOS API 路由定义（共享）
 *
 * 此文件被 xp_admin_api.php（单机版）和 xp_user_api.php（在线版）共同 require
 * 两者区别仅在 ServiceProvider 中注册时的 prefix 和 middleware 不同：
 *   - 单机版：api/admin/cmspro/windowsxponline/v1，中间件 auth:admin
 *   - 在线版：api/user/cmspro/windowsxponline/v1，中间件 auth:web + front_user_status
 *
 * 控制器通过 Auth 门面判断当前用户类型，自动适配身份
 *
 * 响应信封格式：{ "ok": true, "data": ... } / { "ok": false, "error": { code, message } }
 * 路径寻址：文件/文件夹使用路径段数组 string[]
 */

use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\AccountController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\ArchiveController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\DesktopController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\FileController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\FsController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\IeController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\PrintJobController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\PrinterController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\RecycleController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\SchedTaskController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\SessionController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\SettingsController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\StateController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\SystemController;
use Illuminate\Support\Facades\Route;

// ─── 系统 ───
Route::get('/system', [SystemController::class, 'show']);          // 连接测试/关于
Route::post('/system', [SystemController::class, 'reset']);         // 重置出厂

// ─── 会话 ───
Route::get('/session', [SessionController::class, 'show']);        // 会话信息
Route::post('/session', [SessionController::class, 'action']);     // 登录/解锁/锁定/注销/关机/重启

// ─── 用户帐户 ───
Route::get('/accounts', [AccountController::class, 'list']);       // 帐户列表
Route::post('/accounts/login', [AccountController::class, 'login']);  // 登录验证
Route::post('/accounts', [AccountController::class, 'create']);    // 创建帐户
Route::patch('/accounts', [AccountController::class, 'update']);   // 更改密码/提示/头像/名称
Route::delete('/accounts', [AccountController::class, 'delete']);  // 删除帐户

// ─── 文件系统（核心 CRUD）───
Route::get('/fs', [FsController::class, 'read']);                   // 全树根节点或按路径取节点
Route::post('/fs', [FsController::class, 'create']);                // 新建文件/文件夹
Route::post('/fs/write', [FsController::class, 'write']);           // 写文件内容
Route::patch('/fs', [FsController::class, 'patch']);                // 重命名/属性补丁
Route::delete('/fs', [FsController::class, 'delete']);             // 删除（默认进回收站）
Route::post('/fs/move', [FsController::class, 'move']);             // 移动
Route::post('/fs/copy', [FsController::class, 'copy']);             // 复制

// ─── 大文件（blob）分片上传与下载 ───
// 内容存于独立对象存储、快照只留 blobId 引用，不受 10 MB 快照上限约束
Route::post('/fs/upload/init', [FileController::class, 'initUpload']);        // 建立/复用上传会话
Route::post('/fs/upload/chunk', [FileController::class, 'saveChunk']);        // 逐片上传（裸二进制体）
Route::post('/fs/upload/complete', [FileController::class, 'completeUpload']); // 合并落地并挂载到文件树
Route::post('/fs/upload/abort', [FileController::class, 'abortUpload']);       // 取消并清理分片
Route::get('/fs/blob/{blobId}', [FileController::class, 'download'])           // 下载文件内容
    ->where('blobId', '[A-Za-z0-9]{1,64}');

// ─── 压缩包（WinRAR 复刻，实际格式为 ZIP）───
Route::get('/fs/archive/entries', [ArchiveController::class, 'entries']);      // 列出压缩包内条目
Route::post('/fs/archive', [ArchiveController::class, 'create']);              // 压缩选中的文件/文件夹
Route::post('/fs/extract', [ArchiveController::class, 'extract']);             // 解压到目标目录

// ─── 回收站 ───
Route::get('/recycle', [RecycleController::class, 'list']);         // 列表
Route::post('/recycle', [RecycleController::class, 'restore']);    // 还原
Route::delete('/recycle', [RecycleController::class, 'delete']);   // 彻底删除

// ─── 系统设置 ───
Route::get('/settings', [SettingsController::class, 'show']);      // 获取设置
Route::patch('/settings', [SettingsController::class, 'update']);  // 更新设置

// ─── 列表类资源 ───
Route::get('/recent-docs', [StateController::class, 'recentDocs']);
Route::put('/recent-docs', [StateController::class, 'putRecentDocs']);
Route::post('/recent-docs', [StateController::class, 'addRecentDoc']);
Route::delete('/recent-docs', [StateController::class, 'clearRecentDocs']);

Route::get('/run-history', [StateController::class, 'runHistory']);
Route::put('/run-history', [StateController::class, 'putRunHistory']);
Route::post('/run-history', [StateController::class, 'addRunHistory']);
Route::delete('/run-history', [StateController::class, 'clearRunHistory']);

Route::get('/printers', [PrinterController::class, 'list']);
Route::put('/printers', [PrinterController::class, 'replace']);
Route::post('/printers', [PrinterController::class, 'create']);
Route::delete('/printers', [PrinterController::class, 'delete']);

Route::get('/sched-tasks', [SchedTaskController::class, 'list']);
Route::put('/sched-tasks', [SchedTaskController::class, 'replace']);
Route::post('/sched-tasks', [SchedTaskController::class, 'create']);
Route::delete('/sched-tasks', [SchedTaskController::class, 'delete']);

Route::get('/net-drives', [StateController::class, 'netDrives']);
Route::put('/net-drives', [StateController::class, 'putNetDrives']);
Route::post('/net-drives', [StateController::class, 'addNetDrive']);
Route::delete('/net-drives', [StateController::class, 'deleteNetDrive']);

Route::get('/audio', [StateController::class, 'audio']);
Route::put('/audio', [StateController::class, 'putAudio']);
Route::delete('/audio', [StateController::class, 'deleteAudio']);

// ─── 打印队列 ───
Route::get('/print-jobs', [PrintJobController::class, 'list']);
Route::put('/print-jobs', [PrintJobController::class, 'replace']);
Route::post('/print-jobs', [PrintJobController::class, 'create']);
Route::patch('/print-jobs', [PrintJobController::class, 'patch']);
Route::delete('/print-jobs', [PrintJobController::class, 'delete']);

// ─── 桌面布局 ───
Route::get('/desktop', [DesktopController::class, 'show']);
Route::put('/desktop', [DesktopController::class, 'update']);

// ─── Internet Explorer 数据 ───
Route::get('/ie', [IeController::class, 'show']);
Route::put('/ie', [IeController::class, 'update']);
Route::delete('/ie', [IeController::class, 'clearHistory']);

// ─── 全量快照 ───
Route::get('/state', [StateController::class, 'snapshot']);         // 启动 hydrate
