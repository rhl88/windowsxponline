<?php

namespace App\Apps\CmsproWindowsxponline\Services;

/**
 * 免登录版（anonymous）XP 帐户注册表
 *
 * access_mode=anonymous 时，XP 帐户脱离 CMSPRO 用户体系，
 * 以全局注册表文件 anon/accounts.json 存储、所有访客共享；
 * 首次访问自动种子内置 Administrator/Guest（与桌面初始状态同源）。
 *
 * 密码为 SHA-256 加盐哈希，仅存服务端；API 响应由控制器层剥离并派生 hasPassword。
 */
class XpAccountStore
{
    /**
     * 注册表存储键
     */
    private const STORAGE_KEY = 'anon/accounts.json';

    /**
     * 读取全部帐户（首次访问自动种子并落盘）
     *
     * @return array<int, array<string, mixed>> 含 password 哈希的原始帐户列表
     */
    public static function all(): array
    {
        $raw = StorageManager::getDriver()->read(self::STORAGE_KEY);
        if ($raw !== null) {
            $accounts = json_decode($raw, true);
            if (is_array($accounts)) {
                return $accounts;
            }
        }

        // 注册表缺失或损坏：按出厂种子重建（Administrator/Guest）
        $accounts = InitialStateProvider::createAccounts();
        self::persist($accounts);

        return $accounts;
    }

    /**
     * 按名称查找帐户
     *
     * @return array<string, mixed>|null
     */
    public static function find(string $name): ?array
    {
        foreach (self::all() as $account) {
            if (($account['name'] ?? '') === $name) {
                return $account;
            }
        }

        return null;
    }

    /**
     * 帐户是否已存在
     */
    public static function exists(string $name): bool
    {
        return self::find($name) !== null;
    }

    /**
     * 新增帐户（同名冲突由调用方先行校验）
     *
     * @param array<string, mixed> $account 完整帐户数据（含 password 哈希）
     */
    public static function add(array $account): void
    {
        $accounts = self::all();
        $accounts[] = $account;
        self::persist($accounts);
    }

    /**
     * 更新帐户字段（可选改名）
     *
     * @param string $name 目标帐户名
     * @param array<string, mixed> $changes 需合并的字段（password/hint/avatar 等）
     * @param string|null $newName 改名后的名称，null 表示不改名
     * @return array<string, mixed>|null 更新后的帐户（含哈希），帐户不存在返回 null
     */
    public static function patch(string $name, array $changes, ?string $newName = null): ?array
    {
        $accounts = self::all();

        foreach ($accounts as $i => $account) {
            if (($account['name'] ?? '') !== $name) {
                continue;
            }
            if ($newName !== null) {
                $account['name'] = $newName;
            }
            $accounts[$i] = array_merge($account, $changes);
            self::persist($accounts);

            return $accounts[$i];
        }

        return null;
    }

    /**
     * 删除帐户
     *
     * @return bool 是否实际删除（帐户不存在返回 false）
     */
    public static function remove(string $name): bool
    {
        $accounts = self::all();

        foreach ($accounts as $i => $account) {
            if (($account['name'] ?? '') !== $name) {
                continue;
            }
            array_splice($accounts, $i, 1);
            self::persist($accounts);

            return true;
        }

        return false;
    }

    /**
     * 落盘注册表
     *
     * @param array<int, array<string, mixed>> $accounts
     * @throws StateException 序列化或写入失败
     */
    private static function persist(array $accounts): void
    {
        $json = json_encode($accounts, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new StateException('帐户数据序列化失败，请刷新后重试', 'serialize_failed');
        }

        if (!StorageManager::getDriver()->write(self::STORAGE_KEY, $json)) {
            throw new StateException('帐户数据保存失败，请稍后重试', 'write_failed');
        }
    }
}
