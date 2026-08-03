package com.goto.base.pattern

import com.goto.base.contracts.storage.TimingPatternBase
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

/**
 * GOTO Base 个人层 — 24h × weekday 热力图构建器
 *
 * 输入：PatternStore 中已沉淀的 TimingPattern（每个应用一条，含 hourlyPattern + weekdays）
 * 输出：符合 heatmap.schema.json 的热力图数据
 *
 * 设计原则（遵循 Base 纪律）：
 *   1. 只读取 PatternStore 已有数据，不订阅原始事件流
 *   2. 纯算术聚合，无 IO、无副作用
 *   3. 输出可序列化为 JSON 落盘到 personal/ 目录
 *
 * 数据来源对齐：
 *   - launchCount 由 hourlyPattern[hour] * sampleCount 加权近似（PatternStore 不存原始事件）
 *   - topApps 按各应用在 (hour, weekday) 单元的权重 × sampleCount 排序
 */
class HeatmapBuilder(
    private val zone: ZoneId = ZoneId.systemDefault(),
    private val decayHalfLifeDays: Double = 30.0
) {

    /** 热力图单元格 */
    data class HeatmapCell(
        val hour: Int,                  // 0..23
        val weekday: Int,               // 0..6（0=周日，与 schema 对齐）
        val launchCount: Int,           // 该时段总启动次数（加权近似）
        val topApps: List<TopApp>       // 该时段启动最多的应用
    )

    data class TopApp(
        val packageName: String,
        val count: Int
    )

    data class Heatmap(
        val profileId: String,
        val heatmap: List<HeatmapCell>,
        val lastUpdated: String,
        val decayHalfLifeDays: Double = 30.0
    )

    /**
     * 从 TimingPattern 列表构建热力图。
     *
     * @param patterns 某 profile 下全部 TimingPattern
     * @param profileId 用户画像 ID
     * @param referenceTime 参考时间（用于时间衰减），默认当前时间
     */
    fun build(
        patterns: List<TimingPatternBase>,
        profileId: String,
        referenceTime: Long = System.currentTimeMillis()
    ): Heatmap {
        // 单元格：(hour, weekday) -> 应用权重累加
        // weekdays 数组下标 0..6（0=周一..6=周日），需映射到 schema 的 0=周日..6=周六
        val cells = Array(24) { Array(7) { mutableMapOf<String, Double>() } }
        // 标准时间衰减权重（基于 lastSeenAt）
        val nowMs = referenceTime

        for (p in patterns) {
            if (!p.enabled) continue
            val hourly = p.hourlyPattern ?: continue
            if (hourly.size < 24) continue
            // 时间衰减：lastSeenAt 距 now 越远，权重越小（半衰期 decayHalfLifeDays 天）
            val decay = computeDecayWeight(p.lastSeenAt, nowMs)
            for (hour in 0..23) {
                val hourWeight = hourly[hour]
                if (hourWeight <= 0.0) continue
                for (wdIdx in 0..6) {
                    if (p.weekdays.getOrNull(wdIdx) != true) continue
                    // 转换：PatternStore weekdays[0]=周一..[6]=周日
                    //          schema weekday 0=周日..6=周六
                    val schemaWd = patternWeekdayToSchemaWeekday(wdIdx)
                    val contribution = hourWeight * p.sampleCount * decay
                    if (contribution <= 0.0) continue
                    cells[hour][schemaWd].merge(p.packageName, contribution) { a, b -> a + b }
                }
            }
        }

        // 转换为 HeatmapCell 列表
        val cellList = mutableListOf<HeatmapCell>()
        for (hour in 0..23) {
            for (wd in 0..6) {
                val appMap = cells[hour][wd]
                if (appMap.isEmpty()) {
                    cellList.add(HeatmapCell(hour, wd, 0, emptyList()))
                    continue
                }
                val sorted = appMap.entries
                    .sortedByDescending { it.value }
                    .take(10)  // topApps 上限 10
                    .map { e ->
                        TopApp(
                            packageName = e.key,
                            count = e.value.toInt().coerceAtLeast(0)
                        )
                    }
                val total = appMap.values.sum().toInt().coerceAtLeast(0)
                cellList.add(HeatmapCell(hour, wd, total, sorted))
            }
        }

        return Heatmap(
            profileId = profileId,
            heatmap = cellList,
            lastUpdated = formatIso(nowMs),
            decayHalfLifeDays = decayHalfLifeDays
        )
    }

    /**
     * 从 PatternStore 直接构建（便捷入口）。
     */
    fun buildFromStore(
        store: PatternStore,
        profileId: String = "default",
        referenceTime: Long = System.currentTimeMillis()
    ): Heatmap {
        val patterns = store.getAllTimingPatterns(profileId)
        return build(patterns, profileId, referenceTime)
    }

    /** 时间衰减权重：半衰期 decayHalfLifeDays 天，越远权重越小。 */
    private fun computeDecayWeight(lastSeenAt: String, nowMs: Long): Double {
        val lastMs = parseIsoToMs(lastSeenAt) ?: return 0.5  // 解析失败给中等权重
        val deltaDays = (nowMs - lastMs) / (24.0 * 3600 * 1000)
        if (deltaDays <= 0) return 1.0
        return Math.pow(0.5, deltaDays / decayHalfLifeDays)
    }

    /** PatternStore weekdays[0]=周一 → schema weekday 0=周日 的转换。 */
    private fun patternWeekdayToSchemaWeekday(patternIdx: Int): Int {
        // patternIdx: 0=周一..6=周日
        // schema:     0=周日..6=周六
        // 即 周一(0)→1, 周二(1)→2, ..., 周日(6)→0
        return if (patternIdx == 6) 0 else patternIdx + 1
    }

    private fun parseIsoToMs(iso: String): Long? {
        return try {
            Instant.from(DateTimeFormatter.ISO_INSTANT.parse(iso)).toEpochMilli()
        } catch (e: DateTimeParseException) {
            try { iso.toLong() } catch (e: NumberFormatException) { null }
        }
    }

    private fun formatIso(ms: Long): String {
        return DateTimeFormatter.ISO_INSTANT.format(Instant.ofEpochMilli(ms))
    }
}
