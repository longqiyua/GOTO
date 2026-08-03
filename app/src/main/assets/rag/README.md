# GOTO Base 公共 RAG 向量库

> 属于 🟢 **公共层**（Global Layer）。跨用户共享、只读、版本化批量更新。
> 公共层入口：[`../global/README.md`](../global/README.md)

本目录存放 GOTO Base 公共层（goto-base/shared）的 RAG 向量库，
用于在 `AppRouter / IntentRouter / Engine RAG fallback` 等模块中通过向量相似度检索候选应用。

## 文件结构

| 文件 | 说明 |
| --- | --- |
| `vector-store.json` | RAG 向量库主文件，包含每个应用的向量、documentText、intentTags、metadata 及内置索引。 |
| `rag-index.json` | 轻量索引文件（不含向量本体），提供 `byPackage / byCategory / byIntentTag` 三类映射，便于在内存中快速定位。 |
| `README.md` | 本说明文件。 |

## 向量生成方式

- **维度**：`512`
- **生成器**：`bge-small-zh-v1.5-onnx`（真实 BGE-small-zh-v1.5 ONNX 模型）
- **嵌入模型**：`bge-small-zh-v1.5`（北京智源 BAAI，MIT 协议，~95MB FP32 ONNX）
- **生成脚本**：`GOTO-Engine/model-runner/rebuild-rag-index.js`

### documentText 构造

```
documentText = appName + " " + aliases.join(" ")
            + " " + keywords.join(" ")
            + " " + capabilities.join(" ")
            + " " + userIntents.join(" ")
            + " " + semanticDescription
```

### 向量生成流程

1. 读取 `../seeds/*.json` 下所有应用种子
2. 用 BGE-small-zh-v1.5 ONNX 模型对 documentText 编码得到 512 维向量
3. L2 归一化（||v||=1），使 cosine similarity 等价于点积
4. 覆盖写入 `vector-store.json` 的 `vectors[*].vector` 字段
5. 重新生成 `rag-index.json`（三类反向索引）

> 相同 documentText 永远产生相同向量；向量已 L2 归一化。

## 查询方式

采用 **余弦相似度（cosine similarity）** 检索：

```js
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
```

由于向量已 L2 归一化，cosine similarity 等价于向量点积：

```js
// 归一化后：cosine(a, b) == dot(a, b)
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
```

检索流程：

1. 将用户查询文本用相同生成器编码为查询向量；
2. 与 `vector-store.json` 中每个向量计算点积，取 top-K；
3. 可结合 `intentTags` 做意图加权，结合 `metadata.popularityScore` 做流行度加权。

## intentTags 说明

每个应用的 `intentTags` 由 seed 的 `userIntents + keywords` 推导：

- `userIntents` 中的标签权重为 **1.0**；
- `keywords` 中的标签权重为 **0.6**；
- 同名标签去重后取最大权重，按权重降序排列。

`rag-index.json` 的 `byIntentTag` 提供标签 → 向量索引列表的反向索引。

## 更新方式

重新生成整个向量库：

```bash
# 用 BGE-small-zh-v1.5 模型重建（需先下载模型到 ../model/models/）
node GOTO-Engine/model-runner/rebuild-rag-index.js
```

> 模型切换时遵循 `../model/migration-protocol.md`：documentText 永不丢，vectors 可重建，用户数据不受影响。

## 数据来源

- 种子文件：`../seeds/*.json`（phase-1-seed）
- 不修改任何 seed 文件，仅读取其字段生成向量与索引。
