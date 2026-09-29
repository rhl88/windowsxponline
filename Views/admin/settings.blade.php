<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Windows XP Online · 应用设置</title>
    <link rel="stylesheet" href="{{ asset('CmsProUi/component/pear/css/pear.css') }}">
    <link rel="stylesheet" href="{{ asset('CmsProUi/font-awesome/4.7.0/css/font-awesome.min.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/admin.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/variables.css') }}">
    <link rel="stylesheet" href="{{ asset('Admin/css/reset.css') }}">
    <style>
        .layui-input-block{margin-left: 140px;}
        .layui-form-select { width: 300px;}
        .layui-form-label { white-space: nowrap; }
        .item-tips { font-size: 12px; color: #5f5f5f; line-height: 1.6; margin-top: 4px; }
        .driver-panel { display: none; }
        .driver-panel.active { display: block; }
        .settings-tabs .layui-tab-content { padding: 15px 0 0; }
        .bottom-bar { margin-top: 20px; padding-left: 130px; }
        .bottom-bar .layui-btn { min-width: 120px; }
        input:focus-visible, select:focus-visible {
            outline: 2px solid var(--global-primary-color, #1e9fff);
            outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
            * { transition: none !important; }
        }
    </style>
</head>
<body>
<div class="pear-container">
    <div class="layui-card">
        <div class="layui-card-body" style="padding: 20px;">
            <form class="layui-form" lay-filter="settingsForm" onsubmit="return false;">

                <div class="layui-tab layui-tab-brief settings-tabs">
                    <ul class="layui-tab-title">
                        <li class="layui-this">基础设置</li>
                        <li>存储设置</li>
                    </ul>
                    <div class="layui-tab-content">

                        {{-- Tab 一：基础设置 --}}
                        <div class="layui-tab-item layui-show">
                            <div class="layui-form-item">
                                <label class="layui-form-label">访问模式</label>
                                <div class="layui-input-block">
                                    <select name="access_mode" lay-filter="accessModeSelect">
                                        <option value="standalone">单机版（仅超级管理员私有使用）</option>
                                        <option value="online">在线版（所有注册用户可登录使用）</option>
                                        <option value="anonymous">免登录版（Windows 帐户验证登录）</option>
                                    </select>
                                    <div class="item-tips">单机版模式下仅超级管理员可访问 XP 桌面；在线版模式下所有注册用户均可使用自己的 XP 桌面；免登录版无需注册登录，访问者以 Windows 帐户名+密码登录桌面，各帐户桌面数据独立</div>
                                </div>
                            </div>
                            <div class="layui-form-item">
                                <label class="layui-form-label">访问方式</label>
                                <div class="layui-input-block">
                                    <select name="access_type" lay-filter="accessTypeSelect">
                                        <option value="custom_path">自定义访问路径</option>
                                        <option value="bind_domain">绑定域名</option>
                                    </select>
                                    <div class="item-tips">选择访问方式后在下方输入对应配置；两者均留空则通过默认菜单路径访问</div>
                                </div>
                            </div>
                            <div class="layui-form-item access-type-panel" data-type="custom_path" style="display:none;">
                                <label class="layui-form-label">自定义路径</label>
                                <div class="layui-input-block">
                                    <input type="text" name="access_path" class="layui-input" placeholder="如 /my-xp" autocomplete="off">
                                    <div class="item-tips">自定义桌面访问入口路径，保存后可通过 http://站点域名/my-xp 打开 XP 桌面；勿与系统已有路径冲突，留空则通过默认菜单路径访问</div>
                                </div>
                            </div>
                            <div class="layui-form-item access-type-panel" data-type="bind_domain" style="display:none;">
                                <label class="layui-form-label">绑定域名</label>
                                <div class="layui-input-block">
                                    <input type="text" name="bind_domain" class="layui-input" placeholder="如 xp.example.com" autocomplete="off">
                                    <div class="item-tips">直接填写域名即可（无需 http/https 前缀；需在服务器将该域名解析/反代到本站），保存后可通过该域名直接打开 XP 桌面</div>
                                </div>
                            </div>
                            <div class="layui-form-item">
                                <label class="layui-form-label">XP 管理员密码</label>
                                <div class="layui-input-block">
                                    <input type="text" name="xp_admin_password" class="layui-input" placeholder="明文回显，留空则沿用初始默认密码" autocomplete="off">
                                    <div class="item-tips">前台 XP 桌面 Administrator 帐户的登录密码，明文回显便于查看，清空保存即恢复初始默认密码；Guest 帐户为只读模式，其创建的文件与记录均为临时数据、不做保存</div>
                                </div>
                            </div>
                            <div class="layui-form-item">
                                <label class="layui-form-label">快速启动默认项</label>
                                <div class="layui-input-block">
                                    <input type="checkbox" name="ql_showdesktop" title="显示桌面" lay-skin="primary" disabled checked>
                                    <input type="checkbox" name="ql_ie" title="Internet Explorer" lay-skin="primary">
                                    <input type="checkbox" name="ql_wmp" title="Windows Media Player" lay-skin="primary">
                                    <input type="checkbox" name="ql_notepad" title="记事本" lay-skin="primary">
                                    <input type="checkbox" name="ql_calc" title="计算器" lay-skin="primary">
                                    <input type="checkbox" name="ql_cmd" title="命令提示符" lay-skin="primary">
                                    <input type="checkbox" name="ql_taskmgr" title="任务管理器" lay-skin="primary">
                                    <div class="item-tips">任务栏快速启动区的默认快捷方式，对新初始化用户与新建帐户生效；「显示桌面」为固定必选项，老用户仅自动补齐该项；用户在桌面拖拽到快速启动的内容保存在其个人 Quick Launch 文件夹、不受此配置影响</div>
                                </div>
                            </div>
                            <div class="layui-form-item">
                                <label class="layui-form-label">IE 默认主页</label>
                                <div class="layui-input-block">
                                    <input type="text" name="xp_ie_homepage" class="layui-input" placeholder="如 www.cmspro.cn 或 https://www.cmspro.cn/" autocomplete="off">
                                    <div class="item-tips">桌面 Internet Explorer 的默认主页，可填域名或完整网址（自动补全 https:// 前缀）；保存后强制同步到所有用户的 IE 主页，用户之后在桌面「Internet 选项」中的自定义不受影响；留空恢复出厂默认</div>
                                </div>
                            </div>
                            <div class="layui-form-item">
                                <label class="layui-form-label">游客功能</label>
                                <div class="layui-input-block">
                                    <input type="checkbox" name="xp_guest_enabled" lay-skin="switch" lay-text="开启|关闭">
                                    <div class="item-tips">控制前台登录页是否展示内置 Guest 游客帐户，默认关闭；关闭时登录页不显示 Guest 且同时拒绝其登录请求；Guest 为只读体验帐户，其写入均为临时数据不做保存</div>
                                </div>
                            </div>
                        </div>

                        {{-- Tab 二：存储设置 --}}
                        <div class="layui-tab-item">
                            <div class="layui-form-item">
                                <label class="layui-form-label">存储驱动</label>
                                <div class="layui-input-block">
                                    <select name="storage_driver" lay-filter="driverSelect" id="driverSelect">
                                        <option value="local">本地存储</option>
                                        <option value="oss">阿里云 OSS</option>
                                        <option value="cos">腾讯云 COS</option>
                                    </select>
                                    <div class="item-tips">用户 XP 桌面状态数据的存储位置；切换驱动不影响已存储的数据，新数据将使用新驱动</div>
                                </div>
                            </div>
                            <div class="layui-form-item">
                                <label class="layui-form-label">默认空间配额(MB)</label>
                                <div class="layui-input-inline" style="width:180px;">
                                    <input type="number" name="default_space_quota" class="layui-input" min="0" placeholder="100">
                                </div>
                                <div class="layui-form-mid layui-word-aux">新用户首次访问时分配的硬盘空间，0 表示不限制</div>
                            </div>

                            {{-- 阿里云 OSS 配置面板 --}}
                            <div class="driver-panel" data-driver="oss">
                                <blockquote class="layui-elem-quote" style="font-size:13px;">
                                    在 RAM 控制台创建子用户并授予 AliyunOSSFullAccess 权限后获取密钥
                                </blockquote>
                                <div class="layui-form-item">
                                    <label class="layui-form-label">AccessKey ID</label>
                                    <div class="layui-input-block">
                                        <input type="text" name="oss_access_key" class="layui-input" placeholder="LTAI5t****" autocomplete="off">
                                    </div>
                                </div>
                                <div class="layui-form-item">
                                    <label class="layui-form-label">AccessKey Secret</label>
                                    <div class="layui-input-block">
                                        <input type="password" name="oss_access_secret" class="layui-input" placeholder="加密存储，保存后不回显" autocomplete="new-password">
                                    </div>
                                </div>
                                <div class="layui-form-item">
                                    <label class="layui-form-label">Bucket 名称</label>
                                    <div class="layui-input-block">
                                        <input type="text" name="oss_bucket" class="layui-input" placeholder="my-bucket" autocomplete="off">
                                    </div>
                                </div>
                                <div class="layui-form-item">
                                    <label class="layui-form-label">Endpoint</label>
                                    <div class="layui-input-block">
                                        <input type="text" name="oss_endpoint" class="layui-input" placeholder="oss-cn-hangzhou.aliyuncs.com" autocomplete="off">
                                        <div class="item-tips">地域节点域名；同地域 ECS 可填 internal 内网域名免流量费</div>
                                    </div>
                                </div>
                            </div>

                            {{-- 腾讯云 COS 配置面板 --}}
                            <div class="driver-panel" data-driver="cos">
                                <blockquote class="layui-elem-quote" style="font-size:13px;">
                                    密钥在「访问管理 → 密钥管理」创建，APPID 在「账号信息」查看
                                </blockquote>
                                <div class="layui-form-item">
                                    <label class="layui-form-label">SecretId</label>
                                    <div class="layui-input-block">
                                        <input type="text" name="cos_secret_id" class="layui-input" placeholder="AKID****" autocomplete="off">
                                    </div>
                                </div>
                                <div class="layui-form-item">
                                    <label class="layui-form-label">SecretKey</label>
                                    <div class="layui-input-block">
                                        <input type="password" name="cos_secret_key" class="layui-input" placeholder="加密存储，保存后不回显" autocomplete="new-password">
                                    </div>
                                </div>
                                <div class="layui-form-item">
                                    <label class="layui-form-label">Bucket 名称</label>
                                    <div class="layui-input-block">
                                        <input type="text" name="cos_bucket" class="layui-input" placeholder="mybucket-1250000000" autocomplete="off">
                                    </div>
                                </div>
                                <div class="layui-form-item">
                                    <label class="layui-form-label">所属地域</label>
                                    <div class="layui-input-block">
                                        <input type="text" name="cos_region" class="layui-input" placeholder="ap-guangzhou" autocomplete="off">
                                        <div class="item-tips">如 ap-guangzhou、ap-shanghai、ap-beijing</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="bottom-bar">
                    <button class="layui-btn" id="saveBtn" data-permission="cmspro.windowsxponline.settings"><i class="layui-icon layui-icon-ok"></i> 保存设置</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="{{ asset('CmsProUi/component/layui/layui.js') }}"></script>
<script src="{{ asset('CmsProUi/component/pear/pear.js') }}"></script>
@include('admin.partials.permission-script')
<script>
var CSRF_TOKEN = '{{ csrf_token() }}';
var BASE = '/api/admin/cmspro/windowsxponline';
// 快速启动可选程序（showdesktop 为固定必选项，不参与勾选收集）
var QL_APP_IDS = ['ie', 'wmp', 'notepad', 'calc', 'cmd', 'taskmgr'];

layui.use(['form', 'element', 'jquery', 'layer'], function () {
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

    // 根据权限隐藏操作按钮
    $('#saveBtn[data-permission]').each(function () {
        if (!window.hasPermission || !window.hasPermission($(this).data('permission'))) {
            $(this).hide();
        }
    });

    /** 切换存储驱动面板 */
    function switchDriverPanel(driver) {
        $('.driver-panel').removeClass('active');
        $('.driver-panel[data-driver="' + driver + '"]').addClass('active');
    }

    /** 切换访问方式面板 */
    function switchAccessTypePanel(type) {
        $('.access-type-panel').hide();
        $('.access-type-panel[data-type="' + type + '"]').show();
    }

    /** 加载配置 */
    function loadSettings() {
        $.get(BASE + '/settings', function (res) {
            if (res.code !== 0) {
                layer.msg(res.message || '读取配置失败', { icon: 2 });
                return;
            }
            var data = res.data || {};
            // 密钥字段不回显（xp_admin_password 明文回显，不在此列）
            ['oss_access_secret', 'cos_secret_key'].forEach(function (k) {
                data[k] = data[k] === '******' ? '' : (data[k] || '');
            });
            // 根据已配置值推断访问方式（两者均空时默认展示自定义路径面板）
            if (data.bind_domain && !data.access_path) {
                data.access_type = 'bind_domain';
            } else {
                data.access_type = 'custom_path';
            }
            form.val('settingsForm', data);
            // 快速启动默认项回显（逗号分隔 appId 列表）
            var qlIds = (data.xp_quicklaunch_defaults || 'showdesktop,ie,wmp').split(',');
            QL_APP_IDS.forEach(function (id) {
                $('input[name=ql_' + id + ']').prop('checked', qlIds.indexOf(id.trim()) > -1);
            });
            // 游客功能开关回显（后端存 '0'/'1' 字符串，需显式转为布尔，否则 '0' 亦为真值）
            $('input[name=xp_guest_enabled]').prop('checked', String(data.xp_guest_enabled) === '1');
            switchDriverPanel($('select[name=storage_driver]').val());
            switchAccessTypePanel(data.access_type);
            form.render();
        }).fail(function (xhr) {
            var msg = parseError(xhr, '加载配置请求失败');
            if (msg) { layer.msg(msg, { icon: 2 }); }
        });
    }

    // 存储驱动切换事件
    form.on('select(driverSelect)', function (data) {
        switchDriverPanel(data.value);
    });

    // 访问方式切换事件
    form.on('select(accessTypeSelect)', function (data) {
        switchAccessTypePanel(data.value);
    });

    // 保存设置
    $('#saveBtn').on('click', function () {
        var data = form.val('settingsForm');
        // 快速启动默认项：收集勾选项组装为逗号分隔串，showdesktop 固定置顶
        var qlSelected = ['showdesktop'];
        QL_APP_IDS.forEach(function (id) {
            if ($('input[name=ql_' + id + ']').prop('checked')) {
                qlSelected.push(id);
            }
            delete data['ql_' + id];
        });
        data.xp_quicklaunch_defaults = qlSelected.join(',');
        delete data.ql_showdesktop;
        // 游客功能开关：Layui checkbox 未勾选时不提交该字段，须显式转为 '0'/'1'，否则后台无法关闭
        data.xp_guest_enabled = $('input[name=xp_guest_enabled]').prop('checked') ? '1' : '0';
        // IE 默认主页：去除首尾空白，留空即由后端恢复出厂默认
        data.xp_ie_homepage = (data.xp_ie_homepage || '').trim();
        // 留空的密钥不覆盖库中已保存值（xp_admin_password 明文回显，留空即清空密码恢复默认）
        ['oss_access_secret', 'cos_secret_key'].forEach(function (k) {
            if (!data[k]) { delete data[k]; }
        });
        // 根据访问方式清理不相关字段，access_type 仅为前端控制字段不提交后端
        // 对应输入框留空即清除该访问方式，恢复默认菜单路径访问
        var accessType = data.access_type || 'custom_path';
        if (accessType === 'custom_path') {
            data.bind_domain = '';
        } else {
            data.access_path = '';
        }
        delete data.access_type;

        var $btn = $(this).prop('disabled', true).html('<i class="layui-icon layui-icon-loading"></i> 保存中');
        $.ajax({
            url: BASE + '/settings',
            type: 'PUT',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function (res) {
                if (res.code === 0) {
                    layer.msg('设置保存成功', { icon: 1, time: 1200 });
                } else {
                    layer.msg(res.message || '保存失败', { icon: 2, time: 3000 });
                }
            },
            error: function (xhr) {
                var msg = parseError(xhr, '保存请求失败');
                if (msg) { layer.msg(msg, { icon: 2, time: 3000 }); }
            },
            complete: function () {
                $btn.prop('disabled', false).html('<i class="layui-icon layui-icon-ok"></i> 保存设置');
            }
        });
    });

    loadSettings();
});
</script>
</body>
</html>
