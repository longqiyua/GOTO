package com.goto.base.pattern

import com.goto.base.contracts.storage.TimingPatternBase
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

/**
 * GOTO Base 个人层 — 时段应用智能排名构建器
 *
 * 输入：PatternStore 中已沉淀的 TimingPattern
 * 输出：符合 hourly-ranking.schema.json 的排名数据
 *   - globalRanking：全时段排名（带时间衰减加权分）
 *   - hourlyRanking：24 小时分时段排名（含 recencyScore）
 *   - smartRanking：融合当前时段 + weekday + 近期权重的候选应用排名
 *
 * 设计原则：
 *   1. 纯算术特征加权，不依赖向量库
 *   2. 只读 PatternStore，无副作用
 *   3. 算法标识 = "weighted-sum"，权重三者之和=1.0
 */
class HourlyRankingBuilder(
    private val zone: ZoneId = ZoneId.systemDefault(),
    private val decayHalfLifeDays: Double = 30.0,
    private val weights: FusionWeights = FusionWeights.DEFAULT
) {

    /** 融合权重（三者之和=1.0） */
    data class FusionWeights(
        val timeOfDay: Double,   // 时段权重
        val weekday: Double,     // 星期权重
        val recency: Double      // 近期度权重
    ) {
        companion object {
            val DEFAULT = FusionWeights(timeOfDay = 0.5, weekday = 0.2, recency = 0.3)
        }
    }

    /** 全时段排名项 */
    data class GlobalRankItem(
        val packageName: String,
        val totalLaunches: Int,
        val weightedScore: Double
    )

    /** 分时段排名项 */
    data class HourlyRankItem(
        val packageName: String,
        val count: Int,
        val recencyScore: Double
    )

    /** 智能排名候选 */
    data class SmartCandidate(
        val packageName: String,
        val score: Double
    )

    /** 完整排名数据 */
    data class HourlyRanking(
        val profileId: String,
        val globalRanking: List<GlobalRankItem>,
        val hourlyRanking: Map<String, List<HourlyRankItem>>,  // key = "0".."23"
        val smartRanking: SmartRanking
    )

    data class SmartRanking(
        val algorithm: String,
        val weights: FusionWeights,
        val topCandidates: List<SmartCandidate>
    )

    /**
     * 从 TimingPattern 列表构建完整排名。
     *
     * @param patterns 某 profile 下全部 TimingPattern
     * @param profileId 用户画像 ID
     * @param referenceTime 参考时间（用于 smartRanking 的当前时段/weekday 计算 + 时间衰减）
     */
    fun build(
        patterns: List<TimingPatternBase>,
        profileId: String,
        referenceTime: Long = System.currentTimeMillis()
    ): HourlyRanking {
        val nowMs = referenceTime
        val zoned = ZonedDateTime.ofInstant(Instant.ofEpochMilli(nowMs), zone)
        val currentHour = zoned.hour
        // schema weekday: 0=周日..6=周六
        // ZonedDateTime.dayOfWeek: 1=周一..7=周日
        val currentWd = zoned.dayOfWeek.value % 7  // 周日(7)%7=0, 周一(1)%7=1...

        val validPatterns = patterns.filter { it.enabled && !it.hourlyPattern.isNullOrEmpty() && it.hourlyPattern!!.size >= 24 }

        // ===== globalRanking =====
        val globalRanking = validPatterns.map { p ->
            val decay = computeDecayWeight(p.lastSeenAt, nowMs)
            val weightedScore = p.sampleCount * decay
            GlobalRankItem(
                packageName = p.packageName,
                totalLaunches = p.sampleCount,
                weightedScore = weightedScore
            )
        }.sortedByDescending { it.weightedScore }

        // ===== hourlyRanking（24 个小时段各自排名） =====
        val hourlyRanking = mutableMapOf<String, List<HourlyRankItem>>()
        for (hour in 0..23) {
            val items = validPatterns.map { p ->
                val hourWeight = p.hourlyPattern!![hour]
                val decay = computeDecayWeight(p.lastSeenAt, nowMs)
                HourlyRankItem(
                    packageName = p.packageName,
                    count = (hourWeight * p.sampleCount).toInt().coerceAtLeast(0),
                    recencyScore = decay
                )
            }.filter { it.count > 0 }
                .sortedByDescending { it.count }
            hourlyRanking[hour.toString()] = items
        }

        // ===== smartRanking（融合当前时段 + weekday + 近期权重） =====
        val candidates = mutableListOf<SmartCandidate>()
        for (p in validPatterns) {
            val hourWeight = p.hourlyPattern!![currentHour]
            if (hourWeight <= 0.0) continue
            // weekday 命中：当前 weekday 在 p.weekdays 中是否为 true
            // p.weekdays: 0=周一..6=周日；当前 schemaWd 0=周日..6=周六 → 转 patternIdx
            val patternWdIdx = schemaWeekdayToPatternWeekday(currentWd)
            val wdHit = p.weekdays.getOrNull(patternWdIdx) == true
            val wdScore = if (wdHit) 1.0 else 0.3  // 命中 1.0，未命中给 0.3 兜底（避免完全抑制）
            val recency = computeDecayWeight(p.lastSeenAt, nowMs)

            val score = weights.timeOfDay * hourWeight +
                weights.weekday * wdScore +
                weights.recency * recency
            if (score > 0) {
                candidates.add(SmartCandidate(p.packageName, score))
            }
        }
        candidates.sortByDescending { it.score }

        return HourlyRanking(
            profileId = profileId,
            globalRanking = globalRanking,
            hourlyRanking = hourlyRanking,
            smartRanking = SmartRanking(
                algorithm = "weighted-sum",
                weights = weights,
                topCandidates = candidates.take(20)
            )
        )
    }

    /** 从 PatternStore 直接构建。 */
    fun buildFromStore(
        store: PatternStore,
        profileId: String = "default",
        referenceTime: Long = System.currentTimeMillis()
    ): HourlyRanking {
        val patterns = store.getAllTimingPatterns(profileId)
        return build(patterns, profileId, referenceTime)
    }

    /** 时间衰减权重：半衰期 decayHalfLifeDays 天。 */
    private fun computeDecayWeight(lastSeenAt: String, nowMs: Long): Double {
        val lastMs = parseIsoToMs(lastSeenAt) ?: return 0.5
        val deltaDays = (nowMs - lastMs) / (24.0 * 3600 * 1000)
        if (deltaDays <= 0) return 1.0
        return Math.pow(0.5, deltaDays / decayHalfLifeDays)
    }

    /** schema weekday(0=周日) → PatternStore weekdays[0=周一] 转换。 */
    private fun schemaWeekdayToPatternWeekday(schemaWd: Int): Int {
        // schema: 0=周日..6=周六
        // pattern: 0=周一..6=周日
        return if (schemaWd == 0) 6 else schemaWd - 1
    }

    private fun parseIsoToMs(iso: String): Long? {
        return try {
            Instant.from(DateTimeFormatter.ISO_INSTANT.parse(iso)).toEpochMilli()
        } catch (e: DateTimeParseException) {
            try { iso.toLong() } catch (e: NumberFormatException) { null }
        }
    }
}
