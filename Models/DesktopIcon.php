<?php

namespace App\Apps\CmsproWindowsxponline\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * 桌面图标模型
 *
 * 后台可管理的 XP 桌面图标：新增/修改图标无需重新编译前端产物。
 */
class DesktopIcon extends BaseModel
{
    /**
     * 表名
     */
    protected $table = 'app_cmspro_windowsxponline_desktop_icons';

    /**
     * 时间字段名（遵循 CMSPRO 规范）
     */
    const CREATED_AT = 'create_time';
    const UPDATED_AT = 'update_time';

    /**
     * 可批量赋值的字段
     */
    protected $fillable = [
        'name',
        'type',
        'target',
        'icon_url',
        'window_width',
        'window_height',
        'sort',
        'status',
    ];

    /**
     * 类型转换
     */
    protected $casts = [
        'window_width' => 'integer',
        'window_height' => 'integer',
        'sort' => 'integer',
        'status' => 'integer',
        'create_time' => 'datetime:Y-m-d H:i:s',
        'update_time' => 'datetime:Y-m-d H:i:s',
    ];

    /**
     * 图标类型常量
     */
    const TYPE_WEB = 'web';
    const TYPE_FRAME = 'frame';
    const TYPE_PATH = 'path';

    /**
     * 状态常量
     */
    const STATUS_DISABLED = 0;
    const STATUS_ENABLED = 1;

    /**
     * 框架窗口默认尺寸（px）
     */
    const DEFAULT_WINDOW_WIDTH = 1024;
    const DEFAULT_WINDOW_HEIGHT = 720;

    /**
     * 框架窗口宽高允许范围（px）
     */
    const WINDOW_MIN = 320;
    const WINDOW_MAX = 4096;

    /**
     * 全部图标类型
     */
    public static function types(): array
    {
        return [self::TYPE_WEB, self::TYPE_FRAME, self::TYPE_PATH];
    }

    /**
     * 启用图标查询作用域
     */
    public function scopeEnabled(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ENABLED);
    }

    /**
     * 获取下发到桌面端的启用图标列表
     *
     * 返回原始业务字段，由前端负责映射为桌面图标并绑定双击行为。
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getDesktopItems(): array
    {
        /** @var Collection<int, self> $icons */
        $icons = self::query()
            ->enabled()
            ->orderBy('sort')
            ->orderBy('id')
            ->get();

        return $icons->map(fn (self $icon): array => $icon->toDesktopItem())->all();
    }

    /**
     * 转换为桌面端下发的单条数据
     *
     * @return array<string, mixed>
     */
    public function toDesktopItem(): array
    {
        return [
            'key' => 'xpicon_' . $this->id,
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'target' => $this->target,
            'icon_url' => $this->icon_url,
            'window_width' => $this->window_width,
            'window_height' => $this->window_height,
        ];
    }
}