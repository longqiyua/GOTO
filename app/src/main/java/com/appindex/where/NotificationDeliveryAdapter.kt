package com.appindex.where

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicInteger

/**
 * NotificationDeliveryAdapter — Android 通知投递适配器
 *
 * 实现 goto-where/ports/delivery-port.js 的 DeliveryPort。
 *
 * 功能：
 *   1. 创建 GOTO Where Notification Channel
 *   2. 投递 ReminderDecision（JSON 形式）
 *   3. 点击通知打开目标应用
 *   4. 支持操作：打开 / 稍后提醒 / 忽略 / 关闭此类提醒
 *   5. 产生 DeliveryReceipt
 *   6. 产生 ReminderFeedback 并写入 Base
 *
 * 要求：
 *   - packageName 来自 Base / IdentityResolver
 *   - 找不到应用时不得崩溃
 *   - 点击启动不等待反馈写入
 *   - notificationId 稳定且避免冲突
 *   - 相同 ruleId 遵守去重和冷却
 *   - 通知权限拒绝时自动降级到 GOTO 内部卡片
 *   - 不读取其他应用通知
 */
class NotificationDeliveryAdapter(
    private val context: Context,
    private val permissionGateway: PermissionGateway,
    private val config: Config = Config()
) {

    /**
     * 配置项。
     */
    data class Config(
        val channelId: String = "goto_where_reminders",
        val channelName: String = "GOTO Where 提醒",
        val channelDescription: String = "基于使用习惯的智能应用提醒",
        val notificationSmallIcon: Int = android.R.drawable.ic_dialog_info
    )

    /**
     * 已投递的 notificationId 集合（用于去重和冷却）。
     * key: ruleId, value: (notificationId, lastDeliveredAtMs)
     */
    private val deliveredRules = HashMap<String, Pair<Int, Long>>()
    private val nextNotificationId = AtomicInteger(1000)

    /**
     * 投递通知。
     *
     * @param decisionJson ReminderDecision JSON（来自 WhereRuntime）
     * @return DeliveryReceipt JSON 字符串
     */
    fun deliver(decisionJson: String): String {
        val decision = try {
            JSONObject(decisionJson)
        } catch (e: Exception) {
            return failureReceipt("", "", "Invalid decision JSON: ${e.message}")
        }

        val ruleId = decision.optString("ruleId", "")
        val candidateId = decision.optString("candidateId", "")
        val packageName = decision.optString("packageName", "")
        val title = decision.optString("title", "GOTO 提醒")
        val body = decision.optString("body", "")

        // 检查通知权限
        if (!permissionGateway.hasNotificationPostPermission()) {
            // 降级：返回降级 receipt，不投递系统通知
            return degradedReceipt(ruleId, candidateId, packageName, "通知权限未授予")
        }

        // 确保渠道存在
        ensureChannel()

        // 检查去重和冷却
        val now = System.currentTimeMillis()
        val lastDelivered = deliveredRules[ruleId]
        if (lastDelivered != null) {
            val (lastId, lastTime) = lastDelivered
            if (now - lastTime < config_cooldownMs) {
                return cooldownReceipt(ruleId, candidateId, "ruleId 在冷却期内")
            }
        }

        // 生成稳定的 notificationId
        val notificationId = stableNotificationId(ruleId)

        // 构建 Intent：点击打开目标应用
        val contentIntent = buildOpenAppIntent(packageName, ruleId, candidateId)
        val deleteIntent = buildIgnoreIntent(ruleId, candidateId)

        // 构建操作 Action
        val snoozeAction = buildSnoozeAction(ruleId, candidateId)
        val disableAction = buildDisableAction(ruleId, candidateId)

        // 构建通知
        val builder = NotificationCompat.Builder(context, config.channelId)
            .setSmallIcon(config.notificationSmallIcon)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .setDeleteIntent(deleteIntent)

        if (snoozeAction != null) builder.addAction(snoozeAction)
        if (disableAction != null) builder.addAction(disableAction)

        try {
            NotificationManagerCompat.from(context).notify(notificationId, builder.build())
        } catch (e: SecurityException) {
            return degradedReceipt(ruleId, candidateId, packageName, "通知权限被拒绝")
        } catch (e: Exception) {
            return failureReceipt(ruleId, candidateId, "通知投递失败: ${e.message}")
        }

        // 记录已投递
        deliveredRules[ruleId] = Pair(notificationId, now)

        return successReceipt(notificationId, ruleId, candidateId, packageName, title, body)
    }

    /**
     * 取消通知。
     */
    fun cancel(reminderId: String): Boolean {
        return try {
            val ruleId = reminderId
            val entry = deliveredRules[ruleId]
            if (entry != null) {
                NotificationManagerCompat.from(context).cancel(entry.first)
                deliveredRules.remove(ruleId)
            }
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * 更新通知（重新投递）。
     */
    fun update(reminderId: String, decisionJson: String): String {
        cancel(reminderId)
        return deliver(decisionJson)
    }

    /**
     * 创建通知渠道（Android 8.0+ 必需）。
     */
    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                config.channelId,
                config.channelName,
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = config.channelDescription
                enableVibration(true)
                enableLights(false)
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }

    /**
     * 构建"打开目标应用"的 PendingIntent。
     */
    private fun buildOpenAppIntent(packageName: String, ruleId: String, candidateId: String): PendingIntent {
        val intent = if (packageName.isNotBlank() && isAppInstalled(packageName)) {
            context.packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra(EXTRA_RULE_ID, ruleId)
                putExtra(EXTRA_CANDIDATE_ID, candidateId)
                putExtra(EXTRA_ACTION, ACTION_OPENED)
            }
        } else {
            // 找不到应用 → 打开 GOTO 内部提醒卡片
            Intent().apply {
                setClassName(context, "com.appindex.UIUX.SearchActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra(EXTRA_RULE_ID, ruleId)
                putExtra(EXTRA_CANDIDATE_ID, candidateId)
                putExtra(EXTRA_ACTION, ACTION_OPENED)
                putExtra(EXTRA_PACKAGE_NAME, packageName)
            }
        }

        return PendingIntent.getActivity(
            context,
            (ruleId + candidateId + "open").hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * 构建"忽略"（用户划掉通知）的 PendingIntent。
     */
    private fun buildIgnoreIntent(ruleId: String, candidateId: String): PendingIntent {
        val intent = Intent(context, WhereFeedbackReceiver::class.java).apply {
            action = ACTION_IGNORED
            putExtra(EXTRA_RULE_ID, ruleId)
            putExtra(EXTRA_CANDIDATE_ID, candidateId)
        }
        return PendingIntent.getBroadcast(
            context,
            (ruleId + candidateId + "ignore").hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * 构建"稍后提醒"操作。
     */
    private fun buildSnoozeAction(ruleId: String, candidateId: String): NotificationCompat.Action? {
        val intent = Intent(context, WhereFeedbackReceiver::class.java).apply {
            action = ACTION_SNOOZED
            putExtra(EXTRA_RULE_ID, ruleId)
            putExtra(EXTRA_CANDIDATE_ID, candidateId)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            (ruleId + candidateId + "snooze").hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Action.Builder(
            android.R.drawable.ic_media_rew,
            "稍后提醒",
            pendingIntent
        ).build()
    }

    /**
     * 构建"关闭此类提醒"操作。
     */
    private fun buildDisableAction(ruleId: String, candidateId: String): NotificationCompat.Action? {
        val intent = Intent(context, WhereFeedbackReceiver::class.java).apply {
            action = ACTION_DISABLED_RULE
            putExtra(EXTRA_RULE_ID, ruleId)
            putExtra(EXTRA_CANDIDATE_ID, candidateId)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            (ruleId + candidateId + "disable").hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_close_clear_cancel,
            "关闭此类提醒",
            pendingIntent
        ).build()
    }

    /**
     * 判断应用是否已安装。
     */
    private fun isAppInstalled(packageName: String): Boolean {
        return try {
            context.packageManager.getPackageInfo(packageName, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    /**
     * 生成稳定的 notificationId（基于 ruleId hash）。
     */
    private fun stableNotificationId(ruleId: String): Int {
        if (ruleId.isBlank()) return nextNotificationId.incrementAndGet()
        return ruleId.hashCode().let { if (it < 0) -it else it }
    }

    // ====== Receipt 构造 ======

    private fun successReceipt(
        notificationId: Int, ruleId: String, candidateId: String,
        packageName: String, title: String, body: String
    ): String {
        return JSONObject().apply {
            put("receiptId", "rcp-$notificationId-${System.currentTimeMillis()}")
            put("status", "delivered")
            put("notificationId", notificationId)
            put("ruleId", ruleId)
            put("candidateId", candidateId)
            put("packageName", packageName)
            put("title", title)
            put("body", body)
            put("deliveredAt", System.currentTimeMillis())
        }.toString()
    }

    private fun degradedReceipt(ruleId: String, candidateId: String, packageName: String, reason: String): String {
        return JSONObject().apply {
            put("receiptId", "rcp-degraded-${System.currentTimeMillis()}")
            put("status", "degraded")
            put("ruleId", ruleId)
            put("candidateId", candidateId)
            put("packageName", packageName)
            put("reason", reason)
            put("deliveredAt", System.currentTimeMillis())
        }.toString()
    }

    private fun cooldownReceipt(ruleId: String, candidateId: String, reason: String): String {
        return JSONObject().apply {
            put("receiptId", "rcp-cooldown-${System.currentTimeMillis()}")
            put("status", "cooldown")
            put("ruleId", ruleId)
            put("candidateId", candidateId)
            put("reason", reason)
            put("deliveredAt", System.currentTimeMillis())
        }.toString()
    }

    private fun failureReceipt(ruleId: String, candidateId: String, reason: String): String {
        return JSONObject().apply {
            put("receiptId", "rcp-fail-${System.currentTimeMillis()}")
            put("status", "failed")
            put("ruleId", ruleId)
            put("candidateId", candidateId)
            put("reason", reason)
            put("deliveredAt", System.currentTimeMillis())
        }.toString()
    }

    companion object {
        // 默认冷却时间（30 分钟）
        private const val config_cooldownMs = 30L * 60 * 1000

        // Intent extras
        const val EXTRA_RULE_ID = "goto_where_rule_id"
        const val EXTRA_CANDIDATE_ID = "goto_where_candidate_id"
        const val EXTRA_ACTION = "goto_where_action"
        const val EXTRA_PACKAGE_NAME = "goto_where_package_name"

        // 反馈动作
        const val ACTION_OPENED = "opened"
        const val ACTION_IGNORED = "ignored"
        const val ACTION_SNOOZED = "snoozed"
        const val ACTION_DISABLED_RULE = "disabled_rule"
    }
}
