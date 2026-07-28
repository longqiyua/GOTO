package com.appindex.where

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import androidx.core.content.PermissionChecker

/**
 * PermissionGateway — Android 权限网关
 *
 * 职责：
 *   1. 检查 Usage Access 状态
 *   2. 打开系统使用情况访问设置页
 *   3. 检查通知发送权限
 *   4. Android 13+ 申请 POST_NOTIFICATIONS
 *
 * 不会：
 *   - 申请通知读取权限（NotificationListenerService）
 *   - 申请精确闹钟权限（SCHEDULE_EXACT_ALARM）
 *   - 因权限拒绝而崩溃
 *   - 重复骚扰用户
 *
 * PermissionState 与 goto-base/integration/javascript/usage/usage-signal-provider.js
 * 的契约保持一致（通过 JS Bridge 传递）。
 */
class PermissionGateway(private val context: Context) {

    /**
     * 检查并返回统一的 PermissionState。
     *
     * JSON 形态（与 JS Bridge 契约对齐）：
     * {
     *   usageAccessGranted: Boolean,
     *   notificationPostGranted: Boolean,
     *   notificationReadGranted: false,    // 本阶段不申请
     *   exactAlarmGranted: false,          // 本阶段不申请
     *   checkedAt: String (ISO 8601),
     *   platformVersion: Int (Build.VERSION.SDK_INT)
     * }
     */
    fun checkPermissionState(): PermissionState {
        return PermissionState(
            usageAccessGranted = hasUsageAccess(),
            notificationPostGranted = hasNotificationPostPermission(),
            notificationReadGranted = false,
            exactAlarmGranted = false,
            checkedAt = System.currentTimeMillis(),
            platformVersion = Build.VERSION.SDK_INT
        )
    }

    /**
     * 检查 Usage Access（PACKAGE_USAGE_STATS）是否已授权。
     *
     * 使用 AppOpsManager 检查 OPSTR_PACKAGE_USAGE_STATS，适用于 Android 5.0+。
     * 注意：checkOpNoThrow 返回 MODE_ALLOWED 才视为已授权。
     */
    fun hasUsageAccess(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
            ?: return false
        // 使用字符串常量 "android:get_usage_stats" 代替 AppOpsManager.OPSTR_PACKAGE_USAGE_STATS
        // 以避免某些 SDK 版本下的引用解析问题
        val usageStatsOp = "android:get_usage_stats"
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                usageStatsOp,
                Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                usageStatsOp,
                Process.myUid(),
                context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    /**
     * 检查通知发送权限。
     * Android 13+ 需要 POST_NOTIFICATIONS 运行时权限；
     * Android 12 及以下默认启用（用户可在系统设置中关闭）。
     */
    fun hasNotificationPostPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            PermissionChecker.checkSelfPermission(
                context,
                android.Manifest.permission.POST_NOTIFICATIONS
            ) == PermissionChecker.PERMISSION_GRANTED
        } else {
            // Android 12 及以下：通知默认启用
            true
        }
    }

    /**
     * 打开系统使用情况访问设置页。
     * 调用方应在 Activity 上下文中调用，并处理 ActivityNotFoundException。
     */
    fun openUsageAccessSettings(): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * 打开应用通知设置页（让用户手动开启通知）。
     */
    fun openNotificationSettings(): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            // 回退到应用详情页
            try {
                val intent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", context.packageName, null)
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
                context.startActivity(intent)
                true
            } catch (e2: Exception) {
                false
            }
        }
    }

    /**
     * 权限状态数据类（与 JS Bridge 契约对齐）。
     */
    data class PermissionState(
        val usageAccessGranted: Boolean,
        val notificationPostGranted: Boolean,
        val notificationReadGranted: Boolean,
        val exactAlarmGranted: Boolean,
        val checkedAt: Long,
        val platformVersion: Int
    ) {
        /**
         * 转换为 JSON 字符串（供 JS Bridge 使用）。
         */
        fun toJson(): String {
            return """{"usageAccessGranted":$usageAccessGranted,""" +
                """"notificationPostGranted":$notificationPostGranted,""" +
                """"notificationReadGranted":$notificationReadGranted,""" +
                """"exactAlarmGranted":$exactAlarmGranted,""" +
                """"checkedAt":$checkedAt,""" +
                """"platformVersion":$platformVersion}"""
        }

        /**
         * Where 是否可以采集跨应用使用信号。
         */
        fun canCollectUsageSignals(): Boolean = usageAccessGranted

        /**
         * Where 是否可以投递系统通知。
         */
        fun canDeliverNotifications(): Boolean = notificationPostGranted
    }
}
