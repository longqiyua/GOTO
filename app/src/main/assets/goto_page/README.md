# GOTO Page

GOTO Page 是 GOTO 的产品说明与交互预览站点。它用右侧文档解释产品体验，用左侧手机窗口展示对应状态；打开页面即可了解 GOTO 如何搜索、启动、提醒和适配不同设备。

## 使用

- 入口文件：`index.html`
- 文档内容：`Document/`
- 部署说明：`DEPLOY.md`
- 页面版本：V1.0 update

将 `GOTO Page/` 目录的全部内容作为站点根目录发布即可。页面只使用目录内的相对路径资源，不依赖上级目录或服务端接口；本地预览可运行：

```text
python -m http.server 4173 --directory "GOTO Page"
```

面向用户的产品介绍请查看 [`Document/README.md`](Document/README.md)；实现边界与组件关系请查看 [`Document/architecture.md`](Document/architecture.md)。同目录下的其他文件分别说明功能、需求和交互规范。

## 说明

GOTO Engine、GOTO Base、GOTO Where 与 GOTO Prethink 的实现边界保持独立；Page 负责文档呈现、交互演示和与应用端的展示同步，不在页面中重写组件。

本目录包含独立站点运行所需的静态资源。许可证文件保留在各自仓库与组件所属位置，详见 [`LICENSE`](LICENSE)。
