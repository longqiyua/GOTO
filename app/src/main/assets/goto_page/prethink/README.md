# GOTO Prethink 网页适配层

这里是 `GOTO Page` 的网页运行副本，不是 GOTO Prethink 的权威源。

权威实现位于仓库根目录的 `GOTO Prethink/JavaScript/goto-prethink.js`。修改核心算法、候选结构或阈值时，应先修改根目录版本，再通过同步脚本更新此文件。

网页适配层只负责在 GitHub Pages 中加载 Prethink、传入本地应用清单，并把候选交给既有 GOTO Engine。它不修改 GOTO Engine、GOTO Base 或 GOTO Where。
