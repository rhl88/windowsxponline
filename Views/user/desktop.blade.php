<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>Windows XP WebOS - 在线版</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
        #xpFrame { width: 100%; height: 100%; border: none; display: block; }
    </style>
</head>
<body>
    <iframe id="xpFrame" allow="fullscreen; autoplay; clipboard-write"></iframe>
    <script>
    (function() {
        var apiBase = '{{ $apiBase }}';
        var staticUrl = '{{ $staticUrl }}';
        try {
            localStorage.setItem('xp.apiBase', apiBase);
            localStorage.setItem('xp.desktopIcons', @json($desktopIcons));
        } catch(e) {
            console.warn('设置 localStorage 失败:', e);
        }
        document.getElementById('xpFrame').src = staticUrl;
    })();
    </script>
</body>
</html>
