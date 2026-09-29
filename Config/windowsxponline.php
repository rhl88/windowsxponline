<?php

/**
 * Windows XP 在线版应用配置
 *
 * 此配置提供代码层默认值，运行时实际值由数据库 config_items 表管理
 * 配置项 code 规则：app_cmspro_windowsxponline_{name}
 */

return [
    // 基础设置
    'access_mode' => 'online', // online=在线版（多用户）, standalone=单机版（仅超管）
    'access_path' => '', // XP 桌面前端访问路径，留空使用默认 /apps/cmspro.windowsxponline/index.html
    'bind_domain' => '', // 绑定域名，留空使用相对路径

    // 存储设置
    'storage_driver' => 'local', // local=本地, oss=阿里云OSS, cos=腾讯云COS
    'default_space_quota' => 100, // 默认空间配额（MB）

    // 阿里云 OSS 配置
    'oss_access_key' => '',
    'oss_access_secret' => '',
    'oss_bucket' => '',
    'oss_endpoint' => '',

    // 腾讯云 COS 配置
    'cos_secret_id' => '',
    'cos_secret_key' => '',
    'cos_bucket' => '',
    'cos_region' => '',
];
