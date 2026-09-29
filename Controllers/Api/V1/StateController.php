<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Api\V1;

use App\Apps\CmsproWindowsxponline\Services\InitialStateProvider;
use App\Apps\CmsproWindowsxponline\Services\StateService;
use App\Apps\CmsproWindowsxponline\Services\XpAccountStore;
use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\Request;

/**
 * XP WebOS 状态/列表类资源端点
 *
 * GET /state - 全量快照（启动 hydrate，剥离密码）
 * recent-docs: GET/PUT/POST/DELETE
 * run-history: GET/PUT/POST/DELETE
 * net-drives: GET/PUT/POST/DELETE
 * audio: GET/PUT/DELETE
 */
class StateController extends BaseController
{
    // ─── 全量快照 ───

    /**
     * 全量快照（剥离密码）
     */
    public function snapshot()
    {
        $state = $this->getState();

        // anonymous 模式：帐户数据源为全局注册表，快照内置 accounts 字段为出厂种子，统一替换
        if (StateService::isAnonymousMode()) {
            $state['accounts'] = XpAccountStore::all();
        }

        // IE 出厂默认主页（后台 xp_ie_homepage）随快照下发，供前端
        // 「Internet 选项 → 使用默认页」按钮取值；仅响应态注入，不参与落盘
        if (!isset($state['ie']) || !is_array($state['ie'])) {
            $state['ie'] = [];
        }
        $state['ie']['defaultHome'] = InitialStateProvider::configuredIeHomepage();

        $state = StateService::stripAccounts($state);

        return XpResponse::success($state);
    }

    // ─── 最近文档 ───

    public function recentDocs()
    {
        $state = $this->getState();
        return XpResponse::success($state['recentDocs'] ?? []);
    }

    public function putRecentDocs(Request $request)
    {
        $body = $this->jsonBody($request);
        $items = $body['items'] ?? $body;

        if (!is_array($items)) {
            return XpResponse::badRequest('请求体必须是数组');
        }

        $state = $this->getState();
        $state['recentDocs'] = array_slice($items, 0, 15);
        $this->saveState($state);

        return XpResponse::success($state['recentDocs']);
    }

    public function addRecentDoc(Request $request)
    {
        $body = $this->jsonBody($request);
        $item = $body['item'] ?? null;

        if (!is_array($item)) {
            return XpResponse::badRequest('缺少 item 字段');
        }

        $state = $this->getState();
        $recent = $state['recentDocs'] ?? [];

        $itemJson = json_encode($item);
        $recent = array_filter($recent, fn($d) => json_encode($d) !== $itemJson);
        array_unshift($recent, $item);
        $state['recentDocs'] = array_slice(array_values($recent), 0, 15);

        $this->saveState($state);

        return XpResponse::success($state['recentDocs']);
    }

    public function clearRecentDocs()
    {
        $state = $this->getState();
        $state['recentDocs'] = [];
        $this->saveState($state);

        return XpResponse::success(['cleared' => true]);
    }

    // ─── 运行历史 ───

    public function runHistory()
    {
        $state = $this->getState();
        return XpResponse::success($state['runHistory'] ?? []);
    }

    public function putRunHistory(Request $request)
    {
        $body = $this->jsonBody($request);
        $items = $body['items'] ?? $body;

        if (!is_array($items)) {
            return XpResponse::badRequest('请求体必须是数组');
        }

        $state = $this->getState();
        $state['runHistory'] = array_slice($items, 0, 26);
        $this->saveState($state);

        return XpResponse::success($state['runHistory']);
    }

    public function addRunHistory(Request $request)
    {
        $body = $this->jsonBody($request);
        $item = $body['item'] ?? null;

        if ($item === null) {
            return XpResponse::badRequest('缺少 item 字段');
        }

        $state = $this->getState();
        $history = $state['runHistory'] ?? [];
        $history = array_values(array_filter($history, fn($d) => $d !== $item));
        array_unshift($history, $item);
        $state['runHistory'] = array_slice($history, 0, 26);

        $this->saveState($state);

        return XpResponse::success($state['runHistory']);
    }

    public function clearRunHistory()
    {
        $state = $this->getState();
        $state['runHistory'] = [];
        $this->saveState($state);

        return XpResponse::success(['cleared' => true]);
    }

    // ─── 网络驱动器 ───

    public function netDrives()
    {
        $state = $this->getState();
        return XpResponse::success($state['netDrives'] ?? []);
    }

    public function putNetDrives(Request $request)
    {
        $body = $this->jsonBody($request);
        $items = $body['items'] ?? $body;

        if (!is_array($items)) {
            return XpResponse::badRequest('请求体必须是数组');
        }

        $state = $this->getState();
        $state['netDrives'] = $items;
        $this->saveState($state);

        return XpResponse::success($state['netDrives']);
    }

    public function addNetDrive(Request $request)
    {
        $body = $this->jsonBody($request);
        $letter = $body['letter'] ?? '';
        $path = $body['path'] ?? '';

        if ($letter === '') {
            return XpResponse::badRequest('缺少 letter 字段');
        }

        $state = $this->getState();
        if (!isset($state['netDrives']) || !is_array($state['netDrives'])) {
            $state['netDrives'] = [];
        }

        $state['netDrives'] = array_filter($state['netDrives'], fn($d) => ($d['letter'] ?? '') !== $letter);
        $state['netDrives'][] = ['letter' => $letter, 'path' => $path];

        $this->saveState($state);

        return XpResponse::success(['letter' => $letter, 'path' => $path]);
    }

    public function deleteNetDrive(Request $request)
    {
        $body = $this->jsonBody($request);
        $letter = $body['letter'] ?? '';

        $state = $this->getState();
        $before = count($state['netDrives'] ?? []);
        $state['netDrives'] = array_values(array_filter(
            $state['netDrives'] ?? [],
            fn($d) => ($d['letter'] ?? '') !== $letter
        ));
        $after = count($state['netDrives']);

        if ($before !== $after) {
            $this->saveState($state);
        }

        return XpResponse::success(['removed' => $before - $after]);
    }

    // ─── 录音机 ───

    public function audio()
    {
        $state = $this->getState();
        return XpResponse::success($state['audioBlobs'] ?? new \stdClass());
    }

    public function putAudio(Request $request)
    {
        $body = $this->jsonBody($request);

        $state = $this->getState();
        $state['audioBlobs'] = $body;
        $this->saveState($state);

        return XpResponse::success($state['audioBlobs']);
    }

    public function deleteAudio(Request $request)
    {
        $body = $this->jsonBody($request);
        $path = $body['path'] ?? '';

        $state = $this->getState();
        if (is_array($state['audioBlobs'] ?? null)) {
            unset($state['audioBlobs'][$path]);
            $state['audioBlobs'] = (object) $state['audioBlobs'];
            $this->saveState($state);
        }

        return XpResponse::success(['removed' => $path]);
    }
}
