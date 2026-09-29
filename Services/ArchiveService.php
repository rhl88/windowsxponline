<?php

namespace App\Apps\CmsproWindowsxponline\Services;

use App\Apps\CmsproWindowsxponline\Exceptions\BlobException;
use Illuminate\Support\Facades\File;
use ZipArchive;

/**
 * ZIP 压缩包读写服务
 *
 * WinRAR 复刻采用「视觉 1:1、格式用 ZIP」口径：PHP 无法生成 RAR，解压 RAR 又
 * 依赖非默认的 rar PECL 扩展，故压缩与解压一律走 PHP 内置 ZipArchive，
 * 不引入任何外部二进制，保证各部署环境行为一致。
 *
 * ZipArchive 只接受文件路径而非字符串，读写都需在本地临时目录落盘。临时目录
 * 固定在 storage/app/windowsxponline/tmp（与 LocalDriver 的 blob 根目录同级），
 * 该路径在任何部署下都可写，也不会被 open_basedir 拦住。
 *
 * 失败一律抛 BlobException：其 reason → HTTP 状态映射已覆盖压缩解压所需的全部
 * 语义（invalid_param=400 / too_large=409 / read_failed|write_failed=500），
 * 再引入一个 render() 完全相同的异常类只是重复代码。
 */
class ArchiveService
{
    /**
     * 单次压缩/解压允许的累计未压缩字节数上限：200 MB
     *
     * 与 BlobService::MAX_MERGE_BYTES 同源：ZipArchive 在 close() 前会把全部
     * 条目内容驻留内存，峰值与分片合并相当，超过该值将逼近 memory_limit=512M
     */
    public const MAX_TOTAL_BYTES = BlobService::MAX_MERGE_BYTES;

    /**
     * 单个压缩包允许的条目数上限
     *
     * 解压出的每个文件都会成为一个独立 blob（一条元数据 + 一个存储对象），
     * 不设上限时一个含数万条目的压缩包足以把数据表与对象存储打爆
     */
    public const MAX_ENTRIES = 2000;

    private const TMP_DIR = 'app/windowsxponline/tmp';

    /**
     * 按扩展名判断是否为可处理的压缩包
     *
     * 文件树的 icon 字段由 inferFileType() 推断，.rar 同样得到 'zip' 图标，
     * 故判断一律以扩展名为准，避免把 .rar 当成可解压对象后报错文案对不上。
     */
    public static function isArchiveName(string $name): bool
    {
        $dot = strrpos($name, '.');

        return $dot !== false && strtolower(substr($name, $dot + 1)) === 'zip';
    }

    /**
     * 读取节点的文件内容（三种存放位置归一）
     *
     * 快照中的文件节点历史上存在三种内容形态，压缩时必须全部覆盖，
     * 否则老数据（图片 dataURL、记事本文本）压出来的包会缺文件：
     * - blobId：内容在独立对象存储（任意格式文件）
     * - src：base64 dataURL（早期导入的图片/音频）
     * - content：内嵌纯文本（记事本写入）
     *
     * @param array{userType: string, userId: string|int} $identity
     * @return string|null 内容为二进制安全字符串，无法取得时返回 null
     */
    public static function readNodeContent(array $identity, array $node): ?string
    {
        $blobId = $node['blobId'] ?? null;
        if (is_string($blobId) && $blobId !== '') {
            return BlobService::read($identity, $blobId);
        }

        $src = $node['src'] ?? null;
        if (is_string($src) && str_starts_with($src, 'data:')) {
            return self::decodeDataUrl($src);
        }

        $content = $node['content'] ?? null;

        return is_string($content) ? $content : null;
    }

    /**
     * 递归收集子树内全部文件内容，键为压缩包内相对路径
     *
     * 与 WinRAR「添加到压缩文件」一致：被选中的文件/文件夹自身名称作为包内
     * 根级条目，文件夹内部层级原样保留。空文件夹不产生条目（ZIP 需显式目录
     * 条目，而解压侧按文件路径隐式重建目录，两侧口径统一为「只存文件」）。
     *
     * @param array{userType: string, userId: string|int} $identity
     * @param array $node 起始节点
     * @param string $prefix 上级相对路径，根级传空串
     * @return array<string, string> 相对路径 => 文件内容
     */
    public static function collect(array $identity, array $node, string $prefix = ''): array
    {
        $name = (string) ($node['name'] ?? '');
        if ($name === '') {
            return [];
        }

        $relative = $prefix === '' ? $name : $prefix . '/' . $name;

        if (($node['kind'] ?? 'file') !== 'file') {
            $collected = [];
            foreach ($node['children'] ?? [] as $child) {
                if (is_array($child)) {
                    $collected += self::collect($identity, $child, $relative);
                }
            }

            return $collected;
        }

        $content = self::readNodeContent($identity, $node);

        return $content === null ? [] : [$relative => $content];
    }

    /**
     * 由「相对路径 => 内容」生成 ZIP 二进制
     *
     * @param array<string, string> $files
     * @throws BlobException 无条目或写入失败
     */
    public static function build(array $files): string
    {
        if ($files === []) {
            throw new BlobException('没有可压缩的文件', 'invalid_param');
        }

        $path = self::tempFile();

        try {
            self::writeZip($path, $files);

            return (string) File::get($path);
        } finally {
            File::delete($path);
        }
    }

    /**
     * 列出压缩包条目（不读取内容，供 WinRAR 窗口展示）
     *
     * 含非法路径的条目直接跳过：它们在解压时同样会被丢弃，
     * 列表若展示出来会让用户以为能解出而实际解不出。
     *
     * @return array<int, array{name: string, bytes: int, dir: bool}>
     * @throws BlobException 内容不是有效 ZIP
     */
    public static function listEntries(string $data): array
    {
        [$zip, $path] = self::open($data);

        try {
            $entries = [];
            $total = $zip->numFiles;

            for ($i = 0; $i < $total; $i++) {
                // FL_ENC_RAW 取压缩包内的原始字节：libzip 默认会把未标记 UTF-8 的
                // 条目名按 CP437 猜成合法 UTF-8，GBK 中文名会因此变成「╓╨╬─」，
                // 且 mb_check_encoding 判定通过，导致 decodeName() 的 GBK 兜底永不触发。
                $stat = $zip->statIndex($i, ZipArchive::FL_ENC_RAW);
                if ($stat === false) {
                    continue;
                }

                $raw = (string) $stat['name'];
                $name = self::normalizeEntryName(self::decodeName($raw));
                if ($name === null) {
                    continue;
                }

                $entries[] = [
                    'name' => $name,
                    'bytes' => (int) $stat['size'],
                    'dir' => str_ends_with($raw, '/'),
                ];
            }

            return $entries;
        } finally {
            $zip->close();
            File::delete($path);
        }
    }

    /**
     * 解出压缩包内全部文件内容，键为归一化后的相对路径
     *
     * 目录条目被跳过：解压侧按文件相对路径逐级建目录，空目录不会保留，
     * 与 build() 侧「只存文件」的口径一致。
     *
     * @return array<string, string> 相对路径 => 文件内容
     * @throws BlobException 不是有效 ZIP、条目过多或解压后体积超限
     */
    public static function unpack(string $data): array
    {
        [$zip, $path] = self::open($data);

        try {
            self::assertUnpackable($zip);

            $files = [];
            $total = $zip->numFiles;

            for ($i = 0; $i < $total; $i++) {
                $name = self::entryNameAt($zip, $i);
                if ($name === null) {
                    continue;
                }

                $content = $zip->getFromIndex($i);
                if ($content === false) {
                    continue;
                }

                $files[$name] = $content;
            }

            return $files;
        } finally {
            $zip->close();
            File::delete($path);
        }
    }

    /**
     * 归一化压缩包条目名并拦截路径穿越（zip slip）
     *
     * 条目名来自压缩包内部，属完全不可信输入。未过滤时 `../../../x` 或
     * `C:\Windows\x` 会让解压结果逃出目标目录；本应用虽不写真实磁盘，
     * 但穿越段会污染文件树路径寻址，同样必须拒绝。
     *
     * 以 / 或 \ 开头的条目视为根路径并剥去前导分隔符（与 WinRAR 解压绝对路径
     * 条目时的处理一致）：它们不含穿越段，转为相对路径后安全落在目标目录内，
     * 直接拒绝会让这类压缩包整体解不出，反而更糟。同理，冗余分隔符与 `.`
     * 当前目录段（大量打包工具会生成 `./file.txt` 形式）一律归一化掉，
     * 只有真正能上跳的 `..` 才拒绝。
     *
     * @return string|null 归一化后的相对路径，非法时返回 null
     */
    public static function normalizeEntryName(string $raw): ?string
    {
        $name = trim(str_replace('\\', '/', $raw), '/');

        if ($name === '' || preg_match('#^[A-Za-z]:#', $name) || preg_match('/[\x00-\x1F\x7F]/', $name)) {
            return null;
        }

        $segments = [];
        foreach (explode('/', $name) as $segment) {
            $segment = trim($segment);
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..') {
                return null;
            }
            $segments[] = $segment;
        }

        return $segments === [] ? null : implode('/', $segments);
    }

    /**
     * 取得指定序号条目的归一化名称，目录与非法条目返回 null
     *
     * 同 listEntries()，用 FL_ENC_RAW 拿原始字节后再自行判定编码。
     */
    private static function entryNameAt(ZipArchive $zip, int $index): ?string
    {
        $stat = $zip->statIndex($index, ZipArchive::FL_ENC_RAW);
        if ($stat === false) {
            return null;
        }

        $raw = (string) $stat['name'];
        if (str_ends_with($raw, '/')) {
            return null;
        }

        return self::normalizeEntryName(self::decodeName($raw));
    }

    /**
     * 解压前的规模校验
     *
     * 先按条目声明的未压缩总大小拦截解压炸弹：真把内容解出来才发现超限，
     * 内存早已耗尽。声明值可被伪造，故解出后仍以真实字节数二次校验。
     *
     * @throws BlobException 条目过多或解压后体积超限
     */
    private static function assertUnpackable(ZipArchive $zip): void
    {
        $count = $zip->numFiles;
        if ($count > self::MAX_ENTRIES) {
            throw new BlobException(
                sprintf('压缩包内文件过多（%d 个），单次最多解压 %d 个', $count, self::MAX_ENTRIES),
                'too_large'
            );
        }

        $declared = 0;
        for ($i = 0; $i < $count; $i++) {
            $stat = $zip->statIndex($i);
            $declared += $stat === false ? 0 : (int) $stat['size'];
        }

        if ($declared > self::MAX_TOTAL_BYTES) {
            throw new BlobException(
                sprintf('压缩包解压后约 %d MB，超过单次 %d MB 上限', (int) ceil($declared / 1048576), 200),
                'too_large'
            );
        }
    }

    /**
     * 将 ZIP 二进制落盘并打开
     *
     * @return array{0: ZipArchive, 1: string} 句柄与临时文件路径（调用方负责清理）
     * @throws BlobException 落盘失败或内容不是有效 ZIP
     */
    private static function open(string $data): array
    {
        $path = self::tempFile();

        if (File::put($path, $data) === false) {
            File::delete($path);
            throw new BlobException('读取压缩包失败，请稍后重试', 'read_failed');
        }

        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            File::delete($path);
            throw new BlobException('该文件不是有效的 ZIP 压缩包', 'invalid_param');
        }

        return [$zip, $path];
    }

    /**
     * 将条目逐个写入临时文件并关闭归档
     *
     * @param array<string, string> $files
     * @throws BlobException 归档创建或关闭失败
     */
    private static function writeZip(string $path, array $files): void
    {
        $zip = new ZipArchive();
        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new BlobException('压缩失败：无法创建压缩文件', 'write_failed');
        }

        foreach ($files as $name => $content) {
            $zip->addFromString((string) $name, (string) $content);
        }

        if ($zip->close() === false) {
            throw new BlobException('压缩失败：写入压缩文件出错', 'write_failed');
        }
    }

    /**
     * 创建本地临时文件
     *
     * @throws BlobException 临时目录不可创建或不可写
     */
    private static function tempFile(): string
    {
        $dir = storage_path(self::TMP_DIR);
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new BlobException('压缩失败：临时目录不可写', 'write_failed');
        }

        $path = tempnam($dir, 'xpzip_');
        if ($path === false) {
            throw new BlobException('压缩失败：无法创建临时文件', 'write_failed');
        }

        return $path;
    }

    /**
     * 解码 dataURL 为原始字节
     *
     * 早期导入的图片/音频以 `data:<mime>;base64,<payload>` 形式内嵌在快照中，
     * 压缩时若不还原为字节，包内会得到一个 base64 文本而非可打开的图片。
     */
    private static function decodeDataUrl(string $src): ?string
    {
        $comma = strpos($src, ',');
        if ($comma === false) {
            return null;
        }

        $payload = substr($src, $comma + 1);

        if (!str_contains(substr($src, 0, $comma), ';base64')) {
            return rawurldecode($payload);
        }

        $decoded = base64_decode($payload, true);

        return $decoded === false ? null : $decoded;
    }

    /**
     * 转码条目名
     *
     * 中文版 WinRAR 与 Windows 内置压缩生成的 ZIP，条目名多为 GBK 且不带
     * UTF-8 标志位，ZipArchive 会原样返回字节串。不转码则解出的文件名全是
     * 乱码，属可复现的功能缺陷，故按「非合法 UTF-8 即视为 GBK」兜底转换。
     * （极少数 GBK 字节序列恰好也是合法 UTF-8，会被误判保留原样，属可接受代价）
     */
    private static function decodeName(string $raw): string
    {
        if (mb_check_encoding($raw, 'UTF-8')) {
            return $raw;
        }

        return (string) mb_convert_encoding($raw, 'UTF-8', 'GBK');
    }
}
