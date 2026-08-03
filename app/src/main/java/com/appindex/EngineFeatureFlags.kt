package com.appindex

import android.content.Context
import android.content.SharedPreferences

/**
 * EngineFeatureFlags — GOTO Engine V2.1 模块开关（app 层镜像）
 *
 * ## 背景
 * Engine README 规定三语言（JS / Kotlin / Rust）必须保持 9 个 FeatureFlag 一致，
 * 但当前 Kotlin Engine 模块尚未补齐 [com.appindex.ConfigurationData.EngineFeatureFlags] 类，
 * 因此在 app 层提供对齐 V2.1 spec 的最小实现，待 Engine 模块补齐后切换为引用 Engine 自带实现。
 *
 * ## 默认值（与 README "模块开关（FeatureFlags）" 表一致）
 * | Flag                   | 默认  | 作用                                |
 * |------------------------|------|-------------------------------------|
 * | fuzzyMatch             | true | 模糊匹配（Jaccard + 顺序恢复 + 缩写） |
 * | indexTree              | true | 索引树（英文/中文/拼音树）            |
 * | adaptiveRefresh        | true | 自适应刷新（打字速度 + 防抖节流）     |
 * | simInt                 | false| 模拟智能（微观上下文 + 时段加分）     |
 * | t9                     | false| T9 模式                              |
 * | ragFallback            | false| RAG 兜底（BM25 自动检索）            |
 * | personalRerank         | true | 梳理层（PersonalReranker）            |
 * | ragAutoRebuild         | true | 月度 RAG 自动重建                    |
 * | ragTransitionEnabled   | true | RAG 灰度过渡                         |
 *
 * ## 持久化
 * 通过 SharedPreferences 持久化，key 前缀 `engine_flag_`。
 * 默认值与 README 一致，调用方可通过 [update] 修改。
 */
class EngineFeatureFlags(private val context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ════════════════════════════════════════════════════════════════════════
    //  L1 / L2 层
    // ════════════════════════════════════════════════════════════════════════

    /** L2: 模糊匹配（Jaccard + 顺序恢复 + 缩写）。默认 true。 */
    var fuzzyMatch: Boolean
        get() = prefs.getBoolean(KEY_FUZZY_MATCH, DEFAULT_FUZZY_MATCH)
        set(value) = prefs.edit().putBoolean(KEY_FUZZY_MATCH, value).apply()

    /** L2: 索引树（英文单词树 + 中文汉字树 + 拼音树）。默认 true。 */
    var indexTree: Boolean
        get() = prefs.getBoolean(KEY_INDEX_TREE, DEFAULT_INDEX_TREE)
        set(value) = prefs.edit().putBoolean(KEY_INDEX_TREE, value).apply()

    /** L1: 自适应刷新（打字速度 EMA + 防抖/节流）。默认 true。 */
    var adaptiveRefresh: Boolean
        get() = prefs.getBoolean(KEY_ADAPTIVE_REFRESH, DEFAULT_ADAPTIVE_REFRESH)
        set(value) = prefs.edit().putBoolean(KEY_ADAPTIVE_REFRESH, value).apply()

    /** L2: T9 数字键盘模式（"943" → "微信"）。默认 false。 */
    var t9: Boolean
        get() = prefs.getBoolean(KEY_T9, DEFAULT_T9)
        set(value) = prefs.edit().putBoolean(KEY_T9, value).apply()

    // ════════════════════════════════════════════════════════════════════════
    //  L3 / L4 层
    // ════════════════════════════════════════════════════════════════════════

    /** L3: 模拟智能（微观上下文加分 + 时段加分）。默认 false。 */
    var simInt: Boolean
        get() = prefs.getBoolean(KEY_SIM_INT, DEFAULT_SIM_INT)
        set(value) = prefs.edit().putBoolean(KEY_SIM_INT, value).apply()

    /** L4: 梳理层 PersonalReranker（融合 Base 个人层 5 schema 重排）。默认 true。 */
    var personalRerank: Boolean
        get() = prefs.getBoolean(KEY_PERSONAL_RERANK, DEFAULT_PERSONAL_RERANK)
        set(value) = prefs.edit().putBoolean(KEY_PERSONAL_RERANK, value).apply()

    // ════════════════════════════════════════════════════════════════════════
    //  RAG 子系统
    // ════════════════════════════════════════════════════════════════════════

    /** RAG 兜底（运行时 BM25 自动检索）。默认 false。 */
    var ragFallback: Boolean
        get() = prefs.getBoolean(KEY_RAG_FALLBACK, DEFAULT_RAG_FALLBACK)
        set(value) = prefs.edit().putBoolean(KEY_RAG_FALLBACK, value).apply()

    /** 月度 RAG 自动重建（RagMonthlyWorker 30 天周期）。默认 true。 */
    var ragAutoRebuild: Boolean
        get() = prefs.getBoolean(KEY_RAG_AUTO_REBUILD, DEFAULT_RAG_AUTO_REBUILD)
        set(value) = prefs.edit().putBoolean(KEY_RAG_AUTO_REBUILD, value).apply()

    /** RAG 灰度过渡（RagTransitionController 15 天线性权重）。默认 true。 */
    var ragTransitionEnabled: Boolean
        get() = prefs.getBoolean(KEY_RAG_TRANSITION, DEFAULT_RAG_TRANSITION)
        set(value) = prefs.edit().putBoolean(KEY_RAG_TRANSITION, value).apply()

    /**
     * 一次性批量更新多个 flag（用于 V2.1 配置初始化）。
     */
    fun update(block: EngineFeatureFlags.() -> Unit) {
        block()
    }

    /**
     * 重置为 V2.1 默认值（README 规定）。
     */
    fun resetToDefaults() {
        prefs.edit().apply {
            putBoolean(KEY_FUZZY_MATCH, DEFAULT_FUZZY_MATCH)
            putBoolean(KEY_INDEX_TREE, DEFAULT_INDEX_TREE)
            putBoolean(KEY_ADAPTIVE_REFRESH, DEFAULT_ADAPTIVE_REFRESH)
            putBoolean(KEY_T9, DEFAULT_T9)
            putBoolean(KEY_SIM_INT, DEFAULT_SIM_INT)
            putBoolean(KEY_PERSONAL_RERANK, DEFAULT_PERSONAL_RERANK)
            putBoolean(KEY_RAG_FALLBACK, DEFAULT_RAG_FALLBACK)
            putBoolean(KEY_RAG_AUTO_REBUILD, DEFAULT_RAG_AUTO_REBUILD)
            putBoolean(KEY_RAG_TRANSITION, DEFAULT_RAG_TRANSITION)
        }.apply()
    }

    /**
     * 输出当前快照（用于日志/调试/健康检查）。
     */
    fun snapshot(): String = buildString {
        append("EngineFeatureFlags(")
        append("fuzzyMatch=$fuzzyMatch, ")
        append("indexTree=$indexTree, ")
        append("adaptiveRefresh=$adaptiveRefresh, ")
        append("t9=$t9, ")
        append("simInt=$simInt, ")
        append("personalRerank=$personalRerank, ")
        append("ragFallback=$ragFallback, ")
        append("ragAutoRebuild=$ragAutoRebuild, ")
        append("ragTransitionEnabled=$ragTransitionEnabled")
        append(")")
    }

    companion object {
        private const val PREFS_NAME = "goto_engine_flags"

        // SharedPreferences keys
        private const val KEY_FUZZY_MATCH = "engine_flag_fuzzy_match"
        private const val KEY_INDEX_TREE = "engine_flag_index_tree"
        private const val KEY_ADAPTIVE_REFRESH = "engine_flag_adaptive_refresh"
        private const val KEY_T9 = "engine_flag_t9"
        private const val KEY_SIM_INT = "engine_flag_sim_int"
        private const val KEY_PERSONAL_RERANK = "engine_flag_personal_rerank"
        private const val KEY_RAG_FALLBACK = "engine_flag_rag_fallback"
        private const val KEY_RAG_AUTO_REBUILD = "engine_flag_rag_auto_rebuild"
        private const val KEY_RAG_TRANSITION = "engine_flag_rag_transition_enabled"

        // V2.1 默认值（与 README "模块开关" 表对齐）
        const val DEFAULT_FUZZY_MATCH = true
        const val DEFAULT_INDEX_TREE = true
        const val DEFAULT_ADAPTIVE_REFRESH = true
        const val DEFAULT_T9 = false
        const val DEFAULT_SIM_INT = false
        const val DEFAULT_PERSONAL_RERANK = true
        const val DEFAULT_RAG_FALLBACK = false
        const val DEFAULT_RAG_AUTO_REBUILD = true
        const val DEFAULT_RAG_TRANSITION = true
    }
}
