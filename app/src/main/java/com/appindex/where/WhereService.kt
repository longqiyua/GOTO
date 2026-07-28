package com.appindex.where

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import org.json.JSONObject
import java.util.Calendar

/**
 * WhereFeatureFlags — Feature Flags 控制
 *
 *   - goto_where_enabled              Where 主开关
 *   - goto_where_usage_signals_enabled 使用信号采集
 *   - goto_where_notifications_enabled  通知投递
 *   - goto_where_debug_enabled          调试模式
 */
class WhereFeatureFlags(private val context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var gotoWhereEnabled: Boolean
        get() = prefs.getBoolean(KEY_WHERE_ENABLED, false)
        set(value) = prefs.edit().putBoolean(KEY_WHERE_ENABLED, value).apply()

    var usageSignalsEnabled: Boolean
        get() = prefs.getBoolean(KEY_USAGE_SIGNALS_ENABLED, false)
        set(value) = prefs.edit().putBoolean(KEY_USAGE_SIGNALS_ENABLED, value).apply()

    var notificationsEnabled: Boolean
        get() = prefs.getBoolean(KEY_NOTIFICATIONS_ENABLED, false)
        set(value) = prefs.edit().putBoolean(KEY_NOTIFICATIONS_ENABLED, value).apply()

    var debugEnabled: Boolean
        get() = prefs.getBoolean(KEY_DEBUG_ENABLED, false)
        set(value) = prefs.edit().putBoolean(KEY_DEBUG_ENABLED, value).apply()

    /**
     * 是否允许采集使用信号（必须同时启用 Where 和 Usage Signals，且拥有权限）。
     */
    fun canCollectUsageSignals(permissionGateway: PermissionGateway): Boolean {
        if (!gotoWhereEnabled || !usageSignalsEnabled) return false
        return permissionGateway.hasUsageAccess()
    }

    /**
     * 是否允许投递通知。
     */
    fun canDeliverNotifications(permissionGateway: PermissionGateway): Boolean {
        if (!gotoWhereEnabled || !notificationsEnabled) return false
        return permissionGateway.hasNotificationPostPermission()
    }

    companion object {
        private const val PREFS_NAME = "goto_where_flags"
        private const val KEY_WHERE_ENABLED = "goto_where_enabled"
        private const val KEY_USAGE_SIGNALS_ENABLED = "goto_where_usage_signals_enabled"
        private const val KEY_NOTIFICATIONS_ENABLED = "goto_where_notifications_enabled"
        private const val KEY_DEBUG_ENABLED = "goto_where_debug_enabled"
    }
}

/**
 * WhereService — GOTO Where 的 Android 服务入口
 *
 * 职责：
 *   1. 持有 Composition Root（初始化所有适配器 + JS Bridge）
 *   2. 接收 Worker 的评估请求，调用 WhereJsBridge.evaluate()
 *   3. 接收通知反馈，调用 WhereJsBridge.processFeedback()
 *   4. 周期性采集使用信号，调用 WhereJsBridge.ingestUsageSignals()
 *
 * 作为一个普通的前台 Service 启动（仅在用户启用 Where 时）。
 * 不常驻：Where 关闭后立即停止。
 *
 * 注意：本类不复制 Where Core 算法，只编排。
 */
class WhereService : android.app.Service() {

    private var permissionGateway: PermissionGateway? = null
    private var usageSignalProvider: UsageSignalProvider? = null
    private var schedulerAdapter: WorkSchedulerAdapter? = null
    private var deliveryAdapter: NotificationDeliveryAdapter? = null
    private var jsBridge: WhereJsBridge? = null
    private var featureFlags: WhereFeatureFlags? = null

    override fun onCreate() {
        super.onCreate()
        val ctx = applicationContext
        featureFlags = WhereFeatureFlags(ctx)
        permissionGateway = PermissionGateway(ctx)
        usageSignalProvider = UsageSignalProvider(ctx, permissionGateway!!)
        schedulerAdapter = WorkSchedulerAdapter(ctx)
        deliveryAdapter = NotificationDeliveryAdapter(ctx, permissionGateway!!)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) {
            // 系统重启 Service（START_STICKY），但不该发生
            return START_NOT_STICKY
        }

        when (intent.action) {
            ACTION_INITIALIZE -> handleInitialize()
            ACTION_EVALUATE -> handleEvaluate()
            ACTION_PROCESS_FEEDBACK -> handleProcessFeedback(intent)
            ACTION_INGEST_USAGE_SIGNALS -> handleIngestUsageSignals()
            ACTION_CLEANUP -> handleCleanup()
            ACTION_SHUTDOWN -> {
                handleShutdown()
                stopSelf()
            }
        }

        return START_NOT_STICKY
    }

    /**
     * 初始化 Composition Root：加载 WhereRuntime bundle 并启动 JS Bridge。
     */
    private fun handleInitialize() {
        if (featureFlags?.gotoWhereEnabled != true) return

        // 读取预打包的 WhereRuntime bundle（由 build-host-bundle.js 生成）
        val whereRuntimeJs = try {
            assets.open(WHERE_RUNTIME_BUNDLE_ASSET).bufferedReader().use { it.readText() }
        } catch (e: Exception) {
            return
        }

        val delivery = if (featureFlags?.canDeliverNotifications(permissionGateway!!) == true) {
            deliveryAdapter
        } else null

        val scheduler = schedulerAdapter

        val bridge = WhereJsBridge(this)
        bridge.initialize(whereRuntimeJs, delivery, scheduler)
        jsBridge = bridge

        // 启动周期性评估
        schedulerAdapter?.schedulePeriodicEvaluation(30)

        // 启动使用信号采集周期
        if (featureFlags?.canCollectUsageSignals(permissionGateway!!) == true) {
            schedulerAdapter?.schedule(USAGE_SIGNAL_COLLECTION_WORK, 15 * 60 * 1000)
        }
    }

    /**
     * 执行一次 Where 评估。
     */
    private fun handleEvaluate() {
        val bridge = jsBridge ?: return
        if (!bridge.isReady()) return

        val ctx = applicationContext
        val perm = permissionGateway ?: return

        // 构造 ContextSignal
        val cal = Calendar.getInstance()
        val contextSignal = JSONObject().apply {
            put("timestamp", System.currentTimeMillis())
            put("hour", cal.get(Calendar.HOUR_OF_DAY))
            put("minute", cal.get(Calendar.MINUTE))
            put("weekday", (cal.get(Calendar.DAY_OF_WEEK) + 5) % 7) // Calendar 周日=1 → 转为 0=周一
            put("timezone", "local")
            put("foregroundPackageName", getCurrentForegroundPackage())
            put("batteryLevel", 80)
            put("isCharging", false)
            put("networkType", "wifi")
            put("screenState", "on")
        }

        bridge.evaluate(contextSignal.toString()) { resultJson ->
            // 结果已通过 JS Bridge 内部投递通知，这里只做日志
            if (featureFlags?.debugEnabled == true) {
                android.util.Log.d(TAG, "Where evaluate result: $resultJson")
            }
        }
    }

    /**
     * 处理通知反馈。
     */
    private fun handleProcessFeedback(intent: Intent) {
        val bridge = jsBridge ?: return
        if (!bridge.isReady()) return

        val ruleId = intent.getStringExtra(EXTRA_FEEDBACK_RULE_ID) ?: return
        val candidateId = intent.getStringExtra(EXTRA_FEEDBACK_CANDIDATE_ID) ?: ""
        val action = intent.getStringExtra(EXTRA_FEEDBACK_ACTION) ?: return

        val feedback = JSONObject().apply {
            put("feedbackId", "fb-${System.currentTimeMillis()}-$ruleId")
            put("ruleId", ruleId)
            put("candidateId", candidateId)
            put("action", action)
            put("timestamp", System.currentTimeMillis())
        }

        bridge.processFeedback(feedback.toString()) { success ->
            if (featureFlags?.debugEnabled == true) {
                android.util.Log.d(TAG, "Feedback processed: $success")
            }
        }
    }

    /**
     * 采集使用信号并写入 Base。
     */
    private fun handleIngestUsageSignals() {
        val bridge = jsBridge ?: return
        if (!bridge.isReady()) return
        val provider = usageSignalProvider ?: return
        val flags = featureFlags ?: return

        if (!flags.canCollectUsageSignals(permissionGateway!!)) return

        val result = provider.getUsageSignals()
        if (result.degraded || result.signals.isEmpty()) return

        bridge.ingestUsageSignals(result.signalsToJson()) { resultJson ->
            if (flags.debugEnabled) {
                android.util.Log.d(TAG, "Signals ingested: $resultJson")
            }
        }

        // 重新调度下一次采集
        schedulerAdapter?.schedule(USAGE_SIGNAL_COLLECTION_WORK, 15 * 60 * 1000)
    }

    /**
     * 清理过期候选和原始事件。
     */
    private fun handleCleanup() {
        // 通过 JS Bridge 调用 Base 的清理逻辑
        val bridge = jsBridge ?: return
        if (!bridge.isReady()) return

        bridge.evaluate("""{"action":"cleanup"}""") { _ ->
            // 忽略结果
        }
    }

    /**
     * 关闭 Where，取消所有任务并销毁 Bridge。
     */
    private fun handleShutdown() {
        schedulerAdapter?.cancelAllWhereWork()
        jsBridge?.destroy()
        jsBridge = null
    }

    /**
     * 获取当前前台应用包名（简化实现，生产环境应通过 UsageStatsManager）。
     */
    private fun getCurrentForegroundPackage(): String {
        return try {
            val provider = usageSignalProvider ?: return ""
            val result = provider.getUsageSignals(60 * 1000) // 最近 1 分钟
            result.signals.lastOrNull { it.eventType == "foreground" }?.packageName ?: ""
        } catch (e: Exception) {
            ""
        }
    }

    override fun onDestroy() {
        handleShutdown()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): android.os.IBinder? = null

    companion object {
        private const val TAG = "WhereService"

        const val ACTION_INITIALIZE = "com.appindex.where.INITIALIZE"
        const val ACTION_EVALUATE = "com.appindex.where.EVALUATE"
        const val ACTION_PROCESS_FEEDBACK = "com.appindex.where.PROCESS_FEEDBACK"
        const val ACTION_INGEST_USAGE_SIGNALS = "com.appindex.where.INGEST_SIGNALS"
        const val ACTION_CLEANUP = "com.appindex.where.CLEANUP"
        const val ACTION_SHUTDOWN = "com.appindex.where.SHUTDOWN"

        const val EXTRA_SCHEDULE_ID = "schedule_id"
        const val EXTRA_PAYLOAD = "payload"

        const val EXTRA_FEEDBACK_RULE_ID = "feedback_rule_id"
        const val EXTRA_FEEDBACK_CANDIDATE_ID = "feedback_candidate_id"
        const val EXTRA_FEEDBACK_ACTION = "feedback_action"

        private const val WHERE_RUNTIME_BUNDLE_ASSET = "where-runtime-bundle.js"
        private const val USAGE_SIGNAL_COLLECTION_WORK = "usage_signal_collection"
    }
}
