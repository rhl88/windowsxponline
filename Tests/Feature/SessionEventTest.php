<?php

namespace App\Apps\CmsproWindowsxponline\Tests\Feature;

use App\Apps\CmsproWindowsxponline\Controllers\Api\V1\SessionController;
use App\Apps\CmsproWindowsxponline\Tests\Support\WindowsxponlineSetup;
use App\Apps\CmsproWindowsxponline\Tests\Support\XpStateSandbox;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Windows XP 在线版 · 会话事件上报测试
 *
 * 覆盖验收修复项：
 * - A-02：session.events 流水超出上限后仅保留最近 200 条，防止快照无限膨胀
 */
class SessionEventTest extends TestCase
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
     * 构造 POST /session 请求
     *
     * @param array<string, mixed> $payload 请求体
     */
    private function postAction(array $payload): Request
    {
        $request = Request::create('/api/v1/session', 'POST');
        $request->headers->set('Content-Type', 'application/json');
        $request->setMethod('POST');

        foreach ($payload as $key => $value) {
            $request->json()->set($key, $value);
        }

        return $request;
    }

    /** 测试合法动作追加事件并更新会话用户 */
    public function test_上报会话动作后事件入库(): void
    {
        $this->seedXpState([]);

        $response = (new SessionController())->action($this->postAction([
            'action' => 'login',
            'user' => 'tester',
        ]));

        $payload = json_decode($response->getContent(), true);
        $this->assertTrue($payload['ok']);

        $state = $this->readXpState();
        $this->assertCount(1, $state['session']['events']);
        $this->assertSame('login', $state['session']['events'][0]['action']);
        $this->assertSame('tester', $state['session']['user']);
    }

    /** 测试非法动作被拒绝且不写状态 */
    public function test_非法会话动作被拒绝(): void
    {
        $this->seedXpState([]);

        $response = (new SessionController())->action($this->postAction(['action' => 'format-c']));

        $payload = json_decode($response->getContent(), true);
        $this->assertFalse($payload['ok']);
        $this->assertArrayNotHasKey('events', $this->readXpState()['session'] ?? []);
    }

    /** 测试事件流水超出上限后仅保留最近 200 条 */
    public function test_事件流水超上限被截断(): void
    {
        $this->seedXpState([]);

        // 预置 250 条历史事件（最早一条标记 seq=0，便于断言淘汰方向）
        $state = $this->readXpState();
        $events = [];
        for ($i = 0; $i < 250; $i++) {
            $events[] = ['action' => 'lock', 'at' => 1000 + $i, 'user' => 'tester', 'seq' => $i];
        }
        $state['session']['events'] = $events;
        $this->memoryDriver->seedState($this->stateStorageKey(), $state);

        (new SessionController())->action($this->postAction(['action' => 'unlock']));

        $saved = $this->readXpState()['session']['events'];
        $this->assertCount(200, $saved);
        // 最旧的 51 条（seq 0~50）被淘汰，最后一条是本次上报的 unlock
        $this->assertSame(51, $saved[0]['seq']);
        $this->assertSame('unlock', $saved[199]['action']);
    }
}
