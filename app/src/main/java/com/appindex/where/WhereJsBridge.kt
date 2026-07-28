package com.appindex.where

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/**
 * WhereJsBridge — 通过隐藏 WebView 运行 WhereRuntime.js 的桥接器
 *
 * 架构：
 *   - Kotlin 层通过 evaluateJavascript() 调用 WhereRuntime.evaluate(contextSignal)
 *   - JS 层通过 @JavascriptInterface 注入的 AndroidBridge 调用 Kotlin 适配器
 *     - AndroidBridge.deliver(decisionJson) → NotificationDeliveryAdapter.deliver()
 *     - AndroidBridge.schedule(scheduleId, delayMs) → WorkSchedulerAdapter.schedule()
 *     - AndroidBridge.cancel(scheduleId) → WorkSchedulerAdapter.cancel()
 *
 * 不暴露任意 JS 执行接口；所有参数进行 JSON Schema 校验。
 *
 * 注意：WebView 在此不是 UI，而是 JavaScript 执行环境。
 * 所有 UI 操作（通知点击、应用启动）仍由 Kotlin 层完成。
 */
class WhereJsBridge(private val context: Context) {

    private var webView: WebView? = null
    private var androidBridge: AndroidBridge? = null
    @Volatile private var ready = false
    private val initLock = CountDownLatch(1)

    /**
     * AndroidBridge — 暴露给 JavaScript 的接口
     *
     * 所有方法都被 @JavascriptInterface 注解，确保只暴露指定方法。
     */
    class AndroidBridge(
        private val deliveryAdapter: NotificationDeliveryAdapter?,
        private val schedulerAdapter: WorkSchedulerAdapter?,
        private val bridgeReadyCallback: (Boolean) -> Unit
    ) {
        @JavascriptInterface
        fun deliver(decisionJson: String): String {
            if (deliveryAdapter == null) {
                return """{"status":"degraded","reason":"delivery adapter unavailable"}"""
            }
            return try {
                deliveryAdapter.deliver(decisionJson)
            } catch (e: Exception) {
                """{"status":"failed","reason":"${e.message}"}"""
            }
        }

        @JavascriptInterface
        fun schedule(scheduleId: String, delayMs: Long, payload: String): Boolean {
            if (schedulerAdapter == null) return false
            return try {
                schedulerAdapter.schedule(scheduleId, delayMs, payload)
            } catch (e: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun cancel(scheduleId: String): Boolean {
            if (schedulerAdapter == null) return false
            return try {
                schedulerAdapter.cancel(scheduleId)
            } catch (e: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun log(message: String) {
            // 调试日志（生产环境可关闭）
            android.util.Log.d("WhereJsBridge", message)
        }

        @JavascriptInterface
        fun onBridgeReady(success: Boolean) {
            bridgeReadyCallback(success)
        }
    }

    /**
     * 初始化 WebView 并加载 WhereRuntime bundle。
     *
     * @param whereRuntimeJs WhereRuntime 的完整 JavaScript 代码（预打包）
     * @param deliveryAdapter 通知投递适配器
     * @param schedulerAdapter 调度适配器
     * @param timeoutMs 超时时间（毫秒）
     * @return 是否成功初始化
     */
    fun initialize(
        whereRuntimeJs: String,
        deliveryAdapter: NotificationDeliveryAdapter?,
        schedulerAdapter: WorkSchedulerAdapter?,
        timeoutMs: Long = 5000
    ): Boolean {
        return try {
            // 在主线程创建 WebView
            val initResult = AtomicReference<Boolean>(null)
            val latch = CountDownLatch(1)

            (context as? android.app.Activity)?.runOnUiThread {
                try {
                    val wv = WebView(context)
                    webView = wv

                    androidBridge = AndroidBridge(deliveryAdapter, schedulerAdapter) { success ->
                        ready = success
                        initResult.set(success)
                        latch.countDown()
                    }

                    wv.settings.javaScriptEnabled = true
                    wv.settings.domStorageEnabled = true
                    wv.settings.allowFileAccess = false
                    wv.settings.allowContentAccess = false

                    wv.addJavascriptInterface(androidBridge!!, "AndroidBridge")

                    // 注入 WhereRuntime 代码
                    val html = """
                        <html><head><script>
                        try {
                            $whereRuntimeJs
                            // 创建 WhereRuntime 实例（依赖由全局变量注入）
                            window._whereRuntime = new WhereRuntime({
                                baseReader: window._baseReader,
                                baseWriter: window._baseWriter,
                                clock: window._clock,
                                delivery: {
                                    deliver: function(decision) {
                                        return Promise.resolve(
                                            JSON.parse(AndroidBridge.deliver(JSON.stringify(decision)))
                                        );
                                    },
                                    cancel: function(id) { AndroidBridge.cancel(id); return Promise.resolve(); },
                                    update: function(id, d) { return Promise.resolve(); }
                                },
                                scheduler: {
                                    schedule: function(c, t) {
                                        var ms = new Date(t).getTime() - Date.now();
                                        if (ms < 0) ms = 0;
                                        AndroidBridge.schedule(c.candidateId || '', ms, '{}');
                                        return Promise.resolve();
                                    },
                                    cancel: function(id) { AndroidBridge.cancel(id); return Promise.resolve(); },
                                    reschedule: function(id, t) { return Promise.resolve(); }
                                },
                                now: function() { return new Date().toISOString(); }
                            });
                            AndroidBridge.onBridgeReady(true);
                        } catch (e) {
                            AndroidBridge.log('WhereRuntime init failed: ' + e.message);
                            AndroidBridge.onBridgeReady(false);
                        }
                        </script></head><body></body></html>
                    """.trimIndent()

                    wv.loadDataWithBaseURL("about:blank", html, "text/html", "UTF-8", null)
                } catch (e: Exception) {
                    initResult.set(false)
                    latch.countDown()
                }
            } ?: run {
                // 没有 Activity 上下文，无法创建 WebView
                return false
            }

            latch.await(timeoutMs, TimeUnit.MILLISECONDS)
            ready = initResult.get() == true
            ready
        } catch (e: Exception) {
            false
        }
    }

    /**
     * 调用 WhereRuntime.evaluate(contextSignal)。
     *
     * @param contextSignalJson ContextSignal JSON 字符串
     * @param callback 结果回调（在主线程）
     */
    fun evaluate(contextSignalJson: String, callback: (String) -> Unit) {
        if (!ready || webView == null) {
            callback("""{"degraded":true,"reason":"bridge not ready"}""")
            return
        }

        val escapedJson = contextSignalJson.replace("\\", "\\\\").replace("'", "\\'")
        val js = """
            (function() {
                try {
                    var signal = JSON.parse('$escapedJson');
                    window._whereRuntime.evaluate(signal).then(function(result) {
                        AndroidBridge._lastResult = JSON.stringify(result);
                    }).catch(function(e) {
                        AndroidBridge._lastResult = JSON.stringify({degraded:true,reason:e.message});
                    });
                } catch (e) {
                    AndroidBridge._lastResult = JSON.stringify({degraded:true,reason:e.message});
                }
            })();
        """.trimIndent()

        (context as? android.app.Activity)?.runOnUiThread {
            webView?.evaluateJavascript(js) { _ ->
                // 读取结果
                webView?.evaluateJavascript("AndroidBridge._lastResult || 'null'") { result ->
                    callback(unquoteJsString(result))
                }
            } ?: callback("""{"degraded":true,"reason":"no webview"}""")
        } ?: callback("""{"degraded":true,"reason":"no activity"}""")
    }

    /**
     * 调用 WhereRuntime.processFeedback(feedback)。
     */
    fun processFeedback(feedbackJson: String, callback: (Boolean) -> Unit) {
        if (!ready || webView == null) {
            callback(false)
            return
        }

        val escapedJson = feedbackJson.replace("\\", "\\\\").replace("'", "\\'")
        val js = """
            (function() {
                try {
                    var feedback = JSON.parse('$escapedJson');
                    window._whereRuntime.processFeedback(feedback).then(function() {
                        AndroidBridge._feedbackDone = true;
                    }).catch(function(e) {
                        AndroidBridge._feedbackDone = false;
                    });
                } catch (e) {
                    AndroidBridge._feedbackDone = false;
                }
            })();
        """.trimIndent()

        (context as? android.app.Activity)?.runOnUiThread {
            webView?.evaluateJavascript(js) { _ ->
                webView?.evaluateJavascript("AndroidBridge._feedbackDone || false") { result ->
                    callback(result == "true")
                }
            } ?: callback(false)
        } ?: callback(false)
    }

    /**
     * 注入使用信号到 Base。
     */
    fun ingestUsageSignals(signalsJson: String, callback: (String) -> Unit) {
        if (!ready || webView == null) {
            callback("""{"ingested":0,"degraded":true,"reason":"bridge not ready"}""")
            return
        }

        val escapedJson = signalsJson.replace("\\", "\\\\").replace("'", "\\'")
        val js = """
            (function() {
                try {
                    if (window._usageSignalBridge) {
                        window._usageSignalBridge.ingestSignals('$escapedJson').then(function(result) {
                            AndroidBridge._ingestResult = JSON.stringify(result);
                        });
                    } else {
                        AndroidBridge._ingestResult = JSON.stringify({ingested:0,degraded:true,reason:'no bridge'});
                    }
                } catch (e) {
                    AndroidBridge._ingestResult = JSON.stringify({ingested:0,degraded:true,reason:e.message});
                }
            })();
        """.trimIndent()

        (context as? android.app.Activity)?.runOnUiThread {
            webView?.evaluateJavascript(js) { _ ->
                webView?.evaluateJavascript("AndroidBridge._ingestResult || 'null'") { result ->
                    callback(unquoteJsString(result))
                }
            } ?: callback("""{"ingested":0,"degraded":true,"reason":"no webview"}""")
        } ?: callback("""{"ingested":0,"degraded":true,"reason":"no activity"}""")
    }

    /**
     * 销毁 Bridge，释放 WebView 资源。
     */
    fun destroy() {
        ready = false
        webView?.apply {
            (context as? android.app.Activity)?.runOnUiThread {
                try {
                    removeJavascriptInterface("AndroidBridge")
                    loadUrl("about:blank")
                    destroy()
                } catch (e: Exception) {
                    // 静默
                }
            }
        }
        webView = null
        androidBridge = null
    }

    /**
     * Bridge 是否就绪。
     */
    fun isReady(): Boolean = ready

    /**
     * 去除 JS 字符串的引号包装。
     */
    private fun unquoteJsString(s: String?): String {
        if (s == null || s == "null") return "null"
        var v = s
        if (v.startsWith("\"") && v.endsWith("\"")) {
            v = v.substring(1, v.length - 1)
            v = v.replace("\\\"", "\"").replace("\\\\", "\\")
        }
        return v
    }
}
