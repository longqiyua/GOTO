# GOTO 组件布局

本文档只说明仓库内各实现的位置，避免把不同语言的实现误认为重复文件。四个运行时能力都属于 App 的组成部分，但职责边界保持冻结：

| 能力 | Android / Kotlin | Page / JavaScript | 作用 |
| --- | --- | --- | --- |
| GOTO Engine | `modules/goto-engine-kotlin/`，通过 `:goto-engine` 接入 App | `GOTO-Engine/` | 最终匹配、索引、排序与搜索门面 |
| GOTO Base | `app/src/main/java/com/goto/base/` 与 `app/src/main/assets/rag/` | `GOTO-Base/` | RAG、公共知识与个人状态边界 |
| GOTO Where | `app/src/main/java/com/appindex/where/` | `where/` 与 `where-runtime-bundle.js` | 情境判断、提醒与通知投递 |
| GOTO Prethink | `app/src/main/java/com/appindex/prethink/` | `prethink/goto-prethink.js` | 不改变原始输入，生成可解释的候选查询 |

## 为什么还有 `GOTO-Engine`

`GOTO/GOTO-Engine/` 不是裸文件，也不是 Android Engine 的重复副本。它是 GOTO Page 的 JavaScript 权威源，`GOTO Page/index.html` 和 App 内嵌的 `goto_page` 都按这个相对路径加载它。Android App 的 Kotlin 权威实现则位于 `GOTO/modules/goto-engine-kotlin/`，由根 Gradle 工程以 `:goto-engine` 依赖接入。

因此不能删除或随意改名 `GOTO-Engine`：删除会让 Page 离线运行和 App 内嵌页面丢失 Engine；改名会破坏已冻结的加载路径。需要更新时，先更新对应语言的权威实现，再同步到 App 的 assets。

## App 启动链

`GotoApplication` 按以下顺序准备运行时：

1. `EngineInitializer`：初始化搜索、模糊匹配、自适应刷新与智能预测，并接入 Kotlin Engine 模块。
2. `GotoBaseRuntime`：加载 RAG 向量索引、索引元数据和 BGE 模型资源状态。
3. `GotoEngineRuntime`：创建 Kotlin Engine facade，把 Base 读写边界接到 App 的本地持久化适配器。
4. `WhereCompositionRoot`：只初始化权限、信号、调度和通知适配器；真正启动提醒服务仍由用户开关触发。
5. `GotoPrethink`：无状态纯函数组件，按需为 Engine 提供最多 5 个带置信度候选，原始查询始终保留。

RAG 向量查询已随包加载。RAG 重建需要真正的 EmbedderPort；在没有注入嵌入器时，系统保留现有索引并安全降级，不伪造“已重建”。
