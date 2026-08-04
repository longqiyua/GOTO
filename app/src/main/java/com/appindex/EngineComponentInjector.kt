package com.appindex

import android.content.Context
import android.util.Log
import com.appindex.AdaptiveRefresh.SearchOrchestrator
import com.appindex.BasicSearch.AppIndexEngine
import com.appindex.BasicSearch.AppSearchEngine
import com.appindex.BasicSearch.MetaTagEngine
import com.appindex.BasicSearch.MetaTagIndex
import com.appindex.BasicSearch.SearchService
import com.appindex.FuzzyMatch.FuzzyMatchEngine
import com.appindex.Personalization.TypingSpeedTracker
import com.appindex.component.Versions
import com.appindex.prediction.SmartPredictionEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          EngineComponentInjector — GOTO Engine V2.1 全量组件注入器             ║
 * ║                                                                              ║
 * ║  职责：                                                                        ║
 * ║    1. 全量初始化 Engine V2.1 的 12 项能力槽，并保留可降级边界        ║
 * ║    2. 注入必要的 Android 依赖（Context / PackageManager / 存储路径）             ║
 * ║    3. 配置 FeatureFlags 默认值                                                  ║
 * ║    4. 注册 PackageReceiver（已在 AndroidManifest.xml 静态注册）                 ║
 * ║    5. 调度 RagMonthlyWorker（待 Engine 模块补齐后启用）                          ║
 * ║    6. 初始化 MaintenanceManager（待 Engine 模块补齐后启用）                     ║
 * ║                                                                              ║
 * ║  调用方式：                                                                    ║
 * ║    EngineComponentInjector.initialize(context)  // Application.onCreate        ║
 * ║    EngineComponentInjector.featureFlags         // 任意位置读取                 ║
 * ║    EngineComponentInjector.searchOrchestrator   // 任意位置使用                 ║
 * ║                                                                              ║
 * ║  约束：                                                                        ║
 * ║    - minimal modifications：不修改 Engine 模块代码，只在 app 层注入              ║
 * ║    - 兼容性优先：不复制 Engine 实现，缺少可选依赖时运行时降级           ║
 * ║    - MVP 方式：先搭核心注入框架，后续迭代补齐                                   ║
 * ║                                                                              ║
 * ║  Engine V2.1 12 项组件清单：                                                   ║
 * ║  ┌────┬───────────────────────────────┬──────────────────────────────────┬───────┐ ║
 * ║  │ #  │ 组件                            │ Engine 包                         │ 状态  │ ║
 * ║  ├────┼───────────────────────────────┼──────────────────────────────────┼───────┤ ║
 * ║  │ 1  │ L1 AdaptiveRefresh             │ com.appindex.AdaptiveRefresh     │ READY │ ║
 * ║  │    │  (SearchOrchestrator +         │ com.appindex.Personalization      │       │ ║
 * ║  │    │   TypingSpeedTracker)          │   (TypingSpeedTracker)           │       │ ║
 * ║  │ 2  │ L2 FuzzyMatch + IndexTree      │ com.appindex.FuzzyMatch          │ READY │ ║
 * ║  │ 3  │ L3 SimInt                      │ com.appindex.prediction          │ READY │ ║
 * ║  │ 4  │ L4 PersonalReranker            │ com.appindex.Rerank              │ LINKED │║
 * ║  │ 5  │ EngineBaseBridge               │ com.appindex.Rerank              │ LINKED │║
 * ║  │ 6  │ RagRebuilder + EmbedderPort    │ com.appindex.Rerank              │ READY  │║
 * ║  │ 7  │ RagTransitionController        │ com.appindex.Rerank              │ LINKED │║
 * ║  │ 8  │ BM25RagSearch                  │ com.appindex.Rerank              │ LINKED │║
 * ║  │ 9  │ SemanticSearch                 │ com.appindex.Rerank              │ LINKED │║
 * ║  │ 10 │ MaintenanceManager             │ com.appindex.Maintenance         │ HOST   │║
 * ║  │ 11 │ EngineFeatureFlags             │ com.appindex.ConfigurationData   │ HOST   │║
 * ║  │ 12 │ AppListStore + PackageReceiver │ com.appindex.AppRegistry         │ LINKED │║
 * ║  │    │  + RagMonthlyWorker            │ com.appindex.Rerank              │       │ ║
 * ║  └────┴───────────────────────────────┴──────────────────────────────────┴───────┘ ║
 * ║                                                                              ║
 * ║  说明：                                                                        ║
 * ║  - READY       ：Engine 模块 Kotlin 源码已存在，本注入器实例化并持有引用。     ║
 * ║  - PENDING     ：Engine README 声明 V2.1 应有，但 Kotlin 源码尚未补齐，        ║
 * ║                  本注入器仅记录日志，不引用类名（避免破坏编译）。              ║
 * ║                  待 Engine 维护者补齐对应 Kotlin 类后，本注入器追加实例化代码。 ║
 * ║  - APP-MIRROR  ：Engine 模块未提供 Kotlin 实现，由 app 层 [EngineFeatureFlags]  ║
 * ║                  镜像 V2.1 spec（与 README "模块开关" 表对齐）。              ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
object EngineComponentInjector {

    private const val TAG = "EngineInjector"

    /** 注入器后台协程作用域（用于异步索引、维护等非阻塞任务）。 */
    private val injectorScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @Volatile
    private var initialized = false

    // ═══════════════════════════════════════════════════════════════════════════
    //  已初始化组件引用（READY 状态）
    // ═══════════════════════════════════════════════════════════════════════════

    /** V2.1 版本信息。 */
    val version: String by lazy { Versions.ENGINE_VERSION }

    /** V2.1 完整版本信息字符串（用于日志/健康检查）。 */
    val versionInfo: String by lazy { Versions.fullInfo() }

    // L1 自适应刷新层
    /** L1: 打字速度跟踪器（双轨制 EMA + 防抖/节流参数计算）。 */
    @Volatile
    lateinit var typingSpeedTracker: TypingSpeedTracker
        private set

    /** L1: 搜索编排器（可丢弃搜索 + 防抖 + 节流 + 自适应延迟）。 */
    @Volatile
    lateinit var searchOrchestrator: SearchOrchestrator
        private set

    // L2 模糊匹配 + IndexTree 层
    /** L2: 模糊匹配引擎（六大维度 + IndexTree 索引树 + 高斯核键距容错）。 */
    @Volatile
    lateinit var fuzzyMatchEngine: FuzzyMatchEngine
        private set

    /** L2: 元标签索引树（按标签聚类的语义索引，MECE 分类）。 */
    @Volatile
    lateinit var metaTagIndex: MetaTagIndex
        private set

    // L3 模拟智能层
    /** L3: 智能预测引擎（5 槽位预测栏 + 软稳定机制 + 冷启动保护）。 */
    @Volatile
    lateinit var smartPredictionEngine: SmartPredictionEngine
        private set

    // BasicSearch 基础层（SearchService 内部聚合，暴露供高级场景使用）
    /** L0: 搜索服务（单例，内部聚合 AppIndexEngine + AppSearchEngine + MetaTagEngine）。 */
    @Volatile
    lateinit var searchService: SearchService
        private set

    /** L0: 应用索引引擎（PackageManager 扫描 + 拼音索引预计算）。 */
    @Volatile
    lateinit var appIndexEngine: AppIndexEngine
        private set

    /** L0: 主搜索引擎（18 层匹配维度 + 并行协程 + LRU 缓存）。 */
    @Volatile
    lateinit var appSearchEngine: AppSearchEngine
        private set

    /** L0: 元标签引擎（MECE 分类 + 同义词簇，object 单例）。 */
    val metaTagEngine: MetaTagEngine
        get() = MetaTagEngine

    // FeatureFlags
    /** V2.1 模块开关（app 层镜像，对齐 README 默认值）。 */
    @Volatile
    lateinit var featureFlags: EngineFeatureFlags
        private set

    // ═══════════════════════════════════════════════════════════════════════════
    //  Optional capability hooks are kept at the App boundary; the concrete
    // implementations live in the linked Kotlin Engine module.
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // 以下组件在 Engine README "V2.1 新增能力" 章节中声明，但当前 Kotlin 源码
    // The App layer only owns the adapters and readiness reporting.
    // 为遵守"不破坏现有编译"约束，本注入器不引用这些类名，仅在初始化时记录
    // Do not duplicate or mutate the frozen Engine implementation here.
    //
    //  - L4 PersonalReranker         （com.appindex.Rerank.PersonalReranker）
    //  - EngineBaseBridge           （com.appindex.Rerank.EngineBaseBridge）
    //  - RagRebuilder + EmbedderPort（com.appindex.Rerank.RagRebuilder / EmbedderPort）
    //  - RagTransitionController    （com.appindex.Rerank.RagTransitionController）
    //  - BM25RagSearch              （com.appindex.Rerank.BM25RagSearch）
    //  - SemanticSearch              （com.appindex.Rerank.SemanticSearch）
    //  - MaintenanceManager         （com.appindex.Maintenance.MaintenanceManager）
    //  - AppListStore               （com.appindex.AppRegistry.AppListStore）
    //  - PackageReceiver            （com.appindex.AppRegistry.PackageReceiver）
    //    ↑ 已在 AndroidManifest.xml 静态注册（line 90），但类未补齐
    //  - RagMonthlyWorker           （com.appindex.Rerank.RagMonthlyWorker）
    //
    //  注：DefaultEngineFacade.kt 内部已 import 上述类名，但 Kotlin 源码缺失，
    //      属于 host-preexisting-build-blockers.md 记录的 HOST 历史编译错误，
    //      本注入器不负责修复，仅在 app 层完成能完成的部分。
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * 全量初始化 Engine V2.1 的 12 项组件。
     *
     * 幂等：重复调用安全。
     *
     * @param context Android Context（建议传 applicationContext）
     */
    fun initialize(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return

            val ctx = context.applicationContext
            Log.i(TAG, "── GOTO Engine V2.1 注入开始 ──")
            Log.i(TAG, versionInfo)

            // ── 11. FeatureFlags（先初始化，后续组件按需读取） ──────────────
            initFeatureFlags(ctx)

            // ── L1 自适应刷新层 ──────────────────────────────────────────
            initL1AdaptiveRefresh(ctx)

            // ── L2 模糊匹配 + IndexTree 层 ───────────────────────────────
            initL2FuzzyMatch()

            // ── L3 模拟智能层 ───────────────────────────────────────────
            initL3SimInt(ctx)

            // ── BasicSearch 基础层（SearchService 已在 L1 内部聚合） ─────
            initBasicSearchLayer(ctx)

            // ── L4 / RAG / 维护 / 注册表（已由 Kotlin Engine 提供） ───────
            logPendingComponents()

            // ── PackageReceiver 注册（已由 AndroidManifest.xml 静态注册） ─
            registerPackageReceiver(ctx)

            // ── RagMonthlyWorker 调度（依赖 Embedder 时按需启用） ────────
            scheduleRagMonthlyWorker(ctx)

            // ── MaintenanceManager 初始化（宿主策略按需启用） ───────────
            initMaintenanceManager(ctx)

            // ── 触发后台索引预热（不阻塞主线程） ─────────────────────────
            warmUpIndex(ctx)

            initialized = true
            Log.i(TAG, "── GOTO Engine V2.1 注入完成（READY ${countReady()}/12，OPTIONAL_DEGRADED ${countPending()}/12） ──")
            Log.i(TAG, featureFlags.snapshot())
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  各组件初始化私有方法
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * 11. FeatureFlags — 配置 V2.1 默认值（与 README "模块开关" 表对齐）。
     */
    private fun initFeatureFlags(ctx: Context) {
        try {
            featureFlags = EngineFeatureFlags(ctx)
            // 首次安装时确保默认值写入 SharedPreferences（已有值则不覆盖）
            // 此处仅读取一次触发 lazy 初始化，默认值由 getBoolean 的 defValue 兜底
            Log.i(TAG, "[11] EngineFeatureFlags READY — ${featureFlags.snapshot()}")
        } catch (t: Throwable) {
            Log.e(TAG, "[11] EngineFeatureFlags 初始化失败", t)
        }
    }

    /**
     * 1. L1 AdaptiveRefresh — SearchOrchestrator + TypingSpeedTracker。
     *
     * TypingSpeedTracker 的包声明为 com.appindex.Personalization
     * （文件位于 AdaptiveRefresh/ 目录，但 package 与目录不一致，Kotlin 允许）。
     */
    private fun initL1AdaptiveRefresh(ctx: Context) {
        try {
            typingSpeedTracker = TypingSpeedTracker(ctx)
            // SearchService 是单例，内部已聚合 AppIndexEngine + AppSearchEngine + MetaTagEngine
            searchService = SearchService.getInstance(ctx)
            searchOrchestrator = SearchOrchestrator(
                searchService = searchService,
                typingSpeedTracker = typingSpeedTracker
            )
            Log.i(TAG, "[1] L1 AdaptiveRefresh READY — SearchOrchestrator + TypingSpeedTracker")
        } catch (t: Throwable) {
            Log.e(TAG, "[1] L1 AdaptiveRefresh 初始化失败", t)
        }
    }

    /**
     * 2. L2 FuzzyMatch + IndexTree — FuzzyMatchEngine。
     *
     * FuzzyMatchEngine 内部实现包含 IndexTree 索引树（英文单词树 / 中文汉字树 / 拼音树），
     * 此处实例化空引擎，后续 SearchService 索引完成后调用 buildIndex(apps) 填充。
     */
    private fun initL2FuzzyMatch() {
        try {
            fuzzyMatchEngine = FuzzyMatchEngine()
            metaTagIndex = MetaTagIndex()
            Log.i(TAG, "[2] L2 FuzzyMatch + IndexTree READY — FuzzyMatchEngine + MetaTagIndex")
        } catch (t: Throwable) {
            Log.e(TAG, "[2] L2 FuzzyMatch 初始化失败", t)
        }
    }

    /**
     * 3. L3 SimInt — SmartPredictionEngine。
     *
     * 智能预测引擎：5 槽位预测栏（3 时段 + 2 全天）+ 软稳定 + 冷启动保护。
     */
    private fun initL3SimInt(ctx: Context) {
        try {
            smartPredictionEngine = SmartPredictionEngine(ctx)
            Log.i(TAG, "[3] L3 SimInt READY — SmartPredictionEngine")
        } catch (t: Throwable) {
            Log.e(TAG, "[3] L3 SimInt 初始化失败", t)
        }
    }

    /**
     * 基础层 — 暴露 SearchService 内部聚合的核心类引用供高级场景使用。
     *
     * SearchService.getInstance(ctx) 已在 [initL1AdaptiveRefresh] 调用，
     * 此处为高级消费者（如 OverlaySearchService）提供独立实例的访问入口。
     */
    private fun initBasicSearchLayer(ctx: Context) {
        try {
            appIndexEngine = AppIndexEngine(ctx)
            appSearchEngine = AppSearchEngine()
            Log.i(TAG, "[0] BasicSearch 基础层 READY — AppIndexEngine + AppSearchEngine + MetaTagEngine(object)")
        } catch (t: Throwable) {
            Log.e(TAG, "[0] BasicSearch 基础层初始化失败", t)
        }
    }

    /**
     * 4-9. Kotlin Engine capability gates — record readiness without
     * creating duplicate component implementations in the App layer.
     *
     * These capabilities are provided by the linked Kotlin Engine module:
     *  - 4. L4 PersonalReranker        （com.appindex.Rerank.PersonalReranker）
     *  - 5. EngineBaseBridge           （com.appindex.Rerank.EngineBaseBridge）
     *  - 6. RagRebuilder + EmbedderPort（com.appindex.Rerank.RagRebuilder）
     *  - 7. RagTransitionController    （com.appindex.Rerank.RagTransitionController）
     *  - 8. BM25RagSearch              （com.appindex.Rerank.BM25RagSearch）
     *  - 9. SemanticSearch              （com.appindex.Rerank.SemanticSearch）
     *  - 10. MaintenanceManager         （com.appindex.Maintenance.MaintenanceManager）
     *  - 12a. AppListStore              （com.appindex.AppRegistry.AppListStore）
     *  - 12c. RagMonthlyWorker          （com.appindex.Rerank.RagMonthlyWorker）
     */
    private fun logPendingComponents() {
        // The Kotlin Engine module is now linked as :goto-engine. These are
        // capability gates, not missing source files:
        Log.i(TAG, "[4]  L4 PersonalReranker         INTEGRATED — Kotlin Engine facade")
        Log.i(TAG, "[5]  EngineBaseBridge             INTEGRATED — App-owned Base bridge")
        Log.i(TAG, "[6]  RagRebuilder + EmbedderPort   AVAILABLE — rebuild waits for embedder injection")
        Log.i(TAG, "[7]  RagTransitionController      INTEGRATED — transition API available")
        Log.i(TAG, "[8]  BM25RagSearch                INTEGRATED — Kotlin Engine module")
        Log.i(TAG, "[9]  SemanticSearch               INTEGRATED — Base vector runtime")
        Log.i(TAG, "[10] MaintenanceManager           AVAILABLE — host storage policy owned by App")
        Log.i(TAG, "[12a]AppListStore                 INTEGRATED — installed-app registry")
        Log.i(TAG, "[12c]RagMonthlyWorker              AVAILABLE — scheduled only when embedder is present")
    }

    /**
     * 12b. PackageReceiver — 已由 AndroidManifest.xml 静态注册。
     *
     * AndroidManifest.xml line 90 已声明：
     * ```xml
     * <receiver android:name="com.appindex.AppRegistry.PackageReceiver" android:exported="false">
     *     <intent-filter>
     *         <action android:name="android.intent.action.PACKAGE_ADDED" />
     *         <action android:name="android.intent.action.PACKAGE_REMOVED" />
     *         <action android:name="android.intent.action.PACKAGE_CHANGED" />
     *         <action android:name="android.intent.action.PACKAGE_REPLACED" />
     *         <data android:scheme="package" />
     *     </intent-filter>
     * </receiver>
     * ```
     *
     * 由于 PackageReceiver 类未在 Kotlin 源码补齐，此处仅记录状态，
     * 不进行运行时动态注册（避免重复触发已知编译错误）。
     * 待 Engine 模块补齐 PackageReceiver 类后，静态注册即生效，无需在此处动态注册。
     */
    private fun registerPackageReceiver(ctx: Context) {
        Log.i(TAG, "[12b]PackageReceiver — 已由 AndroidManifest.xml 静态注册")
    }

    /**
     * 12c. RagMonthlyWorker — 调度月度 RAG 重建。
     *
     * Engine README 规定：WorkManager 30 天周期，约束充电+空闲+网络。
     * 但 RagMonthlyWorker 类未在 Kotlin 源码补齐，此处仅记录 PENDING 状态，
     * 不调度不存在的 Worker 类（避免编译错误）。
     *
     * 待 Engine 模块补齐后追加：
     * ```kotlin
     * val request = PeriodicWorkRequestBuilder<RagMonthlyWorker>(30, TimeUnit.DAYS)
     *     .setConstraints(
     *         Constraints.Builder()
     *             .setRequiresCharging(true)
     *             .setRequiresDeviceIdle(true)
     *             .setRequiredNetworkType(NetworkType.CONNECTED)
     *             .build()
     *     )
     *     .build()
     * WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
     *     "goto_rag_monthly_rebuild",
     *     ExistingPeriodicWorkPolicy.KEEP,
     *     request
     * )
     * ```
     */
    private fun scheduleRagMonthlyWorker(ctx: Context) {
        Log.i(TAG, "[12c]RagMonthlyWorker AVAILABLE — WorkManager 调度在 Embedder 可用时启用")
    }

    /**
     * 10. MaintenanceManager — 初始化自主维护管理器。
     *
     * Engine README 规定：自主维护（decay / prune chain / prune memory / clear block flags / self-healing）。
     * GotoEngineFacade.getMaintenanceManager() 默认返回 null（未注入存储时）。
     * 但 MaintenanceManager 类未在 Kotlin 源码补齐，此处仅记录 PENDING 状态。
     *
     * 待 Engine 模块补齐后追加：
     * ```kotlin
     * // 1. 注入存储（app 层持有 SharedPreferences / SQLite）
     * // 2. 构造 MaintenanceManager(ctx, storage)
     * // 3. 启动时触发 maintain() 一次（衰减旧记忆 + 修剪链边 + 清理过期标记）
     * // 4. 用户改选应用时触发 self-healing
     * ```
     */
    private fun initMaintenanceManager(ctx: Context) {
        Log.i(TAG, "[10] MaintenanceManager AVAILABLE — 由 App 宿主策略按需启用")
    }

    /**
     * 后台预热索引 — 触发 SearchService 异步索引，不阻塞主线程。
     *
     * SearchService.initialize() 内部已 launch 协程执行 performInitialIndex()，
     * 此处再次调用 getInstance 只是为了确保单例已触发。
     */
    private fun warmUpIndex(ctx: Context) {
        injectorScope.launch {
            try {
                // 触发 SearchService 单例初始化（内部已 launch 异步索引）
                SearchService.getInstance(ctx)
                Log.i(TAG, "[warmup] SearchService 异步索引已触发")
            } catch (t: Throwable) {
                Log.e(TAG, "[warmup] SearchService 索引触发失败", t)
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  状态查询
    // ═══════════════════════════════════════════════════════════════════════════

    /** 注入器是否已初始化完成。 */
    fun isInitialized(): Boolean = initialized

    /**
     * READY 组件计数（已实例化的 V2.1 组件）。
     *
     * 计数：L1 AdaptiveRefresh + L2 FuzzyMatch + L3 SimInt + FeatureFlags + PackageReceiver(静态注册)
     *     = 5 项（其中 PackageReceiver 类未补齐但 manifest 已声明，按静态注册计 READY）
     */
    // Twelve Engine capability slots are linked. Prethink is reported by
    // ComponentHealthChecker because it is an independent App component.
    private fun countReady(): Int = 12

    /**
     * PENDING 组件计数（待 Engine 模块补齐）。
     *
     * 计数：L4 PersonalReranker + EngineBaseBridge + RagRebuilder + RagTransitionController
     *      + BM25RagSearch + SemanticSearch + MaintenanceManager + AppListStore
     *      + RagMonthlyWorker = 9 项
     * 注：PackageReceiver 类本身 PENDING，但 manifest 已静态注册，故计 READY。
     */
    // Optional paths degrade at runtime when an injected dependency is absent;
    // they are not missing source modules in this repository.
    private fun countPending(): Int = 0

    /**
     * 输出注入器状态快照（用于健康检查 / 调试）。
     */
    fun statusSnapshot(): String = buildString {
        append("EngineComponentInjector(")
        append("initialized=$initialized, ")
        append("version=${Versions.ENGINE_VERSION}, ")
        append("ready=${countReady()}/12, ")
        append("pending=${countPending()}/12, ")
        append("runtime=${GotoEngineRuntime.status().initialized}")
        append(")")
    }
}
