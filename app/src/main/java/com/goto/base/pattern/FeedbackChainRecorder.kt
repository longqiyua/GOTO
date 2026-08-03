package com.goto.base.pattern

import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedDeque

/**
 * GOTO Base 个人层 — 反馈链条记录器
 *
 * 记录"用户输入查询 → 点击应用"的完整事件流，用于：
 *   1. 离线命中率分析（clickedRank 分布、matchMode 召回质量）
 *   2. 排名调优（低 rank 命中 → 上浮权重）
 *   3. Where 反馈与搜索反馈的统一审计
 *
 * 数据结构：符合 feedback-chain.schema.json
 * 淘汰策略：LRU，默认上限 1000 条
 *
 * 设计原则（遵循 Base 纪律）：
 *   1. 只记录稳定上下文特征（hour/weekday/geofenceId/foregroundPackage），不存瞬时传感器
 *   2. 内存暂存 + 可导出 JSON 落盘到 personal/ 目录
 *   3. 不与 PatternStore 的 ReminderFeedback 耦合（语义不同：本类记录"搜索点击"，ReminderFeedback 记录"通知反馈"）
 */
class FeedbackChainRecorder(
    private val zone: ZoneId = ZoneId.systemDefault(),
    private val maxEvents: Int = 1000
) {

    /** 反馈事件 */
    data class FeedbackEvent(
        val eventId: String,
        val timestamp: String,                  // ISO 8601
        val query: String,
        val normalizedQuery: String? = null,
        val clickedPackage: String,
        val clickedAppName: String? = null,
        val clickedRank: Int,                   // 0=第1个，-1=未在候选中
        val candidateCount: Int,
        val matchMode: MatchMode,
        val context: EventContext
    )

    enum class MatchMode(val value: String) {
        EXACT("exact"),
        PREFIX("prefix"),
        FUZZY("fuzzy"),
        RAG("rag"),
        SYNONYM("synonym")
    }

    /** 事件上下文（仅稳定特征） */
    data class EventContext(
        val hour: Int,                  // 0..23
        val weekday: Int,               // 0..6（0=周日）
        val geofenceId: String? = null,
        val foregroundPackage: String? = null
    )

    /** 完整反馈链条 */
    data class FeedbackChain(
        val profileId: String,
        val events: List<FeedbackEvent>,
        val maxEvents: Int
    )

    // profileId -> 事件队列（倒序，最新在队首）
    private val chains = mutableMapOf<String, ConcurrentLinkedDeque<FeedbackEvent>>()

    /**
     * 记录一条反馈事件。
     *
     * @param profileId 用户画像 ID
     * @param query 用户原始查询
     * @param clickedPackage 用户点击的应用包名
     * @param clickedRank 在结果列表中的排名（0=第1个，-1=未在候选中、手动选择）
     * @param candidateCount 本次查询返回的候选应用总数
     * @param matchMode 匹配模式
     * @param clickedAppName 点击应用中文名（可选，便于离线分析）
     * @param normalizedQuery 归一化后的查询（可选）
     * @param geofenceId 事件发生时所在围栏 ID（可选）
     * @param foregroundPackage 事件发生时前台应用包名（可选）
     * @param eventTime 事件时间（默认当前时间）
     */
    @Synchronized
    fun record(
        profileId: String,
        query: String,
        clickedPackage: String,
        clickedRank: Int,
        candidateCount: Int,
        matchMode: MatchMode,
        clickedAppName: String? = null,
        normalizedQuery: String? = null,
        geofenceId: String? = null,
        foregroundPackage: String? = null,
        eventTime: Long = System.currentTimeMillis()
    ): FeedbackEvent {
        require(clickedPackage.isNotEmpty()) { "record: clickedPackage must not be empty" }

        val zoned = ZonedDateTime.ofInstant(Instant.ofEpochMilli(eventTime), zone)
        val context = EventContext(
            hour = zoned.hour,
            weekday = zoned.dayOfWeek.value % 7,  // 周日(7)%7=0
            geofenceId = geofenceId,
            foregroundPackage = foregroundPackage
        )

        val event = FeedbackEvent(
            eventId = UUID.randomUUID().toString(),
            timestamp = DateTimeFormatter.ISO_INSTANT.format(Instant.ofEpochMilli(eventTime)),
            query = query,
            normalizedQuery = normalizedQuery,
            clickedPackage = clickedPackage,
            clickedAppName = clickedAppName,
            clickedRank = clickedRank,
            candidateCount = candidateCount,
            matchMode = matchMode,
            context = context
        )

        val deque = chains.getOrPut(profileId) { ConcurrentLinkedDeque() }
        deque.addFirst(event)  // 最新在队首
        // LRU 淘汰
        while (deque.size > maxEvents) {
            deque.removeLast()
        }
        return event
    }

    /** 获取指定 profile 的反馈链条（导出用）。 */
    @Synchronized
    fun export(profileId: String): FeedbackChain {
        val deque = chains[profileId] ?: return FeedbackChain(profileId, emptyList(), maxEvents)
        return FeedbackChain(profileId, deque.toList(), maxEvents)
    }

    /** 获取最近 N 条事件（按时间倒序）。 */
    @Synchronized
    fun getRecent(profileId: String, limit: Int = 100): List<FeedbackEvent> {
        val deque = chains[profileId] ?: return emptyList()
        return deque.toList().take(limit)
    }

    /**
     * 命中率分析：clickedRank 分布。
     * @return 统计结果（rank=-1 计为"未命中候选"）
     */
    fun analyzeHitRate(profileId: String): HitRateAnalysis {
        val deque = chains[profileId] ?: return HitRateAnalysis(0, 0, 0.0, emptyMap())
        val events = deque.toList()
        if (events.isEmpty()) return HitRateAnalysis(0, 0, 0.0, emptyMap())

        val total = events.size
        val hitCount = events.count { it.clickedRank >= 0 }
        val hitRate = if (total > 0) hitCount.toDouble() / total else 0.0
        // rank 分桶：0, 1, 2, 3, 4, 5+
        val buckets = mutableMapOf(
            "rank_0" to 0,
            "rank_1" to 0,
            "rank_2" to 0,
            "rank_3" to 0,
            "rank_4" to 0,
            "rank_5_plus" to 0,
            "not_in_candidates" to 0
        )
        for (e in events) {
            val key = when {
                e.clickedRank < 0 -> "not_in_candidates"
                e.clickedRank == 0 -> "rank_0"
                e.clickedRank == 1 -> "rank_1"
                e.clickedRank == 2 -> "rank_2"
                e.clickedRank == 3 -> "rank_3"
                e.clickedRank == 4 -> "rank_4"
                else -> "rank_5_plus"
            }
            buckets[key] = (buckets[key] ?: 0) + 1
        }
        return HitRateAnalysis(total, hitCount, hitRate, buckets)
    }

    /**
     * 按应用包名过滤的精细化命中率分析（v1.1 三层联动）。
     *
     * 仅统计 clickedPackage == packageName 的事件，提供应用级命中率。
     * 用于 ReminderScorer 的低命中率应用降权。
     *
     * @param profileId 用户画像 ID
     * @param packageName 目标应用包名（非空）
     * @return 应用级命中率分析（totalEvents=0 表示该应用无反馈记录）
     */
    fun analyzeHitRateByPackage(profileId: String, packageName: String): HitRateAnalysis {
        require(packageName.isNotEmpty()) { "analyzeHitRateByPackage: packageName must not be empty" }
        val deque = chains[profileId] ?: return HitRateAnalysis(0, 0, 0.0, emptyMap())
        val events = deque.toList().filter { it.clickedPackage == packageName }
        if (events.isEmpty()) return HitRateAnalysis(0, 0, 0.0, emptyMap())

        val total = events.size
        val hitCount = events.count { it.clickedRank >= 0 }
        val hitRate = if (total > 0) hitCount.toDouble() / total else 0.0
        val buckets = mutableMapOf(
            "rank_0" to 0,
            "rank_1" to 0,
            "rank_2" to 0,
            "rank_3" to 0,
            "rank_4" to 0,
            "rank_5_plus" to 0,
            "not_in_candidates" to 0
        )
        for (e in events) {
            val key = when {
                e.clickedRank < 0 -> "not_in_candidates"
                e.clickedRank == 0 -> "rank_0"
                e.clickedRank == 1 -> "rank_1"
                e.clickedRank == 2 -> "rank_2"
                e.clickedRank == 3 -> "rank_3"
                e.clickedRank == 4 -> "rank_4"
                else -> "rank_5_plus"
            }
            buckets[key] = (buckets[key] ?: 0) + 1
        }
        return HitRateAnalysis(total, hitCount, hitRate, buckets)
    }

    /** 清空指定 profile 的反馈链条。 */
    @Synchronized
    fun reset(profileId: String) {
        chains.remove(profileId)
    }

    data class HitRateAnalysis(
        val totalEvents: Int,
        val hitCount: Int,           // clickedRank >= 0
        val hitRate: Double,         // hitCount / totalEvents
        val rankDistribution: Map<String, Int>
    )
}
