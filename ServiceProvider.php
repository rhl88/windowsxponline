<?php

namespace App\Apps\CmsproWindowsxponline;

use App\Apps\CmsproWindowsxponline\Controllers\Admin\DashboardController;
use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\AccountController;
use App\Apps\CmsproWindowsxponline\Controllers\User\DesktopController;
use App\Apps\CmsproWindowsxponline\Middleware\EnsureXpAdminPermission;
use App\Apps\CmsproWindowsxponline\Middleware\EnsureXpUserAuthenticated;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider as BaseServiceProvider;

/**
 * Windows XP 在线版应用服务提供者
 *
 * 负责注册路由、视图、配置等应用资源
 */
class ServiceProvider extends BaseServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(
            base_path('app/Apps/CmsproWindowsxponline/Config/windowsxponline.php'),
            'apps.cmspro.windowsxponline'
        );
    }

    public function boot(): void
    {
        // 访问模式决定用户端页面/API 是否挂 CMSPRO 登录校验，boot 阶段读取一次统一分发
        $accessMode = $this->currentAccessMode();

        $this->registerRoutes($accessMode);
        $this->registerAccessRoutes($accessMode);
        $this->loadViews();
    }

    /**
     * 读取当前访问模式（数据库未就绪时回退 online）
     */
    private function currentAccessMode(): string
    {
        try {
            return (string) StorageManager::getConfig('access_mode', 'online');
        } catch (\Throwable $e) {
            // 安装/迁移阶段数据库不可用时按默认在线版注册
            return 'online';
        }
    }

    /**
     * 注册路由
     *
     * 五组路由：
     * 1. 后台页面路由 - admin/cmspro/windowsxponline（auth:admin，权限码在 Routes/admin.php 逐条指定）
     * 2. 后台 API 路由 - api/admin/cmspro/windowsxponline（auth:admin，权限码在 Routes/admin_api.php 逐条指定）
     * 3. 用户端页面路由 - user/cmspro/windowsxponline（在线版挂 auth:web + front_user_status；免登录版仅 web）
     * 4. 单机版 XP API 路由 - api/admin/cmspro/windowsxponline/v1（auth:admin + access 权限）
     * 5. 在线版 XP API 路由 - api/user/cmspro/windowsxponline/v1（在线版挂 auth:web + front_user_status；免登录版仅 web）
     *
     * 后台页面与后台 API 两组只在组上挂框架 permission 中间件，具体权限码由各路由文件
     * 通过 EnsureXpAdminPermission 逐条声明（同一组内不同路径对应不同权限）。
     *
     * @param string $accessMode 访问模式 online|standalone|anonymous
     */
    protected function registerRoutes(string $accessMode): void
    {
        // 免登录版（anonymous）：前端访问不校验 CMSPRO 登录态，仅保留 web 会话中间件，
        // XP 帐户登录由应用层 /accounts/login + session(xp_account) 自行裁决
        $userMiddleware = $accessMode === 'anonymous'
            ? ['web']
            : ['web', 'auth:web', 'front_user_status'];

        // 后台页面路由
        Route::prefix('admin/cmspro/windowsxponline')
            ->namespace('App\Apps\CmsproWindowsxponline\Controllers\Admin')
            ->middleware(['web', 'auth:admin', 'permission'])
            ->group(base_path('app/Apps/CmsproWindowsxponline/Routes/admin.php'));

        // 后台 API 路由（设置管理、空间管理等）
        Route::prefix('api/admin/cmspro/windowsxponline')
            ->namespace('App\Apps\CmsproWindowsxponline\Controllers\Admin\Api')
            ->middleware(['web', 'auth:admin', 'permission'])
            ->group(base_path('app/Apps/CmsproWindowsxponline/Routes/admin_api.php'));

        // 用户端页面路由（在线版前端入口）
        Route::prefix('user/cmspro/windowsxponline')
            ->namespace('App\Apps\CmsproWindowsxponline\Controllers\User')
            ->middleware($userMiddleware)
            ->group(base_path('app/Apps/CmsproWindowsxponline/Routes/user.php'));

        // 单机版 XP API 路由（超管使用，apiBase = /api/admin/cmspro/windowsxponline/v1）
        // 追加应用侧权限校验：框架 permission 中间件对本应用权限码推导不命中会直接放行
        Route::prefix('api/admin/cmspro/windowsxponline/v1')
            ->namespace('App\Apps\CmsproWindowsxponline\Controllers\Api\V1')
            ->middleware([
                'web',
                'auth:admin',
                'permission',
                EnsureXpAdminPermission::class . ':access',
            ])
            ->group(base_path('app/Apps/CmsproWindowsxponline/Routes/xp_admin_api.php'));

        // 在线版/免登录版 XP API 路由（apiBase = /api/user/cmspro/windowsxponline/v1）
        // 免登录版仅 web 中间件，身份按会话 XP 帐户裁决（见 StateService::getAnonAccount）
        Route::prefix('api/user/cmspro/windowsxponline/v1')
            ->namespace('App\Apps\CmsproWindowsxponline\Controllers\Api\V1')
            ->middleware($userMiddleware)
            ->group(base_path('app/Apps/CmsproWindowsxponline/Routes/xp_user_api.php'));

        // 在线版欢迎屏直接登录：登录接口对未认证会话开放（仅 web 中间件），
        // 校验通过后由控制器建立 CMSPRO 会话并回写快照 session.user
        // （见 AccountController::loginWithCmsproSession）。
        // Laravel RouteCollection 对同 URI+method 以「后注册者覆盖」生效，
        // 故必须注册在上方 auth:web 组之后；其余接口（/accounts 列表、/state 等）仍要求已登录
        if ($accessMode === 'online') {
            Route::post('api/user/cmspro/windowsxponline/v1/accounts/login', [AccountController::class, 'login'])
                ->middleware(['web']);
        }
    }

    /**
     * 注册动态访问路由
     *
     * 根据 access_path / bind_domain 配置注册额外的 XP 桌面入口路由：
     * - 自定义路径：Route::get('{access_path}', ...)，如 /my-xp
     * - 绑定域名：Route::domain('{host}')->get('/', ...)，如 https://xp.example.com
     *
     * 控制器与中间件由 access_mode 决定：
     * - standalone：DashboardController + auth:admin（仅超管）
     * - online：DesktopController + auth:web（所有注册用户）
     * - anonymous：DesktopController + 仅 web（免 CMSPRO 登录，XP 帐户会话裁决）
     *
     * 桌面页内 iframe 始终加载默认静态资源相对路径，
     * 同源下 localStorage 共享，三种访问方式均正常工作。
     *
     * @param string $accessMode boot 阶段读取的访问模式
     */
    protected function registerAccessRoutes(string $accessMode): void
    {
        try {
            $accessPath = trim((string) StorageManager::getConfig('access_path', ''), '/');
            $bindDomain = (string) StorageManager::getConfig('bind_domain', '');
        } catch (\Throwable $e) {
            // 数据库未就绪（安装/迁移阶段）时跳过动态路由注册
            return;
        }

        if ($accessMode === 'standalone') {
            $controller = DashboardController::class;
            $middleware = [
                'web',
                'auth:admin',
                'permission',
                EnsureXpAdminPermission::class . ':access',
            ];
        } elseif ($accessMode === 'anonymous') {
            // 免登录版：前端访问不校验 CMSPRO 登录态，仅保留 web 会话中间件
            $controller = DesktopController::class;
            $middleware = ['web'];
        } else {
            $controller = DesktopController::class;
            // 动态入口路径不以 user 开头，框架全局未认证跳转会误指后台登录页，
            // 故用应用内中间件校验登录态并跳转前台登录页
            $middleware = ['web', EnsureXpUserAuthenticated::class, 'front_user_status'];
        }

        // 自定义路径入口
        if ($accessPath !== '') {
            Route::get($accessPath, [$controller, 'index'])
                ->middleware($middleware)
                ->name('access.cmspro.windowsxponline.path');
        }

        // 绑定域名入口（bind_domain 契约为纯域名；存量数据可能带协议前缀，兼容解析）
        if ($bindDomain !== '') {
            $host = preg_match('#^https?://#i', $bindDomain)
                ? (string) parse_url($bindDomain, PHP_URL_HOST)
                : trim($bindDomain, '/');

            if ($host !== '') {
                Route::domain($host)
                    ->middleware($middleware)
                    ->get('/', [$controller, 'index'])
                    ->name('access.cmspro.windowsxponline.domain');
            }
        }
    }

    /**
     * 注册视图命名空间
     */
    protected function loadViews(): void
    {
        $this->loadViewsFrom(
            base_path('app/Apps/CmsproWindowsxponline/Views'),
            'cmspro.windowsxponline'
        );
    }
}
