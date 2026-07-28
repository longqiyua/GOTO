package com.appindex.where

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * WhereFeedbackReceiver — 接收通知操作反馈的 BroadcastReceiver
 *
 * 处理来自通知的操作：
 *   - ACTION_IGNORED（用户划掉通知）
 *   - ACTION_SNOOZED（稍后提醒）
 *   - ACTION_DISABLED_RULE（关闭此类提醒）
 *
 * opened 反馈由 SearchActivity 在打开目标应用时触发（通过 EXTRA_ACTION）。
 *
 * 收到反馈后，通过 WhereService 转发到 WhereRuntime.processFeedback()。
 */
class WhereFeedbackReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val receivedAction = intent.action ?: return
        val ruleId = intent.getStringExtra(NotificationDeliveryAdapter.EXTRA_RULE_ID) ?: return
        val candidateId = intent.getStringExtra(NotificationDeliveryAdapter.EXTRA_CANDIDATE_ID) ?: ""

        val feedbackAction = when (receivedAction) {
            NotificationDeliveryAdapter.ACTION_IGNORED -> NotificationDeliveryAdapter.ACTION_IGNORED
            NotificationDeliveryAdapter.ACTION_SNOOZED -> NotificationDeliveryAdapter.ACTION_SNOOZED
            NotificationDeliveryAdapter.ACTION_DISABLED_RULE -> NotificationDeliveryAdapter.ACTION_DISABLED_RULE
            else -> return
        }

        // 通过 WhereService 处理反馈（异步，不阻塞广播）
        try {
            val serviceIntent = Intent(context, WhereService::class.java).apply {
                action = WhereService.ACTION_PROCESS_FEEDBACK
                putExtra(WhereService.EXTRA_FEEDBACK_RULE_ID, ruleId)
                putExtra(WhereService.EXTRA_FEEDBACK_CANDIDATE_ID, candidateId)
                putExtra(WhereService.EXTRA_FEEDBACK_ACTION, feedbackAction)
            }
            context.startService(serviceIntent)
        } catch (e: Exception) {
            // 静默失败，不影响系统
        }
    }
}
