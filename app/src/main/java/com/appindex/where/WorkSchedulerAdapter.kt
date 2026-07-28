package com.appindex.where

import android.content.Context
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * WorkSchedulerAdapter — Android WorkManager 适配器
 *
 * 实现 goto-where/ports/scheduler-port.js 的 SchedulerPort。
 *
 * 职责：
 *   1. 延迟重新检查 Where 评估
 *   2. 周期性模式评估
 *   3. 候选过期清理
 *   4. Base 原始使用事件清理
 *
 * 要求：
 *   - 使用 unique work 防止重复任务
 *   - 支持取消和重新调度
 *   - 不保证精确到分钟
 *   - 不使用 AlarmManager
 *   - 不使用后台常驻 Service
 *   - 系统限制任务时允许延迟，不频繁唤醒设备
 *   - 用户关闭 Where 后取消相关任务
 */
class WorkSchedulerAdapter(private val context: Context) {

    /**
     * 调度延迟的一次性 Where 评估。
     *
     * @param scheduleId 调度 ID（用于取消）
     * @param delayMs 延迟时间（毫秒）
     * @param payload 传递给 Worker 的数据（JSON 字符串）
     */
    fun schedule(scheduleId: String, delayMs: Long, payload: String = "{}"): Boolean {
        return try {
            val data = Data.Builder()
                .putString(WhereEvaluateWorker.KEY_SCHEDULE_ID, scheduleId)
                .putString(WhereEvaluateWorker.KEY_PAYLOAD, payload)
                .build()

            val request = OneTimeWorkRequestBuilder<WhereEvaluateWorker>()
                .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
                .setInputData(data)
                .setConstraints(buildDefaultConstraints())
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                uniqueName(scheduleId),
                ExistingWorkPolicy.REPLACE,
                request
            )
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * 调度周期性 Where 评估。
     *
     * @param intervalMinutes 间隔（分钟），最短 15 分钟
     * @return 是否成功入队
     */
    fun schedulePeriodicEvaluation(intervalMinutes: Long = 30): Boolean {
        return try {
            val request = PeriodicWorkRequestBuilder<WhereEvaluateWorker>(
                intervalMinutes.coerceAtLeast(15), TimeUnit.MINUTES
            )
                .setConstraints(buildDefaultConstraints())
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_EVALUATION_WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
            )
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * 调度候选过期清理任务。
     */
    fun scheduleCandidateCleanup(): Boolean {
        return try {
            val request = OneTimeWorkRequestBuilder<WhereCleanupWorker>()
                .setInitialDelay(5, TimeUnit.MINUTES)
                .setConstraints(buildDefaultConstraints())
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                CANDIDATE_CLEANUP_WORK_NAME,
                ExistingWorkPolicy.KEEP,
                request
            )
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * 调度 Base 原始使用事件清理任务。
     */
    fun scheduleUsageEventCleanup(): Boolean {
        return try {
            val request = PeriodicWorkRequestBuilder<WhereCleanupWorker>(
                6, TimeUnit.HOURS
            )
                .setConstraints(buildDefaultConstraints())
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                USAGE_EVENT_CLEANUP_WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
            )
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * 取消单个调度任务。
     */
    fun cancel(scheduleId: String): Boolean {
        return try {
            WorkManager.getInstance(context).cancelUniqueWork(uniqueName(scheduleId))
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * 重新调度任务（取消旧的并调度新的）。
     */
    fun reschedule(scheduleId: String, delayMs: Long, payload: String = "{}"): Boolean {
        return schedule(scheduleId, delayMs, payload)
    }

    /**
     * 取消所有 Where 相关的 WorkManager 任务。
     * 在用户关闭 Where 时调用。
     */
    fun cancelAllWhereWork(): Boolean {
        return try {
            WorkManager.getInstance(context).cancelUniqueWork(PERIODIC_EVALUATION_WORK_NAME)
            WorkManager.getInstance(context).cancelUniqueWork(CANDIDATE_CLEANUP_WORK_NAME)
            WorkManager.getInstance(context).cancelUniqueWork(USAGE_EVENT_CLEANUP_WORK_NAME)
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * 构建默认 WorkManager 约束：
     *   - 不要求网络
     *   - 不要求充电
     *   - 不要求空闲
     *   - 系统默认电池优化下运行
     */
    private fun buildDefaultConstraints(): Constraints {
        return Constraints.Builder()
            .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
            .setRequiresCharging(false)
            .setRequiresDeviceIdle(false)
            .setRequiresBatteryNotLow(true)
            .build()
    }

    private fun uniqueName(scheduleId: String): String {
        return "goto_where_$scheduleId"
    }

    companion object {
        private const val PERIODIC_EVALUATION_WORK_NAME = "goto_where_periodic_evaluation"
        private const val CANDIDATE_CLEANUP_WORK_NAME = "goto_where_candidate_cleanup"
        private const val USAGE_EVENT_CLEANUP_WORK_NAME = "goto_where_usage_event_cleanup"
    }
}
