package com.goto.base.contracts

// ═══ Base Pattern Builder 输入类型 ═══
// 迁移自 goto-where/runtimes/kotlin/contracts/UsageTypes.kt
// 这些类型是 Base Pattern Builder 的输入数据，概念上属于 GOTO Base。
//
// 注意：AppUsageSignal（平台无关使用信号）仍归 where-contracts 所有，
// 因为它是 Where 的输入信号而非 Base 的 Builder 输入。
// where-contracts 通过 typealias re-export AppUsageAggregate 和 SelectionEvent。

/**
 * 应用使用聚合（Builder 输入）
 * 对齐 goto-base builder/patterns/app-usage-aggregate-types.js
 */
data class AppUsageAggregate(
    val packageName: String,
    val sessionId: String,
    val startedAt: String,          // ISO 8601
    val endedAt: String,            // ISO 8601
    val durationMs: Long,
    val previousPackageName: String? = null,
    val transitionDelayMs: Long? = null,
    val metadata: Map<String, Any?> = emptyMap(),
    val schemaVersion: String = "1.0.0"
)

/**
 * 选择事件（GotoInternalPatternBuilder 输入）
 * 来自 GOTO 搜索结果点击
 */
data class SelectionEvent(
    val normalizedQuery: String,
    val selectedPackageName: String,
    val timestamp: String,          // ISO 8601
    val metadata: Map<String, Any?> = emptyMap()
)
