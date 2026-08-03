package com.goto.base

/**
 * GOTO Base — Boost 分数计算（Kotlin 版）
 *
 * 纯函数：输入 query + Engine 候选项，输出带 boostScore 的候选项。
 * 不修改 Engine，不重排 Engine 结果顺序（仅添加分数字段）。
 */
class BoostCalculator(
    private val synonymClusters: List<SynonymCluster>,
    private val intentMappings: List<IntentMapping>,
    private val maxBoost: Double = 0.3
) {

    /**
     * 计算每个候选项的 boost 分数。
     *
     * @param query 用户查询
     * @param items Engine 候选项 (id, name, originalScore)
     * @param semanticHits SemanticSearch 的 top-K 结果 (id, score)
     * @return 带 boostScore 的候选项列表
     */
    fun computeBoost(
        query: String,
        items: List<Triple<String, String, Double>>,
        semanticHits: List<Pair<String, Double>>
    ): List<BoostedItem> {
        if (items.isEmpty()) return emptyList()

        val q = query.lowercase().trim()
        val semanticMap = semanticHits.toMap()
        val synonymHits = matchSynonyms(q)
        val intentHits = matchIntents(q)

        return items.map { (id, name, origScore) ->
            val semantic = semanticMap[id] ?: 0.0
            val syn = synonymHits.contains(id)
            val intent = intentHits.contains(id)

            var boost = 0.0
            boost += semantic * 0.15
            if (syn) boost += 0.05
            if (intent) boost += 0.10
            boost = boost.coerceIn(0.0, maxBoost)

            BoostedItem(
                id = id,
                name = name,
                boostScore = (boost * 10000).roundToLong() / 10000.0,
                semanticScore = (semantic * 10000).roundToLong() / 10000.0,
                synonymHit = syn,
                intentHit = intent,
                finalScore = ((origScore + boost) * 10000).roundToLong() / 10000.0
            )
        }
    }

    private fun matchSynonyms(query: String): Set<String> {
        val hits = mutableSetOf<String>()
        for (cluster in synonymClusters) {
            val matched = cluster.members.any { m ->
                val ml = m.lowercase()
                query.contains(ml) || ml.contains(query)
            }
            if (matched && cluster.intentCategory != null) {
                for (intent in intentMappings) {
                    if (intent.intent == cluster.intentCategory) {
                        hits.addAll(intent.preferredApps)
                    }
                }
            }
        }
        return hits
    }

    private fun matchIntents(query: String): Set<String> {
        val hits = mutableSetOf<String>()
        for (intent in intentMappings) {
            val matched = intent.keywords.any { k ->
                val kl = k.lowercase()
                query.contains(kl) || kl.contains(query)
            }
            if (matched) hits.addAll(intent.preferredApps)
        }
        return hits
    }
}

private fun Double.roundToLong(): Long = Math.round(this)
