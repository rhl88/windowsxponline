<?php

namespace App\Apps\CmsproWindowsxponline\Exceptions;

use App\Apps\CmsproWindowsxponline\Services\XpResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * XP 文件二进制对象（blob）与分片上传异常
 *
 * 与 StateException 对称：自带 render()，由 Laravel 默认异常处理器直接渲染为
 * XP 前端响应信封，无需注册异常处理器，也不改动框架代码。
 *
 * 区分 reason 的意义在于 HTTP 语义正确：客户端参数/状态类错误必须返回 4xx，
 * 若统一走 500 会让前端无法判断「该重试还是该提示用户」。
 */
class BlobException extends RuntimeException
{
    /**
     * @param string $message 面向用户的中文错误信息
     * @param string $reason 机器可读的失败原因标识
     */
    public function __construct(string $message, private readonly string $reason = 'write_failed')
    {
        parent::__construct($message);
    }

    /**
     * 获取失败原因标识
     *
     * 取值：invalid_param | chunk_mismatch | not_found | conflict | too_large | write_failed | read_failed
     */
    public function getReason(): string
    {
        return $this->reason;
    }

    /**
     * 渲染为 XP 前端响应信封
     *
     * 按 reason 映射 HTTP 状态：4xx 为客户端可纠正错误，500 为服务端故障
     */
    public function render(Request $request): JsonResponse
    {
        return match ($this->reason) {
            'invalid_param', 'chunk_mismatch' => XpResponse::badRequest($this->getMessage()),
            'not_found' => XpResponse::notFound($this->getMessage()),
            'conflict', 'too_large' => XpResponse::conflict($this->getMessage()),
            'read_failed' => XpResponse::serverError($this->getMessage()),
            default => XpResponse::serverError($this->getMessage()),
        };
    }
}
