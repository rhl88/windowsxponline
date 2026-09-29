<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\BaseController;
use App\Apps\CmsproWindowsxponline\Exceptions\StateException;
use App\Apps\CmsproWindowsxponline\Models\UserSpace;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Illuminate\Auth\GenericUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 桌面状态持久化测试
 *
 * 覆盖验收修复项：
 * - M-06：初始状态必须真正落盘（配额记录先于写入创建）；
 *         写入失败必须上抛异常，不得返回 false 被调用方静默忽略。
 * - M-10：快照序列化去 JSON_PRETTY_PRINT；超过硬上限必须拒绝落盘。
 */
class StatePersistenceTest extends TestCase
{
    use WindowsxponlineSetup;
    use XpStateSandbox;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWindowsxponline();
        $this->bootXpStateSandbox();
    }

    protected function tearDown(): void
    {
        $this->shutdownXpStateSandbox();
        parent::tearDown();
    }

    /**
     * 首次请求时初始状态必须落盘，且配额记录自动补建
     *
     * 修复前 saveState 在 ensureUserSpace 之前执行，配额校验查不到记录即返回 false，
     * 初始状态永远写不进存储，导致每次请求都重新初始化、用户改动全部丢失。
     */
    public function test_首次请求时初始状态会落盘且配额记录自动创建(): void
    {
        UserSpace::query()->delete();
        $this->memoryDriver->delete($this->stateStorageKey());

        $state = StateService::getCurrentState();

        $this->assertArrayHasKey('fsTree', $state);
        $this->assertNotNull($this->readXpState(), '初始状态未落盘，用户改动将在下次请求时丢失');
        $this->assertSame(1, $this->sandboxSpace()->count(), '配额记录未自动创建');
    }

    /**
     * 正常保存后状态可读回，used_mb 同步更新
     */
    public function test_正常保存后状态可读回(): void
    {
        $state = [
            'fsTree' => ['name' => '我的电脑', 'children' => []],
            'session' => ['user' => $this->sandboxUsername],
        ];

        StateService::saveState(UserSpace::TYPE_ADMIN, $this->sandboxAdminId, $state);

        $saved = $this->readXpState();
        $this->assertSame('我的电脑', $saved['fsTree']['name'] ?? '');
        // used_mb 按 ceil(字节/1MB) 计，非空写入最小记为 1MB
        $this->assertSame(1, (int) $this->sandboxSpace()->value('used_mb'));
    }

    /**
     * 空间被停用时保存状态必须抛异常，而非静默返回 false
     */
    public function test_空间被停用时保存状态抛出异常(): void
    {
        $this->seedXpState();
        $this->sandboxSpace()->update(['status' => UserSpace::STATUS_DISABLED]);

        $exception = $this->captureSaveFailure($this->readXpState());

        $this->assertSame('space_disabled', $exception->getReason());
        $this->assertStringContainsString('停用', $exception->getMessage());
    }

    /**
     * 配额不足时保存状态必须抛异常
     */
    public function test_配额不足时保存状态抛出异常(): void
    {
        // quota_mb=0 表示不限制（不参与校验），不足场景用 1MB 配额 + 2MB 内容触发
        $this->seedXpState([$this->makeTextFile('大文件.txt', str_repeat('a', 2097152))]);
        $this->sandboxSpace()->update(['quota_mb' => 1]);

        $exception = $this->captureSaveFailure($this->readXpState());

        $this->assertSame('quota_exceeded', $exception->getReason());
        $this->assertStringContainsString('云空间不足', $exception->getMessage());
    }

    /**
     * 配额记录缺失时保存状态必须抛异常
     */
    public function test_配额记录缺失时保存状态抛出异常(): void
    {
        $this->seedXpState();
        $this->sandboxSpace()->delete();

        $exception = $this->captureSaveFailure($this->readXpState());

        $this->assertSame('space_missing', $exception->getReason());
    }

    /**
     * 未登录时控制器基类的 saveState 必须抛异常
     *
     * 全部 38 处 V1 写接口调用点均以裸语句形式调用 $this->saveState($state)，
     * 契约由基类统一保证。
     */
    public function test_未登录时控制器保存状态抛出异常(): void
    {
        $this->seedXpState();
        Auth::forgetGuards();

        $exception = null;
        try {
            $this->makeStateWriter()->write($this->readXpState());
        } catch (StateException $e) {
            $exception = $e;
        }

        $this->assertInstanceOf(StateException::class, $exception);
        $this->assertSame('not_logged_in', $exception->getReason());
    }

    /**
     * 前台登录用户必须解析为 user 类型空间
     *
     * 框架未定义 user guard，前台认证走 web guard。
     * 修复前 StateService 误用 Auth::guard('user')，前台登录后所有 XP 接口直接 500。
     */
    public function test_前台登录用户解析为用户端空间类型(): void
    {
        Auth::forgetGuards();
        Auth::guard('web')->setUser(new GenericUser([
            'id' => 21,
            'name' => 'frontuser',
        ]));

        $this->assertSame(UserSpace::TYPE_USER, StateService::getCurrentUserType());
        $this->assertSame(21, StateService::getCurrentUserId());
        $this->assertSame('frontuser', StateService::getCurrentUsername());
    }

    /**
     * 状态异常必须渲染为 XP 前端响应信封
     */
    public function test_状态异常渲染为前端响应信封(): void
    {
        $exception = new StateException('云空间已被停用，无法保存桌面状态', 'space_disabled');

        $response = $exception->render(Request::create('/api/v1/state', 'PUT'));
        $data = json_decode($response->getContent(), true);

        $this->assertSame(500, $response->getStatusCode());
        $this->assertFalse($data['ok']);
        $this->assertSame('云空间已被停用，无法保存桌面状态', $data['error']['message']);
    }

    /**
     * 首次初始化时空间记录只查询一次
     *
     * 修复前 ensureUserSpace、配额校验、已用量更新各自 SELECT 一次，单次初始化要 4 次查询。
     */
    public function test_首次初始化时空间记录只查询一次(): void
    {
        UserSpace::query()->delete();
        StateService::resetSpaceCache();

        DB::flushQueryLog();
        DB::enableQueryLog();

        StateService::getCurrentState();

        $spaceSelects = array_filter(
            DB::getQueryLog(),
            static function (array $log): bool {
                return str_starts_with(strtolower(ltrim($log['query'])), 'select')
                    && str_contains($log['query'], 'user_spaces');
            }
        );

        $this->assertCount(1, $spaceSelects, '空间记录在同一请求内被重复查询');
    }

    /**
     * M-10：落盘的快照为紧凑 JSON，不再带缩进换行（体积膨胀约一倍）
     */
    public function test_快照落盘为紧凑JSON(): void
    {
        $state = [
            'fsTree' => ['name' => '我的电脑', 'children' => []],
            'session' => ['user' => $this->sandboxUsername],
        ];

        StateService::saveState(UserSpace::TYPE_ADMIN, $this->sandboxAdminId, $state);

        $raw = $this->memoryDriver->read($this->stateStorageKey());
        $this->assertNotNull($raw);
        $this->assertStringNotContainsString("\n", $raw, '快照不应包含 pretty-print 换行缩进');
    }

    /**
     * M-10：快照超过硬上限（10MB）时必须拒绝落盘并抛出异常
     */
    public function test_快照超硬上限时拒绝落盘(): void
    {
        $this->seedXpState();
        $before = $this->memoryDriver->read($this->stateStorageKey());

        $hugeState = ['blob' => str_repeat('x', 11 * 1024 * 1024)];
        $exception = $this->captureSaveFailure($hugeState);

        $this->assertSame('state_too_large', $exception->getReason());
        $this->assertSame(
            $before,
            $this->memoryDriver->read($this->stateStorageKey()),
            '超限快照不得覆盖已落盘数据'
        );
    }

    /**
     * 当前沙箱用户的配额记录查询构造器
     *
     * @return Builder<UserSpace>
     */
    private function sandboxSpace(): Builder
    {
        return UserSpace::where('user_type', UserSpace::TYPE_ADMIN)
            ->where('user_id', $this->sandboxAdminId);
    }

    /**
     * 执行一次保存并捕获 StateException
     *
     * @param array<string, mixed>|null $state 待保存的状态快照
     */
    private function captureSaveFailure(?array $state): StateException
    {
        try {
            StateService::saveState(UserSpace::TYPE_ADMIN, $this->sandboxAdminId, $state ?? []);
        } catch (StateException $e) {
            return $e;
        }

        $this->fail('保存状态时应当抛出 StateException，实际未抛出');
    }

    /**
     * 构造暴露 saveState 的最小控制器，用于验证基类契约
     */
    private function makeStateWriter(): BaseController
    {
        return new class extends BaseController {
            /**
             * @param array<string, mixed> $state 待保存的状态快照
             */
            public function write(array $state): void
            {
                $this->saveState($state);
            }
        };
    }
}
