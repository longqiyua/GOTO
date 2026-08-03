# note-to-show：本地文档到右侧页面

`note-to-show` 是右侧文档正文的独立渲染层。文档文件夹中的 Markdown/HTML 文件是编辑源；`document-bundle.js` 由构建脚本生成，仅作为 GitHub Pages 或 Android WebView 无法直接读取文件时的离线回退。页面不把正文硬编码成另一份副本。

## 实时更新链路

打开目录项后，Page 先完成首屏渲染，再由 `note-to-show` 接管当前文档的观察。组件使用本地 `cache: no-store` 请求重新读取源文件；源文件的内容、文件名或时间戳发生变化时，组件只刷新右侧内容区，并重新执行已有的目录元信息、Mermaid、联动按钮和访问进度装饰。刷新失败保持上一次可读内容，并回退到 bundle，不影响左侧手机预览。

## 样式契约

组件根节点提供 `data-note-style`、`data-note-file` 与 `data-note-live`。自定义样式必须作用于 `.note-to-show-root`，不能依赖或改写 Engine、Base、Where 的 DOM；页面布局保留三栏结构，文档正文保持可访问的标题层级、链接和代码块。

## 开源声明

本模块独立采用 Apache License 2.0，SPDX 标识为 `Apache-2.0`。该授权只覆盖 `GOTO Page/note-to-show/`，不改变项目其他目录的授权，也不改变三大冻结组件的实现边界。详细声明见模块目录中的 `README.md` 与 `LICENSE`。
