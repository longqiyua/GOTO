package com.appindex.where

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * PermissionState 数据类的 JVM 单元测试（不依赖 Android 设备）。
 *
 * 测试覆盖：
 *   - PermissionState 的toJson()
 *   - canCollectUsageSignals() / canDeliverNotifications()
 *   - 默认值
 *
 * 注意：PermissionGateway 的真实方法依赖 Android Context，需要 instrumentation 测试。
 */
class PermissionStateTest {

    @Test
    fun `PermissionState 默认值为 false 且 schemaVersion 对齐`() {
        val state = PermissionGateway.PermissionState(
            usageAccessGranted = false,
            notificationPostGranted = false,
            notificationReadGranted = false,
            exactAlarmGranted = false,
            checkedAt = 0L,
            platformVersion = 0
        )
        assertFalse(state.usageAccessGranted)
        assertFalse(state.notificationPostGranted)
        assertFalse(state.notificationReadGranted)
        assertFalse(state.exactAlarmGranted)
        assertFalse(state.canCollectUsageSignals())
        assertFalse(state.canDeliverNotifications())
    }

    @Test
    fun `PermissionState toJson 生成合法 JSON 且包含所有契约字段`() {
        val state = PermissionGateway.PermissionState(
            usageAccessGranted = true,
            notificationPostGranted = true,
            notificationReadGranted = false,
            exactAlarmGranted = false,
            checkedAt = 1722000000000L,
            platformVersion = 34
        )

        val json = state.toJson()
        val obj = JSONObject(json)

        assertEquals(true, obj.getBoolean("usageAccessGranted"))
        assertEquals(true, obj.getBoolean("notificationPostGranted"))
        assertEquals(false, obj.getBoolean("notificationReadGranted"))
        assertEquals(false, obj.getBoolean("exactAlarmGranted"))
        assertEquals(1722000000000L, obj.getLong("checkedAt"))
        assertEquals(34, obj.getInt("platformVersion"))
    }

    @Test
    fun `canCollectUsageSignals 仅在 usageAccessGranted 为 true 时为 true`() {
        val withAccess = PermissionGateway.PermissionState(
            usageAccessGranted = true,
            notificationPostGranted = false,
            notificationReadGranted = false,
            exactAlarmGranted = false,
            checkedAt = 0L,
            platformVersion = 0
        )
        assertTrue(withAccess.canCollectUsageSignals())

        val withoutAccess = withAccess.copy(usageAccessGranted = false)
        assertFalse(withoutAccess.canCollectUsageSignals())
    }

    @Test
    fun `canDeliverNotifications 仅在 notificationPostGranted 为 true 时为 true`() {
        val withNotif = PermissionGateway.PermissionState(
            usageAccessGranted = false,
            notificationPostGranted = true,
            notificationReadGranted = false,
            exactAlarmGranted = false,
            checkedAt = 0L,
            platformVersion = 0
        )
        assertTrue(withNotif.canDeliverNotifications())

        val withoutNotif = withNotif.copy(notificationPostGranted = false)
        assertFalse(withoutNotif.canDeliverNotifications())
    }

    @Test
    fun `notificationReadGranted 和 exactAlarmGranted 始终为 false（本阶段不申请）`() {
        // 这两个字段在 Phase 3 必须为 false
        val state = PermissionGateway.PermissionState(
            usageAccessGranted = true,
            notificationPostGranted = true,
            notificationReadGranted = false, // 硬编码
            exactAlarmGranted = false,       // 硬编码
            checkedAt = 0L,
            platformVersion = 0
        )
        assertFalse(state.notificationReadGranted)
        assertFalse(state.exactAlarmGranted)
    }
}
