package com.goto.base.pattern

import com.goto.base.contracts.ReminderPriorityBase
import com.goto.base.contracts.storage.AppTransitionPatternBase
import com.goto.base.contracts.storage.GotoInternalPattern
import com.goto.base.contracts.storage.ReminderPreferenceBase
import com.goto.base.contracts.storage.TimingPatternBase
import java.time.Instant
import java.util.UUID

/**
 * Pattern 工厂函数集合
 *
 * 对齐 goto-base/runtime/shared/where-pattern-types.js 中的工厂函数。
 * 所有工厂函数返回完整填充了字段的 Pattern 对象，调用方负责填入业务字段。
 */

/** Schema 版本（与 JS WHERE_PATTERN_SCHEMA_VERSION 一致） */
const val WHERE_PATTERN_SCHEMA_VERSION = "1.0.0"

/** Builder 版本（与 JS builderVersion metadata 一致） */
const val BUILDER_VERSION = "1.0.0"

/**
 * 生成带前缀的 UUID。
 * 对齐 JS genId：优先返回 UUID，无法生成时回退到时间戳+随机串。
 */
fun genId(prefix: String): String = "$prefix-${UUID.randomUUID()}"

/**
 * 创建 TimingPatternBase。
 *
 * 对齐 JS createTimingPattern：默认 weekdays 为周一到周五启用。
 */
fun createTimingPattern(
    packageName: String,
    weekdays: List<Boolean> = listOf(true, true, true, true, true, false, false),
    typicalHour: Int,
    typicalMinute: Int,
    timeWindowMinutes: Int = 30,
    hourlyPattern: List<Double>? = null,
    sampleCount: Int,
    confidence: Double,
    firstSeenAt: String,
    lastSeenAt: String,
    metadata: Map<String, Any?> = emptyMap()
): TimingPatternBase {
    return TimingPatternBase(
        patternId = "timing:$packageName",
        packageName = packageName,
        weekdays = weekdays,
        typicalHour = typicalHour,
        typicalMinute = typicalMinute,
        timeWindowMinutes = timeWindowMinutes,
        hourlyPattern = hourlyPattern,
        sampleCount = sampleCount,
        confidence = confidence,
        firstSeenAt = firstSeenAt,
        lastSeenAt = lastSeenAt,
        metadata = metadata + mapOf("builderVersion" to BUILDER_VERSION)
    )
}

/**
 * 创建 AppTransitionPatternBase。
 *
 * 对齐 JS createAppTransitionPattern：patternId 为 "transition:from->to"。
 */
fun createAppTransitionPattern(
    fromPackageName: String,
    toPackageName: String,
    transitionCount: Int,
    weightedTransitionCount: Double,
    medianDelayMs: Int,
    p90DelayMs: Int? = null,
    confidence: Double,
    firstSeenAt: String,
    lastSeenAt: String,
    metadata: Map<String, Any?> = emptyMap()
): AppTransitionPatternBase {
    return AppTransitionPatternBase(
        patternId = "transition:$fromPackageName->$toPackageName",
        fromPackageName = fromPackageName,
        toPackageName = toPackageName,
        transitionCount = transitionCount,
        weightedTransitionCount = weightedTransitionCount,
        medianDelayMs = medianDelayMs,
        p90DelayMs = p90DelayMs,
        confidence = confidence,
        firstSeenAt = firstSeenAt,
        lastSeenAt = lastSeenAt,
        metadata = metadata + mapOf("builderVersion" to BUILDER_VERSION)
    )
}

/**
 * 创建 GotoInternalPattern。
 *
 * 对齐 JS createGotoInternalPattern：patternId 为 "goto-internal:query@pkg"，
 * 默认 weekdays 全部启用。
 */
fun createGotoInternalPattern(
    normalizedQuery: String,
    targetPackageName: String,
    weekdays: List<Boolean> = listOf(true, true, true, true, true, true, true),
    typicalHour: Int,
    typicalMinute: Int? = null,
    timeWindowMinutes: Int? = null,
    sampleCount: Int,
    confidence: Double,
    firstSeenAt: String? = null,
    lastSeenAt: String? = null,
    metadata: Map<String, Any?> = emptyMap()
): GotoInternalPattern {
    return GotoInternalPattern(
        patternId = "goto-internal:$normalizedQuery@$targetPackageName",
        normalizedQuery = normalizedQuery,
        targetPackageName = targetPackageName,
        weekdays = weekdays,
        typicalHour = typicalHour,
        typicalMinute = typicalMinute,
        timeWindowMinutes = timeWindowMinutes,
        sampleCount = sampleCount,
        confidence = confidence,
        firstSeenAt = firstSeenAt,
        lastSeenAt = lastSeenAt,
        metadata = metadata + mapOf("builderVersion" to BUILDER_VERSION)
    )
}

/**
 * 创建 ReminderPreferenceBase（默认值）。
 *
 * 对齐 JS createReminderPreference：enabled=true，priority=NORMAL，所有计数为 0。
 */
fun createReminderPreference(ruleId: String): ReminderPreferenceBase {
    return ReminderPreferenceBase(
        ruleId = ruleId,
        enabled = true,
        priority = ReminderPriorityBase.NORMAL,
        consecutiveIgnoreCount = 0,
        openedCount = 0,
        ignoredCount = 0,
        dismissedCount = 0,
        updatedAt = Instant.now().toString()
    )
}
