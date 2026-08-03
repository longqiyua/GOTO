package com.goto.base

import org.json.JSONObject

/**
 * GOTO Base — 应用知识数据模型（Kotlin 版）
 *
 * 对应 schema/app-knowledge.schema.json
 */
data class AppKnowledge(
    val packageName: String,
    val name: String,
    val nameEn: String? = null,
    val aliases: List<String> = emptyList(),
    val developer: String? = null,
    val category: String,
    val subcategories: List<String> = emptyList(),
    val tags: List<String>,
    val synonyms: List<String> = emptyList(),
    val scenarios: List<String> = emptyList(),
    val description: String,
    val semanticDescription: String,
    val intentTags: List<String> = emptyList(),
    val popularity: Double = 0.5,
    val region: List<String> = listOf("GLOBAL"),
    val metadata: KnowledgeMetadata
) {
    companion object {
        fun fromJSON(json: JSONObject): AppKnowledge {
            val meta = json.getJSONObject("metadata")
            return AppKnowledge(
                packageName = json.getString("packageName"),
                name = json.getString("name"),
                nameEn = json.optString("nameEn", null),
                aliases = json.optJSONArray("aliases")?.let { arr ->
                    List(arr.length()) { arr.getString(it) }
                } ?: emptyList(),
                developer = json.optString("developer", null),
                category = json.getString("category"),
                tags = json.optJSONArray("tags")?.let { arr ->
                    List(arr.length()) { arr.getString(it) }
                } ?: emptyList(),
                synonyms = json.optJSONArray("synonyms")?.let { arr ->
                    List(arr.length()) { arr.getString(it) }
                } ?: emptyList(),
                scenarios = json.optJSONArray("scenarios")?.let { arr ->
                    List(arr.length()) { arr.getString(it) }
                } ?: emptyList(),
                description = json.getString("description"),
                semanticDescription = json.getString("semanticDescription"),
                intentTags = json.optJSONArray("intentTags")?.let { arr ->
                    List(arr.length()) { arr.getString(it) }
                } ?: emptyList(),
                popularity = json.optDouble("popularity", 0.5),
                region = json.optJSONArray("region")?.let { arr ->
                    List(arr.length()) { arr.getString(it) }
                } ?: listOf("GLOBAL"),
                metadata = KnowledgeMetadata(
                    source = meta.getString("source"),
                    verified = meta.optBoolean("verified", false),
                    lastUpdated = meta.getString("lastUpdated")
                )
            )
        }
    }
}

data class KnowledgeMetadata(
    val source: String,
    val verified: Boolean,
    val lastUpdated: String
)

/**
 * 同义词簇
 */
data class SynonymCluster(
    val id: String,
    val canonical: String,
    val members: List<String>,
    val intentCategory: String? = null
)

/**
 * 意图映射
 */
data class IntentMapping(
    val intent: String,
    val keywords: List<String>,
    val preferredApps: List<String>,
    val weight: Double = 1.0
)

/**
 * 增强后的应用信息（HOST 喂给 Engine 的数据）。
 * 不修改 Engine 的 AppInfo 定义，只是扩展字段。
 */
data class EnrichedApp(
    val name: String,
    val packageName: String,
    val label: String,
    val aliases: List<String> = emptyList(),
    val tags: List<String> = emptyList(),
    val synonyms: List<String> = emptyList(),
    val category: String? = null,
    val semanticDescription: String? = null,
    val popularity: Double = 0.5,
    val intentTags: List<String> = emptyList()
)

/**
 * 带 boost 分数的查询结果项。
 */
data class BoostedItem(
    val id: String,
    val name: String,
    val boostScore: Double,
    val semanticScore: Double,
    val synonymHit: Boolean,
    val intentHit: Boolean,
    val finalScore: Double
)

/**
 * Base 状态信息。
 */
data class GotoBaseStatus(
    val loaded: Boolean,
    val appCount: Int,
    val embeddingCount: Int
)
