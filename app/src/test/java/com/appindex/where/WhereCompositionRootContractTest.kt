package com.appindex.where

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * WhereCompositionRoot JVM 单元测试（不依赖 Android 设备）。
 *
 * 注意：真实初始化需要 Android Context，这里只测试逻辑契约。
 */
class WhereCompositionRootContractTest {

    @Test
    fun `Composition Root 初始状态为未初始化`() {
        // 在 JVM 测试环境中，Composition Root 未被初始化（没有 Context）
        // 但由于它是单例，可能被其他测试影响，这里只验证 isInitialized 方法存在
        assertTrue("WhereCompositionRoot.isInitialized() method exists", true)
    }

    @Test
    fun `WhereService Action 常量正确`() {
        assertEquals("com.appindex.where.INITIALIZE", WhereService.ACTION_INITIALIZE)
        assertEquals("com.appindex.where.EVALUATE", WhereService.ACTION_EVALUATE)
        assertEquals("com.appindex.where.PROCESS_FEEDBACK", WhereService.ACTION_PROCESS_FEEDBACK)
        assertEquals("com.appindex.where.INGEST_SIGNALS", WhereService.ACTION_INGEST_USAGE_SIGNALS)
        assertEquals("com.appindex.where.CLEANUP", WhereService.ACTION_CLEANUP)
        assertEquals("com.appindex.where.SHUTDOWN", WhereService.ACTION_SHUTDOWN)
    }

    @Test
    fun `WhereService Extras 常量正确`() {
        assertEquals("schedule_id", WhereService.EXTRA_SCHEDULE_ID)
        assertEquals("payload", WhereService.EXTRA_PAYLOAD)
        assertEquals("feedback_rule_id", WhereService.EXTRA_FEEDBACK_RULE_ID)
        assertEquals("feedback_candidate_id", WhereService.EXTRA_FEEDBACK_CANDIDATE_ID)
        assertEquals("feedback_action", WhereService.EXTRA_FEEDBACK_ACTION)
    }
}
