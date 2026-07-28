package com.appindex.where

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * UsageSignalProvider 数据模型 JVM 单元测试（不依赖 Android 设备）。
 *
 * 测试覆盖：
 *   - AppUsageSignal 数据类
 *   - UsageSignalResult 数据类
 *   - Config 默认值
 *   - JSON 序列化契约
 *
 * 注意：getUsageSignals() 方法依赖 Android UsageStatsManager，需要 instrumentation 测试。
 */
class UsageSignalProviderTest {

    @Test
    fun `AppUsageSignal 包含所有契约字段`() {
        val signal = UsageSignalProvider.AppUsageSignal(
            signalId = "sig-1",
            packageName = "com.example.app",
            eventType = "foreground",
            timestamp = 1722000000000L,
            durationMs = 5000L,
            previousPackageName = "com.example.prev",
            nextPackageName = "com.example.next",
            source = "android-usage-stats",
            permissionState = "{}",
            schemaVersion = UsageSignalProvider.SCHEMA_VERSION
        )

        assertEquals("sig-1", signal.signalId)
        assertEquals("com.example.app", signal.packageName)
        assertEquals("foreground", signal.eventType)
        assertEquals(1722000000000L, signal.timestamp)
        assertEquals(5000L, signal.durationMs)
        assertEquals("com.example.prev", signal.previousPackageName)
        assertEquals("com.example.next", signal.nextPackageName)
        assertEquals("android-usage-stats", signal.source)
        assertEquals("1.0.0", signal.schemaVersion)
    }

    @Test
    fun `AppUsageSignal toJson 包含所有字段`() {
        val signal = UsageSignalProvider.AppUsageSignal(
            signalId = "sig-2",
            packageName = "com.test",
            eventType = "background",
            timestamp = 1000L,
            durationMs = 0L,
            previousPackageName = null,
            nextPackageName = null,
            source = "android-usage-stats",
            permissionState = "{}",
            schemaVersion = "1.0.0"
        )

        val json = signal.toJson()
        assertEquals("sig-2", json.getString("signalId"))
        assertEquals("com.test", json.getString("packageName"))
        assertEquals("background", json.getString("eventType"))
        assertEquals(1000L, json.getLong("timestamp"))
        assertEquals(0L, json.getLong("durationMs"))
        assertTrue(json.isNull("previousPackageName"))
        assertTrue(json.isNull("nextPackageName"))
        assertEquals("android-usage-stats", json.getString("source"))
        assertEquals("1.0.0", json.getString("schemaVersion"))
    }

    @Test
    fun `Config 默认值符合契约`() {
        val config = UsageSignalProvider.Config()

        // 24 小时 TTL
        assertEquals(24 * 60 * 60 * 1000L, config.eventTtlMs)
        // 最多 1000 事件/查询
        assertEquals(1000, config.maxEventsPerQuery)
        // 排除系统包
        assertTrue(config.excludedPackagePrefixes.contains("com.android.systemui"))
        assertTrue(config.excludedPackagePrefixes.contains("com.android.launcher"))
        // 排除 GOTO 自身
        assertTrue(config.excludedSelfPackages.contains("com.appindex"))
    }

    @Test
    fun `UsageSignalResult signalsToJson 生成合法 JSON 数组`() {
        val permState = PermissionGateway.PermissionState(
            usageAccessGranted = false,
            notificationPostGranted = false,
            notificationReadGranted = false,
            exactAlarmGranted = false,
            checkedAt = 0L,
            platformVersion = 0
        )

        val signals = listOf(
            UsageSignalProvider.AppUsageSignal(
                signalId = "s1",
                packageName = "com.a",
                eventType = "foreground",
                timestamp = 1L,
                durationMs = 0L,
                previousPackageName = null,
                nextPackageName = "com.b",
                source = "android-usage-stats",
                permissionState = "{}",
                schemaVersion = "1.0.0"
            ),
            UsageSignalProvider.AppUsageSignal(
                signalId = "s2",
                packageName = "com.b",
                eventType = "foreground",
                timestamp = 2L,
                durationMs = 0L,
                previousPackageName = "com.a",
                nextPackageName = null,
                source = "android-usage-stats",
                permissionState = "{}",
                schemaVersion = "1.0.0"
            )
        )

        val result = UsageSignalProvider.UsageSignalResult(
            signals = signals,
            degraded = false,
            permissionState = permState,
            reason = "ok"
        )

        val jsonStr = result.signalsToJson()
        val arr = JSONArray(jsonStr)
        assertEquals(2, arr.length())

        val first = arr.getJSONObject(0)
        assertEquals("s1", first.getString("signalId"))
        assertEquals("com.a", first.getString("packageName"))
    }

    @Test
    fun `UsageSignalResult degraded 状态包含 reason`() {
        val permState = PermissionGateway.PermissionState(
            usageAccessGranted = false,
            notificationPostGranted = false,
            notificationReadGranted = false,
            exactAlarmGranted = false,
            checkedAt = 0L,
            platformVersion = 0
        )

        val result = UsageSignalProvider.UsageSignalResult(
            signals = emptyList(),
            degraded = true,
            permissionState = permState,
            reason = "Usage Access not granted"
        )

        assertTrue(result.degraded)
        assertEquals("Usage Access not granted", result.reason)
        assertEquals(0, result.signals.size)
    }

    @Test
    fun `SCHEMA_VERSION 为 1 dot 0 dot 0`() {
        assertEquals("1.0.0", UsageSignalProvider.SCHEMA_VERSION)
    }
}
