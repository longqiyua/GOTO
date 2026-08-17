# GOTO Page

GOTO Page 是 GOTO 的产品说明与交互预览站点。它用右侧文档解释产品体验，用左侧手机窗口展示对应状态；打开页面即可了解 GOTO 如何搜索、启动、提醒和适配不同设备。

## 版本

- **GOTO Page 主版本号：1.1**（版本标识 `v1.1`，显示于右侧预览界面顶部）
- 左侧手机预览界面（GPA，GOTO Page App）底部保留应用版本标识：`V1.0 update`

> 版本说明：`v1.1` 为本站点（GOTO Page）的固定版本号，与左侧手机预览中展示的 GOTO 应用版本 `V1.0 update` 相互独立；右侧文档界面顶部统一标注本站点版本。

## 使用

- 入口文件：`index.html`
- 文档内容：`Document/`
- 部署说明：`DEPLOY.md`
- 页面版本：v1.1（详见上方「版本」）

将 `GOTO Page/` 目录的全部内容作为站点根目录发布即可。页面只使用目录内的相对路径资源，不依赖上级目录或服务端接口；本地预览可运行：

```text
python -m http.server 4173 --directory "GOTO Page"
```

面向用户的产品介绍请查看 [`Document/README.md`](Document/README.md)；实现边界与组件关系请查看 [`Document/architecture.md`](Document/architecture.md)。同目录下的其他文件分别说明功能、需求和交互规范。

## 目录结构

```text
GOTO Page/
├── index.html                 # 唯一入口（GitHub Pages 解析 / → index.html）
├── manifest.json              # PWA 清单
├── sw.js                      # Service Worker（本地化资源缓存，HTML network-first）
├── ceramic-finish.css         # 站点最终视觉契约（右侧预览界面样式与动画）
├── preview-final.css          # 基础样式（被 ceramic-finish.css 覆盖）
├── preview-authority.css      # 主题变量（light/dark）
├── preview-data.js            # 预览演示数据
├── *.js                       # app-icons / search / home-stats / statistics / community 等运行时
├── fonts/                     # 本地化字体（Outfit、Poppins、Inter 等 woff2 + fonts-local.css）
├── libs/                      # 本地化三方库（markdown-it、md-renderer、mermaid）
├── Document/                  # 文档内容 + document-bundle.js 离线打包
├── GOTO-Engine/               # 搜索引擎（本地化，冻结不改动）
├── GOTO-Base/                 # 数据/模型（本地化，冻结不改动）
├── where-runtime-bundle.js    # Where 本地产物（本地优先加载，CDN 后备）
├── GithubPage/                # GitHub Page 离线 MD 文档面板内容
├── note-to-show/  prethink/   # 功能子模块（本地化）
├── media/  music/  payment-qr/  # 静态资源
└── .nojekyll                  # 关闭 Jekyll 过滤
```

## 设计原则

- 自包含：字体、三方库全部本地化到 `fonts/`、`libs/`，无运行时外部 CDN 依赖；`Where` 组件本地优先，仅本地缺失时回退独立仓库 CDN。
- 相对路径：全部资源使用目录内相对引用，移动/换目录不影响功能（可做迁移自检）。
- 极简克制：卡片式 UI、大留白、低对比配色；全局动画采用弱弹簧的柔顺缓出（`cubic-bezier(.22, 1, .36, 1)`），不带物理回弹。
- 视觉契约：标准模式极简线描；光感模式使用克制的陶瓷质感；版本号 `V1.1` 在右上角以裸露数字呈现。
- 组件冻结：`GOTO-Engine`、`GOTO-Base`、`GOTO-Where` 保持独立实现，页面不重写组件，仅通过公开接口与 Port 适配层联动。

## 模块关系

| 模块 | 目录 | 与 Page 的关系 |
| --- | --- | --- |
| GOTO Page | 本目录 | 产品说明 + 交互预览站点（入口 `index.html`） |
| GOTO Engine | `GOTO-Engine/` | 搜索引擎，本地化调用，冻结不改动 |
| GOTO Base | `GOTO-Base/` | 数据/模型层，本地化调用，冻结不改动 |
| GOTO Where | `where-runtime-bundle.js` | 智能提醒决策，本地优先 + 独立仓库 CDN 后备 |
| GOTO Prethink | `prethink/` | 预想/联想子模块，本地化调用 |
| Note-to-show | `note-to-show/` | 展示子模块，本地化调用 |

## 同步检查清单

推送/更新前逐项确认：

- [ ] 版本号统一为 `v1.1`：右上角 `V1.1`、本 README、`ceramic-finish.css` 头部注释一致
- [ ] `sw.js` 的 `CACHE_VERSION` 已递增（发布新版本时）
- [ ] 无外部 CDN 依赖：`index.html` 内无 `fonts.googleapis` / `cdn.*` 等运行时引用（`Where` 仅作为后备存在）
- [ ] `fonts/`、`libs/` 资源完整，字体可正常加载（`document.fonts.status === 'loaded'`）
- [ ] 控制台无 error / Uncaught / 资源加载失败
- [ ] 初始界面 → 进入动画正常：手机左移、文档从右侧滑入、无回弹
- [ ] 目录与正文分隔线位于 `.doc-content-wrap` 左侧（无黑边）
- [ ] 右上角版本号为裸露数字（无背景/边框/内边距）

## 说明

GOTO Engine、GOTO Base、GOTO Where 与 GOTO Prethink 的实现边界保持独立；Page 负责文档呈现、交互演示和与应用端的展示同步，不在页面中重写组件。

本目录包含独立站点运行所需的静态资源。许可证文件保留在各自仓库与组件所属位置，详见 [`LICENSE`](LICENSE)。
