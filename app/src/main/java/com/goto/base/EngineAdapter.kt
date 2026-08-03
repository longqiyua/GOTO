package com.goto.base

import android.content.Context
import org.json.JSONObject

/**
 * GOTO Base — Engine 适配器（Kotlin 版）
 *
 * 核心职责：
 * 1. enrichDataset(rawApps) → 增强后的应用数据（HOST 喂给 Engine.setAppDataset）
 * 2. applyBoost(query, items) → 带 boost 分数的结果（HOST 拿 Engine 结果后调用）
 *
 * 不 import 任何 Engine 类，不修改 Engine。
 */
class GotoBase private constructor(
    private val persistence: Persistence,
    private val knowledge: KnowledgeBaseLoader,
    private val semantic: SemanticSearch,
    private var boostCalc: BoostCalculator? = null,
    private var loaded: Boolean = false
) {

    /** 异步加载所有 Base 数据。 */
    fun load() {
        if (loaded) return

        knowledge.load(persistence)

        val synonyms = try {
            val json = persistence.readJSON("synonyms/clusters.json")
            val arr = json.getJSONArray("clusters")
            (0 until arr.length()).map { i ->
                val c = arr.getJSONObject(i)
                SynonymCluster(
                    id = c.getString("id"),
                    canonical = c.getString("canonical"),
                    members = c.getJSONArray("members").let { a -> List(a.length()) { a.getString(it) } },
                    intentCategory = c.optString("intentCategory", null)
                )
            }
        } catch (e: Exception) {
            emptyList()
        }

        val intents = try {
            val json = persistence.readJSON("intents/intent-map.json")
            val arr = json.getJSONArray("mappings")
            (0 until arr.length()).map { i ->
                val m = arr.getJSONObject(i)
                IntentMapping(
                    intent = m.getString("intent"),
                    keywords = m.getJSONArray("keywords").let { a -> List(a.length()) { a.getString(it) } },
                    preferredApps = m.getJSONArray("preferredApps").let { a -> List(a.length()) { a.getString(it) } },
                    weight = m.optDouble("weight", 1.0)
                )
            }
        } catch (e: Exception) {
            emptyList()
        }

        try {
            // 公共层 RAG 向量库：BGE-small-zh-v1.5 真实 512 维向量（330 应用）
            val vectors = persistence.readJSON("rag/vector-store.json")
            semantic.load(vectors)
        } catch (e: Exception) {
            // 向量加载失败不阻塞（近义词/意图匹配仍可用）
        }

        boostCalc = BoostCalculator(synonyms, intents)
        loaded = true
    }

    /** 用 Base 知识增强 Engine 应用数据集。 */
    fun enrichDataset(rawApps: List<EnrichedApp>): List<EnrichedApp> {
        return rawApps.map { app ->
            val k = knowledge.getKnowledge(app.packageName) ?: return@map app
            app.copy(
                aliases = k.aliases,
                tags = k.tags,
                synonyms = k.synonyms,
                category = k.category,
                semanticDescription = k.semanticDescription,
                popularity = k.popularity,
                intentTags = k.intentTags
            )
        }
    }

    /** 对 Engine 查询结果应用 boost（轻量重排）。 */
    fun applyBoost(
        query: String,
        items: List<Triple<String, String, Double>>,  // (id, name, origScore)
        queryVector: DoubleArray? = null
    ): List<BoostedItem> {
        val calc = boostCalc ?: return emptyList()
        val semanticHits = semantic.search(query, 10, queryVector)
        val boosted = calc.computeBoost(query, items, semanticHits)
        // 按 finalScore 降序（boost 只上浮，不新增）
        return boosted.sortedByDescending { it.finalScore }
    }

    /** 语义检索（直接暴露）。 */
    fun semanticSearch(query: String, k: Int, queryVector: DoubleArray? = null): List<Pair<String, Double>> {
        return semantic.search(query, k, queryVector)
    }

    /** 按包名查应用知识。 */
    fun getKnowledge(packageName: String): AppKnowledge? = knowledge.getKnowledge(packageName)

    /** 状态信息。 */
    fun status(): GotoBaseStatus = GotoBaseStatus(
        loaded = loaded,
        appCount = knowledge.size(),
        embeddingCount = semantic.size()
    )

    companion object {
        /** 工厂方法：从文件系统路径创建。 */
        fun create(dataPath: String): GotoBase {
            return GotoBase(
                persistence = Persistence.fromFile(dataPath),
                knowledge = KnowledgeBaseLoader(),
                semantic = SemanticSearch()
            )
        }

        /** 工厂方法：Android Context（优先 externalFilesDir，fallback assets）。 */
        fun create(context: Context, dataPath: String): GotoBase {
            return GotoBase(
                persistence = Persistence.fromContext(context, dataPath),
                knowledge = KnowledgeBaseLoader(),
                semantic = SemanticSearch()
            )
        }
    }
}

/**
 * 知识库加载器（封装 KnowledgeBase 的加载逻辑）。
 * 单独抽出便于测试 mock。
 */
class KnowledgeBaseLoader {
    private val apps: MutableMap<String, AppKnowledge> = mutableMapOf()
    private val aliasIndex: MutableMap<String, String> = mutableMapOf()
    private val tagIndex: MutableMap<String, MutableSet<String>> = mutableMapOf()
    private var loaded: Boolean = false

    fun load(persistence: Persistence) {
        if (loaded) return
        val files = persistence.listFiles("apps")
        for (f in files) {
            if (!f.endsWith(".json")) continue
            try {
                val json = persistence.readJSON(f)
                val app = AppKnowledge.fromJSON(json)
                indexApp(app)
            } catch (e: Exception) {
                // 单文件失败不阻塞
            }
        }
        loaded = true
    }

    private fun indexApp(app: AppKnowledge) {
        val pkg = app.packageName
        apps[pkg] = app
        // 别名索引
        val aliases = mutableSetOf(app.name)
        app.nameEn?.let { aliases.add(it) }
        aliases.addAll(app.aliases)
        for (a in aliases) aliasIndex[a.lowercase()] = pkg
        // 标签索引
        for (t in app.tags) {
            tagIndex.getOrPut(t) { mutableSetOf() }.add(pkg)
        }
    }

    fun getKnowledge(packageName: String): AppKnowledge? = apps[packageName]
    fun lookupByAlias(alias: String): String? = aliasIndex[alias.lowercase()]
    fun lookupByTag(tag: String): List<String> = tagIndex[tag]?.toList() ?: emptyList()
    fun all(): List<AppKnowledge> = apps.values.toList()
    fun size(): Int = apps.size
    fun isLoaded(): Boolean = loaded
}
