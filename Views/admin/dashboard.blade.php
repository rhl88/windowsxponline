<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Windows XP Online · 桌面</title>
    <link rel="stylesheet" href="{{ asset('CmsProUi/component/pear/css/pear.css') }}">
    <link rel="stylesheet" href="{{ asset('CmsProUi/font-awesome/4.7.0/css/font-awesome.min.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/admin.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/variables.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/reset.css') }}">
    <style>
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
        .xp-desktop-wrapper { width: 100%; height: 100vh; overflow: hidden; position: relative; }
        .xp-desktop-wrapper iframe { width: 100%; height: 100%; border: none; display: block; }
        @media (prefers-reduced-motion: reduce) {
            * { transition: none !important; animation: none !important; }
        }
    </style>
</head>
<body>
<div class="xp-desktop-wrapper">
    <iframe id="xpDesktopFrame"
            allow="fullscreen; autoplay; clipboard-write">
    </iframe>
</div>
<script src="{{ asset('CmsProUi/component/layui/layui.js') }}"></script>
<script src="{{ asset('CmsProUi/component/pear/pear.js') }}"></script>
<script>
// 同域下 localStorage 共享，先设置 apiBase 与后台配置的桌面图标再加载 iframe
(function() {
    var apiBase = '{{ $apiBase }}';
    var staticUrl = '{{ $staticUrl }}';
    try {
        localStorage.setItem('xp.apiBase', apiBase);
        localStorage.setItem('xp.desktopIcons', JSON.stringify(@json($desktopIcons)));
    } catch(e) {
        console.warn('设置 localStorage 失败:', e);
    }
    document.getElementById('xpDesktopFrame').src = staticUrl;
})();
</script>
</body>
</html>
