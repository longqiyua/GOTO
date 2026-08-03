package com.appindex.webapp

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.appindex.EngineInitializer
import com.appindex.EngineComponentInjector
import com.appindex.R
import org.json.JSONArray
import org.json.JSONObject
import kotlinx.coroutines.runBlocking
import java.io.ByteArrayOutputStream

/**
 * GOTO 主前端入口 — 加载 GOTO Page（WebView 模式）
 *
 * 将 GOTO Page 的纯前端页面（assets/goto_page/index.html）作为应用主 UI。
 * 前端页面已自带 `html.embedded` 嵌入模式：隐藏右侧文档区，手机预览满屏。
 *
 * ## 加载流程
 * 1. WebView 加载 `file:///android_asset/goto_page/index.html`
 * 2. `onPageFinished` 注入 `document.documentElement.classList.add('embedded')` 激活嵌入模式
 * 3. 通过 `GOTOAndroidBridge` 注入已安装应用列表（Engine 扫描结果）
 *
 * ## 原生桥接
 * - [GOTOAndroidBridge] 暴露给前端 JS：`window.GOTOAndroidBridge.setInstalledApps(json)`
 * - 前端已预留此接口（index.html 第 15321 行），原生只需调用
 *
 * ## 离线策略
 * - 所有前端资源打包在 assets/goto_page/ 内，无需网络
 * - Service Worker 在 file:// 协议下自动跳过（前端已处理）
 * - 外部 CDN 字体（Google Fonts）在离线时由 CSS fallback 字体兜底
 */
class GotoWebActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var rootView: FrameLayout
    private lateinit var statusPanel: LinearLayout
    private lateinit var statusTitle: TextView
    private lateinit var statusDetail: TextView
    private lateinit var retryButton: TextView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Page 运行在 Android WebView 时，由 Activity 负责启动 Engine 注入与本地应用扫描。
        // 不改动 Engine 内部实现，只补齐宿主层初始化入口。
        EngineInitializer.initialize(applicationContext)

        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        )

        // 全屏沉浸式
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            )
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.navigationBarColor = Color.TRANSPARENT
            window.isNavigationBarContrastEnforced = false
        }

        rootView = FrameLayout(this).apply {
            setBackgroundColor(0xFFF2F2F0.toInt())
        }

        // GOTO owns the complete edge-to-edge surface. If the system applies
        // gesture/navigation insets to the child hierarchy, WebView becomes
        // narrower than the physical display and leaves a false right gutter.
        // Consume the insets at the host boundary; the embedded Page handles
        // its own safe-area spacing in CSS.
        ViewCompat.setOnApplyWindowInsetsListener(rootView) { view, _ ->
            view.setPadding(0, 0, 0, 0)
            WindowInsetsCompat.CONSUMED
        }
        ViewCompat.requestApplyInsets(rootView)

        webView = WebView(this).apply {
            setBackgroundColor(0xFFF2F2F0.toInt())
            contentDescription = getString(R.string.goto_web_content_desc)
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
                cacheMode = WebSettings.LOAD_NO_CACHE
                mediaPlaybackRequiresUserGesture = false
                // Page 已提供 viewport=device-width。关闭桌面页的 overview/wide viewport，
                // 避免 WebView 在嵌入模式下按内容宽度保留一条不可见的右侧布局带。
                loadWithOverviewMode = false
                useWideViewPort = false
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                // 混合内容（file:// 加载本地资源）
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            }

            // JS 桥接：暴露原生能力给前端
            addJavascriptInterface(
                GOTOAndroidBridge(this@GotoWebActivity),
                "GOTOAndroidBridgeNative"
            )

            webViewClient = GotoWebViewClient()
            webChromeClient = WebChromeClient()

            // Page 的 embedded 模式自己管理内部滚动；关闭 WebView 根滚动条，
            // 避免 Android 预留滚动条宽度造成左右边距不一致和手势抢占。
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            scrollBarStyle = View.SCROLLBARS_INSIDE_OVERLAY
            overScrollMode = View.OVER_SCROLL_NEVER

            // 加载本地前端页面
            loadUrl("file:///android_asset/goto_page/index.html")
        }

        rootView.addView(
            webView,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        rootView.addView(createStatusPanel())
        setContentView(rootView)
    }

    /**
     * WebViewClient — 拦截外部链接在系统浏览器打开，页面加载完成后注入 embedded 类。
     */
    private inner class GotoWebViewClient : WebViewClient() {
        override fun onPageFinished(view: WebView?, url: String?) {
            super.onPageFinished(view, url)
            // 激活嵌入模式：隐藏右侧文档区，手机预览满屏
            view?.evaluateJavascript(
                "document.documentElement.classList.add('embedded');",
                null
            )
            showPageReady()
            // 注入已安装应用列表（Engine 扫描结果 → 前端 GOTOAndroidBridge）
            injectInstalledApps()
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            super.onReceivedError(view, request, error)
            if (request?.isForMainFrame == true) {
                showPageError()
            }
        }

        override fun onRenderProcessGone(
            view: WebView?,
            detail: android.webkit.RenderProcessGoneDetail?
        ): Boolean {
            showPageError()
            return true
        }

        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
            val url = request?.url ?: return false
            // file:// 协议正常加载
            if ("file" == url.scheme) return false
            // http/https 外部链接在系统浏览器打开
            if ("http" == url.scheme || "https" == url.scheme) {
                startActivity(Intent(Intent.ACTION_VIEW, url))
                return true
            }
            return false
        }
    }

    private fun createStatusPanel(): View {
        statusPanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 32)
            setBackgroundColor(0xFFF2F2F0.toInt())
            isClickable = true
            isFocusable = true
        }

        val progress = ProgressBar(this).apply {
            isIndeterminate = true
        }
        statusPanel.addView(
            progress,
            LinearLayout.LayoutParams(32, 32).apply {
                bottomMargin = 20
            }
        )

        statusTitle = TextView(this).apply {
            setText(R.string.goto_loading_title)
            setTextColor(Color.rgb(24, 24, 24))
            textSize = 20f
            gravity = Gravity.CENTER
        }
        statusPanel.addView(statusTitle)

        statusDetail = TextView(this).apply {
            setText(R.string.goto_loading_subtitle)
            setTextColor(Color.rgb(112, 112, 108))
            textSize = 13f
            gravity = Gravity.CENTER
            setPadding(0, 10, 0, 0)
        }
        statusPanel.addView(statusDetail)

        retryButton = TextView(this).apply {
            setText(R.string.goto_retry)
            setTextColor(Color.WHITE)
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(28, 12, 28, 12)
            background = GradientDrawable().apply {
                setColor(Color.rgb(193, 113, 92))
                cornerRadius = 16f
            }
            visibility = View.GONE
            setOnClickListener {
                showLoading()
                webView.reload()
            }
        }
        statusPanel.addView(
            retryButton,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 22
            }
        )

        return statusPanel.apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
    }

    private fun showLoading() {
        statusPanel.visibility = View.VISIBLE
        statusPanel.alpha = 1f
        statusTitle.setText(R.string.goto_loading_title)
        statusDetail.setText(R.string.goto_loading_subtitle)
        retryButton.visibility = View.GONE
    }

    private fun showPageReady() {
        statusPanel.animate()
            .alpha(0f)
            .setDuration(180L)
            .withEndAction { statusPanel.visibility = View.GONE }
            .start()
    }

    private fun showPageError() {
        statusPanel.visibility = View.VISIBLE
        statusPanel.alpha = 1f
        statusTitle.setText(R.string.goto_load_error)
        statusDetail.setText(R.string.goto_load_error_detail)
        retryButton.visibility = View.VISIBLE
    }

    /**
     * 注入已安装应用列表到前端。
     * 前端 index.html 已预留 `window.GOTOAndroidBridge.setInstalledApps(json)` 接口。
     *
     * 从 EngineComponentInjector.appIndexEngine.indexedApps 读取应用列表，
     * 将每个应用的图标 Drawable 转换为 base64 data URI，通过 evaluateJavascript 注入前端。
     * 如果 Engine 尚未完成索引（应用列表为空），会延迟重试。
     */
    private fun injectInstalledApps() {
        injectAppsRetry(0)
    }

    private fun injectAppsRetry(attempt: Int) {
        if (attempt > 8) return
        if (!EngineComponentInjector.isInitialized()) {
            webView.postDelayed({ injectAppsRetry(attempt + 1) }, 800)
            return
        }
        if (attempt == 0) {
            Thread {
                try {
                    runBlocking { EngineComponentInjector.appIndexEngine.indexAllApps() }
                } finally {
                    webView.post { injectAppsRetry(1) }
                }
            }.start()
            return
        }
        val apps = try {
            EngineComponentInjector.appIndexEngine.indexedApps
        } catch (_: Throwable) {
            emptyList()
        }
        if (apps.isEmpty()) {
            webView.postDelayed({ injectAppsRetry(attempt + 1) }, 800)
            return
        }
        // 图标转换在后台线程执行，避免阻塞 UI
        Thread {
            try {
                val jsonArray = JSONArray()
                for (app in apps) {
                    val json = JSONObject()
                    json.put("name", app.label)
                    json.put("packageName", app.packageName)
                    json.put("py", app.pinyin)
                    json.put("abbr", app.pinyinInitials)
                    json.put("isSystemApp", app.isSystemApp)
                    app.icon?.let { drawable ->
                        val dataUri = drawableToDataUri(drawable, 96)
                        if (dataUri.isNotEmpty()) {
                            json.put("iconURI", dataUri)
                        }
                    }
                    jsonArray.put(json)
                }
                val jsonStr = jsonArray.toString()
                webView.post {
                    try {
                        webView.evaluateJavascript(
                            "if(window.GOTOAndroidBridge&&window.GOTOAndroidBridge.setInstalledApps){" +
                                "window.GOTOAndroidBridge.setInstalledApps($jsonStr);" +
                                "}else{console.warn('[GOTO] GOTOAndroidBridge not ready');}",
                            null
                        )
                    } catch (_: Throwable) { }
                }
            } catch (_: Throwable) {
                // 注入失败不影响页面加载
            }
        }.start()
    }

    /**
     * 将 Drawable 转换为 base64 data URI 字符串，供前端 <img src> 使用。
     * 使用 PNG 格式保证透明度。
     */
    private fun drawableToDataUri(drawable: Drawable, sizePx: Int): String {
        return try {
            val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, sizePx, sizePx)
            drawable.draw(canvas)
            val baos = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos)
            bitmap.recycle()
            val base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
            "data:image/png;base64,$base64"
        } catch (_: Throwable) {
            ""
        }
    }

    /**
     * 返回键由 WebView 历史栈处理（前端路由后退）。
     */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        webView.apply {
            stopLoading()
            removeJavascriptInterface("GOTOAndroidBridgeNative")
            destroy()
        }
        super.onDestroy()
    }
}
