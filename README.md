# GOTO Page

GOTO Page 是 GOTO 的静态产品文档与交互预览页面，可直接作为独立目录部署到 GitHub Pages。

## 使用

- 入口文件：`index.html`
- 文档内容：`Document/`
- 部署说明：`DEPLOY.md`
- 页面版本：V1.0 official

将 `GOTO Page/` 目录的全部内容作为站点根目录发布即可。页面只使用目录内的相对路径资源，不依赖上级目录或服务端接口；本地预览可运行：

```text
python -m http.server 4173 --directory "GOTO Page"
```

详细产品说明、组件架构和交互文档请查看 [`Document/readme.md`](Document/readme.md) 及同目录下的文档文件。

## 说明

GOTO Engine、GOTO Base 与 GOTO Where 是已定档组件，Page 只负责文档呈现、交互演示和与应用端的展示同步，不改写三大组件的实现。

本目录包含独立站点运行所需的静态资源。许可证文件保留在各自仓库与组件所属位置，详见 [`LICENSE`](LICENSE)。
