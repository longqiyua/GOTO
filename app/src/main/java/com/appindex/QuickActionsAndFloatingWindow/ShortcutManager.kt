package com.appindex.QuickActionsAndFloatingWindow

import android.content.Context
import android.content.SharedPreferences

/**
 * 快捷绑定管理器 v2
 *
 * 支持两种模式：
 * - 标准模式：输入关键词，应用置顶显示（需点击确认）
 * - 快速模式：输入关键词，直接跳转应用（无需确认）
 *
 * 免费用户：最多 5 个绑定
 * 会员：无限绑定
 */
class ShortcutManager(context: Context) {

    companion object {
        private const val PREFS_NAME = "shortcut_bindings"
        private const val KEY_BINDINGS = "bindings_json"
        private const val MAX_FREE_BINDINGS = 5
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * 快捷绑定数据
     *
     * @property keyword 绑定的字符，如 "jd"
     * @property packageName 应用包名
     * @property appLabel 应用名称
     * @property useCount 使用次数
     * @property timestamp 创建时间
     * @property isQuickMode 是否为快速模式（true=直接跳转）
     */
    data class ShortcutBinding(
        val keyword: String,
        val packageName: String,
        val appLabel: String,
        val useCount: Int = 0,
        val timestamp: Long = System.currentTimeMillis(),
        val isQuickMode: Boolean = false
    )

    /**
     * 获取所有绑定
     */
    fun getAllBindings(): List<ShortcutBinding> {
        val json = prefs.getString(KEY_BINDINGS, null) ?: return emptyList()
        return try {
            parseBindings(json)
        } catch (_: Exception) {
            emptyList()
        }
    }

    /**
     * 添加绑定
     *
     * @param keyword 绑定的字符
     * @param packageName 应用包名
     * @param appLabel 应用名称
     * @param isMember 是否为会员
     * @param isQuickMode 是否为快速模式
     * @return true 成功，false 超出限制（免费用户）
     */
    fun addBinding(
        keyword: String,
        packageName: String,
        appLabel: String,
        isMember: Boolean = true,
        isQuickMode: Boolean = false
    ): Boolean {
        val bindings = getAllBindings().toMutableList()

        bindings.removeAll { it.keyword == keyword }

        bindings.add(ShortcutBinding(keyword.lowercase(), packageName, appLabel, isQuickMode = isQuickMode))
        saveBindings(bindings)
        return true
    }

    /**
     * 移除绑定
     */
    fun removeBinding(keyword: String) {
        val bindings = getAllBindings().toMutableList()
        bindings.removeAll { it.keyword == keyword }
        saveBindings(bindings)
    }

    /**
     * 检查输入是否匹配某个快捷绑定
     * 匹配成功后自动增加使用计数
     *
     * @return 匹配的绑定，或 null
     */
    fun matchShortcut(input: String): ShortcutBinding? {
        val trimmed = input.trim().lowercase()
        val binding = getAllBindings().firstOrNull { it.keyword == trimmed }
        if (binding != null) {
            incrementUseCount(trimmed)
        }
        return binding
    }

    /**
     * 增加指定绑定的使用次数
     */
    fun incrementUseCount(keyword: String) {
        val bindings = getAllBindings().toMutableList()
        val idx = bindings.indexOfFirst { it.keyword == keyword }
        if (idx >= 0) {
            bindings[idx] = bindings[idx].copy(useCount = bindings[idx].useCount + 1)
            saveBindings(bindings)
        }
    }

    /**
     * 获取绑定数量
     */
    fun getBindingCount(): Int = getAllBindings().size

    /**
     * 获取最大绑定数
     */
    fun getMaxBindings(isMember: Boolean = true): Int {
        return Int.MAX_VALUE
    }

    /**
     * 清空所有绑定
     */
    fun clearAll() {
        prefs.edit().remove(KEY_BINDINGS).apply()
    }

    // ═══════════════════════════════════════════════════════════
    //  序列化 / 反序列化
    // ═══════════════════════════════════════════════════════════

    private fun saveBindings(bindings: List<ShortcutBinding>) {
        val json = serializeBindings(bindings)
        prefs.edit().putString(KEY_BINDINGS, json).apply()
    }

    /**
     * 序列化：keyword|packageName|appLabel|useCount|timestamp|isQuickMode;...
     */
    private fun serializeBindings(bindings: List<ShortcutBinding>): String {
        return bindings.joinToString(";") {
            "${it.keyword}|${it.packageName}|${it.appLabel}|${it.useCount}|${it.timestamp}|${if (it.isQuickMode) 1 else 0}"
        }
    }

    /**
     * 反序列化（向后兼容）
     */
    private fun parseBindings(json: String): List<ShortcutBinding> {
        if (json.isBlank()) return emptyList()
        return json.split(";").mapNotNull { entry ->
            val parts = entry.split("|")
            if (parts.size >= 3 && parts[0].isNotBlank()) {
                ShortcutBinding(
                    keyword = parts[0],
                    packageName = parts[1],
                    appLabel = parts[2],
                    useCount = parts.getOrNull(3)?.toIntOrNull() ?: 0,
                    timestamp = parts.getOrNull(4)?.toLongOrNull() ?: System.currentTimeMillis(),
                    isQuickMode = parts.getOrNull(5)?.toIntOrNull() == 1
                )
            } else null
        }
    }
}
