package com.appindex.where

import android.content.Context
import org.json.JSONObject
import java.io.IOException

/**
 * ComponentHealthChecker — 组件健康检查器（Android 端）
 *
 * 职责：
 *   1. 读取静态发布状态：app/src/main/assets/release/component-status.json
 *   2. 结合运行时检测状态（WhereCompositionRoot、PermissionGateway 等）
 *   3. 输出最终状态供 UI 显示
 *
 * 状态来源：
 *   - 发布状态（静态）：assets/release/component-status.json
 *   - 运行时状态（动态）：ComponentRegistry / WhereCompositionRoot
 *
 * 注意：
 *   - 不得声称真机验证已完成（deviceValidation.status=not-run 时）
 *   - Android Runtime 显示"已实现并通过自动测试，尚未完成真机验证"
 *   - 不在代码中写死另一份状态，统一读取 component-status.json
 *
 * 集成方式（待 AppIndex 历史编译错误修复后）：
 *   val checker = ComponentHealthChecker(context)
 *   checker.load()
 *   val summary = checker.combinedSummary()
 *   // 在 SettingsActivity 或"关于 GOTO"中渲染 summary
 */
class ComponentHealthChecker(private val context: Context) {

    companion object {
        private const val ASSET_PATH = "release/component-status.json"

        // 状态常量（与 component-status.json schema 一致）
        const val STATUS_AVAILABLE = "available"
        const val STATUS_INITIALIZING = "initializing"
        const val STATUS_UNAVAILABLE = "unavailable"
        const val STATUS_INCOMPATIBLE = "incompatible"
        const val STATUS_DEGRADED = "degraded"
        const val STATUS_DISABLED = "disabled"
        const val STATUS_NOT_RUN = "not-run"
    }

    // 静态发布状态（来自 component-status.json）
    private var staticStatus: JSONObject? = null

    // 运行时覆盖状态（由 ComponentRegistry / WhereCompositionRoot 提供）
    private val runtimeOverrides: MutableMap<String, String> = mutableMapOf()

    /**
     * 从 assets 加载静态发布状态。
     * 失败时不抛异常，返回 false（HOST 应降级为"状态未知"）。
     */
    fun load(): Boolean {
        return try {
            val json = context.assets.open(ASSET_PATH).bufferedReader().use { it.readText() }
            staticStatus = JSONObject(json)
            true
        } catch (e: IOException) {
            // assets 不存在或读取失败 → 状态未知，不崩溃
            staticStatus = null
            false
        } catch (e: Exception) {
            staticStatus = null
            false
        }
    }

    /**
     * 设置运行时覆盖状态（由 ComponentRegistry 调用）。
     * 运行时状态优先于静态发布状态。
     */
    fun setRuntimeOverride(componentId: String, status: String) {
        runtimeOverrides[componentId] = status
    }

    /**
     * 获取组件最终状态（发布状态 + 运行时检测状态）。
     * 运行时覆盖优先。
     */
    fun getComponentStatus(componentId: String): String {
        runtimeOverrides[componentId]?.let { return it }
        return try {
            staticStatus?.getJSONObject("components")?.getJSONObject(componentId)?.optString("status", STATUS_UNAVAILABLE)
                ?: STATUS_UNAVAILABLE
        } catch (e: Exception) {
            STATUS_UNAVAILABLE
        }
    }

    /**
     * 获取组件显示名称。
     */
    fun getComponentDisplayName(componentId: String): String {
        return try {
            val comp = staticStatus?.getJSONObject("components")?.getJSONObject(componentId)
            comp?.optString("displayName", componentId) ?: componentId
        } catch (e: Exception) {
            componentId
        }
    }

    /**
     * 是否所有核心组件运行正常（用于 UI 总状态显示）。
     * 注意：deviceValidation.status=not-run 时不返回 true（不得声称全部验证完成）。
     */
    fun isAllCoreComponentsOk(): Boolean {
        val components = listOf("engine", "base", "where", "whereAndroid")
        val allAvailable = components.all { getComponentStatus(it) == STATUS_AVAILABLE }
        if (!allAvailable) return false

        // 即使所有组件 available，若真机验证未通过，也不显示"全部验证完成"
        val deviceStatus = getDeviceValidationStatus()
        return deviceStatus == "passed"
    }

    /**
     * 获取真机验证状态（not-run / passed / failed）。
     */
    fun getDeviceValidationStatus(): String {
        return try {
            staticStatus?.optJSONObject("deviceValidation")?.optString("status", STATUS_NOT_RUN)
                ?: STATUS_NOT_RUN
        } catch (e: Exception) {
            STATUS_NOT_RUN
        }
    }

    /**
     * 获取总状态文案。
     */
    fun getOverallSummary(): String {
        val components = listOf("engine", "base", "where", "whereAndroid")
        val statuses = components.map { getComponentStatus(it) }
        val allAvailable = statuses.all { it == STATUS_AVAILABLE }
        val anyUnavailable = statuses.any { it == STATUS_UNAVAILABLE || it == STATUS_INCOMPATIBLE || it == STATUS_DISABLED }
        val anyDegraded = statuses.any { it == STATUS_DEGRADED }
        val deviceValidated = getDeviceValidationStatus() == "passed"

        return when {
            allAvailable && deviceValidated -> "所有核心组件运行正常"
            allAvailable && !deviceValidated -> "所有核心组件已加载，真机验证：尚未执行"
            anyDegraded -> "部分组件降级运行，GOTO 正在降级运行"
            anyUnavailable -> "部分组件未加载，GOTO 正在降级运行"
            else -> "组件状态：部分功能受限"
        }
    }

    /**
     * 输出所有组件的最终状态摘要（用于 UI 渲染）。
     */
    fun combinedSummary(): ComponentSummary {
        val components = listOf("engine", "base", "where", "whereAndroid").map { id ->
            ComponentInfo(
                id = id,
                displayName = getComponentDisplayName(id),
                status = getComponentStatus(id),
                version = getVersion(id),
                summary = getSummary(id),
                deviceValidated = isComponentDeviceValidated(id)
            )
        }
        return ComponentSummary(
            overall = getOverallSummary(),
            allOk = isAllCoreComponentsOk(),
            deviceValidationStatus = getDeviceValidationStatus(),
            components = components
        )
    }

    private fun getVersion(componentId: String): String {
        return try {
            staticStatus?.getJSONObject("components")?.getJSONObject(componentId)?.optString("version", "")
                ?: ""
        } catch (e: Exception) { "" }
    }

    private fun getSummary(componentId: String): String {
        return try {
            staticStatus?.getJSONObject("components")?.getJSONObject(componentId)?.optString("summary", "")
                ?: ""
        } catch (e: Exception) { "" }
    }

    private fun isComponentDeviceValidated(componentId: String): Boolean {
        return try {
            staticStatus?.getJSONObject("components")?.getJSONObject(componentId)?.optBoolean("deviceValidated", false)
                ?: false
        } catch (e: Exception) { false }
    }

    // ====== 数据类 ======

    data class ComponentInfo(
        val id: String,
        val displayName: String,
        val status: String,
        val version: String,
        val summary: String,
        val deviceValidated: Boolean
    )

    data class ComponentSummary(
        val overall: String,
        val allOk: Boolean,
        val deviceValidationStatus: String,
        val components: List<ComponentInfo>
    )
}
