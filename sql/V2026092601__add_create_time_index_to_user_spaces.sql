-- ============================================================================
-- 数据库变更脚本
-- ============================================================================
-- 版本号: V2026092601
-- 变更描述: 用户空间表新增 create_time 索引（后台列表按创建时间倒序分页）
-- 影响表: app_cmspro_windowsxponline_user_spaces
-- 变更类型: DDL（索引变更）
-- 作者: CmsPro
-- 创建日期: 2026-09-26
-- 关联验收项: M-07（索引与模糊查询优化）
-- 预计执行时间: < 1 秒（小表）
-- 风险等级: 低
-- 说明: 常规升级由 Laravel 迁移
--       2026_09_26_000002_add_create_time_index_to_app_cmspro_windowsxponline_user_spaces_table.php
--       自动执行；本脚本供手工部署 / 数据库审计使用（MySQL 语法）。
-- ============================================================================

-- ---------- 前置检查 ----------
-- 确认索引不存在，避免重复执行报错（返回 0 行表示可安全创建）
SELECT INDEX_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'app_cmspro_windowsxponline_user_spaces'
  AND INDEX_NAME = 'idx_create_time';

-- ---------- 正向变更 ----------
-- MySQL 的 CREATE INDEX 不支持 IF NOT EXISTS，
-- 若前置检查已有结果请跳过本语句（迁移文件版本已做幂等处理）
CREATE INDEX `idx_create_time`
    ON `app_cmspro_windowsxponline_user_spaces` (`create_time`);

-- ---------- 数据验证 ----------
SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'app_cmspro_windowsxponline_user_spaces'
  AND INDEX_NAME = 'idx_create_time';

-- ---------- 回滚方案 ----------
-- 如需回滚，执行以下 SQL:
-- DROP INDEX `idx_create_time` ON `app_cmspro_windowsxponline_user_spaces`;
