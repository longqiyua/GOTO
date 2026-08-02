# GOTO Engine

> 版本：**V2.1 update**  
> GOTO 的本地应用搜索与意图识别引擎母体。GUI 只是壳，所有搜索/学习/推荐逻辑都在引擎里。

## 定位

- 纯前端 IIFE 模块，仅依赖 `window`、`localStorage`、`Date`、`Map`/`Set`。
- 可在浏览器、Electron、Android WebView、iOS WKWebView 中运行。
- 通过 `engine.installGlobals()` 把 API 挂到 `window.GOTOEngine` 与 `window._xxx` 全局函数上。

## 当前已迁入

- `goto-engine.js`
  - 搜索管线：**精确匹配 → 前缀索引 → 模糊匹配**
  - Trie 前缀树索引（支持精确扩展与前缀扩展召回）
  - 模拟智能分类词库
  - 本地学习记录
  - 负反馈权重调整
  - 待索引库
  - Chain-of-Action Routing 上下文接口
  - 统一搜索入口 `runSearchPipeline`

## 搜索管线

```
runSearchPipeline(query, apps)
    ├── exactSearch(query, apps)      # 完整 term 精确命中
    ├── prefixSearch(query, apps)     # Trie 前缀树扩展
    └── fuzzySearch(query, apps)      # 模糊匹配兜底
```

### 统计型排序（不依赖模拟智能）

精确/前缀命中的结果会使用以下统计信息进行排序，**无需开启模拟智能**：

- 启动次数
- 最近使用时间
- 是否已安装
- 时段偏好
- 模式频率

模拟智能相关的加分（学习权重、上下文规则、Pro 模式、微观上下文）仅在功能开启时追加。

## 索引结构

- `byInitial` / `byT9` / `byPrefix` / `byChar` / `byAppId` 倒排索引
- **Trie 前缀树索引**：节点含 `children`、`ids`（前缀下全部 App）、`terminals`（精确结尾 App）

## 前缀树扩展接口（隐藏入口）

```js
GOTOEngine.trieIndex.insert(term, appOrId)     // 动态插入
GOTOEngine.trieIndex.remove(term, appOrId)     // 动态删除
GOTOEngine.trieIndex.exactSearch(term)         // 返回 Set<id>
GOTOEngine.trieIndex.prefixSearch(prefix)      // 返回 Set<id>
GOTOEngine.trieIndex.rebuild()                 // 重建整棵树
GOTOEngine.trieIndex.getRoot()                 // 取根节点
```

对应全局快捷函数：

```js
_trieInsert(term, appOrId)
_trieRemove(term, appOrId)
_trieExactSearch(term)
_triePrefixSearch(prefix)
_trieRebuild()
_trieGetRoot()
_exactSearch(query, apps)
_prefixSearch(query, apps)
```

## 当前接入方式

`AppIndex/preview.html` 已通过：

```html
<script src="GOTO-Engine/goto-engine.js"></script>
```

接入该引擎，并优先调用统一搜索入口 `runSearchPipeline`。

## 下一步迁移建议

1. 将 `_onSearch` 内剩余页面态逻辑继续瘦身
2. 把 `先锋体验 -> 模拟智能` 面板的数据展示完全改为读取 `GOTOEngine`
3. 将 `Chain-of-Action Routing` 首页卡片和后续悬浮窗策略统一接到同一套规则引擎
4. 将时间分桶统计、联想规则、PRO 信息注入拆成独立子模块
