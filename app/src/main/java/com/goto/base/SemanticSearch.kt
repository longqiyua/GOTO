package com.goto.base

import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.sqrt

/**
 * GOTO Base — 语义向量检索（Kotlin 版）
 *
 * 加载 rag/vector-store.json（BGE-small-zh-v1.5 真实 512 维向量）。
 * 检索：纯 Kotlin 线性扫描 cosine 相似度（向量已 L2 归一化，等价于点积）。
 * 生产环境可替换为 HNSW 库（如 JAHMS 或 JNI 桥接 hnswlib）。
 */
class SemanticSearch {
    private val vectors: MutableMap<String, DoubleArray> = mutableMapOf()
    private val appNames: MutableMap<String, String> = mutableMapOf()
    private val appCategories: MutableMap<String, String> = mutableMapOf()
    private var metaModel: String = ""
    private var metaDim: Int = 0
    private var loaded: Boolean = false

    /**
     * 从 vector-store.json 加载（新格式，由 build-rag-from-seeds.js 生成）。
     * 字段：version / embeddingModel / dimension / vectors[]
     *   vectors[i] = { packageName, appName, primaryCategory, primarySubcategory, documentText, vector[] }
     */
    fun load(data: JSONObject) {
        metaModel = data.optString("embeddingModel", "bge-small-zh-v1.5")
        metaDim = data.optInt("dimension", 512)

        val arr = data.getJSONArray("vectors")
        vectors.clear()
        appNames.clear()
        appCategories.clear()
        for (i in 0 until arr.length()) {
            val item = arr.getJSONObject(i)
            // 新格式：packageName（兼容旧格式的 id 字段）
            val id = item.optString("packageName", item.optString("id", ""))
            if (id.isEmpty()) continue
            // 新格式：vector（兼容旧格式的 embedding 字段）
            val emb = if (item.has("vector")) item.getJSONArray("vector") else item.getJSONArray("embedding")
            val vec = DoubleArray(emb.length()) { emb.getDouble(it) }
            vectors[id] = normalize(vec)
            item.optString("appName", "").takeIf { it.isNotEmpty() }?.let { appNames[id] = it }
            item.optString("primaryCategory", "").takeIf { it.isNotEmpty() }?.let { appCategories[id] = it }
        }
        loaded = true
    }

    private fun normalize(vec: DoubleArray): DoubleArray {
        var norm = 0.0
        for (v in vec) norm += v * v
        norm = sqrt(norm)
        if (norm == 0.0) return vec
        return DoubleArray(vec.size) { vec[it] / norm }
    }

    /** 用查询向量检索 top-K。返回 (packageName, cosine相似度)。 */
    fun searchByVector(query: DoubleArray, k: Int): List<Pair<String, Double>> {
        if (!loaded) return emptyList()
        val q = normalize(query)
        val results = vectors.map { (id, v) -> id to cosine(q, v) }.toMutableList()
        results.sortByDescending { it.second }
        return results.take(k)
    }

    /** 用文本查询检索（MVP：需调用方提供 queryVector）。 */
    fun search(query: String, k: Int, queryVector: DoubleArray? = null): List<Pair<String, Double>> {
        if (queryVector != null) return searchByVector(queryVector, k)
        // MVP: 无嵌入器时返回空（向量库已就绪，但端侧嵌入器尚未接入）
        return emptyList()
    }

    private fun cosine(a: DoubleArray, b: DoubleArray): Double {
        var dot = 0.0
        for (i in a.indices) dot += a[i] * b[i]
        return dot
    }

    fun size(): Int = vectors.size
    fun isLoaded(): Boolean = loaded
    fun model(): String = metaModel
    fun dim(): Int = metaDim
    fun appName(id: String): String? = appNames[id]
    fun category(id: String): String? = appCategories[id]
}
