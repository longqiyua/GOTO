package com.goto.base.pattern

import com.goto.base.contracts.storage.AppTransitionPatternBase
import com.goto.base.contracts.storage.GotoInternalPattern
import com.goto.base.contracts.storage.ReminderFeedbackBase
import com.goto.base.contracts.storage.ReminderPreferenceBase
import com.goto.base.contracts.storage.TimingPatternBase

/**
 * Pattern 存储接口
 *
 * 对齐 goto-base/runtime/shared/where-pattern-store.js 中的 WherePatternStore 抽象接口。
 *
 * 设计原则：
 *   1. 所有方法原子、幂等（重放安全）
 *   2. profileId 用于多用户/多配置文件隔离
 *   3. schemaVersion 不兼容时由调用方决定迁移或隔离
 *   4. 读写返回深拷贝，避免外部修改内部状态
 *
 * 与 LearningStore 的关系：
 *   - PatternStore 是 Personal Layer 的一个独立子模块
 *   - 实现可以共享同一个底层存储（不同 Object Store）或独立存储
 *   - 删除 profile 时应同时清空 Pattern 数据
 */
interface PatternStore {

    // ====== TimingPattern ======

    /** 获取指定应用的 TimingPattern */
    fun getTimingPattern(packageName: String, profileId: String = "default"): TimingPatternBase?

    /** 写入/更新 TimingPattern */
    fun upsertTimingPattern(pattern: TimingPatternBase, profileId: String = "default")

    /** 获取该 profile 下的全部 TimingPattern */
    fun getAllTimingPatterns(profileId: String = "default"): List<TimingPatternBase>

    // ====== AppTransitionPattern ======

    /** 获取从指定应用出发的所有转移 pattern */
    fun getAppTransitionPatterns(fromPackageName: String, profileId: String = "default"): List<AppTransitionPatternBase>

    /** 写入/更新 AppTransitionPattern */
    fun upsertAppTransitionPattern(pattern: AppTransitionPatternBase, profileId: String = "default")

    /** 获取该 profile 下的全部 AppTransitionPattern */
    fun getAllAppTransitionPatterns(profileId: String = "default"): List<AppTransitionPatternBase>

    // ====== GotoInternalPattern ======

    /** 获取该 profile 下的全部 GotoInternalPattern */
    fun getGotoInternalPatterns(profileId: String = "default"): List<GotoInternalPattern>

    /** 写入/更新 GotoInternalPattern */
    fun upsertGotoInternalPattern(pattern: GotoInternalPattern, profileId: String = "default")

    /** 获取该 profile 下的全部 GotoInternalPattern（同 getGotoInternalPatterns，对齐 JS 接口命名） */
    fun getAllGotoInternalPatterns(profileId: String = "default"): List<GotoInternalPattern>

    // ====== ReminderPreference ======

    /** 获取指定 ruleId 的 ReminderPreference */
    fun getReminderPreference(ruleId: String, profileId: String = "default"): ReminderPreferenceBase?

    /** 写入/更新 ReminderPreference */
    fun upsertReminderPreference(pref: ReminderPreferenceBase, profileId: String = "default")

    /** 获取该 profile 下的全部 ReminderPreference */
    fun getAllReminderPreferences(profileId: String = "default"): List<ReminderPreferenceBase>

    // ====== ReminderFeedback ======

    /** 记录一条 ReminderFeedback */
    fun recordReminderFeedback(feedback: ReminderFeedbackBase, profileId: String = "default")

    /** 获取最近的 ReminderFeedback（默认按时间降序，取前 limit 条） */
    fun getRecentReminderFeedback(limit: Int = 100, profileId: String = "default"): List<ReminderFeedbackBase>

    /** 按过滤条件获取 ReminderFeedback */
    fun getRecentReminderFeedback(filter: FeedbackFilter, profileId: String = "default"): List<ReminderFeedbackBase>

    // ====== Profile 管理 ======

    /** 导出指定 profile 的全部 Pattern 数据 */
    fun exportPatternProfile(profileId: String = "default"): PatternProfileData

    /** 导入 Pattern 数据到指定 profile（覆盖） */
    fun importPatternProfile(data: PatternProfileData, profileId: String = "default")

    /** 重置指定 profile（清空所有 Pattern 数据） */
    fun resetPatternProfile(profileId: String = "default")

    /** 返回各表的计数统计；profileId 为 null 时返回全部 profile 汇总 */
    fun stats(profileId: String? = null): PatternStoreStats

    /** 存储是否可用（初始化成功后为 true） */
    val available: Boolean

    /** 是否处于降级模式（不可用或部分功能失败时为 true） */
    val degraded: Boolean
}

/**
 * 反馈查询过滤器
 *
 * 对齐 JS WherePatternStore.getRecentReminderFeedback(filter) 的 filter 参数。
 * 所有字段为可选，null 表示不限制该字段。
 */
data class FeedbackFilter(
    val ruleId: String? = null,
    val candidateId: String? = null,
    val action: String? = null,
    val since: String? = null,
    val limit: Int? = null
)

/**
 * Pattern Profile 数据（导出/导入用）
 *
 * 对齐 JS exportPatternProfile / importPatternProfile 的数据结构。
 */
data class PatternProfileData(
    val timing: List<TimingPatternBase>,
    val transitions: List<AppTransitionPatternBase>,
    val gotoInternal: List<GotoInternalPattern>,
    val preferences: List<ReminderPreferenceBase>,
    val feedback: List<ReminderFeedbackBase>
)

/**
 * PatternStore 统计信息
 *
 * 对齐 JS WherePatternStore.stats() 的返回结构。
 */
data class PatternStoreStats(
    val timingCount: Int,
    val transitionCount: Int,
    val gotoInternalCount: Int,
    val preferenceCount: Int,
    val feedbackCount: Int
)
