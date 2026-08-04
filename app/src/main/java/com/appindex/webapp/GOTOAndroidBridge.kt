package com.appindex.webapp

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import com.appindex.where.NotificationDeliveryAdapter
import com.appindex.where.PermissionGateway
import org.json.JSONObject

/**
 * GOTO 前端 JS 桥接 — 暴露原生能力给 WebView 内的前端页面
 *
 * 注册名：`GOTOAndroidBridgeNative`（在 [GotoWebActivity] 中通过 addJavascriptInterface 注入）
 *
 * 前端 index.html 已预留 `window.GOTOAndroidBridge` 接口（第 15321 行），
 * 本类作为原生侧实现，前端通过 `window.GOTOAndroidBridgeNative.X()` 调用。
 *
 * 当前实现：
 * - [getVersion]：返回 Engine 版本号
 * - [getInstalledApps]：返回已安装应用列表（JSON 字符串）
 * - [onSearchTriggered]：前端搜索触发时通知原生（用于统计/反馈）
 * - [onAppLaunched]：前端点击启动应用时通知原生（用于 Engine 反馈学习）
 *
 * 后续可扩展：文件系统、剪贴板、系统设置等原生能力。
 */
class GOTOAndroidBridge(private val context: Context) {

    companion object {
        private const val TAG = "GOTOAndroidBridge"
        private const val NOTIFICATION_PERMISSION_REQUEST_CODE = 4107
    }

    private val permissionGateway by lazy { PermissionGateway(context) }
    private val notificationDelivery by lazy {
        NotificationDeliveryAdapter(context, permissionGateway)
    }

    /** Request the Android notification permission from the hosting Activity. */
    @JavascriptInterface
    fun requestNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        if (permissionGateway.hasNotificationPostPermission()) return true
        val activity = context as? Activity ?: return false
        activity.runOnUiThread {
            activity.requestPermissions(
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                NOTIFICATION_PERMISSION_REQUEST_CODE
            )
        }
        return true
    }

    /** Deliver a real GOTO Where notification through the existing adapter. */
    @JavascriptInterface
    fun sendNotification(title: String?, body: String?, target: String?): String {
        val candidate = target.orEmpty()
        val decision = JSONObject().apply {
            put("ruleId", "page-smart-reminder:$candidate")
            put("candidateId", candidate)
            put("packageName", "")
            put("title", title?.takeIf { it.isNotBlank() } ?: "GOTO 智能提醒")
            put("body", body.orEmpty())
        }
        return notificationDelivery.deliver(decision.toString())
    }

    /**
     * 返回 GOTO Engine 版本号。
     * 前端调用：`GOTOAndroidBridgeNative.getVersion()`
     */
    @JavascriptInterface
    fun getVersion(): String {
        return try {
            com.appindex.component.Versions.ENGINE_VERSION
        } catch (_: Throwable) {
            "unknown"
        }
    }

    /**
     * 返回已安装应用列表（JSON 字符串）。
     * 前端调用：`GOTOAndroidBridgeNative.getInstalledApps()`
     *
     * 实际应用列表由 EngineComponentInjector → SearchService → AppIndexEngine 扫描。
     * 此处返回 JSON 供前端 `GOTOAndroidBridge.setInstalledApps()` 消费。
     */
    @JavascriptInterface
    fun getInstalledApps(): String {
        return try {
            // Engine 扫描结果通过 SearchService 获取
            // 当前返回空数组，待 Engine 初始化完成后由 GotoWebActivity 主动注入
            "[]"
        } catch (_: Throwable) {
            "[]"
        }
    }

    /**
     * 前端搜索触发时通知原生（用于统计/反馈学习）。
     * 前端调用：`GOTOAndroidBridgeNative.onSearchTriggered(query)`
     */
    @JavascriptInterface
    fun onSearchTriggered(query: String?) {
        Log.d(TAG, "搜索触发: $query")
        query?.takeIf { it.isNotBlank() }?.let { com.appindex.GotoEngineRuntime.facade()?.recordSearch(it) }
    }

    /**
     * 前端点击启动应用时通知原生（用于 Engine 反馈学习）。
     * 前端调用：`GOTOAndroidBridgeNative.onAppLaunched(packageName, appName, query)`
     */
    @JavascriptInterface
    fun onAppLaunched(packageName: String?, appName: String?, query: String?) {
        Log.d(TAG, "启动应用: pkg=$packageName name=$appName query=$query")
        val name = appName?.takeIf { it.isNotBlank() } ?: packageName.orEmpty()
        if (name.isNotBlank()) {
            com.appindex.GotoEngineRuntime.facade()?.recordSelection(query.orEmpty(), name)
        }
    }

    /**
     * 前端请求打开系统设置（或应用详情页）。
     * 前端调用：`GOTOAndroidBridgeNative.openAppSettings(packageName)`
     */
    /** Launch the real installed Android app represented by a package name or label. */
    @JavascriptInterface
    fun launchApp(target: String?): Boolean {
        val raw = target?.trim().orEmpty()
        if (raw.isBlank()) return false
        return try {
            val packageManager = context.packageManager
            val packageName = if (raw.contains('.')) {
                raw
            } else {
                packageManager.getInstalledApplications(0)
                    .firstOrNull { info ->
                        info.loadLabel(packageManager).toString().equals(raw, ignoreCase = true)
                    }
                    ?.packageName
                    ?: raw
            }
            val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return false
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
            if (context is Activity) {
                context.runOnUiThread { context.startActivity(intent) }
            } else {
                context.startActivity(intent)
            }
            Log.d(TAG, "Launch app: pkg=$packageName")
            true
        } catch (error: Throwable) {
            Log.w(TAG, "Unable to launch app: $raw", error)
            false
        }
    }

    @JavascriptInterface
    fun openAppSettings(packageName: String?) {
        Log.d(TAG, "打开应用设置: $packageName")
        // 后续接入 Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
    }
}
