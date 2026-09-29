<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Admin\Api;

use App\Apps\CmsproWindowsxponline\Models\UserSpace;
use App\Apps\CmsproWindowsxponline\Services\StorageManager;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * 后台空间管理 API 控制器
 *
 * 管理用户 XP 桌面空间配额
 */
class SpaceApiController extends Controller
{
    /**
     * 用户名最大长度（与 user_spaces.username varchar(100) 一致）
     */
    private const USERNAME_MAX_LENGTH = 100;

    /**
     * 空间配额上限（MB），与后台设置 default_space_quota 上限保持一致
     */
    private const QUOTA_MAX = 1048576;

    /**
     * 空间状态允许值
     */
    private const STATUSES = [UserSpace::STATUS_DISABLED, UserSpace::STATUS_ENABLED];

    /**
     * 列表默认每页条数
     */
    private const DEFAULT_PER_PAGE = 15;

    /**
     * 列表每页条数上限
     */
    private const PER_PAGE_MAX = 100;

    /**
     * 空间配额列表
     */
    public function list(Request $request)
    {
        $keyword = $request->query('keyword', '');
        $userType = $request->query('user_type', '');

        $query = UserSpace::query();

        // 右模糊（前缀匹配）可命中 idx_username 索引，全模糊 %kw% 必然全表扫描；
        // 转义 LIKE 通配符，防止用户输入 % / _ 退化为全表扫描
        if ($keyword !== '') {
            $query->where('username', 'like', addcslashes($keyword, '%_\\') . '%');
        }
        if ($userType !== '') {
            $query->where('user_type', $userType);
        }

        $query->orderBy('create_time', 'desc');

        $paginator = $query->paginate($this->resolvePerPage($request));

        return response()->json(ApiResponse::paginate($paginator));
    }

    /**
     * 解析每页条数（M-08：兼容 per_page 与 Layui 默认的 limit 参数名）
     *
     * 优先 per_page，回退 limit，默认 15；钳制到 1~PER_PAGE_MAX，
     * 防止超大值一次拉取全表。
     */
    private function resolvePerPage(Request $request): int
    {
        $perPage = (int) ($request->query('per_page') ?: $request->query('limit') ?: self::DEFAULT_PER_PAGE);

        return max(1, min($perPage, self::PER_PAGE_MAX));
    }

    /**
     * 空间详情
     */
    public function detail($id)
    {
        $space = UserSpace::find($id);
        if (!$space) {
            return response()->json(ApiResponse::error(404, '空间记录不存在'));
        }

        return response()->json(ApiResponse::success($space));
    }

    /**
     * 更新空间配额
     */
    public function update(Request $request, $id)
    {
        $space = UserSpace::find($id);
        if (!$space) {
            return response()->json(ApiResponse::error(404, '空间记录不存在'));
        }

        $body = $request->json()->all();
        $quotaMb = (int) ($body['quota_mb'] ?? 0);
        $status = (int) ($body['status'] ?? $space->status);

        if ($quotaMb < 0) {
            return response()->json(ApiResponse::error(400, '配额不能为负数'));
        }
        if ($quotaMb > self::QUOTA_MAX) {
            return response()->json(ApiResponse::error(400, '配额不能超过 ' . self::QUOTA_MAX . ' MB'));
        }
        if (!in_array($status, self::STATUSES, true)) {
            return response()->json(ApiResponse::error(400, '状态仅支持 0（禁用）或 1（启用）'));
        }

        $space->quota_mb = $quotaMb > 0 ? $quotaMb : $space->quota_mb;
        $space->status = $status;
        $space->save();

        return response()->json(ApiResponse::success($space, '空间配额已更新'));
    }

    /**
     * 创建空间配额记录
     */
    public function create(Request $request)
    {
        $body = $request->json()->all();
        $userType = $body['user_type'] ?? '';
        $userId = (int) ($body['user_id'] ?? 0);
        $username = $body['username'] ?? '';
        $quotaMb = (int) ($body['quota_mb'] ?? 0);

        if (!in_array($userType, [UserSpace::TYPE_ADMIN, UserSpace::TYPE_USER], true) || $userId <= 0) {
            return response()->json(ApiResponse::error(400, '用户类型和ID不能为空'));
        }

        // username 为查询展示用的冗余字段，入库前须校验非空与长度，避免超长截断
        $username = trim((string) $username);
        if ($username === '') {
            return response()->json(ApiResponse::error(400, '用户名不能为空'));
        }
        if (mb_strlen($username) > self::USERNAME_MAX_LENGTH) {
            return response()->json(ApiResponse::error(400, '用户名长度不能超过 ' . self::USERNAME_MAX_LENGTH . ' 个字符'));
        }
        if ($quotaMb > self::QUOTA_MAX) {
            return response()->json(ApiResponse::error(400, '配额不能超过 ' . self::QUOTA_MAX . ' MB'));
        }

        $existing = UserSpace::where('user_type', $userType)
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            return response()->json(ApiResponse::error(409, '该用户的空间记录已存在'));
        }

        if ($quotaMb <= 0) {
            $quotaMb = StorageManager::getDefaultQuotaMb();
        }

        $space = UserSpace::create([
            'user_type' => $userType,
            'user_id' => $userId,
            'username' => $username,
            'quota_mb' => $quotaMb,
            'used_mb' => 0,
            'status' => UserSpace::STATUS_ENABLED,
        ]);

        return response()->json(ApiResponse::success($space, '空间记录已创建'));
    }
}
