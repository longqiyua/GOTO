package com.appindex.where

import android.content.Context
import android.content.Intent

/**
 * WhereCompositionRoot — GOTO Where 的唯一 Composition Root
 *
 * 职责：
 *   1. 初始化 GOTO Base Runtime（通过 JS Bridge）
 *   2. 初始化 BaseReaderAdapter / BaseWriterAdapter（JS 端）
 *   3. 初始化 GOTO Where Runtime（JS 端）
 *   4. 注入：
 *      - PermissionGateway（Kotlin）
 *      - UsageSignalProvider（Kotlin）
 *      - ClockPort（JS 端实现）
 *      - WorkSchedulerAdapter（Kotlin）
 *      - NotificationDeliveryAdapter（Kotlin）
 *
 *  调用方式：
 *    WhereCompositionRoot.initialize(context)  // 在 Application.onCreate 或 Activity.onCreate
 *    WhereCompositionRoot.startWhere()         // 用户启用 Where 时
 *    WhereCompositionRoot.stopWhere()          // 用户关闭 Where 时
 *
 *  注意：本类不复制 Where Core 算法，只负责组装依赖。
 */
object WhereCompositionRoot {

    @Volatile private var initialized = false
    @Volatile private var whereStarted = false

    private var permissionGateway: PermissionGateway? = null
    private var usageSignalProvider: UsageSignalProvider? = null
    private var schedulerAdapter: WorkSchedulerAdapter? = null
    private var deliveryAdapter: NotificationDeliveryAdapter? = null
    private var featureFlags: WhereFeatureFlags? = null

    /**
     * 初始化 Composition Root。
     * 在 Application.onCreate 或 SearchActivity.onCreate 中调用。
     */
    fun initialize(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return

            val ctx = context.applicationContext
            featureFlags = WhereFeatureFlags(ctx)
            permissionGateway = PermissionGateway(ctx)
            usageSignalProvider = UsageSignalProvider(ctx, permissionGateway!!)
            schedulerAdapter = WorkSchedulerAdapter(ctx)
            deliveryAdapter = NotificationDeliveryAdapter(ctx, permissionGateway!!)

            initialized = true
        }
    }

    /**
     * 启动 Where（用户启用时）。
     *
     * 1. 设置 feature flag
     * 2. 启动 WhereService
     * 3. WhereService 在 onCreate 中完成 JS Bridge 初始化
     */
    fun startWhere(context: Context) {
        if (!initialized) initialize(context)
        if (whereStarted) return

        featureFlags?.gotoWhereEnabled = true

        val intent = Intent(context, WhereService::class.java).apply {
            action = WhereService.ACTION_INITIALIZE
        }
        context.startService(intent)

        whereStarted = true
    }

    /**
     * 停止 Where（用户关闭时）。
     *
     * 1. 取消所有 WorkManager 任务
     * 2. 销毁 JS Bridge
     * 3. 停止 WhereService
     */
    fun stopWhere(context: Context) {
        if (!whereStarted) return

        featureFlags?.gotoWhereEnabled = false

        val intent = Intent(context, WhereService::class.java).apply {
            action = WhereService.ACTION_SHUTDOWN
        }
        context.startService(intent)

        whereStarted = false
    }

    /**
     * 启用/禁用使用信号采集。
     */
    fun setUsageSignalsEnabled(context: Context, enabled: Boolean) {
        if (!initialized) initialize(context)
        featureFlags?.usageSignalsEnabled = enabled
    }

    /**
     * 启用/禁用通知投递。
     */
    fun setNotificationsEnabled(context: Context, enabled: Boolean) {
        if (!initialized) initialize(context)
        featureFlags?.notificationsEnabled = enabled
    }

    /**
     * 触发一次手动评估（用于测试）。
     */
    fun evaluateNow(context: Context) {
        if (!whereStarted) return
        val intent = Intent(context, WhereService::class.java).apply {
            action = WhereService.ACTION_EVALUATE
        }
        context.startService(intent)
    }

    /**
     * 触发一次使用信号采集（用于测试）。
     */
    fun ingestSignalsNow(context: Context) {
        if (!whereStarted) return
        val intent = Intent(context, WhereService::class.java).apply {
            action = WhereService.ACTION_INGEST_USAGE_SIGNALS
        }
        context.startService(intent)
    }

    /**
     * 获取 PermissionGateway（用于 UI 显示权限状态）。
     */
    fun getPermissionGateway(): PermissionGateway? = permissionGateway

    /**
     * 获取 FeatureFlags（用于 UI 显示开关状态）。
     */
    fun getFeatureFlags(): WhereFeatureFlags? = featureFlags

    /**
     * Where 是否已启动。
     */
    fun isWhereStarted(): Boolean = whereStarted

    /**
     * Composition Root 是否已初始化。
     */
    fun isInitialized(): Boolean = initialized
}
