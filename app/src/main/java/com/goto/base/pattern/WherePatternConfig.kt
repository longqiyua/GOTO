package com.goto.base.pattern

/**
 * Pattern 构建和存储的全局配置
 *
 * 对齐 goto-base/runtime/shared/where-pattern-types.js 中的 DEFAULT_WHERE_PATTERN_CONFIG。
 * 所有阈值常量必须与 JS 版本完全一致。
 *
 * 字段说明：
 *   - minSampleCount: 最小样本数
 *   - minConfidence: 最小置信度
 *   - defaultTimeWindowMinutes: 默认时间窗口
 *   - decayHalfLifeDays: 衰减半衰期
 *   - decayMinWeight: 衰减下限
 *   - outlierP90ThresholdMs: 异常值 P90 阈值（10 分钟）
 *   - maxFeedbackKept: 单 profile 最多保留反馈数
 *   - maxPatternsKept: 单 profile 最多保留 pattern 数
 *   - maxSampleThreshold: confidence 饱和样本数（达到此值 sampleFactor=1.0）
 *   - schemaVersion: Schema 版本
 */
data class WherePatternConfig(
    val minSampleCount: Int = 3,
    val minConfidence: Double = 0.4,
    val defaultTimeWindowMinutes: Int = 30,
    val decayHalfLifeDays: Int = 30,
    val decayMinWeight: Double = 0.05,
    val outlierP90ThresholdMs: Long = 600_000L,
    val maxFeedbackKept: Int = 5000,
    val maxPatternsKept: Int = 1000,
    val maxSampleThreshold: Int = 10,
    val schemaVersion: String = "1.0.0"
) {
    init {
        // 对齐 JS buildWherePatternConfig 的 clamp 逻辑
        require(minSampleCount >= 1) { "minSampleCount must be >= 1" }
        require(minConfidence in 0.0..1.0) { "minConfidence must be in [0, 1]" }
        require(defaultTimeWindowMinutes >= 1) { "defaultTimeWindowMinutes must be >= 1" }
        require(decayHalfLifeDays >= 1) { "decayHalfLifeDays must be >= 1" }
        require(maxFeedbackKept >= 100) { "maxFeedbackKept must be >= 100" }
        require(maxPatternsKept >= 50) { "maxPatternsKept must be >= 50" }
        require(maxSampleThreshold >= 1) { "maxSampleThreshold must be >= 1" }
    }

    companion object {
        /** 默认配置（与 JS DEFAULT_WHERE_PATTERN_CONFIG 一致） */
        val DEFAULT = WherePatternConfig()
    }
}
