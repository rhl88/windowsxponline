<?php

namespace App\Apps\CmsproWindowsxponline\Services;

/**
 * 文件系统树操作辅助服务
 *
 * 基于 XP WebOS 路径段数组（string[]）寻址法
 * 操作 fsTree 嵌套数组，使用引用遍历实现节点查找和修改
 */
class FsTreeService
{
    /**
     * 按路径段数组查找节点引用
     *
     * @param array &$tree fsTree 根节点
     * @param array $path 路径段数组
     * @return array|null 节点引用，不存在返回 null
     */
    public static function &findNode(array &$tree, array $path): ?array
    {
        if (empty($path)) {
            return $tree;
        }

        $current = &$tree;
        foreach ($path as $segment) {
            if (!isset($current['children']) || !is_array($current['children'])) {
                $null = null;
                return $null;
            }
            $found = false;
            foreach ($current['children'] as &$child) {
                if (isset($child['name']) && $child['name'] === $segment) {
                    $current = &$child;
                    $found = true;
                    break;
                }
            }
            unset($child);
            if (!$found) {
                $null = null;
                return $null;
            }
        }
        return $current;
    }

    /**
     * 查找节点的父节点引用和其在 children 中的索引
     *
     * @return array{parent: array|null, index: int} parent 为父节点引用，index 为目标在 children 中的索引
     */
    public static function findParent(array &$tree, array $path): array
    {
        if (count($path) === 0) {
            return ['parent' => null, 'index' => -1];
        }

        $parentPath = array_slice($path, 0, -1);
        $targetName = end($path);

        $parent = &self::findNode($tree, $parentPath);
        if ($parent === null || !isset($parent['children'])) {
            return ['parent' => null, 'index' => -1];
        }

        foreach ($parent['children'] as $i => &$child) {
            if (isset($child['name']) && $child['name'] === $targetName) {
                return ['parent' => &$parent, 'index' => $i];
            }
        }

        return ['parent' => null, 'index' => -1];
    }

    /**
     * 同级重名自动去重
     *
     * 如 "新建文件夹" 已存在，则返回 "新建文件夹 (2)"
     *
     * @param array $siblings 兄弟节点数组
     * @param string $name 期望名称
     * @return string 去重后的最终名称
     */
    public static function dedupeName(array $siblings, string $name): string
    {
        $existing = array_map(fn($n) => $n['name'] ?? '', $siblings);
        if (!in_array($name, $existing, true)) {
            return $name;
        }

        $dot = strrpos($name, '.');
        $base = $dot !== false && $dot > 0 ? substr($name, 0, $dot) : $name;
        $ext = $dot !== false && $dot > 0 ? substr($name, $dot) : '';

        $i = 2;
        while (in_array("{$base} ({$i}){$ext}", $existing, true)) {
            $i++;
        }
        return "{$base} ({$i}){$ext}";
    }

    /**
     * 根据文件名推断图标和类型文案
     *
     * @param string $name 文件名
     * @return array{icon: string, type: string}
     */
    public static function inferFileType(string $name): array
    {
        $dot = strrpos($name, '.');
        if ($dot === false || $dot === 0) {
            return ['icon' => 'file', 'type' => '文件'];
        }
        $ext = strtolower(substr($name, $dot + 1));

        return match ($ext) {
            'txt', 'log', 'ini', 'inf' => ['icon' => 'text', 'type' => '文本文档'],
            'bmp', 'jpg', 'jpeg', 'png', 'gif' => ['icon' => 'image', 'type' => 'PNG 图像'],
            'mp3', 'wav', 'mid' => ['icon' => 'music', 'type' => '音频文件'],
            'avi', 'mpg', 'wmv' => ['icon' => 'audio', 'type' => '视频片段'],
            'zip', 'rar' => ['icon' => 'zip', 'type' => '压缩(zip)文件夹'],
            'exe' => ['icon' => 'exe', 'type' => '应用程序'],
            'lnk' => ['icon' => 'shortcut', 'type' => '快捷方式'],
            'ttf', 'fon' => ['icon' => 'font', 'type' => '字体文件'],
            'doc' => ['icon' => 'text', 'type' => 'Word 文档'],
            'xls' => ['icon' => 'text', 'type' => 'Excel 工作表'],
            // 未知扩展名一律按 XP「无关联程序的文件」处理：通用图标 + 双击弹「打开方式」
            default => ['icon' => 'file', 'type' => strtoupper($ext) . ' 文件'],
        };
    }

    /**
     * 计算文件大小文本
     *
     * @param string $content 文件内容
     * @return string XP 风格大小文本
     */
    public static function formatSize(string $content): string
    {
        return self::formatBytes(strlen($content));
    }

    /**
     * 按字节数计算文件大小文本
     *
     * blob 文件的内容不在快照中（存于独立对象存储），无法用 formatSize()
     * 从内容反推长度，只能由服务端按元数据中的真实字节数生成，
     * 否则大文件会被算成 base64 字符数或直接记为 1 KB。
     *
     * @param int $bytes 字节数
     * @return string XP 风格大小文本
     */
    public static function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes . ' 字节';
        }
        $kb = $bytes / 1024;
        if ($kb < 1024) {
            return ceil($kb) . ' KB';
        }
        return round($kb / 1024, 1) . ' MB';
    }

    /**
     * 创建新节点（文件/文件夹）
     *
     * @param array &$tree fsTree
     * @param array $parentPath 父路径段
     * @param array $node 完整 FSNode
     * @return string 去重后的最终名称
     */
    public static function createNode(array &$tree, array $parentPath, array $node): string
    {
        $parent = &self::findNode($tree, $parentPath);
        if ($parent === null) {
            return '';
        }
        if (!isset($parent['children']) || !is_array($parent['children'])) {
            $parent['children'] = [];
        }

        $finalName = self::dedupeName($parent['children'], $node['name']);
        $node['name'] = $finalName;
        $now = now()->toIso8601String();
        $node['created'] = $node['created'] ?? $now;
        $node['modified'] = $node['modified'] ?? $now;

        $parent['children'][] = $node;
        $parent['modified'] = $now;

        return $finalName;
    }

    /**
     * 确保基准目录下逐级存在指定目录链，返回最终完整路径段
     *
     * 解压压缩包时需要按条目的相对路径重建目录层级。createNode() 会自动去重
     * （同名则追加 " (2)"），故每级都用其返回值修正路径，避免后续层级挂到错误
     * 的父目录下。同名文件挡路时无从创建目录，返回 null 交由调用方决定跳过或失败。
     *
     * @param array &$tree fsTree
     * @param array<int, string> $basePath 基准目录路径段
     * @param array<int, string> $segments 待确保的子目录名序列（空数组表示就在基准目录下）
     * @return array<int, string>|null 完整路径段，失败返回 null
     */
    public static function ensureFolderPath(array &$tree, array $basePath, array $segments): ?array
    {
        $full = $basePath;

        foreach ($segments as $segment) {
            $full[] = $segment;

            $node = self::findNode($tree, $full);
            if ($node === null) {
                $created = self::createNode($tree, array_slice($full, 0, -1), [
                    'name' => $segment,
                    'kind' => 'folder',
                    'icon' => 'folder',
                    'type' => '文件夹',
                    'children' => [],
                ]);
                if ($created === '') {
                    return null;
                }
                $full[count($full) - 1] = $created;
            } elseif (!in_array($node['kind'] ?? '', ['folder', 'drive'], true)) {
                return null;
            }
        }

        return $full;
    }

    /**
     * 写文件内容（存在则更新，不存在则创建）
     *
     * @param array &$tree fsTree
     * @param array $parentPath 父路径段
     * @param string $name 文件名
     * @param string $content 文件内容
     * @return bool 是否创建新文件
     */
    public static function writeFile(array &$tree, array $parentPath, string $name, string $content): bool
    {
        $parent = &self::findNode($tree, $parentPath);
        if ($parent === null) {
            return false;
        }
        if (!isset($parent['children']) || !is_array($parent['children'])) {
            $parent['children'] = [];
        }

        $now = now()->toIso8601String();

        foreach ($parent['children'] as &$child) {
            if (($child['name'] ?? '') === $name && ($child['kind'] ?? '') === 'file') {
                $child['content'] = $content;
                $child['size'] = self::formatSize($content);
                $child['modified'] = $now;
                return false;
            }
        }
        unset($child);

        $fileType = self::inferFileType($name);
        $parent['children'][] = [
            'name' => $name,
            'kind' => 'file',
            'icon' => $fileType['icon'],
            'type' => $fileType['type'],
            'size' => self::formatSize($content),
            'content' => $content,
            'created' => $now,
            'modified' => $now,
        ];
        $parent['modified'] = $now;

        return true;
    }

    /**
     * 重命名节点（重算扩展名关联 icon/type）
     *
     * @param array &$tree fsTree
     * @param array $path 目标路径段
     * @param string $newName 新名称
     * @return string 去重后的最终名称，空字符串表示路径不存在
     */
    public static function renameNode(array &$tree, array $path, string $newName): string
    {
        $result = self::findParent($tree, $path);
        if ($result['parent'] === null || $result['index'] < 0) {
            return '';
        }

        $parent = &$result['parent'];
        $index = $result['index'];
        $node = &$parent['children'][$index];

        $oldKind = $node['kind'] ?? 'file';

        $siblings = [];
        foreach ($parent['children'] as $i => $sibling) {
            if ($i !== $index) {
                $siblings[] = $sibling;
            }
        }
        $finalName = self::dedupeName($siblings, $newName);

        $node['name'] = $finalName;

        if ($oldKind === 'file') {
            $fileType = self::inferFileType($finalName);
            $node['icon'] = $fileType['icon'];
            $node['type'] = $fileType['type'];
        }
        $node['modified'] = now()->toIso8601String();

        return $finalName;
    }

    /**
     * 应用属性补丁到节点
     *
     * @param array &$tree fsTree
     * @param array $path 目标路径段
     * @param array $patch 补丁字段，null 值表示清除该字段
     * @return bool 是否成功
     */
    public static function patchNode(array &$tree, array $path, array $patch): bool
    {
        $node = &self::findNode($tree, $path);
        if ($node === null) {
            return false;
        }

        foreach ($patch as $key => $value) {
            if ($value === null) {
                unset($node[$key]);
            } else {
                $node[$key] = $value;
            }
        }
        $node['modified'] = now()->toIso8601String();

        return true;
    }

    /**
     * 删除节点（返回被删节点快照）
     *
     * @param array &$tree fsTree
     * @param array $path 目标路径段
     * @return array|null 被删节点，null 表示路径不存在
     */
    public static function deleteNode(array &$tree, array $path): ?array
    {
        $result = self::findParent($tree, $path);
        if ($result['parent'] === null || $result['index'] < 0) {
            return null;
        }

        $parent = &$result['parent'];
        $index = $result['index'];
        $node = $parent['children'][$index];

        array_splice($parent['children'], $index, 1);
        $parent['modified'] = now()->toIso8601String();

        return $node;
    }

    /**
     * 移动节点到目标目录
     *
     * 不可移到自身或自身的子目录
     *
     * @param array &$tree fsTree
     * @param array $srcPath 源路径段
     * @param array $dstPath 目标目录路径段
     * @return bool 是否成功
     */
    public static function moveNode(array &$tree, array $srcPath, array $dstPath): bool
    {
        $srcName = end($srcPath);
        $srcPathStr = implode('/', $srcPath);
        $dstPathStr = implode('/', $dstPath);

        if ($srcPathStr === $dstPathStr) {
            return false;
        }

        if (str_starts_with($dstPathStr . '/', $srcPathStr . '/')) {
            return false;
        }

        $dstParent = &self::findNode($tree, $dstPath);
        if ($dstParent === null) {
            return false;
        }
        if (!isset($dstParent['children']) || !is_array($dstParent['children'])) {
            $dstParent['children'] = [];
        }

        $node = self::deleteNode($tree, $srcPath);
        if ($node === null) {
            return false;
        }

        $finalName = self::dedupeName($dstParent['children'], $srcName);
        $node['name'] = $finalName;
        $now = now()->toIso8601String();
        $node['modified'] = $now;
        $dstParent['children'][] = $node;
        $dstParent['modified'] = $now;

        return true;
    }

    /**
     * 复制节点到目标目录
     *
     * @param array &$tree fsTree
     * @param array $srcPath 源路径段
     * @param array $dstPath 目标目录路径段
     * @param array<string, string> $blobMap 旧 blobId → 新 blobId 映射，
     *        用于让副本指向独立的内容对象（浅拷贝会让两节点共享同一 blobId，
     *        删其一即摧毁另一份数据）
     * @return bool 是否成功
     */
    public static function copyNode(array &$tree, array $srcPath, array $dstPath, array $blobMap = []): bool
    {
        $srcNode = self::findNode($tree, $srcPath);
        if ($srcNode === null) {
            return false;
        }

        $dstParent = &self::findNode($tree, $dstPath);
        if ($dstParent === null) {
            return false;
        }
        if (!isset($dstParent['children']) || !is_array($dstParent['children'])) {
            $dstParent['children'] = [];
        }

        $copy = self::remapBlobs($srcNode, $blobMap);
        $finalName = self::dedupeName($dstParent['children'], $srcNode['name']);
        $copy['name'] = $finalName;
        $now = now()->toIso8601String();
        $copy['created'] = $now;
        $copy['modified'] = $now;
        $dstParent['children'][] = $copy;
        $dstParent['modified'] = $now;

        return true;
    }

    /**
     * 递归收集子树内所有节点引用的 blobId（去重、升序无关）
     *
     * 内容存于独立对象存储的文件节点带 blobId 字段，
     * 彻底删除与复制都需要先拿到完整清单才能定位对象。
     *
     * @param array $node 起始节点（文件或目录）
     * @return array<int, string>
     */
    public static function collectBlobIds(array $node): array
    {
        $found = [];

        $blobId = $node['blobId'] ?? null;
        if (is_string($blobId) && $blobId !== '') {
            $found[$blobId] = true;
        }

        foreach ($node['children'] ?? [] as $child) {
            if (is_array($child)) {
                foreach (self::collectBlobIds($child) as $id) {
                    $found[$id] = true;
                }
            }
        }

        return array_keys($found);
    }

    /**
     * 按映射表改写子树内所有节点的 blobId
     *
     * 映射表为空时原样返回，保证既有「快照内嵌内容」节点的复制路径零开销。
     *
     * @param array $node 起始节点
     * @param array<string, string> $blobMap 旧 blobId → 新 blobId
     * @return array 改写后的节点
     */
    private static function remapBlobs(array $node, array $blobMap): array
    {
        if ($blobMap === []) {
            return $node;
        }

        $blobId = $node['blobId'] ?? null;
        if (is_string($blobId) && isset($blobMap[$blobId])) {
            $node['blobId'] = $blobMap[$blobId];
        }

        foreach ($node['children'] ?? [] as $i => $child) {
            if (is_array($child)) {
                $node['children'][$i] = self::remapBlobs($child, $blobMap);
            }
        }

        return $node;
    }

    /**
     * 路径段数组转字符串（用于回收站 key）
     */
    public static function pathToString(array $path): string
    {
        return implode('/', $path);
    }

    /**
     * 生成回收站条目 key
     */
    public static function generateRecycleKey(string $origPath, string $name): string
    {
        return $origPath . '#' . (now()->timestamp * 1000 + random_int(1000, 9999)) . bin2hex(random_bytes(2));
    }
}
