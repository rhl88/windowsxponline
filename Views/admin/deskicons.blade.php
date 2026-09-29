<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Windows XP Online · 桌面图标</title>
    <link rel="stylesheet" href="{{ asset('CmsProUi/component/pear/css/pear.css') }}">
    <link rel="stylesheet" href="{{ asset('CmsProUi/font-awesome/4.7.0/css/font-awesome.min.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/admin.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/variables.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/reset.css') }}">
    <style>
        .deskicon-form-tips { font-size: 12px; color: #5f5f5f; line-height: 1.6; margin-top: 4px; }
        .deskicon-icon-cell img { width: 26px; height: 26px; object-fit: contain; vertical-align: middle; }
        .deskicon-target-cell { display: block; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .deskicon-upload-row { display: flex; align-items: center; gap: 8px; }
        .deskicon-upload-row .layui-input { flex: 1; }
        .deskicon-preview { margin-top: 8px; }
        .deskicon-preview img { width: 32px; height: 32px; object-fit: contain; border: 1px solid #e6e6e6; border-radius: 3px; padding: 2px; background: #fff; }
        .deskicon-preview img[data-empty="1"] { visibility: hidden; }
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
                    <div class="layui-input-inline" style="width:200px;">
                        <input type="text" name="keyword" placeholder="图标名称" class="layui-input">
                    </div>
                </div>
                <div class="layui-inline">
                    <div class="layui-input-inline" style="width:160px;">
                        <select name="type">
                            <option value="">全部类型</option>
                            <option value="web">网页快捷方式</option>
                            <option value="frame">框架页面</option>
                            <option value="path">路径快捷方式</option>
                        </select>
                    </div>
                </div>
                <div class="layui-inline">
                    <button class="layui-btn layui-btn-md" lay-submit lay-filter="deskicon-query">
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
            <table id="deskicon-table" lay-filter="deskicon-table"></table>
        </div>
    </div>

    {{-- 图标列模板 --}}
    @verbatim
    <script type="text/html" id="deskicon-icon-tpl">
        {{# if(d.icon_url){ }}
        <img src="{{d.icon_url}}" alt="">
        {{# } else { }}
        <i class="layui-icon layui-icon-picture" style="color:#c2c2c2;font-size:20px;"></i>
        {{# } }}
    </script>
    @endverbatim

    {{-- 目标列模板 --}}
    @verbatim
    <script type="text/html" id="deskicon-target-tpl">
        <span class="deskicon-target-cell" title="{{d.target}}">{{d.target}}</span>
    </script>
    @endverbatim

    {{-- 类型列模板 --}}
    @verbatim
    <script type="text/html" id="deskicon-type-tpl">
        {{# if(d.type === 'web'){ }}
        <span class="layui-badge layui-bg-blue">网页快捷方式</span>
        {{# } else if(d.type === 'frame'){ }}
        <span class="layui-badge layui-bg-green">框架页面</span>
        {{# } else { }}
        <span class="layui-badge layui-bg-orange">路径快捷方式</span>
        {{# } }}
    </script>
    @endverbatim

    {{-- 状态列模板 --}}
    @verbatim
    <script type="text/html" id="deskicon-status-tpl">
        {{# if(d.status == 1){ }}
        <span class="layui-badge layui-bg-green">启用</span>
        {{# } else { }}
        <span class="layui-badge layui-bg-red">禁用</span>
        {{# } }}
    </script>
    @endverbatim

    {{-- 操作列模板 --}}
    @verbatim
    <script type="text/html" id="deskicon-bar">
        <div class="layui-btn-container">
            <a class="layui-btn layui-btn-xs layui-btn-normal" lay-event="edit" data-permission="cmspro.windowsxponline.deskicons">编辑</a>
            <a class="layui-btn layui-btn-xs layui-btn-danger" lay-event="del" data-permission="cmspro.windowsxponline.deskicons">删除</a>
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

    var TYPE_TEXT = { web: '网页快捷方式', frame: '框架页面', path: '路径快捷方式' };
    var TARGET_TIPS = {
        web: '网页网址，支持 http://、https:// 或站内以 / 开头的地址',
        frame: '框架页面地址，需允许被 iframe 嵌入；支持 http://、https:// 或站内以 / 开头的地址',
        path: 'XP 桌面路径，以 / 开头，如 /我的文档'
    };

    /** 解析后端错误文案 */
    function parseError(xhr, fallback) {
        if (xhr && xhr.status === 401) { return ''; }
        try {
            var res = JSON.parse(xhr && xhr.responseText);
            if (res && res.message) { return res.message; }
        } catch (e) {}
        return fallback;
    }

    /** HTML 转义（表格模板直接用字符串拼接，避免图标名称/地址注入标签） */
    function esc(value) {
        return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    table.render({
        elem: '#deskicon-table',
        url: BASE + '/deskicons',
        request: { pageName: 'page', limitName: 'per_page' },
        page: {
            layout: ['count', 'prev', 'page', 'next', 'limit'],
            groups: 5,
            limit: 15,
            limits: [10, 15, 30, 50]
        },
        cols: [[
            { title: 'ID', field: 'id', align: 'center', width: 70, sort: true },
            { title: '图标', align: 'center', width: 70, templet: '#deskicon-icon-tpl' },
            { title: '名称', field: 'name', align: 'center', minWidth: 130 },
            { title: '类型', field: 'type', align: 'center', width: 130, templet: '#deskicon-type-tpl' },
            { title: '目标', field: 'target', align: 'left', minWidth: 240, templet: '#deskicon-target-tpl' },
            { title: '排序', field: 'sort', align: 'center', width: 80, sort: true },
            { title: '状态', field: 'status', align: 'center', width: 90, templet: '#deskicon-status-tpl' },
            { title: '创建时间', field: 'create_time', align: 'center', width: 170 },
            { title: '操作', toolbar: '#deskicon-bar', align: 'center', width: 130, fixed: 'right' }
        ]],
        skin: false,
        defaultToolbar: [{
            title: '新增图标',
            layEvent: 'add',
            icon: 'layui-icon-add-1'
        }, {
            title: '刷新',
            layEvent: 'refresh',
            icon: 'layui-icon-refresh'
        }, 'filter', 'print', 'exports'],
        parseData: function (res) {
            var list = [];
            if (res.code === 0 && res.data) {
                $.each(res.data.items || [], function (i, item) {
                    list.push({
                        id: item.id,
                        /* 表格模板用转义值，表单/预览用原始值（表单内再统一转义） */
                        name: esc(item.name),
                        nameRaw: item.name,
                        type: item.type,
                        typeText: TYPE_TEXT[item.type] || item.type,
                        target: esc(item.target),
                        targetRaw: item.target,
                        icon_url: esc(item.icon_url),
                        icon_urlRaw: item.icon_url,
                        window_width: item.window_width,
                        window_height: item.window_height,
                        sort: item.sort,
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
    form.on('submit(deskicon-query)', function (data) {
        table.reload('deskicon-table', { where: data.field, page: { curr: 1 } });
        return false;
    });

    // 工具栏事件
    table.on('toolbar(deskicon-table)', function (obj) {
        if (obj.event === 'add') {
            openIconForm(null);
        } else if (obj.event === 'refresh') {
            table.reload('deskicon-table');
        }
    });

    // 行内操作
    table.on('tool(deskicon-table)', function (obj) {
        if (obj.event === 'edit') {
            openIconForm(obj.data);
        } else if (obj.event === 'del') {
            confirmDelete(obj.data);
        }
    });

    /**
     * 组装新增/编辑表单 HTML
     * @param {object|null} d 编辑时的行数据，新增传 null
     */
    function buildFormHtml(d) {
        var data = d || {
            name: '', type: 'web', target: '', icon_url: '',
            window_width: 1024, window_height: 720, sort: 0, status: 1
        };
        var typeOpts = ['web', 'frame', 'path'].map(function (t) {
            return '<option value="' + t + '"' + (data.type === t ? ' selected' : '') + '>' + TYPE_TEXT[t] + '</option>';
        }).join('');
        var statusOpts = [1, 0].map(function (s) {
            return '<option value="' + s + '"' + (data.status === s ? ' selected' : '') + '>' + (s === 1 ? '启用' : '禁用') + '</option>';
        }).join('');
        var frameRow = data.type === 'frame' ? '' : ' style="display:none;"';

        return [
            '<div style="padding:16px 20px;">',
            '<form class="layui-form" lay-filter="deskiconForm" onsubmit="return false;">',
            '  <div class="layui-form-item">',
            '    <label class="layui-form-label">名称</label>',
            '    <div class="layui-input-block">',
            '      <input type="text" name="name" class="layui-input" maxlength="100" value="' + esc(data.name) + '" placeholder="桌面图标显示文字">',
            '    </div>',
            '  </div>',
            '  <div class="layui-form-item">',
            '    <label class="layui-form-label">类型</label>',
            '    <div class="layui-input-block">',
            '      <select name="type" lay-filter="deskiconType">' + typeOpts + '</select>',
            '    </div>',
            '  </div>',
            '  <div class="layui-form-item">',
            '    <label class="layui-form-label">目标</label>',
            '    <div class="layui-input-block">',
            '      <input type="text" name="target" class="layui-input" maxlength="1024" value="' + esc(data.target) + '" placeholder="网址或桌面路径">',
            '      <div class="deskicon-form-tips" id="targetTips"></div>',
            '    </div>',
            '  </div>',
            '  <div class="layui-form-item">',
            '    <label class="layui-form-label">图标</label>',
            '    <div class="layui-input-block">',
            '      <div class="deskicon-upload-row">',
            '        <input type="text" name="icon_url" class="layui-input" maxlength="500" value="' + esc(data.icon_url) + '" placeholder="可留空使用默认图标">',
            '        <button type="button" class="layui-btn layui-btn-primary" id="iconUploadBtn">上传</button>',
            '      </div>',
            '      <input type="file" id="iconFileInput" accept=".ico,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg" style="display:none;">',
            '      <div class="deskicon-preview"><img id="iconPreview" src="' + esc(data.icon_url) + '" data-empty="' + (data.icon_url ? '0' : '1') + '" alt=""></div>',
            '    </div>',
            '  </div>',
            '  <div class="layui-form-item"' + frameRow + ' id="frameSizeRow">',
            '    <label class="layui-form-label">窗口尺寸</label>',
            '    <div class="layui-input-inline" style="width:110px;">',
            '      <input type="number" name="window_width" class="layui-input" min="320" max="4096" value="' + (data.window_width || 1024) + '">',
            '    </div>',
            '    <div class="layui-input-inline" style="width:110px;">',
            '      <input type="number" name="window_height" class="layui-input" min="320" max="4096" value="' + (data.window_height || 720) + '">',
            '    </div>',
            '    <div class="layui-form-mid">px</div>',
            '  </div>',
            '  <div class="layui-form-item">',
            '    <label class="layui-form-label">排序</label>',
            '    <div class="layui-input-inline" style="width:110px;">',
            '      <input type="number" name="sort" class="layui-input" value="' + (data.sort || 0) + '">',
            '    </div>',
            '    <div class="layui-form-mid layui-word-aux">数值越小越靠前</div>',
            '  </div>',
            '  <div class="layui-form-item">',
            '    <label class="layui-form-label">状态</label>',
            '    <div class="layui-input-block">',
            '      <select name="status">' + statusOpts + '</select>',
            '    </div>',
            '  </div>',
            '  <div class="layui-form-item" style="text-align:center;margin-top:15px;">',
            '    <button class="layui-btn" lay-submit lay-filter="saveDeskicon" style="min-width:120px;">保存</button>',
            '  </div>',
            '</form>',
            '</div>'
        ].join('');
    }

    /**
     * 打开新增/编辑弹窗
     * @param {object|null} d 编辑行数据，新增传 null
     */
    function openIconForm(d) {
        var iconId = d ? d.id : null;
        // 表单字段一律使用未转义的原始值，由 buildFormHtml 统一做属性转义
        var values = d ? {
            name: d.nameRaw,
            type: d.type,
            target: d.targetRaw,
            icon_url: d.icon_urlRaw,
            window_width: d.window_width,
            window_height: d.window_height,
            sort: d.sort,
            status: d.status
        } : null;

        var index = layer.open({
            type: 1,
            title: iconId ? '编辑桌面图标 - ' + d.name : '新增桌面图标',
            shade: [0.5, '#000'],
            area: ['620px', '660px'],
            content: buildFormHtml(values),
            success: function (layero) {
                form.render(null, 'deskiconForm');

                // 类型联动：框架页面才需要窗口尺寸
                function syncType(type) {
                    $('#targetTips').text(TARGET_TIPS[type] || '');
                    if (type === 'frame') {
                        $('#frameSizeRow').show();
                    } else {
                        $('#frameSizeRow').hide();
                    }
                }
                syncType(values ? values.type : 'web');
                form.on('select(deskiconType)', function (data) {
                    syncType(data.value);
                });

                // 图标预览
                var $iconInput = $('input[name=icon_url]', layero);
                function syncPreview(url) {
                    var $img = $('#iconPreview', layero);
                    if (url) {
                        $img.attr('src', url).data('empty', '0');
                    } else {
                        $img.attr('src', '').data('empty', '1');
                    }
                }
                syncPreview(values ? values.icon_url : '');
                $iconInput.on('input', function () {
                    syncPreview($(this).val());
                });

                // 图标上传：图标需支持 .ico，故走应用内上传接口
                $('#iconUploadBtn', layero).on('click', function () {
                    $('#iconFileInput', layero).click();
                });
                $('#iconFileInput', layero).on('change', function () {
                    var file = this.files[0];
                    if (!file) { return; }

                    var fd = new FormData();
                    fd.append('icon', file);

                    var $btn = $('#iconUploadBtn', layero);
                    $btn.prop('disabled', true).text('上传中…');

                    $.ajax({
                        url: BASE + '/deskicons/icon',
                        type: 'POST',
                        data: fd,
                        processData: false,
                        contentType: false,
                        dataType: 'json',
                        success: function (res) {
                            if (res.code === 0 && res.data && res.data.url) {
                                $iconInput.val(res.data.url);
                                syncPreview(res.data.url);
                                layer.msg('图标已上传', { icon: 1, time: 1200 });
                            } else {
                                layer.msg(res.message || '图标上传失败', { icon: 2, time: 3000 });
                            }
                        },
                        error: function (xhr) {
                            var msg = parseError(xhr, '图标上传失败');
                            if (msg) { layer.msg(msg, { icon: 2, time: 3000 }); }
                        },
                        complete: function () {
                            $btn.prop('disabled', false).text('上传');
                            $('#iconFileInput', layero).val('');
                        }
                    });
                });

                // 保存
                form.on('submit(saveDeskicon)', function (formData) {
                    var $btn = $(this);
                    if ($btn.prop('disabled')) { return false; }
                    $btn.prop('disabled', true).text('保存中…');

                    var f = formData.field;
                    var payload = {
                        name: f.name,
                        type: f.type,
                        target: f.target,
                        icon_url: f.icon_url || '',
                        window_width: parseInt(f.window_width, 10) || 1024,
                        window_height: parseInt(f.window_height, 10) || 720,
                        sort: parseInt(f.sort, 10) || 0,
                        status: parseInt(f.status, 10)
                    };

                    $.ajax({
                        url: iconId ? BASE + '/deskicons/' + iconId : BASE + '/deskicons',
                        type: iconId ? 'PUT' : 'POST',
                        dataType: 'json',
                        contentType: 'application/json',
                        data: JSON.stringify(payload),
                        success: function (res) {
                            if (res.code === 0) {
                                layer.close(index);
                                layer.msg(iconId ? '桌面图标已更新' : '桌面图标已创建', { icon: 1, time: 1200 });
                                table.reload('deskicon-table');
                            } else {
                                layer.msg(res.message || '保存失败', { icon: 2, time: 3000 });
                            }
                        },
                        error: function (xhr) {
                            var msg = parseError(xhr, '保存请求失败');
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
    }

    /**
     * 删除确认
     * @param {object} d 行数据
     */
    function confirmDelete(d) {
        layer.confirm('确定删除桌面图标「' + d.name + '」吗？', {
            title: '删除确认',
            icon: 3
        }, function (idx) {
            layer.close(idx);
            $.ajax({
                url: BASE + '/deskicons/' + d.id,
                type: 'DELETE',
                dataType: 'json',
                success: function (res) {
                    if (res.code === 0) {
                        layer.msg('桌面图标已删除', { icon: 1, time: 1200 });
                        table.reload('deskicon-table');
                    } else {
                        layer.msg(res.message || '删除失败', { icon: 2, time: 3000 });
                    }
                },
                error: function (xhr) {
                    var msg = parseError(xhr, '删除请求失败');
                    if (msg) { layer.msg(msg, { icon: 2, time: 3000 }); }
                }
            });
        });
    }
});
</script>
</body>
</html>