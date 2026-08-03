package com.goto.base.pattern

import com.goto.base.contracts.AppUsageAggregate
import com.goto.base.contracts.storage.TimingPatternBase
import java.time.Instant
import java.time.ZoneOffset
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * TimingPattern 构建器
 *
 * 对齐 goto-base/builder/patterns/timing-pattern-builder.js。
 *
 * 从 AppUsageAggregate 数组推导出应用时间使用模式。
 *
 * 算法：
 *   1. 按 packageName 分组
 *   2. 对每组会话，提取 startedAt 的 (weekday, hour, minute)
 *   3. 统计 weekdays 直方图（7 项）
 *   4. 统计 hourly 直方图（24 项），归一化为 0..1
 *   5. 计算 typicalHour = 最大概率小时
 *   6. typicalMinute = 该小时内会话的分钟中位数
 *   7. confidence = (sampleCount / maxSampleThreshold) * hourConcentration
 *   8. 时间衰减：按 lastSeenAt 与 decayHalfLifeDays 计算
 *
 * 重要：禁止接入 Android Usage Access；输入必须为 AppUsageAggregate 数组。
 */
class TimingPatternBuilder(
    private val config: WherePatternConfig = WherePatternConfig.DEFAULT,
    private val now: () -> String = { Instant.now().toString() }
) {
    /**
     * 从 AppUsageAggregate 数组构建 TimingPattern 数组。
     *
     * @param aggregates AppUsageAggregate 数组
     * @return TimingPattern 数组（已过滤低于阈值的应用）
     */
    fun build(aggregates: List<AppUsageAggregate>?): List<TimingPatternBase> {
        if (aggregates.isNullOrEmpty()) return emptyList()

        // 按 packageName 分组（过滤无 packageName / startedAt / Date.parse 为 NaN 的项）
        val groups = mutableMapOf<String, MutableList<Session>>()
        for (agg in aggregates) {
            val pkg = agg.packageName
            val startedAt = agg.startedAt
            if (pkg.isEmpty() || startedAt.isEmpty()) continue
            val ts = parseIsoToMs(startedAt) ?: continue
            groups.getOrPut(pkg) { mutableListOf() }.add(Session(agg, ts))
        }

        val patterns = mutableListOf<TimingPatternBase>()
        for ((packageName, sessions) in groups.entries) {
            val pattern = buildOne(packageName, sessions) ?: continue
            patterns.add(pattern)
        }
        return patterns
    }

    /**
     * 增量更新：在已有 pattern 基础上合并新会话。
     *
     * @param existing 已有的 TimingPattern（可为 null）
     * @param newAggregates 新会话
     * @return 更新后的 TimingPattern（或 null 表示样本不足）
     */
    fun update(existing: TimingPatternBase?, newAggregates: List<AppUsageAggregate>?): TimingPatternBase? {
        if (newAggregates.isNullOrEmpty()) return existing
        if (existing != null) {
            return mergeAndRebuild(existing, newAggregates)
        }
        val pkg = newAggregates[0].packageName
        val sessions = newAggregates.mapNotNull { agg ->
            val ts = parseIsoToMs(agg.startedAt) ?: return@mapNotNull null
            Session(agg, ts)
        }
        return buildOne(pkg, sessions)
    }

    /**
     * 对单个 packageName 的会话构建 Pattern。
     */
    private fun buildOne(packageName: String, sessions: List<Session>): TimingPatternBase? {
        if (sessions.size < config.minSampleCount) return null

        // 1. weekday 直方图（0=周一..6=周日）
        val weekdayCount = IntArray(7)
        val hourlyCount = IntArray(24)
        val hourMinuteBuckets = mutableMapOf<Int, MutableList<Int>>()
        var firstSeenMs = Long.MAX_VALUE
        var lastSeenMs = Long.MIN_VALUE

        for (s in sessions) {
            val zonedDateTime = Instant.ofEpochMilli(s.ts).atZone(ZoneOffset.UTC)
            // java.time: dayOfWeek.value 1=Monday..7=Sunday → weekdayIdx = value - 1
            // 等价于 JS getUTCDay(): 周日=0..周六=6 → weekdayIdx = (day==0)?6:day-1
            val weekdayIdx = zonedDateTime.dayOfWeek.value - 1
            weekdayCount[weekdayIdx]++
            val hour = zonedDateTime.hour
            val minute = zonedDateTime.minute
            hourlyCount[hour]++
            hourMinuteBuckets.getOrPut(hour) { mutableListOf() }.add(minute)
            if (s.ts < firstSeenMs) firstSeenMs = s.ts
            if (s.ts > lastSeenMs) lastSeenMs = s.ts
        }

        // 2. 找出典型小时（出现次数最多的小时）
        var typicalHour = 0
        var maxCount = -1
        for (h in 0 until 24) {
            if (hourlyCount[h] > maxCount) {
                maxCount = hourlyCount[h]
                typicalHour = h
            }
        }
        if (maxCount == 0) return null

        // 3. typicalMinute = 该小时内的分钟中位数
        val minutesInHour = hourMinuteBuckets[typicalHour] ?: emptyList()
        val typicalMinute = medianInt(minutesInHour)

        // 4. weekdays 数组（出现次数 >= 1 即 true）
        val weekdays = weekdayCount.map { it > 0 }

        // 5. hourlyPattern 归一化
        val maxHourly = max(1, hourlyCount.maxOrNull() ?: 0)
        val hourlyPattern = hourlyCount.map { it.toDouble() / maxHourly }

        // 6. confidence = (sampleCount / maxSampleThreshold) * hourConcentration
        val sampleCount = sessions.size
        val sampleFactor = min(1.0, sampleCount.toDouble() / config.maxSampleThreshold)
        val hourConcentration = maxCount.toDouble() / sampleCount
        val rawConfidence = sampleFactor * hourConcentration
        // 先用 rawConfidence 过滤（minConfidence 针对原始信号强度）
        if (rawConfidence < config.minConfidence) return null
        // 再应用时间衰减（衰减影响最终 confidence，但不影响是否被召回）
        val confidence = applyDecay(rawConfidence, lastSeenMs)

        // 7. P90 异常值过滤（保留为 metadata，不影响 pattern 主字段）
        val delays = sessions.map { it.agg.durationMs }.sorted()
        val p90 = percentile(delays, 0.9)

        return createTimingPattern(
            packageName = packageName,
            weekdays = weekdays,
            typicalHour = typicalHour,
            typicalMinute = typicalMinute,
            timeWindowMinutes = config.defaultTimeWindowMinutes,
            hourlyPattern = hourlyPattern,
            sampleCount = sampleCount,
            confidence = round(confidence, 4),
            firstSeenAt = msToIso(firstSeenMs),
            lastSeenAt = msToIso(lastSeenMs),
            metadata = mapOf(
                "source" to "pattern-builder",
                "p90DurationMs" to p90,
                "maxSampleThreshold" to config.maxSampleThreshold
            )
        )
    }

    /**
     * 合并并重建 pattern。
     *
     * 策略：将 existing.sampleCount 与新会话数相加作为新 sampleCount，
     * weekdays 合并（或运算），新会话足以独立构建 pattern 时以新数据为主导。
     */
    private fun mergeAndRebuild(existing: TimingPatternBase, newAggregates: List<AppUsageAggregate>): TimingPatternBase {
        val newSessions = newAggregates.mapNotNull { agg ->
            if (agg.packageName != existing.packageName || agg.startedAt.isEmpty()) return@mapNotNull null
            val ts = parseIsoToMs(agg.startedAt) ?: return@mapNotNull null
            Session(agg, ts)
        }
        if (newSessions.isEmpty()) return existing

        val newPattern = buildOne(existing.packageName, newSessions)

        // 合并 weekdays（或运算）：即使新会话不足以独立构建 pattern，仍可贡献 weekday 信号
        val mergedWeekdays = existing.weekdays.toMutableList()
        for (s in newSessions) {
            val zonedDateTime = Instant.ofEpochMilli(s.ts).atZone(ZoneOffset.UTC)
            val weekdayIdx = zonedDateTime.dayOfWeek.value - 1
            mergedWeekdays[weekdayIdx] = true
        }

        // 合并 sampleCount
        val mergedSample = (existing.sampleCount) + newSessions.size

        // 合并 confidence
        val mergedConf: Double
        var typicalHour = existing.typicalHour
        var typicalMinute = existing.typicalMinute
        var hourlyPattern: List<Double>? = existing.hourlyPattern

        if (newPattern != null) {
            // 新会话足够独立构建 pattern，以新数据为主导
            mergedConf = round(0.4 * existing.confidence + 0.6 * newPattern.confidence, 4)
            typicalHour = newPattern.typicalHour
            typicalMinute = newPattern.typicalMinute
            hourlyPattern = newPattern.hourlyPattern
        } else {
            // 新会话不足 minSampleCount，做轻量合并：confidence 微调
            val existingSample = max(1, existing.sampleCount)
            val newWeight = newSessions.size.toDouble() / (existingSample + newSessions.size)
            mergedConf = round((1 - newWeight) * existing.confidence + newWeight * 0.5, 4)
        }

        // 取较新/较早时间
        val newLastMs = newSessions.maxOf { it.ts }
        val newFirstMs = newSessions.minOf { it.ts }
        val existingLastMs = parseIsoToMs(existing.lastSeenAt) ?: Long.MIN_VALUE
        val existingFirstMs = parseIsoToMs(existing.firstSeenAt) ?: Long.MAX_VALUE
        val lastSeen = if (existingLastMs > newLastMs) existing.lastSeenAt else msToIso(newLastMs)
        val firstSeen = if (existingFirstMs < newFirstMs) existing.firstSeenAt else msToIso(newFirstMs)

        // floor：max(mergedConf, minConfidence)
        val finalConf = if (mergedConf >= config.minConfidence) mergedConf else config.minConfidence

        return existing.copy(
            weekdays = mergedWeekdays,
            sampleCount = mergedSample,
            confidence = finalConf,
            typicalHour = typicalHour,
            typicalMinute = typicalMinute,
            hourlyPattern = hourlyPattern,
            firstSeenAt = firstSeen,
            lastSeenAt = lastSeen,
            decayVersion = existing.decayVersion
        )
    }

    /**
     * 应用时间衰减。
     *
     * 公式：factor = 0.5 ^ (elapsedDays / decayHalfLifeDays)
     * 返回 max(decayMinWeight, confidence * factor)
     */
    private fun applyDecay(confidence: Double, lastSeenMs: Long): Double {
        val nowMs = parseIsoToMs(now()) ?: return max(config.decayMinWeight, confidence)
        val elapsedDays = max(0.0, (nowMs - lastSeenMs) / 86_400_000.0)
        val factor = 0.5.pow(elapsedDays / config.decayHalfLifeDays)
        return max(config.decayMinWeight, confidence * factor)
    }

    /** 内部会话包装类 */
    private data class Session(val agg: AppUsageAggregate, val ts: Long)
}
