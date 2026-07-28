package com.appindex.where

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

/**
 * WhereEvaluateWorker — 周期性/延迟 Where 评估 Worker
 *
 * 触发 WhereService 执行一次 WhereRuntime.evaluate()。
 * 不复制 Where Core 算法，只触发 Service 调用 JS Bridge。
 */
class WhereEvaluateWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        return try {
            val intent = android.content.Intent(applicationContext, WhereService::class.java).apply {
                action = WhereService.ACTION_EVALUATE
                putExtra(WhereService.EXTRA_SCHEDULE_ID, inputData.getString(KEY_SCHEDULE_ID) ?: "")
                putExtra(WhereService.EXTRA_PAYLOAD, inputData.getString(KEY_PAYLOAD) ?: "{}")
            }
            applicationContext.startService(intent)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val KEY_SCHEDULE_ID = "schedule_id"
        const val KEY_PAYLOAD = "payload"
    }
}

/**
 * WhereCleanupWorker — 候选过期清理和原始事件清理 Worker
 */
class WhereCleanupWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        return try {
            val intent = android.content.Intent(applicationContext, WhereService::class.java).apply {
                action = WhereService.ACTION_CLEANUP
            }
            applicationContext.startService(intent)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
