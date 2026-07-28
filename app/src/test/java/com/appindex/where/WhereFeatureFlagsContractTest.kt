package com.appindex.where

import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * WhereFeatureFlags JVM 单元测试（不依赖 Android 设备）。
 *
 * 注意：真实 SharedPreferences 操作需要 Android Context，这里只测试逻辑契约。
 * 完整的启用/禁用流程测试在 instrumentation 测试中执行。
 */
class WhereFeatureFlagsContractTest {

    @Test
    fun `WhereFeatureFlags 类存在且可加载`() {
        val clazz = Class.forName("com.appindex.where.WhereFeatureFlags")
        assertTrue("WhereFeatureFlags class exists", clazz != null)
    }

    @Test
    fun `WhereFeatureFlags companion object 存在`() {
        val companionClass = Class.forName("com.appindex.where.WhereFeatureFlags\$Companion")
        assertTrue("WhereFeatureFlags.Companion exists", companionClass != null)
    }

    @Test
    fun `WhereService companion object 存在且可加载`() {
        val companionClass = Class.forName("com.appindex.where.WhereService\$Companion")
        assertTrue("WhereService.Companion exists", companionClass != null)
    }
}
