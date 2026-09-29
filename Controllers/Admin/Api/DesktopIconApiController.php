<?php

namespace App\Apps\CmsproWindowsxponline\Controllers\Admin\Api;

use App\Apps\CmsproWindowsxponline\Models\DesktopIcon;
use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * 后台桌面图标管理 API 控制器
 *
 * 提供桌面图标的增删改查与图标文件上传，管理结果由控制器写入
 * localStorage（见 Views/admin/dashboard.blade.php、Views/user/desktop.blade.php），
 * 使新增/调整桌面图标无需重新编译前端产物。
 */
class DesktopIconApiController extends Controller
{
    /**
     * 列表默认每页条数
     */
    private const DEFAULT_PER_PAGE = 15;

    /**
     * 列表每页条数上限
     */
    private const PER_PAGE_MAX = 100;

    /**
     * 图标上传目录（相对 public/uploads）
     */
    private const ICON_DIR = 'cmspro.windowsxponline/desktop_icons';

    /**
     * 图标允许的扩展名
     */
    private const ICON_EXTENSIONS = ['ico', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];

    /**
     * 图标大小上限（KB）
     */
    private const ICON_MAX_KB = 2048;

    /**
     * 图标地址字段长度上限（与 desktop_icons.icon_url varchar(500) 一致）
     */
    private const ICON_URL_MAX_LENGTH = 500;

    /**
     * 排序值范围
     */
    private const SORT_MIN = -999999;
    private const SORT_MAX = 999999;

    /**
     * 图标列表
     */
    public function list(Request $request)
    {
        $keyword = trim((string) $request->query('keyword', ''));
        $type = (string) $request->query('type', '');

        $query = DesktopIcon::query();

        // 右模糊（前缀匹配）可命中 name 索引，全模糊 %kw% 必然全表扫描；
        // 转义 LIKE 通配符，防止用户输入 % / _ 退化为全表扫描
        if ($keyword !== '') {
            $query->where('name', 'like', addcslashes($keyword, '%_\\') . '%');
        }
        if (in_array($type, DesktopIcon::types(), true)) {
            $query->where('type', $type);
        }

        $query->orderBy('sort')->orderBy('id');

        $paginator = $query->paginate($this->resolvePerPage($request));

        return response()->json(ApiResponse::paginate($paginator));
    }

    /**
     * 创建图标
     */
    public function create(Request $request)
    {
        $body = $this->normalizePayload($request->json()->all());

        $validator = Validator::make($body, $this->rules($body));
        if ($validator->fails()) {
            return response()->json(ApiResponse::error(400, (string) $validator->errors()->first()));
        }

        $icon = DesktopIcon::create($body);

        return response()->json(ApiResponse::success($icon, '桌面图标已创建'));
    }

    /**
     * 更新图标
     */
    public function update(Request $request, $id)
    {
        $icon = DesktopIcon::find($id);
        if (!$icon) {
            return response()->json(ApiResponse::error(404, '桌面图标不存在'));
        }

        $body = $this->normalizePayload($request->json()->all());

        $validator = Validator::make($body, $this->rules($body));
        if ($validator->fails()) {
            return response()->json(ApiResponse::error(400, (string) $validator->errors()->first()));
        }

        // 图标被替换时清理旧文件，避免反复上传堆积垃圾文件
        if ($body['icon_url'] !== $icon->icon_url) {
            $this->deleteIconFile($icon->icon_url);
        }

        $icon->fill($body)->save();

        return response()->json(ApiResponse::success($icon, '桌面图标已更新'));
    }

    /**
     * 删除图标
     */
    public function delete($id)
    {
        $icon = DesktopIcon::find($id);
        if (!$icon) {
            return response()->json(ApiResponse::error(404, '桌面图标不存在'));
        }

        $this->deleteIconFile($icon->icon_url);
        $icon->delete();

        return response()->json(ApiResponse::success(null, '桌面图标已删除'));
    }

    /**
     * 上传图标文件
     *
     * 说明：图标为应用私有资源且需支持 .ico（favicon），而系统附件服务
     * （AttachmentService）的图片扩展名白名单不含 ico，故此处自行落盘到
     * public/uploads/{本应用}/desktop_icons/，不入系统附件表。
     */
    public function uploadIcon(Request $request)
    {
        $file = $request->file('icon');

        if ($file === null || !$file->isValid()) {
            return response()->json(ApiResponse::error(400, '请选择要上传的图标文件'));
        }

        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, self::ICON_EXTENSIONS, true)) {
            return response()->json(ApiResponse::error(
                400,
                '图标格式不支持，仅支持 ' . implode('/', self::ICON_EXTENSIONS)
            ));
        }

        if ($file->getSize() > self::ICON_MAX_KB * 1024) {
            return response()->json(ApiResponse::error(
                400,
                '图标大小不能超过 ' . round(self::ICON_MAX_KB / 1024, 1) . ' MB'
            ));
        }

        $dir = self::ICON_DIR . '/' . date('Y/m/d');
        $fileName = Str::random(40) . '.' . $extension;
        $path = $file->storeAs($dir, $fileName, 'public_uploads');

        if (!$path) {
            return response()->json(ApiResponse::error(500, '图标保存失败，请检查上传目录权限'));
        }

        return response()->json(ApiResponse::success([
            'url' => '/uploads/' . $path,
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
        ], '上传成功'));
    }

    /**
     * 解析每页条数（兼容 per_page 与 Layui 默认的 limit 参数名）
     */
    private function resolvePerPage(Request $request): int
    {
        $perPage = (int) ($request->query('per_page') ?: $request->query('limit') ?: self::DEFAULT_PER_PAGE);

        return max(1, min($perPage, self::PER_PAGE_MAX));
    }

    /**
     * 归一化请求体
     *
     * @param array<string, mixed> $body 原始请求体
     * @return array<string, mixed> 归一化后的字段
     */
    private function normalizePayload(array $body): array
    {
        return [
            'name' => trim((string) ($body['name'] ?? '')),
            'type' => trim((string) ($body['type'] ?? '')),
            'target' => trim((string) ($body['target'] ?? '')),
            'icon_url' => trim((string) ($body['icon_url'] ?? '')),
            'window_width' => (int) ($body['window_width'] ?? DesktopIcon::DEFAULT_WINDOW_WIDTH),
            'window_height' => (int) ($body['window_height'] ?? DesktopIcon::DEFAULT_WINDOW_HEIGHT),
            'sort' => (int) ($body['sort'] ?? 0),
            'status' => (int) ($body['status'] ?? DesktopIcon::STATUS_ENABLED),
        ];
    }

    /**
     * 校验规则
     *
     * target 需按类型区分：网页/框架仅允许 http(s) 或站内相对路径（防止
     * javascript: 等伪协议注入），路径快捷方式仅允许站内路径。
     *
     * @param array<string, mixed> $body 归一化后的请求体
     * @return array<string, mixed>
     */
    private function rules(array $body): array
    {
        $min = DesktopIcon::WINDOW_MIN;
        $max = DesktopIcon::WINDOW_MAX;

        return [
            'name' => 'required|string|max:100',
            'type' => 'required|in:' . implode(',', DesktopIcon::types()),
            'target' => [
                'required', 'string', 'max:1024',
                function (string $attribute, $value, Closure $fail) use ($body): void {
                    $isUrl = (bool) preg_match('#^https?://#i', $value);
                    $isPath = str_starts_with($value, '/');

                    if (($body['type'] ?? '') === DesktopIcon::TYPE_PATH) {
                        if (!$isPath || $isUrl) {
                            $fail('路径快捷方式的目标必须是以 / 开头的桌面路径，不能是网址');
                        }
                        return;
                    }

                    if (!$isUrl && !$isPath) {
                        $fail('目标必须是以 http://、https:// 或 / 开头的地址');
                    }
                },
            ],
            'icon_url' => 'nullable|string|max:' . self::ICON_URL_MAX_LENGTH,
            'window_width' => "integer|min:{$min}|max:{$max}",
            'window_height' => "integer|min:{$min}|max:{$max}",
            'sort' => 'integer|min:' . self::SORT_MIN . '|max:' . self::SORT_MAX,
            'status' => 'integer|in:' . DesktopIcon::STATUS_DISABLED . ',' . DesktopIcon::STATUS_ENABLED,
        ];
    }

    /**
     * 删除本应用上传的图标文件
     *
     * 仅处理本应用上传目录下的相对路径；用户手工填写的外部地址、站内其他
     * 路径一律不触碰。
     */
    private function deleteIconFile(?string $iconUrl): void
    {
        $prefix = '/uploads/' . self::ICON_DIR . '/';

        if (!$iconUrl || !str_starts_with($iconUrl, $prefix)) {
            return;
        }

        $relative = substr($iconUrl, strlen('/uploads/'));

        if ($relative === '' || str_contains($relative, '..')) {
            return;
        }

        $disk = Storage::disk('public_uploads');
        if ($disk->exists($relative)) {
            $disk->delete($relative);
        }
    }
}