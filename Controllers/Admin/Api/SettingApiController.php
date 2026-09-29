<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Admin\Api;

use App\Apps\CmsproWindowsxponline\Services\InitialStateProvider;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use App\Http\Responses\ApiResponse;
use App\Models\ConfigItem;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Crypt;

/**
 * 后台设置 API 控制器
 *
 * 管理应用配置项：访问模式、存储驱动、云存储凭证等
 */
class SettingApiController extends Controller
{
    /**
     * 配置项白名单
     */
    private const ALLOWED_KEYS = [
        'access_mode',
        'access_path',
        'bind_domain',
        'storage_driver',
        'default_space_quota',
        'oss_access_key',
        'oss_access_secret',
        'oss_bucket',
        'oss_endpoint',
        'cos_secret_id',
        'cos_secret_key',
        'cos_bucket',
        'cos_region',
        'xp_admin_password',
        'xp_quicklaunch_defaults',
        'xp_ie_homepage',
        'xp_guest_enabled',
    ];

    /**
     * 配置项 code 前缀
     */
    private const CODE_PREFIX = 'app_cmspro_windowsxponline_';

    /**
     * 需要加密存储的敏感字段
     */
    private const ENCRYPTED_KEYS = [
        'oss_access_secret',
        'cos_secret_key',
        'xp_admin_password',
    ];

    /**
     * 后台读取时脱敏为 ****** 的字段
     *
     * xp_admin_password 需明文回显（管理员自行查看密码），不在此列；
     * 其数据库存储仍走 ENCRYPTED_KEYS 加密口径。
     */
    private const MASKED_KEYS = [
        'oss_access_secret',
        'cos_secret_key',
    ];

    /**
     * 访问模式允许值（与 manifest.json access_mode.options 一致）
     */
    private const ACCESS_MODES = ['online', 'standalone', 'anonymous'];

    /**
     * 存储驱动允许值（与 manifest.json storage_driver.options 一致）
     */
    private const STORAGE_DRIVERS = ['local', 'oss', 'cos'];

    /**
     * 默认空间配额下限（MB）
     */
    private const QUOTA_MIN = 1;

    /**
     * 默认空间配额上限（MB），即 1TB
     */
    private const QUOTA_MAX = 1048576;

    /**
     * 获取所有设置
     */
    public function getSettings()
    {
        $settings = [];
        foreach (self::ALLOWED_KEYS as $key) {
            $settings[$key] = StorageManager::getConfig($key, '');
            if (in_array($key, self::MASKED_KEYS, true) && $settings[$key] !== '') {
                $settings[$key] = '******';
            }
        }

        return response()->json(ApiResponse::success($settings));
    }

    /**
     * 更新设置
     */
    public function update(Request $request)
    {
        $body = $request->json()->all();

        // 绑定域名归一化为纯域名（容错剥离误带的协议前缀与尾部斜杠）
        if (array_key_exists('bind_domain', $body)) {
            $body['bind_domain'] = $this->normalizeBindDomain($body['bind_domain']);
        }

        // 验证访问入口格式、枚举取值与数值范围
        $errors = $this->validateConfig($body);
        if (!empty($errors)) {
            return response()->json(ApiResponse::error(40001, implode('；', $errors)));
        }

        $updated = [];
        $meta = null;

        foreach (self::ALLOWED_KEYS as $key) {
            if (!array_key_exists($key, $body)) {
                continue;
            }

            $value = $body[$key];
            // 脱敏字段跳过占位符（未修改）
            if (in_array($key, self::MASKED_KEYS, true) && $value === '******') {
                continue;
            }

            // 敏感字段加密后存储
            if (in_array($key, self::ENCRYPTED_KEYS, true)) {
                $value = Crypt::encryptString($value);
            }

            $existing = ConfigItem::where('code', self::CODE_PREFIX . $key)->first();

            if ($existing !== null) {
                // 仅更新值：group_id/name/type/tips/sort 等结构字段由框架
                // AppInstallerService::registerConfigGroups() 依 manifest 统一维护，
                // 此处覆盖会破坏后台配置界面的分组与中文标题
                $existing->update(['value' => $value]);
            } else {
                // 配置项尚未播种（应用未走完整安装流程）→ 用 manifest 元信息补建
                $meta ??= $this->getConfigMeta();
                $itemMeta = $meta[$key] ?? ['group_id' => 0, 'title' => $key, 'type' => 'text', 'tips' => ''];

                ConfigItem::create([
                    'code' => self::CODE_PREFIX . $key,
                    'group_id' => $itemMeta['group_id'],
                    'name' => $itemMeta['title'],
                    'value' => $value,
                    'type' => $itemMeta['type'],
                    'tips' => $itemMeta['tips'],
                ]);
            }

            $updated[] = $key;
        }

        StorageManager::resetConfigCache();

        // 访问路径/绑定域名/访问模式变更后，动态访问入口路由需重新注册，清除路由与配置缓存
        if (!empty(array_intersect($updated, ['access_path', 'bind_domain', 'access_mode']))) {
            Artisan::call('route:clear');
            Artisan::call('config:clear');
        }

        return response()->json(ApiResponse::success(
            ['updated' => $updated],
            '设置已更新'
        ));
    }

    /**
     * 从 manifest.json 读取配置项元信息（含 group_id）
     *
     * 用于配置项尚未播种时补建记录所需的 group_id、name 等必填字段
     *
     * @return array<string, array{group_id: int, title: string, type: string, tips: string}>
     */
    private function getConfigMeta(): array
    {
        $manifestPath = __DIR__ . '/../../../manifest.json';
        if (!file_exists($manifestPath)) {
            return [];
        }

        $manifest = json_decode(file_get_contents($manifestPath), true);
        $meta = [];

        foreach ($manifest['config_groups'] ?? [] as $group) {
            $groupCode = self::CODE_PREFIX . $group['name'];
            $groupId = \App\Models\ConfigGroup::where('code', $groupCode)->value('id') ?? 0;

            foreach ($group['items'] ?? [] as $item) {
                $meta[$item['name']] = [
                    'group_id' => $groupId,
                    'title' => $item['title'] ?? $item['name'],
                    'type' => $item['type'] ?? 'text',
                    'tips' => $item['tips'] ?? '',
                ];
            }
        }

        return $meta;
    }

    /**
     * 验证设置项合法性
     *
     * 按访问入口格式、枚举取值、数值范围三类分别校验，聚合全部错误一次性返回。
     *
     * @param array<string, mixed> $body 请求体
     * @return array<string> 错误信息列表，空数组表示验证通过
     */
    private function validateConfig(array $body): array
    {
        return array_merge(
            $this->validateAccessEntry($body),
            $this->validateEnums($body),
            $this->validateQuota($body),
            $this->validateQuickLaunch($body),
            $this->validateIeHomepage($body),
            $this->validateGuestEnabled($body)
        );
    }

    /**
     * 验证 IE 默认主页
     *
     * 允许留空（读取时回退出厂默认主页）；非空时须为 http(s) 网址或纯域名，
     * 非法值会导致前端 iframe 加载失败白屏，故入库前拦截。
     * 入库保留管理员原始输入，协议补全统一在读取侧（normalizeIeHomepage）完成。
     *
     * @param array<string, mixed> $body 请求体
     * @return array<string> 错误信息列表
     */
    private function validateIeHomepage(array $body): array
    {
        if (!array_key_exists('xp_ie_homepage', $body)) {
            return [];
        }

        $raw = trim((string) $body['xp_ie_homepage']);
        if ($raw === '') {
            return [];
        }

        // 剥离协议与路径/查询/锚点，仅校验主机名部分
        // 分隔符用 ~：字符类内含 #，若仍以 # 作分隔符会提前终止正则
        $host = preg_replace('~[/?#].*$~', '', preg_replace('#^https?://#i', '', $raw));

        if (!preg_match('/^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/', (string) $host)) {
            return ['IE 默认主页格式不正确，请填写域名或完整网址（如 www.cmspro.cn）'];
        }

        return [];
    }

    /**
     * 验证游客功能开关取值
     *
     * 仅接受 '0'（关闭）/'1'（开启）；开关关闭时前台登录页不下发 Guest 帐户，
     * 且拒绝 Guest 登录请求，非法值会造成判定歧义，故入库前拦截。
     *
     * @param array<string, mixed> $body 请求体
     * @return array<string> 错误信息列表
     */
    private function validateGuestEnabled(array $body): array
    {
        if (!array_key_exists('xp_guest_enabled', $body)) {
            return [];
        }

        if (!in_array((string) $body['xp_guest_enabled'], ['0', '1'], true)) {
            return ['游客功能开关仅支持 0（关闭）或 1（开启）'];
        }

        return [];
    }

    /**
     * 验证快速启动默认项
     *
     * 逗号分隔 appId 列表，每项必须在前端应用注册表映射内（InitialStateProvider::QUICKLAUNCH_APPS），
     * 非法值会导致任务栏渲染出点击无响应的死快捷方式，必须入库前拦截。
     *
     * @param array<string, mixed> $body 请求体
     * @return array<string> 错误信息列表
     */
    private function validateQuickLaunch(array $body): array
    {
        if (!array_key_exists('xp_quicklaunch_defaults', $body)) {
            return [];
        }

        $errors = [];
        foreach (explode(',', (string) $body['xp_quicklaunch_defaults']) as $id) {
            $id = trim($id);
            if ($id !== '' && !isset(InitialStateProvider::QUICKLAUNCH_APPS[$id])) {
                $errors[] = "快速启动默认项包含不支持的程序: {$id}";
            }
        }

        return $errors;
    }

    /**
     * 验证访问路径与绑定域名格式
     *
     * - 两者互斥，不能同时配置
     * - access_path 非空时必须以 / 开头
     * - bind_domain 非空时须为纯域名格式（不含协议，入库前已归一化）
     *
     * @param array<string, mixed> $body 请求体
     * @return array<string> 错误信息列表
     */
    private function validateAccessEntry(array $body): array
    {
        $errors = [];

        $accessPath = $body['access_path'] ?? '';
        $bindDomain = $body['bind_domain'] ?? '';

        if ($accessPath !== '' && $bindDomain !== '') {
            $errors[] = '访问路径和绑定域名不能同时配置，请选择其一';
        }

        if ($accessPath !== '' && !str_starts_with($accessPath, '/')) {
            $errors[] = '访问路径必须以 / 开头';
        }

        // 纯域名格式：各段以字母数字开头结尾、可含连字符，至多 63 字符，至少含一个点
        if ($bindDomain !== ''
            && !preg_match('/^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$/', $bindDomain)) {
            $errors[] = '绑定域名格式不正确，请直接填写域名（如 xp.example.com），无需 http/https 前缀';
        }

        return $errors;
    }

    /**
     * 归一化绑定域名为纯域名
     *
     * 用户直接填写域名即可；误带 http(s):// 协议前缀或尾部斜杠时自动剥离，
     * 统一以纯域名入库，路由注册与 URL 拼接侧按纯域名消费。
     */
    private function normalizeBindDomain($value): string
    {
        if (!is_string($value)) {
            return '';
        }

        $domain = trim($value);
        $domain = preg_replace('#^https?://#i', '', $domain);

        return rtrim((string) $domain, '/');
    }

    /**
     * 验证枚举类配置项取值
     *
     * access_mode 决定动态路由注册方式、storage_driver 决定文件驱动实例化，
     * 非法值会导致入口 404 或存储驱动抛异常，故必须在写入前拦截。
     *
     * @param array<string, mixed> $body 请求体
     * @return array<string> 错误信息列表
     */
    private function validateEnums(array $body): array
    {
        $errors = [];

        if (array_key_exists('access_mode', $body)
            && !in_array($body['access_mode'], self::ACCESS_MODES, true)) {
            $errors[] = '访问模式仅支持：' . implode('、', self::ACCESS_MODES);
        }

        if (array_key_exists('storage_driver', $body)
            && !in_array($body['storage_driver'], self::STORAGE_DRIVERS, true)) {
            $errors[] = '存储驱动仅支持：' . implode('、', self::STORAGE_DRIVERS);
        }

        return $errors;
    }

    /**
     * 验证默认空间配额范围
     *
     * 配额单位为 MB，必须为正整数且不超过 1TB，防止写入 0/负数导致
     * 用户无法上传，或超大值导致配额校验形同虚设。
     *
     * @param array<string, mixed> $body 请求体
     * @return array<string> 错误信息列表
     */
    private function validateQuota(array $body): array
    {
        if (!array_key_exists('default_space_quota', $body)) {
            return [];
        }

        $quota = $body['default_space_quota'];
        $isPositiveInt = is_numeric($quota) && (string) (int) $quota === (string) $quota;

        if (!$isPositiveInt || $quota < self::QUOTA_MIN || $quota > self::QUOTA_MAX) {
            return [sprintf(
                '默认空间配额必须为 %d ~ %d 之间的整数（单位 MB）',
                self::QUOTA_MIN,
                self::QUOTA_MAX
            )];
        }

        return [];
    }
}
