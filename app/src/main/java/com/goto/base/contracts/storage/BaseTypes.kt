package com.goto.base.contracts.storage

import com.goto.base.contracts.FeedbackAction
import com.goto.base.contracts.ReminderPriorityBase

// ═══ Base 存储层 Pattern 类型（完整版） ═══
// 迁移自 goto-where/runtimes/kotlin/contracts/storage/BaseTypes.kt
// 对齐 goto-base/schema/usage/*.schema.json
// 这些是 PatternStore 持久化的类型，包含存储元数据。
//
// 权威源现已归 GOTO Base（com.goto.base.contracts.storage），
// where-contracts.storage 包通过 typealias re-export 本文件类型，
// 保持 Where 侧 import 路径不变（com.goto.where.contracts.storage.*）。

/** 时间使用模式（Base 存储版本） */
data class TimingPatternBase(
    val patternId: String,
    val packageName: String,
    val weekdays: List<Boolean>,                 // 长度 7，0=周一..6=周日
    val typicalHour: Int,                        // 0..23
    val typicalMinute: Int,                      // 0..59
    val timeWindowMinutes: Int,                  // 1..720
    val hourlyPattern: List<Double>? = null,     // 长度 24，权重 0..1
    val sampleCount: Int,
    val confidence: Double,                      // 0..1
    val firstSeenAt: String,
    val lastSeenAt: String,
    val decayVersion: Int = 0,
    val enabled: Boolean = true,
    val metadata: Map<String, Any?> = emptyMap(),
    val schemaVersion: String = "1.0.0"
)

/** 应用转移模式（Base 存储版本） */
data class AppTransitionPatternBase(
    val patternId: String,
    val fromPackageName: String,
    val toPackageName: String,
    val transitionCount: Int,
    val weightedTransitionCount: Double,
    val medianDelayMs: Int,
    val p90DelayMs: Int? = null,
    val confidence: Double,
    val firstSeenAt: String,
    val lastSeenAt: String,
    val decayVersion: Int = 0,
    val enabled: Boolean = true,
    val metadata: Map<String, Any?> = emptyMap(),
    val schemaVersion: String = "1.0.0"
)

/** GOTO 内部行为模式（Base 存储版本） */
data class GotoInternalPattern(
    val patternId: String,
    val normalizedQuery: String,
    val targetPackageName: String,
    val weekdays: List<Boolean>,                 // 长度 7
    val typicalHour: Int,                        // 0..23
    val typicalMinute: Int? = null,              // 0..59
    val timeWindowMinutes: Int? = null,          // 1..720
    val sampleCount: Int,
    val confidence: Double,
    val firstSeenAt: String? = null,
    val lastSeenAt: String? = null,
    val decayVersion: Int = 0,
    val enabled: Boolean = true,
    val metadata: Map<String, Any?> = emptyMap(),
    val schemaVersion: String = "1.0.0"
)

/** 提醒偏好（Base 存储版本，含完整统计字段） */
data class ReminderPreferenceBase(
    val ruleId: String,
    val enabled: Boolean,
    val priority: ReminderPriorityBase = ReminderPriorityBase.NORMAL,
    val quietHoursOverride: QuietHoursOverride? = null,
    val cooldownOverride: Int? = null,           // 秒
    val consecutiveIgnoreCount: Int = 0,
    val openedCount: Int = 0,
    val ignoredCount: Int = 0,
    val dismissedCount: Int = 0,
    val lastDeliveredAt: String? = null,
    val lastFeedbackAt: String? = null,
    val updatedAt: String? = null,
    val metadata: Map<String, Any?> = emptyMap(),
    val schemaVersion: String = "1.0.0"
)

/** 提醒反馈（Base 存储版本） */
data class ReminderFeedbackBase(
    val feedbackId: String,
    val ruleId: String,
    val candidateId: String,
    val receiptId: String? = null,
    val packageName: String? = null,
    val action: FeedbackAction,
    val delayMs: Int? = null,
    val snoozeUntil: String? = null,
    val timestamp: String,
    val profileId: String? = "default",
    val metadata: Map<String, Any?> = emptyMap(),
    val schemaVersion: String = "1.0.0"
)

/** 静默时段覆盖 */
data class QuietHoursOverride(
    val startHour: Int? = null,      // 0..23
    val startMinute: Int? = null,    // 0..59
    val endHour: Int? = null,        // 0..23
    val endMinute: Int? = null       // 0..59
)
