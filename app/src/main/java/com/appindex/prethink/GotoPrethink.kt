package com.appindex.prethink

/** Independent Android contract; it never mutates the frozen Engine/Base/Where. */
data class QueryCandidate(
    val query: String,
    val confidence: Float,
    val source: String,
    val editCost: Float,
    val explanation: String,
)

data class PrethinkApp(
    val id: String,
    val name: String,
    val aliases: List<String> = emptyList(),
)

data class PrethinkConfig(
    val maxCandidates: Int = GotoPrethink.maxCandidates,
    val minConfidence: Float = GotoPrethink.minConfidence,
)

object GotoPrethink {
    const val version = "1.0"
    const val maxCandidates = 5
    const val minConfidence = 0.45f

    object Source {
        const val original = "ORIGINAL_QUERY"
        const val alias = "APP_ALIAS"
        const val repeatedNoise = "REPEATED_NOISE"
        const val keyboardCorrection = "KEYBOARD_CORRECTION"
        const val editDistance = "EDIT_DISTANCE"
    }

    /** Backwards-compatible raw-only entry point. */
    fun expand(raw: String, enabled: Boolean = true): List<QueryCandidate> =
        expand(raw, emptyList(), enabled)

    /** Expand against installed-app metadata without changing the raw query. */
    fun expand(raw: String, apps: List<PrethinkApp>, enabled: Boolean = true): List<QueryCandidate> {
        val original = raw.trim()
        if (!enabled || original.isEmpty()) return emptyList()
        val clean = original.lowercase()
        val result = mutableListOf(
            QueryCandidate(original, 1f, Source.original, 0f, "Original input is preserved and has the highest priority"),
        )
        fun add(candidate: QueryCandidate) {
            if (candidate.confidence < minConfidence || candidate.query.isBlank()) return
            val old = result.indexOfFirst { it.query.equals(candidate.query, ignoreCase = true) }
            if (old < 0) result += candidate
            else if (candidate.confidence > result[old].confidence) result[old] = candidate
        }
        var start = 0
        while (start + 1 < clean.length && clean[start] == clean[start + 1]) start++
        if (start > 0 && start < clean.length) {
            add(QueryCandidate(clean.substring(start), .72f, Source.repeatedNoise,
                start.toFloat() / clean.length, "Repeated leading characters were proposed as noise"))
        }
        for (app in apps) {
            val canonical = app.name.ifBlank { app.id }
            for (alias in app.aliases + canonical) {
                val field = alias.trim().lowercase()
                if (field.isBlank()) continue
                if (field == clean) {
                    add(QueryCandidate(canonical, .98f, Source.alias, 0f, "Application name or alias matched exactly"))
                    continue
                }
                val cost = editDistance(clean, field).toFloat() / maxOf(clean.length, field.length, 1)
                if (field.length >= 3 && cost <= .42f) {
                    add(QueryCandidate(canonical, maxOf(.46f, .9f - cost * .72f),
                        if (cost <= 1f / maxOf(clean.length, field.length)) Source.keyboardCorrection else Source.editDistance,
                        cost, "Explainable edit distance within the confidence threshold"))
                }
            }
        }
        return result.sortedWith(compareBy<QueryCandidate> { it.source != Source.original }.thenByDescending { it.confidence })
            .take(PrethinkConfig().maxCandidates)
    }

    fun mergePathScore(highest: Float, second: Float? = null): Float = highest - 0.1f * (second ?: 0f)

    fun scorePaths(scores: List<Float>): Float {
        val sorted = scores.filter { it.isFinite() }.sortedDescending()
        return mergePathScore(sorted.firstOrNull() ?: 0f, sorted.getOrNull(1))
    }

    private fun editDistance(left: String, right: String): Int {
        var row = IntArray(right.length + 1) { it }
        left.forEachIndexed { i, a ->
            val next = IntArray(right.length + 1) { i + 1 }
            right.forEachIndexed { j, b ->
                next[j + 1] = minOf(row[j + 1] + 1, next[j] + 1, row[j] + if (a == b) 0 else 1)
                if (i > 0 && j > 0 && a == right[j - 1] && left[i - 1] == b) next[j + 1] = minOf(next[j + 1], row[j - 1] + 1)
            }
            row = next
        }
        return row[right.length]
    }
}

