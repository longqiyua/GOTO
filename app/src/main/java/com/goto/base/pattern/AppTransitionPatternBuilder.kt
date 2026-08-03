package com.goto.base.pattern

import com.goto.base.contracts.AppUsageAggregate
import com.goto.base.contracts.storage.AppTransitionPatternBase
import java.time.Instant
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * AppTransitionPattern 构建器
 *
 * 对齐 goto-base/builder/patterns/app-transition-pattern-builder.js。
 *
 * 从 AppUsageAggregate 数组推导出应用转移模式。
 *
 * 算法：
 *   1. 按时间排序所有会话
 *   2. 对相邻 (A, B) 计算 delay = B.startedAt - A.endedAt
 *   3. 按 (from, to) 分组
 *   4. 对每组：
 *      - transitionCount = 样本数
 *      - medianDelayMs = 延时中位数
 *      - p90DelayMs = P90 延时（异常值过滤用）
 *      - weightedTransitionCount = 应用时间衰减后的加权和
 *      - confidence = sampleFactor（与 Timing 不同，无 hourConcentration）
 *
 * 重要：禁止接入 Android Usage Access；输入必须为 AppUsageAggregate 数组。
 */
class AppTransitionPatternBuilder(
    private val config: WherePatternConfig = WherePatternConfig.DEFAULT,
    private val now: () -> String = { Instant.now().toString() },
    private val maxDelayMs: Long = 1_800_000L  // 30 分钟
) {
    /**
     * 从 AppUsageAggregate 数组构建 AppTransitionPattern 数组。
     *
     * @param aggregates AppUsageAggregate 数组
     * @return AppTransitionPattern 数组
     */
    fun build(aggregates: List<AppUsageAggregate>?): List<AppTransitionPatternBase> {
        if (aggregates.isNullOrEmpty()) return emptyList()

        // 过滤无 packageName/startedAt/endedAt 的项；解析 ms；过滤 NaN
        val sorted = aggregates.mapNotNull { agg ->
            val pkg = agg.packageName
            val startedAt = agg.startedAt
            val endedAt = agg.endedAt
            if (pkg.isEmpty() || startedAt.isEmpty() || endedAt.isEmpty()) return@mapNotNull null
            val startedMs = parseIsoToMs(startedAt) ?: return@mapNotNull null
            val endedMs = parseIsoToMs(endedAt) ?: return@mapNotNull null
            SortedEntry(pkg, startedMs, endedMs)
        }.sortedBy { it.startedMs }

        if (sorted.size < 2) return emptyList()

        // 收集所有转移：key = "from->to"
        val transitions = mutableMapOf<String, TransitionEntry>()
        for (i in 1 until sorted.size) {
            val prev = sorted[i - 1]
            val curr = sorted[i]
            if (prev.packageName == curr.packageName) continue
            val delay = curr.startedMs - prev.endedMs
            if (delay < 0 || delay > maxDelayMs) continue
            val key = "${prev.packageName}->${curr.packageName}"
            val entry = transitions.getOrPut(key) {
                TransitionEntry(prev.packageName, curr.packageName, mutableListOf(), mutableListOf())
            }
            entry.delays.add(delay)
            entry.timestamps.add(curr.startedMs)
        }

        val patterns = mutableListOf<AppTransitionPatternBase>()
        for (entry in transitions.values) {
            val pattern = buildOne(entry) ?: continue
            patterns.add(pattern)
        }
        return patterns
    }

    /**
     * 增量更新：在已有 pattern 基础上合并新转移。
     *
     * @param existing 已有的 AppTransitionPattern（可为 null）
     * @param newAggregates 新会话
     * @return 更新后的 AppTransitionPattern（或 null）
     */
    fun update(existing: AppTransitionPatternBase?, newAggregates: List<AppUsageAggregate>?): AppTransitionPatternBase? {
        if (newAggregates.isNullOrEmpty()) return existing
        if (existing == null) {
            val all = build(newAggregates)
            return all.firstOrNull { it.fromPackageName == newAggregates[0].packageName }
        }

        // 尝试用新数据独立构建
        val newPatterns = build(newAggregates)
        val match = newPatterns.firstOrNull {
            it.fromPackageName == existing.fromPackageName && it.toPackageName == existing.toPackageName
        }

        if (match != null) {
            // 新数据足够独立构建 pattern，做完整合并
            val mergedCount = existing.transitionCount + match.transitionCount
            val mergedWeighted = existing.weightedTransitionCount + match.weightedTransitionCount
            val mergedMedian = Math.round(0.5 * existing.medianDelayMs + 0.5 * match.medianDelayMs).toInt()
            val mergedConf = round(0.4 * existing.confidence + 0.6 * match.confidence, 4)
            val existingLastMs = parseIsoToMs(existing.lastSeenAt) ?: Long.MIN_VALUE
            val matchLastMs = parseIsoToMs(match.lastSeenAt) ?: Long.MIN_VALUE
            val existingFirstMs = parseIsoToMs(existing.firstSeenAt) ?: Long.MAX_VALUE
            val matchFirstMs = parseIsoToMs(match.firstSeenAt) ?: Long.MAX_VALUE
            val lastSeen = if (existingLastMs > matchLastMs) existing.lastSeenAt else match.lastSeenAt
            val firstSeen = if (existingFirstMs < matchFirstMs) existing.firstSeenAt else match.firstSeenAt

            return existing.copy(
                transitionCount = mergedCount,
                weightedTransitionCount = mergedWeighted,
                medianDelayMs = mergedMedian,
                confidence = mergedConf,
                firstSeenAt = firstSeen,
                lastSeenAt = lastSeen,
                decayVersion = existing.decayVersion
            )
        }

        // 新数据不足以独立构建 pattern，做轻量合并：
        // 提取属于此转移的新会话对
        val newTransitions = extractTransitions(newAggregates)
        val relevant = newTransitions.filter {
            it.from == existing.fromPackageName && it.to == existing.toPackageName
        }
        if (relevant.isEmpty()) return existing

        val newCount = relevant.size
        val mergedCount = existing.transitionCount + newCount
        val newWeightedSum = relevant.sumOf { decayFactor(it.timestamp) }
        val mergedWeighted = existing.weightedTransitionCount + round(newWeightedSum, 4)
        val allNewDelays = relevant.map { it.delay }.sorted()
        val mergedMedian = Math.round(
            0.5 * existing.medianDelayMs + 0.5 * median(allNewDelays).toInt()
        ).toInt()
        val newLastMs = relevant.maxOf { it.timestamp }
        val newFirstMs = relevant.minOf { it.timestamp }
        val existingLastMs = parseIsoToMs(existing.lastSeenAt) ?: Long.MIN_VALUE
        val existingFirstMs = parseIsoToMs(existing.firstSeenAt) ?: Long.MAX_VALUE
        val lastSeen = if (existingLastMs > newLastMs) existing.lastSeenAt else msToIso(newLastMs)
        val firstSeen = if (existingFirstMs < newFirstMs) existing.firstSeenAt else msToIso(newFirstMs)

        return existing.copy(
            transitionCount = mergedCount,
            weightedTransitionCount = mergedWeighted,
            medianDelayMs = mergedMedian,
            confidence = existing.confidence,  // 保持 confidence（轻量合并不改信号强度）
            firstSeenAt = firstSeen,
            lastSeenAt = lastSeen,
            decayVersion = existing.decayVersion
        )
    }

    /**
     * 从 aggregate 数组提取转移对（用于轻量合并）。
     */
    private fun extractTransitions(aggregates: List<AppUsageAggregate>): List<ExtractedTransition> {
        if (aggregates.size < 2) return emptyList()
        val sorted = aggregates.mapNotNull { agg ->
            val pkg = agg.packageName
            val startedAt = agg.startedAt
            val endedAt = agg.endedAt
            if (pkg.isEmpty() || startedAt.isEmpty() || endedAt.isEmpty()) return@mapNotNull null
            val startedMs = parseIsoToMs(startedAt) ?: return@mapNotNull null
            val endedMs = parseIsoToMs(endedAt) ?: return@mapNotNull null
            SortedEntry(pkg, startedMs, endedMs)
        }.sortedBy { it.startedMs }

        val transitions = mutableListOf<ExtractedTransition>()
        for (i in 1 until sorted.size) {
            val prev = sorted[i - 1]
            val curr = sorted[i]
            if (prev.packageName == curr.packageName) continue
            val delay = curr.startedMs - prev.endedMs
            if (delay < 0 || delay > maxDelayMs) continue
            transitions.add(ExtractedTransition(prev.packageName, curr.packageName, delay, curr.startedMs))
        }
        return transitions
    }

    /**
     * 对单个转移条目构建 Pattern。
     */
    private fun buildOne(entry: TransitionEntry): AppTransitionPatternBase? {
        if (entry.delays.size < config.minSampleCount) return null

        // 排序计算中位数与 P90
        val sortedDelays = entry.delays.sorted()
        val medianDelayMs = median(sortedDelays)
        val p90DelayMs = percentile(sortedDelays, 0.9)

        // 时间衰减后的加权和
        var weightedSum = 0.0
        for (ts in entry.timestamps) {
            weightedSum += decayFactor(ts)
        }

        val sampleCount = entry.delays.size
        val sampleFactor = min(1.0, sampleCount.toDouble() / config.maxSampleThreshold)
        // confidence 基于"信号强度"（sampleFactor），延时质量作为 metadata 供 scorer 使用
        // 注意：与 Timing 不同，这里没有 hourConcentration
        val rawConfidence = sampleFactor
        // 先用 rawConfidence 过滤（minConfidence 针对原始信号强度）
        if (rawConfidence < config.minConfidence) return null
        // 再应用时间衰减
        val lastSeenMs = entry.timestamps.maxOrNull() ?: Long.MIN_VALUE
        val confidence = applyDecay(rawConfidence, lastSeenMs)
        // 延时惩罚（记录为 metadata，不直接影响 confidence 过滤）
        val delayPenalty = min(1.0, medianDelayMs.toDouble() / maxDelayMs)

        val firstSeenMs = entry.timestamps.minOrNull() ?: Long.MIN_VALUE

        return createAppTransitionPattern(
            fromPackageName = entry.from,
            toPackageName = entry.to,
            transitionCount = sampleCount,
            weightedTransitionCount = round(weightedSum, 4),
            medianDelayMs = Math.round(medianDelayMs.toDouble()).toInt(),
            p90DelayMs = Math.round(p90DelayMs.toDouble()).toInt(),
            confidence = round(confidence, 4),
            firstSeenAt = msToIso(firstSeenMs),
            lastSeenAt = msToIso(lastSeenMs),
            metadata = mapOf(
                "source" to "pattern-builder",
                "delayPenalty" to round(delayPenalty, 4)
            )
        )
    }

    /**
     * 计算单个时间戳的衰减因子。
     * 公式：max(decayMinWeight, 0.5 ^ (elapsedDays / decayHalfLifeDays))
     */
    private fun decayFactor(timestampMs: Long): Double {
        val nowMs = parseIsoToMs(now()) ?: return config.decayMinWeight
        val elapsedDays = max(0.0, (nowMs - timestampMs) / 86_400_000.0)
        val factor = 0.5.pow(elapsedDays / config.decayHalfLifeDays)
        return max(config.decayMinWeight, factor)
    }

    /**
     * 应用时间衰减到 confidence。
     * 公式：max(decayMinWeight, confidence * 0.5 ^ (elapsedDays / decayHalfLifeDays))
     */
    private fun applyDecay(confidence: Double, lastSeenMs: Long): Double {
        val nowMs = parseIsoToMs(now()) ?: return max(config.decayMinWeight, confidence)
        val elapsedDays = max(0.0, (nowMs - lastSeenMs) / 86_400_000.0)
        val factor = 0.5.pow(elapsedDays / config.decayHalfLifeDays)
        return max(config.decayMinWeight, confidence * factor)
    }

    /** 已排序的会话条目 */
    private data class SortedEntry(
        val packageName: String,
        val startedMs: Long,
        val endedMs: Long
    )

    /** 转移条目（构建阶段） */
    private data class TransitionEntry(
        val from: String,
        val to: String,
        val delays: MutableList<Long>,
        val timestamps: MutableList<Long>
    )

    /** 提取的转移（轻量合并阶段） */
    private data class ExtractedTransition(
        val from: String,
        val to: String,
        val delay: Long,
        val timestamp: Long
    )
}
