<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Windows XP Online · 空间管理</title>
    <link rel="stylesheet" href="{{ asset('CmsProUi/component/pear/css/pear.css') }}">
    <link rel="stylesheet" href="{{ asset('CmsProUi/font-awesome/4.7.0/css/font-awesome.min.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/admin.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/variables.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/reset.css') }}">
    <style>
        .space-form-tips { font-size: 12px; color: #5f5f5f; line-height: 1.6; margin-top: 4px; }
        .usage-bar-wrap { display: flex; align-items: center; gap: 8px; }
        .usage-bar { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; min-width: 80px; }
        .usage-bar-inner { height: 100%; border-radius: 4px; transition: width 0.3s; }
        .usage-text { font-size: 12px; color: #5f5f5f; white-space: nowrap; }
        @media (prefers-reduced-motion: reduce) {
            * { transition: none !important; animation: none !important; }
        }
    </style>
</head>
<body>
<div class="pear-container">
    {{-- 搜索栏 --}}
    <div class="layui-card">
        <div class="layui-card-body">
            <form class="layui-form" action="">
                <div class="layui-inline">
                    <div class="layui-input-inline" style="width:180px;">
                        <input type="text" name="keyword" placeholder="用户名" class="layui-input">
                    </div>
                </div>
                <div class="layui-inline">
                    <div class="layui-input-inline" style="width:140px;">
                        <select name="user_type">
                            <option value="">全部类型</option>
                            <option value="admin">管理员</option>
                            <option value="user">用户</option>
                        </select>
                    </div>
                </div>
                <div class="layui-inline">
                    <button class="layui-btn layui-btn-md" lay-submit lay-filter="space-query">
                        <i class="layui-icon layui-icon-search"></i> 查询
                    </button>
                    <button type="reset" class="layui-btn layui-btn-md layui-btn-primary">
                        <i class="layui-icon layui-icon-refresh"></i> 重置
                    </button>
                </div>
            </form>
        </div>
    </div>

    {{-- 数据表格 --}}
    <div class="layui-card">
        <div class="layui-card-body">
            <table id="space-table" lay-filter="space-table"></table>
        </div>
    </div>

    {{-- 状态列模板 --}}
    @verbatim
    <script type="text/html" id="space-status-tpl">
        {{# if(d.status == 1){ }}
        <span class="layui-badge layui-bg-green">启用</span>
        {{# } else { }}
        <span class="layui-badge layui-bg-red">禁用</span>
        {{# } }}
    </script>
    @endverbatim

    {{-- 用户类型列模板 --}}
    @verbatim
    <script type="text/html" id="space-type-tpl">
        {{# if(d.user_type == 'admin'){ }}
        <span class="layui-badge layui-bg-blue">管理员</span>
        {{# } else { }}
        <span class="layui-badge">用户</span>
        {{# } }}
    </script>
    @endverbatim

    {{-- 使用率列模板 --}}
    @verbatim
    <script type="text/html" id="space-usage-tpl">
        <div class="usage-bar-wrap">
            <div class="usage-bar">
                <div class="usage-bar-inner" style="width:{{d.usagePercent}}%;background:{{d.usageColor}};"></div>
            </div>
            <span class="usage-text">{{d.used_mb}} / {{d.quota_mb}} MB ({{d.usagePercent}}%)</span>
        </div>
    </script>
    @endverbatim

    {{-- 操作列模板 --}}
    @verbatim
    <script type="text/html" id="space-bar">
        <div class="layui-btn-container">
            <a class="layui-btn layui-btn-xs layui-btn-normal" lay-event="edit" data-permission="cmspro.windowsxponline.spaces">编辑配额</a>
        </div>
    </script>
    @endverbatim
</div>

<script src="{{ asset('CmsProUi/component/layui/layui.js') }}"></script>
<script src="{{ asset('CmsProUi/component/pear/pear.js') }}"></script>
@include('admin.partials.permission-script')
<script>
var CSRF_TOKEN = '{{ csrf_token() }}';
var BASE = '/api/admin/cmspro/windowsxponline';

layui.use(['table', 'form', 'jquery', 'layer'], function () {
    var table = layui.table;
    var form = layui.form;
    var $ = layui.jquery;
    var layer = layui.layer;

    // CSRF + 登录态统一处理
    $.ajaxSetup({
        headers: { 'X-CSRF-TOKEN': CSRF_TOKEN },
        statusCode: {
            401: function () {
                if (window.__redirecting) { return; }
                window.__redirecting = true;
                layer.msg('登录已过期，请重新登录', { icon: 2, time: 1500 }, function () {
                    window.location.href = '/admin/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
                });
            }
        }
    });

    /**
     * 解析后端错误文案
     */
    function parseError(xhr, fallback) {
        if (xhr && xhr.status === 401) { return ''; }
        try {
            var res = JSON.parse(xhr && xhr.responseText);
            if (res && res.message) { return res.message; }
        } catch (e) {}
        return fallback;
    }

    /** 计算使用率颜色 */
    function usageColor(percent) {
        if (percent >= 90) { return '#ff5722'; }
        if (percent >= 70) { return '#ffb800'; }
        return '#16b777';
    }

    table.render({
        elem: '#space-table',
        url: BASE + '/spaces',
        request: { pageName: 'page', limitName: 'per_page' },
        page: {
            layout: ['count', 'prev', 'page', 'next', 'limit'],
            groups: 5,
            limit: 15,
            limits: [10, 15, 30, 50]
        },
        cols: [[
            { title: 'ID', field: 'id', align: 'center', width: 70, sort: true },
            { title: '用户名', field: 'username', align: 'center', minWidth: 120 },
            { title: '用户类型', field: 'user_type', align: 'center', width: 100, templet: '#space-type-tpl' },
            { title: '配额(MB)', field: 'quota_mb', align: 'center', width: 110, sort: true },
            { title: '已用(MB)', field: 'used_mb', align: 'center', width: 110 },
            { title: '使用率', align: 'center', minWidth: 200, templet: '#space-usage-tpl' },
            { title: '状态', field: 'status', align: 'center', width: 90, templet: '#space-status-tpl' },
            { title: '创建时间', field: 'create_time', align: 'center', width: 170 },
            { title: '操作', toolbar: '#space-bar', align: 'center', width: 110, fixed: 'right' }
        ]],
        skin: false,
        defaultToolbar: [{
            title: '刷新',
            layEvent: 'refresh',
            icon: 'layui-icon-refresh'
        }, 'filter', 'print', 'exports'],
        parseData: function (res) {
            var list = [];
            if (res.code === 0 && res.data) {
                var items = res.data.items || [];
                $.each(items, function (i, item) {
                    var quota = item.quota_mb || 0;
                    var used = item.used_mb || 0;
                    var percent = quota > 0 ? Math.min(100, Math.round(used / quota * 100)) : 0;
                    list.push({
                        id: item.id,
                        user_type: item.user_type,
                        user_id: item.user_id,
                        username: item.username,
                        quota_mb: quota,
                        used_mb: used,
                        usagePercent: percent,
                        usageColor: usageColor(percent),
                        status: item.status,
                        create_time: item.create_time
                    });
                });
            }
            return {
                code: res.code === 0 ? 0 : 1,
                msg: res.message || '',
                count: res.data && res.data.pagination ? res.data.pagination.total : 0,
                data: list
            };
        },
        done: function () {
            // 根据权限隐藏行内操作按钮
            $('td [data-permission]').each(function () {
                if (!window.hasPermission || !window.hasPermission($(this).data('permission'))) {
                    $(this).hide();
                }
            });
        }
    });

    // 搜索
    form.on('submit(space-query)', function (data) {
        table.reload('space-table', { where: data.field, page: { curr: 1 } });
        return false;
    });

    // 工具栏刷新
    table.on('toolbar(space-table)', function (obj) {
        if (obj.event === 'refresh') {
            table.reload('space-table');
        }
    });

    // 编辑配额弹窗
    table.on('tool(space-table)', function (obj) {
        if (obj.event !== 'edit') { return; }
        var d = obj.data;

        var html = [
            '<div style="padding: 20px;">',
            '  <form class="layui-form" lay-filter="editForm" onsubmit="return false;">',
            '    <div class="layui-form-item">',
            '      <label class="layui-form-label">用户名</label>',
            '      <div class="layui-input-block">',
            '        <input type="text" class="layui-input" value="' + d.username + '" disabled>',
            '      </div>',
            '    </div>',
            '    <div class="layui-form-item">',
            '      <label class="layui-form-label">配额(MB)</label>',
            '      <div class="layui-input-block">',
            '        <input type="number" name="quota_mb" class="layui-input" min="0" value="' + d.quota_mb + '" placeholder="0 表示不限制">',
            '        <div class="space-form-tips">当前已用 ' + d.used_mb + ' MB，使用率 ' + d.usagePercent + '%</div>',
            '      </div>',
            '    </div>',
            '    <div class="layui-form-item">',
            '      <label class="layui-form-label">状态</label>',
            '      <div class="layui-input-block">',
            '        <select name="status">',
            '          <option value="1"' + (d.status == 1 ? ' selected' : '') + '>启用</option>',
            '          <option value="0"' + (d.status == 0 ? ' selected' : '') + '>禁用</option>',
            '        </select>',
            '      </div>',
            '    </div>',
            '    <div class="layui-form-item" style="text-align:center;margin-top:15px;">',
            '      <button class="layui-btn" lay-submit lay-filter="saveSpace" style="min-width:120px;">保存</button>',
            '    </div>',
            '  </form>',
            '</div>'
        ].join('');

        var editIndex = layer.open({
            type: 1,
            title: '编辑空间配额 - ' + d.username,
            shade: [0.5, '#000'],
            area: ['460px', '380px'],
            content: html,
            success: function () {
                form.render(null, 'editForm');
                form.on('submit(saveSpace)', function (formData) {
                    var $btn = $(this);
                    if ($btn.prop('disabled')) { return false; }
                    $btn.prop('disabled', true).text('保存中…');

                    var payload = {
                        quota_mb: parseInt(formData.field.quota_mb, 10) || 0,
                        status: parseInt(formData.field.status, 10)
                    };

                    $.ajax({
                        url: BASE + '/spaces/' + d.id,
                        type: 'PUT',
                        dataType: 'json',
                        contentType: 'application/json',
                        data: JSON.stringify(payload),
                        success: function (res) {
                            if (res.code === 0) {
                                layer.close(editIndex);
                                layer.msg('空间配额已更新', { icon: 1, time: 1200 });
                                table.reload('space-table');
                            } else {
                                layer.msg(res.message || '更新失败', { icon: 2, time: 3000 });
                            }
                        },
                        error: function (xhr) {
                            var msg = parseError(xhr, '更新请求失败');
                            if (msg) { layer.msg(msg, { icon: 2, time: 3000 }); }
                        },
                        complete: function () {
                            $btn.prop('disabled', false).text('保存');
                        }
                    });
                    return false;
                });
            }
        });
    });
});
</script>
</body>
</html>
