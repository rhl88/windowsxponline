<?php

/**
 * 在线版 XP API 路由
 * 前缀：api/user/cmspro/windowsxponline/v1
 * 中间件：web, auth:web, front_user_status
 *
 * 使用当前登录用户身份运行 XP 桌面
 */

// 共享路由定义
require __DIR__ . '/xp_routes.php';
