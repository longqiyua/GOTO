package com.appindex

import android.app.Application
import android.content.Context
import android.util.Log

/**
 * EngineInitializer — GOTO Engine V2.1 注入入口（供 Application.onCreate 调用）
 *
 * ## 背景
 * GOTO 应用当前未自定义 [Application] 类（AndroidManifest.xml 的 `<application>`
 * 标签未设置 `android:name`），使用默认 `android.app.Application`。
 *
 * 本类提供 V2.1 引擎组件的统一初始化入口，支持三种接入方式：
 *
 * ### 方式 1：自定义 Application（推荐）
 * 在 `com.appindex` 包下新建 `GotoApplication.kt`：
 * ```kotlin
 * class GotoApplication : Application() {
 *     override fun onCreate() {
 *         super.onCreate()
 *         EngineInitializer.initialize(this)
 *     }
 * }
 * ```
 * 然后在 `AndroidManifest.xml` 的 `<application>` 标签添加属性：
 * ```xml
 * <application
 *     android:name=".GotoApplication"
 *     ... >
 * ```
 *
 * ### 方式 2：在已有 Activity onCreate 中调用（最小改动）
 * ```kotlin
 * class WelcomeActivity : AppCompatActivity() {
 *     override fun onCreate(savedInstanceState: Bundle?) {
 *         EngineInitializer.initialize(applicationContext)
 *         super.onCreate(savedInstanceState)
 *         ...
 *     }
 * }
 * ```
 *
 * ### 方式 3：在已有 Service onCreate 中调用
 * ```kotlin
 * class OverlaySearchService : Service() {
 *     override fun onCreate() {
 *         EngineInitializer.initialize(this)
 *         super.onCreate()
 *         ...
 *     }
 * }
 * ```
 *
 * ## 设计说明
 * 本类是 [EngineComponentInjector] 的薄封装，提供：
 * - 幂等初始化入口
 * - 兼容 Application / Activity / Service 多种调用源
 * - 简化的 API（一行代码完成注入）
 *
 * 实际注入逻辑由 [EngineComponentInjector] 完成。
 */
object EngineInitializer {

    private const val TAG = "EngineInit"

    @Volatile
    private var initialized = false

    /**
     * 初始化 GOTO Engine V2.1 全量组件。
     *
     * 幂等：重复调用安全（内部基于 [EngineComponentInjector.isInitialized] 双重检查）。
     *
     * @param context 任意 Android Context（内部会取 applicationContext）
     */
    @JvmStatic
    fun initialize(context: Context) {
        if (initialized) {
            Log.d(TAG, "EngineInitializer 已初始化，跳过")
            return
        }
        synchronized(this) {
            if (initialized) return
            try {
                EngineComponentInjector.initialize(context)
                initialized = true
                Log.i(TAG, "GOTO Engine V2.1 初始化完成 — ${EngineComponentInjector.statusSnapshot()}")
            } catch (t: Throwable) {
                // 即使注入失败也不应阻塞宿主 Application 启动
                Log.e(TAG, "GOTO Engine V2.1 初始化失败（不阻塞宿主启动）", t)
            }
        }
    }

    /**
     * 是否已初始化。
     */
    @JvmStatic
    fun isInitialized(): Boolean = initialized || EngineComponentInjector.isInitialized()

    /**
     * 释放资源（可选，供测试或宿主销毁时调用）。
     *
     * 当前实现仅重置 [initialized] 标志，
     * EngineComponentInjector 内的组件引用保留（避免运行中消费者拿到 null）。
     */
    @JvmStatic
    fun release() {
        initialized = false
        Log.i(TAG, "EngineInitializer release（已重置标志，组件引用保留）")
    }
}
