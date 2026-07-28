package com.appindex.where

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * UsageSignalProvider — Android 使用信号提供者
 *
 * 使用 Android 官方 UsageStats API（需 PACKAGE_USAGE_STATS 权限）获取用户授权范围内的
 * 应用使用事件，转化为平台无关的 AppUsageSignal。
 *
 * 输出 JSON 形态（与 goto-base 契约对齐）：
 * {
 *   signalId, packageName, eventType, timestamp, durationMs,
 *   previousPackageName, nextPackageName,
 *   source: "android-usage-stats",
 *   permissionState, schemaVersion
 * }
 *
 * 要求：
 *   1. 兼容不同 Android 版本的前台/后台事件类型
 *   2. 去除无效、重复和乱序事件
 *   3. 排除 GOTO 自己不需要的系统噪音
 *   4. 原始事件默认 TTL 为 24 小时（配置化）
 *   5. 聚合后删除过期原始事件（由 Base 层负责）
 *   6. Usage Access 未授权时返回 degraded，不伪造数据
 *   7. 不保存窗口标题、输入内容或其他隐私内容
 *   8. 不阻塞主线程（调用方应在 IO 调度器调用）
 */
class UsageSignalProvider(
    private val context: Context,
    private val permissionGateway: PermissionGateway,
    private val config: Config = Config()
) {

    /**
     * 配置项。
     */
    data class Config(
        /** 原始事件保留时长（毫秒），默认 24 小时 */
        val eventTtlMs: Long = TimeUnit.HOURS.toMillis(24),
        /** 单次查询最大事件数 */
        val maxEventsPerQuery: Int = 1000,
        /** 排除的系统包名前缀（系统噪音） */
        val excludedPackagePrefixes: List<String> = listOf(
            "com.android.systemui",
            "com.android.launcher",
            "com.google.android.googlequicksearchbox",
            // 输入法（不属于用户应用）
            "com.iflytek.inputmethod",
            "com.sohu.inputmethod.sogou",
            "com.baidu.input"
        ),
        /** 排除的 GOTO 自身包名 */
        val excludedSelfPackages: List<String> = listOf(
            "com.appindex"
        )
    )

    /**
     * 获取最近时间窗口内的使用信号。
     *
     * @param lookbackMs 回溯时长（毫秒），默认 24 小时
     * @return UsageSignalResult（signals 数组 + degraded 标志）
     */
    fun getUsageSignals(lookbackMs: Long = config.eventTtlMs): UsageSignalResult {
        val permState = permissionGateway.checkPermissionState()
        if (!permState.usageAccessGranted) {
            return UsageSignalResult(
                signals = emptyList(),
                degraded = true,
                permissionState = permState,
                reason = "Usage Access not granted"
            )
        }

        val statsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return UsageSignalResult(
                signals = emptyList(),
                degraded = true,
                permissionState = permState,
                reason = "UsageStatsManager unavailable"
            )

        val now = System.currentTimeMillis()
        val start = now - lookbackMs

        val events = try {
            statsManager.queryEvents(start, now)
        } catch (e: SecurityException) {
            return UsageSignalResult(
                signals = emptyList(),
                degraded = true,
                permissionState = permState,
                reason = "SecurityException: ${e.message}"
            )
        } catch (e: Exception) {
            return UsageSignalResult(
                signals = emptyList(),
                degraded = true,
                permissionState = permState,
                reason = "Query failed: ${e.message}"
            )
        }

        val signals = mutableListOf<AppUsageSignal>()
        val event = UsageEvents.Event()
        var count = 0
        var lastPackageName: String? = null
        var lastTimestamp: Long = 0

        while (events.hasNextEvent() && count < config.maxEventsPerQuery) {
            events.getNextEvent(event)
            val packageName = event.packageName ?: continue

            // 过滤系统噪音和 GOTO 自身
            if (isExcluded(packageName)) continue

            val eventType = mapEventType(event.eventType)
            if (eventType == null) continue

            // 去重：相同 packageName + 相同 eventType + 相同 timestamp
            if (packageName == lastPackageName && eventType == signals.lastOrNull()?.eventType
                && event.timeStamp == lastTimestamp
            ) continue

            // 乱序过滤：时间戳不能倒退
            if (event.timeStamp < lastTimestamp) continue

            val signal = AppUsageSignal(
                signalId = "sig-${event.timeStamp}-$packageName-${eventType}",
                packageName = packageName,
                eventType = eventType,
                timestamp = event.timeStamp,
                durationMs = 0L, // UsageEvents 不直接提供 duration，需在聚合层计算
                previousPackageName = lastPackageName,
                nextPackageName = null, // 由后续事件填充
                source = "android-usage-stats",
                permissionState = permState.toJson(),
                schemaVersion = SCHEMA_VERSION
            )
            signals.add(signal)
            lastPackageName = packageName
            lastTimestamp = event.timeStamp
            count++
        }

        // 填充 nextPackageName（基于事件序列）
        for (i in signals.indices) {
            if (i + 1 < signals.size) {
                signals[i] = signals[i].copy(nextPackageName = signals[i + 1].packageName)
            }
        }

        return UsageSignalResult(
            signals = signals,
            degraded = false,
            permissionState = permState,
            reason = "ok"
        )
    }

    /**
     * 将 Android UsageEvents.Event 类型映射为平台无关的 eventType。
     *
     * 兼容不同 Android 版本：
     *   - ACTIVITY_RESUMED / MOVE_TO_FOREGROUND → "foreground"
     *   - ACTIVITY_PAUSED / MOVE_TO_BACKGROUND → "background"
     *   - USER_INTERACTION → "interaction"
     *   - 其他 → null（忽略）
     */
    private fun mapEventType(androidType: Int): String? {
        return when (androidType) {
            UsageEvents.Event.MOVE_TO_FOREGROUND,
            UsageEvents.Event.ACTIVITY_RESUMED -> "foreground"

            UsageEvents.Event.MOVE_TO_BACKGROUND,
            UsageEvents.Event.ACTIVITY_PAUSED -> "background"

            UsageEvents.Event.USER_INTERACTION -> "interaction"

            // 其他事件类型（SCREEN_INTERACTIVE 等）暂不处理，避免噪音
            else -> null
        }
    }

    /**
     * 判断包名是否应被排除（系统噪音或 GOTO 自身）。
     */
    private fun isExcluded(packageName: String): Boolean {
        if (packageName.isBlank()) return true
        for (prefix in config.excludedPackagePrefixes) {
            if (packageName.startsWith(prefix)) return true
        }
        for (self in config.excludedSelfPackages) {
            if (packageName == self) return true
        }
        return false
    }

    /**
     * 单个使用信号（平台无关）。
     */
    data class AppUsageSignal(
        val signalId: String,
        val packageName: String,
        val eventType: String,
        val timestamp: Long,
        val durationMs: Long,
        val previousPackageName: String?,
        val nextPackageName: String?,
        val source: String,
        val permissionState: String,
        val schemaVersion: String
    ) {
        /**
         * 转换为 JSON（供 JS Bridge 传递）。
         */
        fun toJson(): JSONObject {
            return JSONObject().apply {
                put("signalId", signalId)
                put("packageName", packageName)
                put("eventType", eventType)
                put("timestamp", timestamp)
                put("durationMs", durationMs)
                put("previousPackageName", previousPackageName ?: JSONObject.NULL)
                put("nextPackageName", nextPackageName ?: JSONObject.NULL)
                put("source", source)
                put("permissionState", permissionState)
                put("schemaVersion", schemaVersion)
            }
        }
    }

    /**
     * 使用信号查询结果。
     */
    data class UsageSignalResult(
        val signals: List<AppUsageSignal>,
        val degraded: Boolean,
        val permissionState: PermissionGateway.PermissionState,
        val reason: String
    ) {
        /**
         * 转换为 JSON 数组（供 JS Bridge 传递）。
         */
        fun signalsToJson(): String {
            val arr = JSONArray()
            for (s in signals) arr.put(s.toJson())
            return arr.toString()
        }
    }

    companion object {
        /** Schema 版本（与 goto-base 对齐） */
        const val SCHEMA_VERSION = "1.0.0"
    }
}
