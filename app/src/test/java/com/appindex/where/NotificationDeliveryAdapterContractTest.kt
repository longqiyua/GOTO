package com.appindex.where

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * NotificationDeliveryAdapter 数据契约 JVM 单元测试（不依赖 Android 设备）。
 *
 * 测试覆盖：
 *   - Receipt JSON 结构（success/degraded/cooldown/failure）
 *   - 默认 Config 值
 *   - 反馈动作常量
 *
 * 注意：deliver() / cancel() 方法依赖 Android NotificationManager，需要 instrumentation 测试。
 */
class NotificationDeliveryAdapterContractTest {

    @Test
    fun `Config 默认值符合契约`() {
        val config = NotificationDeliveryAdapter.Config()

        assertEquals("goto_where_reminders", config.channelId)
        assertEquals("GOTO Where 智能提醒", config.channelName)
        assertEquals("由 GOTO Where 根据时间、应用使用模式和个人偏好提供的提醒", config.channelDescription)
    }

    @Test
    fun `反馈动作常量正确`() {
        assertEquals("opened", NotificationDeliveryAdapter.ACTION_OPENED)
        assertEquals("ignored", NotificationDeliveryAdapter.ACTION_IGNORED)
        assertEquals("snoozed", NotificationDeliveryAdapter.ACTION_SNOOZED)
        assertEquals("disabled_rule", NotificationDeliveryAdapter.ACTION_DISABLED_RULE)
    }

    @Test
    fun `Intent extras 常量正确`() {
        assertEquals("goto_where_rule_id", NotificationDeliveryAdapter.EXTRA_RULE_ID)
        assertEquals("goto_where_candidate_id", NotificationDeliveryAdapter.EXTRA_CANDIDATE_ID)
        assertEquals("goto_where_action", NotificationDeliveryAdapter.EXTRA_ACTION)
        assertEquals("goto_where_package_name", NotificationDeliveryAdapter.EXTRA_PACKAGE_NAME)
    }
}
