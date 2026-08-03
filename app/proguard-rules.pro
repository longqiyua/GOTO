# =============================================================================
# GOTO ProGuard / R8 规则
# =============================================================================
# 此文件由 release buildType 引用（app/build.gradle.kts line 28）。
# 仅追加 GOTO 业务代码的保留规则，AndroidX / Material / Kotlin 等三方库的
# 规则由各自的 consumer-proguard-rules 自动注入，无需在此重复声明。
# -----------------------------------------------------------------------------

# ────────────── 反射访问的 Kotlin 单例 object ──────────────
# Engine 核心 object（通过反射或 by lazy 间接实例化）
-keep class com.appindex.Rerank.PersonalReranker { *; }
-keep class com.appindex.Rerank.RagRebuilder { *; }
-keep class com.appindex.Rerank.RagEmbedderHolder { *; }
-keep class com.appindex.Rerank.BM25RagSearch { *; }
-keep class com.appindex.BasicSearch.MetaTagEngine { *; }

# ────────────── 数据类（序列化 / 反射读取字段） ──────────────
-keep class com.appindex.Rerank.PersonalSnapshot { *; }
-keep class com.appindex.Rerank.RuntimeContext { *; }
-keep class com.appindex.Rerank.FeedbackContext { *; }
-keep class com.appindex.Rerank.FeedbackChainEvent { *; }
-keep class com.appindex.Rerank.BridgeStatus { *; }
-keep class com.appindex.model.SearchResult { *; }
-keep class com.appindex.model.AppInfo { *; }
-keep class com.appindex.model.MatchType { *; }
-keep class com.appindex.model.MemberProfile { *; }

# ────────────── AndroidManifest 注册的组件（AGP 自动 keep，此处显式声明以防万一） ──────────────
-keep class com.appindex.UIUX.WelcomeActivity { *; }
-keep class com.appindex.UIUX.SearchActivity { *; }
-keep class com.appindex.UIUX.ActivationActivity { *; }
-keep class com.appindex.UIUX.SettingsActivity { *; }
-keep class com.appindex.UIUX.RankingActivity { *; }
-keep class com.appindex.UIUX.GestureRecordActivity { *; }
-keep class com.appindex.QuickActionsAndFloatingWindow.OverlaySearchService { *; }
-keep class com.appindex.where.WhereService { *; }
-keep class com.appindex.where.WhereFeedbackReceiver { *; }
-keep class com.appindex.AppRegistry.PackageReceiver { *; }

# ────────────── 许可证校验（反射访问字段 / 方法） ──────────────
-keep class com.appindex.license.LicenseManager { *; }
-keep class com.appindex.license.LicenseManager$* { *; }
-keep class com.appindex.license.LicenseApiClient { *; }
-keep class com.appindex.license.LicenseApiClient$* { *; }
