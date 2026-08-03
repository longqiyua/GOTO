package com.goto.base.contracts

// ═══ Base 存储层相关枚举契约 ═══
// 迁移自 goto-where/runtimes/kotlin/contracts/Enums.kt
// 这些枚举被 Base Pattern 类型（ReminderFeedbackBase / ReminderPreferenceBase）使用，
// 概念上属于 Base Personal Layer，因此归 base-contracts 所有。
// where-contracts 通过 typealias re-export，保持 Where 侧 import 不变。

/** 用户反馈动作类型 */
enum class FeedbackAction(val value: String) {
    OPENED("opened"),
    IGNORED("ignored"),
    DISMISSED("dismissed"),
    DISABLED_RULE("disabled_rule"),
    SNOOZED("snoozed");

    companion object {
        fun fromValue(v: String?): FeedbackAction? = v?.let { src ->
            entries.firstOrNull { it.value == src }
        }
    }
}

/** 提醒优先级（Base 版本，4 级，含 critical） */
enum class ReminderPriorityBase(val value: String) {
    LOW("low"),
    NORMAL("normal"),
    HIGH("high"),
    CRITICAL("critical");

    companion object {
        fun fromValue(v: String?): ReminderPriorityBase = v?.let { src ->
            entries.firstOrNull { it.value == src }
        } ?: NORMAL
    }
}
