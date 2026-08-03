package com.goto.base.pattern

import com.goto.base.contracts.SelectionEvent
import com.goto.base.contracts.storage.GotoInternalPattern
import java.time.Instant
import java.time.ZoneOffset
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * GotoInternalPattern 构建器
 *
 * 对齐 goto-base/builder/patterns/goto-internal-pattern-builder.js。
 *
 * 从 SelectionEvent 数组推导出 GOTO 内部行为模式。
 *
 * 算法：
 *   1. 按 (normalizedQuery, selectedPackageName) 分组
 *   2. 对每组的 SelectionEvent：
 *      - 提取 timestamp 的 (weekday, hour, minute)
 *   3. 统计 weekday 直方图与 hourly 直方图
 *   4. typicalHour = 出现次数最多的小时
 *   5. typicalMinute = 该小时内分钟的中位数
 *   6. confidence = (sampleCount / maxSampleThreshold) * hourConcentration * 衰减
 *
 * 注意：GotoInternal 没有 hourlyPattern 字段、没有 P90 计算。
 *
 * 输入来源是真实的 Personal Base QueryEvent + SelectionEvent（用户搜索行为）。
 */
class GotoInternalPatternBuilder(
    private val config: WherePatternConfig = WherePatternConfig.DEFAULT,
    private val now: () -> String = { Instant.now().toString() }
) {
    /**
     * 从 SelectionEvent 数组构建 GotoInternalPattern 数组。
     *
     * @param events SelectionEvent 数组（必须包含 normalizedQuery、selectedPackageName、timestamp）
     * @return GotoInternalPattern 数组
     */
    fun build(events: List<SelectionEvent>?): List<GotoInternalPattern> {
        if (events.isNullOrEmpty()) return emptyList()

        // 按 (normalizedQuery, selectedPackageName) 分组
        val groups = mutableMapOf<String, MutableList<Session>>()
        for (se in events) {
            val q = se.normalizedQuery
            val pkg = se.selectedPackageName
            val tsStr = se.timestamp
            if (q.isEmpty() || pkg.isEmpty() || tsStr.isEmpty()) continue
            val ts = parseIsoToMs(tsStr) ?: continue
            val key = "$q@$pkg"
            groups.getOrPut(key) { mutableListOf() }.add(Session(se, ts))
        }

        val patterns = mutableListOf<GotoInternalPattern>()
        for ((_, sessions) in groups.entries) {
            val pattern = buildOne(sessions) ?: continue
            patterns.add(pattern)
        }
        return patterns
    }

    /**
     * 增量更新：在已有 pattern 基础上合并新事件。
     *
     * @param existing 已有的 GotoInternalPattern（可为 null）
     * @param newSelectionEvents 新选择事件
     * @return 更新后的 GotoInternalPattern（或 null）
     */
    fun update(existing: GotoInternalPattern?, newSelectionEvents: List<SelectionEvent>?): GotoInternalPattern? {
        if (newSelectionEvents.isNullOrEmpty()) return existing
        if (existing == null) {
            val all = build(newSelectionEvents)
            return all.firstOrNull()
        }
        // 合并：按 newSelectionEvents 过滤同 query+pkg 的事件
        val filtered = newSelectionEvents.filter {
            it.normalizedQuery == existing.normalizedQuery &&
                it.selectedPackageName == existing.targetPackageName
        }
        if (filtered.isEmpty()) return existing

        val newSessions = filtered.mapNotNull { se ->
            val ts = parseIsoToMs(se.timestamp) ?: return@mapNotNull null
            Session(se, ts)
        }
        if (newSessions.isEmpty()) return existing

        val newPattern = buildOne(newSessions)

        // 合并 weekdays（或运算）
        val mergedWeekdays = existing.weekdays.toMutableList()
        for (s in newSessions) {
            val zonedDateTime = Instant.ofEpochMilli(s.ts).atZone(ZoneOffset.UTC)
            val weekdayIdx = zonedDateTime.dayOfWeek.value - 1
            mergedWeekdays[weekdayIdx] = true
        }

        val mergedSample = existing.sampleCount + newSessions.size

        val mergedConf: Double
        var typicalHour = existing.typicalHour
        var typicalMinute = existing.typicalMinute

        if (newPattern != null) {
            // 新事件足够独立构建 pattern
            mergedConf = round(0.4 * existing.confidence + 0.6 * newPattern.confidence, 4)
            typicalHour = newPattern.typicalHour
            typicalMinute = newPattern.typicalMinute
        } else {
            // 新事件不足 minSampleCount，轻量合并
            val existingSample = max(1, existing.sampleCount)
            val newWeight = newSessions.size.toDouble() / (existingSample + newSessions.size)
            mergedConf = round((1 - newWeight) * existing.confidence + newWeight * 0.5, 4)
        }

        val newLastMs = newSessions.maxOf { it.ts }
        val newFirstMs = newSessions.minOf { it.ts }
        val existingLastMs = parseIsoToMs(existing.lastSeenAt) ?: Long.MIN_VALUE
        val existingFirstMs = parseIsoToMs(existing.firstSeenAt) ?: Long.MAX_VALUE
        val lastSeen = if (existingLastMs > newLastMs) existing.lastSeenAt else msToIso(newLastMs)
        val firstSeen = if (existingFirstMs < newFirstMs) existing.firstSeenAt else msToIso(newFirstMs)

        val finalConf = if (mergedConf >= config.minConfidence) mergedConf else config.minConfidence

        return existing.copy(
            weekdays = mergedWeekdays,
            sampleCount = mergedSample,
            confidence = finalConf,
            typicalHour = typicalHour,
            typicalMinute = typicalMinute,
            firstSeenAt = firstSeen,
            lastSeenAt = lastSeen,
            decayVersion = existing.decayVersion
        )
    }

    /**
     * 对单个 (query, pkg) 分组构建 Pattern。
     */
    private fun buildOne(sessions: List<Session>): GotoInternalPattern? {
        if (sessions.size < config.minSampleCount) return null

        val weekdayCount = IntArray(7)
        val hourlyCount = IntArray(24)
        val hourMinuteBuckets = mutableMapOf<Int, MutableList<Int>>()
        var firstSeenMs = Long.MAX_VALUE
        var lastSeenMs = Long.MIN_VALUE

        for (s in sessions) {
            val zonedDateTime = Instant.ofEpochMilli(s.ts).atZone(ZoneOffset.UTC)
            val weekdayIdx = zonedDateTime.dayOfWeek.value - 1
            weekdayCount[weekdayIdx]++
            val hour = zonedDateTime.hour
            val minute = zonedDateTime.minute
            hourlyCount[hour]++
            hourMinuteBuckets.getOrPut(hour) { mutableListOf() }.add(minute)
            if (s.ts < firstSeenMs) firstSeenMs = s.ts
            if (s.ts > lastSeenMs) lastSeenMs = s.ts
        }

        var typicalHour = 0
        var maxCount = -1
        for (h in 0 until 24) {
            if (hourlyCount[h] > maxCount) {
                maxCount = hourlyCount[h]
                typicalHour = h
            }
        }
        if (maxCount == 0) return null

        val minutesInHour = hourMinuteBuckets[typicalHour] ?: emptyList()
        val typicalMinute = medianInt(minutesInHour)
        val weekdays = weekdayCount.map { it > 0 }

        val sampleCount = sessions.size
        val sampleFactor = min(1.0, sampleCount.toDouble() / config.maxSampleThreshold)
        val hourConcentration = maxCount.toDouble() / sampleCount
        val rawConfidence = sampleFactor * hourConcentration
        // 先用 rawConfidence 过滤（minConfidence 针对原始信号强度）
        if (rawConfidence < config.minConfidence) return null
        // 再应用时间衰减
        val confidence = applyDecay(rawConfidence, lastSeenMs)

        // 取 sessions[0] 作为 first（提取 normalizedQuery / selectedPackageName）
        val first = sessions[0].se
        return createGotoInternalPattern(
            normalizedQuery = first.normalizedQuery,
            targetPackageName = first.selectedPackageName,
            weekdays = weekdays,
            typicalHour = typicalHour,
            typicalMinute = typicalMinute,
            timeWindowMinutes = config.defaultTimeWindowMinutes,
            sampleCount = sampleCount,
            confidence = round(confidence, 4),
            firstSeenAt = msToIso(firstSeenMs),
            lastSeenAt = msToIso(lastSeenMs),
            metadata = mapOf("source" to "pattern-builder")
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
    private data class Session(val se: SelectionEvent, val ts: Long)
}
