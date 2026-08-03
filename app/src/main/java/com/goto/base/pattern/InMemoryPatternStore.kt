package com.goto.base.pattern

import com.goto.base.contracts.storage.AppTransitionPatternBase
import com.goto.base.contracts.storage.GotoInternalPattern
import com.goto.base.contracts.storage.ReminderFeedbackBase
import com.goto.base.contracts.storage.ReminderPreferenceBase
import com.goto.base.contracts.storage.TimingPatternBase

/**
 * PatternStore 的内存实现
 *
 * 对齐 goto-base/runtime/shared/where-pattern-store.js 中的 InMemoryWherePatternStore。
 *
 * 提供：
 *   - profileId 隔离（数据存于 _profiles[profileId]）
 *   - 原子读写（单线程模型下天然原子）
 *   - 数据上限保护（maxPatternsKept / maxFeedbackKept）
 *   - 所有读写返回深拷贝，避免外部修改内部状态
 *
 * LRU 淘汰策略：
 *   - 仅 timing + transition + gotoInternal 三类参与 LRU
 *   - preferences 和 feedback 不参与 LRU（它们有独立的上限保护）
 *   - 当总数 > maxPatternsKept 时，按 lastSeenAt||firstSeenAt 升序，删除最旧的
 */
class InMemoryPatternStore(
    private val config: WherePatternConfig = WherePatternConfig.DEFAULT
) : PatternStore {

    private val maxPatternsKept: Int = config.maxPatternsKept
    private val maxFeedbackKept: Int = config.maxFeedbackKept

    // profileId -> ProfileData
    private val profiles = mutableMapOf<String, ProfileData>()
    private val defaultProfileId = "default"
    private var initialized = false

    init {
        // 确保 default profile 存在
        getProfile(defaultProfileId)
        initialized = true
    }

    /** 单个 profile 的全部数据 */
    private data class ProfileData(
        val timing: MutableMap<String, TimingPatternBase>,                                   // packageName → pattern
        val transitions: MutableMap<String, MutableList<AppTransitionPatternBase>>,           // fromPkg → list
        val gotoInternal: MutableMap<String, MutableList<GotoInternalPattern>>,               // query → list
        val preferences: MutableMap<String, ReminderPreferenceBase>,                          // ruleId → pref
        val feedback: MutableList<ReminderFeedbackBase>
    )

    private fun newProfile(): ProfileData {
        return ProfileData(
            timing = mutableMapOf(),
            transitions = mutableMapOf(),
            gotoInternal = mutableMapOf(),
            preferences = mutableMapOf(),
            feedback = mutableListOf()
        )
    }

    private fun getProfile(profileId: String): ProfileData {
        val pid = if (profileId.isEmpty()) defaultProfileId else profileId
        return profiles.getOrPut(pid) { newProfile() }
    }

    override val available: Boolean
        get() = initialized

    override val degraded: Boolean
        get() = !initialized

    // ====== TimingPattern ======

    override fun getTimingPattern(packageName: String, profileId: String): TimingPatternBase? {
        val p = getProfile(profileId)
        return p.timing[packageName]?.let { deepCopy(it) }
    }

    override fun getAllTimingPatterns(profileId: String): List<TimingPatternBase> {
        val p = getProfile(profileId)
        return p.timing.values.map { deepCopy(it) }
    }

    override fun upsertTimingPattern(pattern: TimingPatternBase, profileId: String) {
        require(pattern.packageName.isNotEmpty()) { "upsertTimingPattern: invalid pattern" }
        val p = getProfile(profileId)
        p.timing[pattern.packageName] = deepCopy(pattern)
        maybeEvictPatterns(p)
    }

    // ====== AppTransitionPattern ======

    override fun getAppTransitionPatterns(fromPackageName: String, profileId: String): List<AppTransitionPatternBase> {
        val p = getProfile(profileId)
        return (p.transitions[fromPackageName] ?: emptyList()).map { deepCopy(it) }
    }

    override fun getAllAppTransitionPatterns(profileId: String): List<AppTransitionPatternBase> {
        val p = getProfile(profileId)
        return p.transitions.values.flatten().map { deepCopy(it) }
    }

    override fun upsertAppTransitionPattern(pattern: AppTransitionPatternBase, profileId: String) {
        require(pattern.fromPackageName.isNotEmpty() && pattern.toPackageName.isNotEmpty()) {
            "upsertAppTransitionPattern: invalid pattern"
        }
        val p = getProfile(profileId)
        val key = pattern.fromPackageName
        val arr = p.transitions.getOrPut(key) { mutableListOf() }
        // 替换同 toPackageName 的项
        val idx = arr.indexOfFirst { it.toPackageName == pattern.toPackageName }
        if (idx >= 0) arr[idx] = deepCopy(pattern)
        else arr.add(deepCopy(pattern))
        maybeEvictPatterns(p)
    }

    // ====== GotoInternalPattern ======

    override fun getGotoInternalPatterns(profileId: String): List<GotoInternalPattern> {
        return getAllGotoInternalPatterns(profileId)
    }

    override fun getAllGotoInternalPatterns(profileId: String): List<GotoInternalPattern> {
        val p = getProfile(profileId)
        return p.gotoInternal.values.flatten().map { deepCopy(it) }
    }

    override fun upsertGotoInternalPattern(pattern: GotoInternalPattern, profileId: String) {
        require(pattern.normalizedQuery.isNotEmpty() && pattern.targetPackageName.isNotEmpty()) {
            "upsertGotoInternalPattern: invalid pattern"
        }
        val p = getProfile(profileId)
        val key = pattern.normalizedQuery
        val arr = p.gotoInternal.getOrPut(key) { mutableListOf() }
        // 替换同 targetPackageName 的项
        val idx = arr.indexOfFirst { it.targetPackageName == pattern.targetPackageName }
        if (idx >= 0) arr[idx] = deepCopy(pattern)
        else arr.add(deepCopy(pattern))
        maybeEvictPatterns(p)
    }

    // ====== ReminderPreference ======

    override fun getReminderPreference(ruleId: String, profileId: String): ReminderPreferenceBase? {
        val p = getProfile(profileId)
        return p.preferences[ruleId]?.let { deepCopy(it) }
    }

    override fun getAllReminderPreferences(profileId: String): List<ReminderPreferenceBase> {
        val p = getProfile(profileId)
        return p.preferences.values.map { deepCopy(it) }
    }

    override fun upsertReminderPreference(pref: ReminderPreferenceBase, profileId: String) {
        require(pref.ruleId.isNotEmpty()) { "upsertReminderPreference: invalid preference" }
        val p = getProfile(profileId)
        p.preferences[pref.ruleId] = deepCopy(pref)
    }

    // ====== ReminderFeedback ======

    override fun recordReminderFeedback(feedback: ReminderFeedbackBase, profileId: String) {
        require(feedback.feedbackId.isNotEmpty()) { "recordReminderFeedback: invalid feedback" }
        val p = getProfile(profileId)
        p.feedback.add(deepCopy(feedback))
        // 上限保护
        if (p.feedback.size > maxFeedbackKept) {
            // 保留最新的 maxFeedbackKept 条（按 timestamp 升序排序后保留最新 N 条）
            p.feedback.sortBy { parseIsoToMs(it.timestamp) ?: 0L }
            while (p.feedback.size > maxFeedbackKept) {
                p.feedback.removeAt(0)
            }
        }
    }

    override fun getRecentReminderFeedback(limit: Int, profileId: String): List<ReminderFeedbackBase> {
        return getRecentReminderFeedback(FeedbackFilter(limit = limit), profileId)
    }

    override fun getRecentReminderFeedback(filter: FeedbackFilter, profileId: String): List<ReminderFeedbackBase> {
        val p = getProfile(profileId)
        var list = p.feedback.toList()

        filter.ruleId?.let { rid -> list = list.filter { it.ruleId == rid } }
        filter.candidateId?.let { cid -> list = list.filter { it.candidateId == cid } }
        filter.action?.let { act -> list = list.filter { it.action.value == act } }
        filter.since?.let { sinceStr ->
            val sinceMs = parseIsoToMs(sinceStr)
            if (sinceMs != null) {
                list = list.filter { f ->
                    val t = parseIsoToMs(f.timestamp)
                    t != null && t >= sinceMs
                }
            }
        }
        filter.limit?.let { lim ->
            if (lim > 0) {
                // 按 timestamp 降序，最新优先
                list = list.sortedByDescending { parseIsoToMs(it.timestamp) ?: 0L }
                list = list.take(lim)
            }
        }
        return list.map { deepCopy(it) }
    }

    // ====== Profile 管理 ======

    override fun exportPatternProfile(profileId: String): PatternProfileData {
        val pid = if (profileId.isEmpty()) defaultProfileId else profileId
        val p = profiles[pid] ?: return PatternProfileData(
            timing = emptyList(),
            transitions = emptyList(),
            gotoInternal = emptyList(),
            preferences = emptyList(),
            feedback = emptyList()
        )
        return PatternProfileData(
            timing = p.timing.values.map { deepCopy(it) },
            transitions = p.transitions.values.flatten().map { deepCopy(it) },
            gotoInternal = p.gotoInternal.values.flatten().map { deepCopy(it) },
            preferences = p.preferences.values.map { deepCopy(it) },
            feedback = p.feedback.map { deepCopy(it) }
        )
    }

    override fun importPatternProfile(data: PatternProfileData, profileId: String) {
        val pid = if (profileId.isEmpty()) defaultProfileId else profileId
        val p = newProfile()
        profiles[pid] = p

        for (t in data.timing) {
            if (t.packageName.isNotEmpty()) {
                p.timing[t.packageName] = deepCopy(t)
            }
        }
        for (t in data.transitions) {
            if (t.fromPackageName.isNotEmpty() && t.toPackageName.isNotEmpty()) {
                p.transitions.getOrPut(t.fromPackageName) { mutableListOf() }.add(deepCopy(t))
            }
        }
        for (g in data.gotoInternal) {
            if (g.normalizedQuery.isNotEmpty() && g.targetPackageName.isNotEmpty()) {
                p.gotoInternal.getOrPut(g.normalizedQuery) { mutableListOf() }.add(deepCopy(g))
            }
        }
        for (pref in data.preferences) {
            if (pref.ruleId.isNotEmpty()) {
                p.preferences[pref.ruleId] = deepCopy(pref)
            }
        }
        for (f in data.feedback) {
            if (f.feedbackId.isNotEmpty()) {
                p.feedback.add(deepCopy(f))
            }
        }
    }

    override fun resetPatternProfile(profileId: String) {
        val pid = if (profileId.isEmpty()) defaultProfileId else profileId
        profiles[pid] = newProfile()
    }

    // ====== 统计 ======

    override fun stats(profileId: String?): PatternStoreStats {
        if (profileId != null) {
            val p = profiles[profileId] ?: return PatternStoreStats(0, 0, 0, 0, 0)
            return PatternStoreStats(
                timingCount = p.timing.size,
                transitionCount = p.transitions.values.sumOf { it.size },
                gotoInternalCount = p.gotoInternal.values.sumOf { it.size },
                preferenceCount = p.preferences.size,
                feedbackCount = p.feedback.size
            )
        }
        // 全部 profile 汇总
        var timingCount = 0
        var transitionCount = 0
        var gotoInternalCount = 0
        var preferenceCount = 0
        var feedbackCount = 0
        for (p in profiles.values) {
            timingCount += p.timing.size
            transitionCount += p.transitions.values.sumOf { it.size }
            gotoInternalCount += p.gotoInternal.values.sumOf { it.size }
            preferenceCount += p.preferences.size
            feedbackCount += p.feedback.size
        }
        return PatternStoreStats(
            timingCount = timingCount,
            transitionCount = transitionCount,
            gotoInternalCount = gotoInternalCount,
            preferenceCount = preferenceCount,
            feedbackCount = feedbackCount
        )
    }

    // ====== 内部辅助 ======

    /**
     * LRU 淘汰：当 timing + transition + gotoInternal 总数 > maxPatternsKept 时，
     * 按 lastSeenAt||firstSeenAt 升序，删除最旧的。
     * preferences 和 feedback 不参与 LRU。
     */
    private fun maybeEvictPatterns(p: ProfileData) {
        val total = p.timing.size +
            p.transitions.values.sumOf { it.size } +
            p.gotoInternal.values.sumOf { it.size }
        if (total <= maxPatternsKept) return

        // 收集所有 pattern 及其时间戳
        data class EvictEntry(
            val kind: Int,  // 0=timing, 1=transition, 2=gotoInternal
            val ts: Long,
            val patternId: String,
            val key1: String,  // packageName / fromPackageName / normalizedQuery
            val key2: String   // unused for timing / toPackageName / targetPackageName
        )

        val all = mutableListOf<EvictEntry>()
        for (t in p.timing.values) {
            val ts = parseIsoToMs(t.lastSeenAt) ?: parseIsoToMs(t.firstSeenAt) ?: 0L
            all.add(EvictEntry(0, ts, t.patternId, t.packageName, ""))
        }
        for (arr in p.transitions.values) {
            for (t in arr) {
                val ts = parseIsoToMs(t.lastSeenAt) ?: parseIsoToMs(t.firstSeenAt) ?: 0L
                all.add(EvictEntry(1, ts, t.patternId, t.fromPackageName, t.toPackageName))
            }
        }
        for (arr in p.gotoInternal.values) {
            for (g in arr) {
                val ts = parseIsoToMs(g.lastSeenAt) ?: parseIsoToMs(g.firstSeenAt) ?: 0L
                all.add(EvictEntry(2, ts, g.patternId, g.normalizedQuery, g.targetPackageName))
            }
        }

        // 按时间戳升序排序
        all.sortBy { it.ts }

        val toRemove = all.take(all.size - maxPatternsKept)
        for (item in toRemove) {
            when (item.kind) {
                0 -> {
                    p.timing.remove(item.key1)
                }
                1 -> {
                    val arr = p.transitions[item.key1]
                    if (arr != null) {
                        val idx = arr.indexOfFirst { it.toPackageName == item.key2 }
                        if (idx >= 0) arr.removeAt(idx)
                        if (arr.isEmpty()) p.transitions.remove(item.key1)
                    }
                }
                2 -> {
                    val arr = p.gotoInternal[item.key1]
                    if (arr != null) {
                        val idx = arr.indexOfFirst { it.targetPackageName == item.key2 }
                        if (idx >= 0) arr.removeAt(idx)
                        if (arr.isEmpty()) p.gotoInternal.remove(item.key1)
                    }
                }
            }
        }
    }

    // ====== 深拷贝辅助 ======

    /** 深拷贝 TimingPatternBase */
    private fun deepCopy(p: TimingPatternBase): TimingPatternBase {
        return p.copy(
            weekdays = p.weekdays.toList(),
            hourlyPattern = p.hourlyPattern?.toList(),
            metadata = deepCopyMetadata(p.metadata)
        )
    }

    /** 深拷贝 AppTransitionPatternBase */
    private fun deepCopy(p: AppTransitionPatternBase): AppTransitionPatternBase {
        return p.copy(
            metadata = deepCopyMetadata(p.metadata)
        )
    }

    /** 深拷贝 GotoInternalPattern */
    private fun deepCopy(p: GotoInternalPattern): GotoInternalPattern {
        return p.copy(
            weekdays = p.weekdays.toList(),
            metadata = deepCopyMetadata(p.metadata)
        )
    }

    /** 深拷贝 ReminderPreferenceBase */
    private fun deepCopy(p: ReminderPreferenceBase): ReminderPreferenceBase {
        return p.copy(
            metadata = deepCopyMetadata(p.metadata)
        )
    }

    /** 深拷贝 ReminderFeedbackBase */
    private fun deepCopy(p: ReminderFeedbackBase): ReminderFeedbackBase {
        return p.copy(
            metadata = deepCopyMetadata(p.metadata)
        )
    }

    /** 深拷贝 metadata Map（值通常是 String/Int/Long/Double/Boolean 等基本类型） */
    private fun deepCopyMetadata(metadata: Map<String, Any?>): Map<String, Any?> {
        if (metadata.isEmpty()) return emptyMap()
        val result = LinkedHashMap<String, Any?>(metadata.size)
        for ((k, v) in metadata) {
            result[k] = deepCopyValue(v)
        }
        return result
    }

    /** 递归深拷贝值（处理 List / Map / 基本类型） */
    private fun deepCopyValue(v: Any?): Any? {
        return when (v) {
            null -> null
            is String, is Boolean, is Int, is Long, is Double, is Float -> v
            is List<*> -> v.map { deepCopyValue(it) }
            is Map<*, *> -> {
                val result = LinkedHashMap<String, Any?>(v.size)
                for ((k, value) in v) {
                    result[k.toString()] = deepCopyValue(value)
                }
                result
            }
            else -> v  // 不可变对象或未知类型，直接返回引用
        }
    }
}
