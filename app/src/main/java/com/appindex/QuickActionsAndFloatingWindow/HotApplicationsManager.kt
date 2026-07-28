package com.appindex.QuickActionsAndFloatingWindow

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    高频应用统计栏管理器 / Hot Applications Manager            ║
 * ║                                                                              ║
 * ║  功能：                                                                        ║
 * ║  1. 每30分钟统计一次高频应用                                                   ║
 * ║  2. 用户可选统计时效：1小时 / 2小时（默认1小时）                                ║
 * ║  3. 第一次进入默认提示，用户可手动覆盖                                         ║
 * ║  4. 数据隐性写入 App_Launches，随激活码同步                                    ║
 * ║                                                                              ║
 * ║  数据存储：SharedPreferences + 同步到 App_Launches                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class HotApplicationsManager(context: Context) {

    private val preferences: SharedPreferences =
        context.getSharedPreferences("hot_apps_prefs", Context.MODE_PRIVATE)

    /** 统计时效（小时） */
    var statisticsDurationHours: Int
        get() = preferences.getInt(KEY_STATISTICS_DURATION, DEFAULT_DURATION_HOURS)
        set(value) {
            preferences.edit().putInt(KEY_STATISTICS_DURATION, value.coerceIn(1, 4)).apply()
        }

    /** 是否已设置过（第一次进入提示用） */
    var hasConfigured: Boolean
        get() = preferences.getBoolean(KEY_HAS_CONFIGURED, false)
        set(value) = preferences.edit().putBoolean(KEY_HAS_CONFIGURED, value).apply()

    /**
     * 记录一次应用启动（用于高频统计）
     * 每30分钟为一个统计窗口
     */
    fun recordApplicationLaunch(packageName: String, label: String) {
        val now = System.currentTimeMillis()
        val windowKey = getCurrentWindowKey(now)

        val json = preferences.getString(windowKey, "[]") ?: "[]"
        val array = JSONArray(json)

        var found = false
        for (index in 0 until array.length()) {
            val obj = array.getJSONObject(index)
            if (obj.getString(KEY_PACKAGE_NAME) == packageName) {
                obj.put(KEY_COUNT, obj.getInt(KEY_COUNT) + 1)
                obj.put(KEY_LAST_USED, now)
                found = true
                break
            }
        }

        if (!found) {
            array.put(JSONObject().apply {
                put(KEY_PACKAGE_NAME, packageName)
                put(KEY_LABEL, label)
                put(KEY_COUNT, 1)
                put(KEY_LAST_USED, now)
            })
        }

        preferences.edit().putString(windowKey, array.toString()).apply()

        // 清理过期窗口数据
        cleanOldWindows(now)
    }

    /**
     * 获取当前高频应用列表
     * @param limit 返回数量
     * @return 按使用频率排序的应用列表
     */
    fun getHotApplications(limit: Int = 5): List<HotApplicationStat> {
        val now = System.currentTimeMillis()
        val durationMilliseconds = statisticsDurationHours.toLong() * 60L * 60L * 1000L
        val cutoffTime = now - durationMilliseconds

        // 聚合所有有效窗口的数据
        val applicationCounts = mutableMapOf<String, HotApplicationStat>()

        val allKeys = preferences.all.keys.filter { it.startsWith(WINDOW_KEY_PREFIX) }
        for (key in allKeys) {
            val windowTime = key.removePrefix(WINDOW_KEY_PREFIX).toLongOrNull() ?: continue
            if (windowTime < cutoffTime) continue

            val json = preferences.getString(key, "[]") ?: "[]"
            val array = JSONArray(json)

            for (index in 0 until array.length()) {
                val obj = array.getJSONObject(index)
                val packageName = obj.getString(KEY_PACKAGE_NAME)
                val label = obj.getString(KEY_LABEL)
                val count = obj.getInt(KEY_COUNT)

                val existing = applicationCounts[packageName]
                if (existing != null) {
                    applicationCounts[packageName] = existing.copy(count = existing.count + count)
                } else {
                    applicationCounts[packageName] = HotApplicationStat(packageName, label, count)
                }
            }
        }

        return applicationCounts.values.sortedByDescending { it.count }.take(limit)
    }

    /**
     * 获取用于 App_Launches 同步的数据格式
     */
    fun getHotApplicationsForSync(): JSONArray {
        val hotApplications = getHotApplications(10)
        val array = JSONArray()
        hotApplications.forEach { application ->
            array.put(JSONObject().apply {
                put(KEY_PACKAGE_NAME, application.packageName)
                put(KEY_LABEL, application.label)
                put(KEY_OPEN_TIMES, application.count)
                put(KEY_SOURCE, SOURCE_HOT_APPLICATIONS_BAR)
            })
        }
        return array
    }

    /**
     * 获取当前统计时效的显示文本
     */
    fun getDurationLabel(): String {
        return "${statisticsDurationHours}小时"
    }

    /**
     * 切换统计时效
     */
    fun toggleDuration(): Int {
        statisticsDurationHours = when (statisticsDurationHours) {
            1 -> 2
            2 -> 1
            else -> 1
        }
        return statisticsDurationHours
    }

    /**
     * 获取当前时间窗口的键名（每30分钟一个窗口）
     */
    private fun getCurrentWindowKey(time: Long): String {
        val windowIndex = time / WINDOW_LENGTH_MILLISECONDS
        return "${WINDOW_KEY_PREFIX}${windowIndex * WINDOW_LENGTH_MILLISECONDS}"
    }

    /**
     * 清理过期的窗口数据
     */
    private fun cleanOldWindows(now: Long) {
        val maxDurationMilliseconds = MAX_DURATION_HOURS.toLong() * 60L * 60L * 1000L
        val cutoffTime = now - maxDurationMilliseconds

        val editor = preferences.edit()
        val allKeys = preferences.all.keys
        for (key in allKeys) {
            if (key.startsWith(WINDOW_KEY_PREFIX)) {
                val windowTime = key.removePrefix(WINDOW_KEY_PREFIX).toLongOrNull() ?: continue
                if (windowTime < cutoffTime) {
                    editor.remove(key)
                }
            }
        }
        editor.apply()
    }

    /** 单个高频应用统计 */
    data class HotApplicationStat(
        val packageName: String,
        val label: String,
        val count: Int
    )

    companion object {
        // SharedPreferences Key 常量
        private const val KEY_STATISTICS_DURATION = "stats_duration_hours"
        private const val KEY_HAS_CONFIGURED = "has_configured_hot_apps"

        // JSON 字段 Key
        private const val KEY_PACKAGE_NAME = "packageName"
        private const val KEY_LABEL = "label"
        private const val KEY_COUNT = "count"
        private const val KEY_LAST_USED = "lastUsed"
        private const val KEY_OPEN_TIMES = "OpenTimes"
        private const val KEY_SOURCE = "source"
        private const val SOURCE_HOT_APPLICATIONS_BAR = "hot_apps_bar"

        // 窗口配置
        private const val WINDOW_KEY_PREFIX = "window_"
        private const val WINDOW_LENGTH_MILLISECONDS = 30L * 60L * 1000L
        private const val MAX_DURATION_HOURS = 4
        private const val DEFAULT_DURATION_HOURS = 1
    }
}
