# note-to-show 网页副本

这里是 `GOTO Page` 的运行副本，权威组件源位于仓库根目录的 `note-to-show/`。

根目录版本提供：

- `document/` 到 `HTML/` 的命令行转换器；
- Markdown、HTML、TXT、CSV、DOCX、XLSX 的基础转换；
- 可编辑的 HTML、CSS、JS 默认模板；
- 浏览器端 `NoteToShow.mount()` 与本地文档实时刷新。

修改组件核心逻辑时，应先修改根目录版本，再执行：

```text
powershell -ExecutionPolicy Bypass -File scripts/sync-note-to-show.ps1
```

Page 端只负责把文档渲染到右侧区域，不改变 GOTO Engine、GOTO Base 或 GOTO Where。
