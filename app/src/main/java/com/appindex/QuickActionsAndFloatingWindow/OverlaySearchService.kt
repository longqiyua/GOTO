package com.appindex.QuickActionsAndFloatingWindow

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.appindex.R
import com.appindex.BasicSearch.AppIndexEngine
import com.appindex.model.AppInfo
import com.appindex.model.SearchResult
import com.appindex.model.SearchMode
import com.appindex.BasicSearch.AppSearchEngine
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.cancelChildren

/**
 * 桌面悬浮条 + 毛玻璃叠加搜索 Service
 *
 * 免费功能：
 * - 桌面常驻条形悬浮球（默认开启）
 * - 可拖拽、自动吸附左右边缘
 * - 带关闭按钮，用户可随时关闭
 * - 点击展开毛玻璃搜索框
 */
class OverlaySearchService : Service() {

    private lateinit var windowManager: WindowManager
    private var floatingBar: View? = null
    private var overlayPanel: View? = null
    private var isPanelVisible = false

    private val indexEngine by lazy { AppIndexEngine(this) }
    private val searchEngine by lazy { AppSearchEngine() }
    private var allApps: List<AppInfo> = emptyList()

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var searchJob: Job? = null

    // --- 悬浮条参数 ---
    private lateinit var barParams: WindowManager.LayoutParams
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false
    private var isOnLeftSide = false

    // --- 搜索历史 ---
    private val HISTORY_PREFS = "overlay_search_history"
    private val MAX_HISTORY = 5

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        serviceScope.launch {
            allApps = withContext(Dispatchers.Default) { indexEngine.indexAllApps() }
            // 读取会员状态，设置搜索模式
            val prefs = getSharedPreferences("appindex_license", MODE_PRIVATE)
            val isMember = prefs.getBoolean("is_member", false)
            if (isMember) {
                searchEngine.searchMode = SearchMode.FUZZY_ENGINE
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Android 8+ 前台服务必须显示通知
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForeground(NOTIFICATION_ID, createNotification())
        }
        if (floatingBar == null) {
            showFloatingBar()
        }
        return START_STICKY
    }

    /**
     * 创建前台服务通知（Android 8+ 必需）
     */
    private fun createNotification(): Notification {
        val channelId = "overlay_search_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "桌面悬浮条",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "保持桌面搜索悬浮条常驻"
                setShowBadge(false)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }

        // 点击通知打开主应用
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, com.appindex.webapp.GotoWebActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("AppIndex 悬浮条运行中")
            .setContentText("点击打开应用搜索")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    companion object {
        private const val NOTIFICATION_ID = 1001
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        floatingBar?.let { windowManager.removeView(it) }
        overlayPanel?.let { windowManager.removeView(it) }
    }

    // ================================================================
    //  条形悬浮条
    // ================================================================

    @SuppressLint("ClickableViewAccessibility")
    private fun showFloatingBar() {
        val density = resources.displayMetrics.density
        val barWidth = (48 * density).toInt()
        val barHeight = (140 * density).toInt()

        val params = WindowManager.LayoutParams(
            barWidth,
            barHeight,
            getWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.CENTER_VERTICAL or Gravity.END
        params.x = 0
        params.y = 0
        barParams = params

        // 主容器
        val container = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(barWidth, barHeight)
        }

        // 条形背景
        val barBg = View(this).apply {
            id = R.id.floatingBarBg
            setBackgroundResource(R.drawable.floating_bar_bg)
            layoutParams = FrameLayout.LayoutParams(barWidth, barHeight)
        }

        // 竖排文字 "搜"
        val barText = TextView(this).apply {
            text = "搜"
            textSize = 18f
            setTextColor(android.graphics.Color.WHITE)
            gravity = Gravity.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            layoutParams = FrameLayout.LayoutParams(barWidth, (80 * density).toInt()).apply {
                topMargin = (20 * density).toInt()
            }
        }

        // 关闭按钮（小圆点）
        val closeBtn = View(this).apply {
            setBackgroundResource(R.drawable.floating_bar_close_bg)
            layoutParams = FrameLayout.LayoutParams((20 * density).toInt(), (20 * density).toInt()).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
                bottomMargin = (12 * density).toInt()
            }
            setOnClickListener {
                // 关闭悬浮条
                stopSelf()
                // 保存关闭状态
                getSharedPreferences("overlay_prefs", MODE_PRIVATE)
                    .edit().putBoolean("floating_bar_enabled", false).apply()
                Toast.makeText(this@OverlaySearchService, "悬浮条已关闭，可在设置中重新开启", Toast.LENGTH_SHORT).show()
            }
        }

        container.addView(barBg)
        container.addView(barText)
        container.addView(closeBtn)

        // 点击展开搜索面板
        container.setOnClickListener {
            if (!isDragging) {
                toggleOverlayPanel()
            }
        }
        container.setOnTouchListener(barTouchListener)

        floatingBar = container
        windowManager.addView(container, params)
    }

    private val barTouchListener = object : View.OnTouchListener {
        @SuppressLint("ClickableViewAccessibility")
        override fun onTouch(v: View, event: MotionEvent): Boolean {
            val density = resources.displayMetrics.density
            val barWidth = (48 * density).toInt()
            val screenWidth = resources.displayMetrics.widthPixels
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = barParams.x
                    initialY = barParams.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - initialTouchX
                    val dy = event.rawY - initialTouchY
                    if (kotlin.math.abs(dx) > 10 || kotlin.math.abs(dy) > 10) {
                        isDragging = true
                        // X: 约束在左右边缘附近（允许从一侧拖到另一侧）
                        var newX = initialX - dx.toInt()
                        // 限制X范围：左侧边缘到右侧边缘
                        val minX = 0
                        val maxX = screenWidth - barWidth
                        newX = newX.coerceIn(minX, maxX)
                        barParams.x = newX
                        // Y: 自由移动，限制在屏幕内
                        var newY = initialY + dy.toInt()
                        val screenHeight = resources.displayMetrics.heightPixels
                        val barHeight = (140 * density).toInt()
                        newY = newY.coerceIn(-screenHeight / 2 + barHeight / 2, screenHeight / 2 - barHeight / 2)
                        barParams.y = newY
                        val bar = floatingBar
                        if (bar != null) {
                            windowManager.updateViewLayout(bar, barParams)
                        }
                    }
                    return true
                }
                MotionEvent.ACTION_UP -> {
                    if (isDragging) snapToEdge()
                    return true
                }
            }
            return false
        }
    }

    /**
     * 吸附到屏幕左右边缘，垂直居中，带动画
     */
    private fun snapToEdge() {
        val screenWidth = resources.displayMetrics.widthPixels
        val density = resources.displayMetrics.density
        val barWidth = (48 * density).toInt()
        val currentX = barParams.x

        // 判断应该吸附到哪一侧
        val targetX: Int
        val targetLeft: Boolean
        if (currentX > screenWidth / 2 - barWidth / 2) {
            // 吸附到右侧
            targetX = screenWidth - barWidth
            targetLeft = false
        } else {
            // 吸附到左侧
            targetX = 0
            targetLeft = true
        }

        // Y轴居中
        val targetY = 0

        // 如果侧边改变了，更新背景
        if (targetLeft != isOnLeftSide) {
            isOnLeftSide = targetLeft
            val barBg = floatingBar?.findViewById<View>(R.id.floatingBarBg)
            barBg?.setBackgroundResource(
                if (targetLeft) R.drawable.floating_bar_bg_left else R.drawable.floating_bar_bg
            )
        }

        // 动画吸附
        val animatorX = ValueAnimator.ofInt(currentX, targetX)
        val animatorY = ValueAnimator.ofInt(barParams.y, targetY)
        animatorX.duration = 250
        animatorY.duration = 250
        animatorX.interpolator = android.view.animation.DecelerateInterpolator()
        animatorY.interpolator = android.view.animation.DecelerateInterpolator()
        animatorX.addUpdateListener {
            barParams.x = it.animatedValue as Int
            if (floatingBar != null) {
                windowManager.updateViewLayout(floatingBar, barParams)
            }
        }
        animatorY.addUpdateListener {
            barParams.y = it.animatedValue as Int
            if (floatingBar != null) {
                windowManager.updateViewLayout(floatingBar, barParams)
            }
        }
        animatorX.start()
        animatorY.start()
    }

    // ================================================================
    //  叠加搜索面板
    // ================================================================

    private fun toggleOverlayPanel() {
        if (isPanelVisible) {
            hideOverlayPanel()
        } else {
            showOverlayPanel()
        }
    }

    private fun showOverlayPanel() {
        if (overlayPanel != null) {
            overlayPanel?.visibility = View.VISIBLE
            isPanelVisible = true
            val searchInput = overlayPanel?.findViewById<EditText>(R.id.overlaySearchInput)
            searchInput?.postDelayed({
                searchInput?.requestFocus()
                val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
                imm.showSoftInput(searchInput, InputMethodManager.SHOW_IMPLICIT)
            }, 200)
            return
        }

        val overlayView = buildOverlayPanel()
        overlayPanel = overlayView

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            getWindowType(),
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        )

        windowManager.addView(overlayView, params)
        isPanelVisible = true

        val searchInput = overlayView.findViewById<EditText>(R.id.overlaySearchInput)
        searchInput.postDelayed({
            searchInput.requestFocus()
            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
            imm.showSoftInput(searchInput, InputMethodManager.SHOW_IMPLICIT)
        }, 200)
    }

    private fun hideOverlayPanel() {
        val searchInput = overlayPanel?.findViewById<EditText>(R.id.overlaySearchInput)
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(searchInput?.windowToken, 0)
        overlayPanel?.visibility = View.GONE
        isPanelVisible = false
    }

    private fun buildOverlayPanel(): View {
        val inflater = LayoutInflater.from(this)
        val view = inflater.inflate(R.layout.overlay_search_panel, null)

        val searchInput = view.findViewById<EditText>(R.id.overlaySearchInput)
        val closeBtn = view.findViewById<ImageView>(R.id.overlayCloseBtn)
        val recyclerView = view.findViewById<RecyclerView>(R.id.overlayRecyclerView)
        val emptyHint = view.findViewById<TextView>(R.id.overlayEmptyHint)
        val hintView = view.findViewById<TextView>(R.id.overlayHint)
        val dimBg = view.findViewById<View>(R.id.overlayDimBg)

        dimBg.setOnClickListener { hideOverlayPanel() }
        closeBtn.setOnClickListener { hideOverlayPanel() }

        val clearBtn = ImageView(this).apply {
            setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
            setColorFilter(getColor(R.color.text_tertiary))
            val btnSize = (24 * resources.displayMetrics.density).toInt()
            layoutParams = LinearLayout.LayoutParams(btnSize, btnSize).apply {
                marginEnd = (8 * resources.displayMetrics.density).toInt()
            }
            visibility = View.GONE
            contentDescription = "清除"
            setOnClickListener {
                searchInput.text.clear()
                searchInput.requestFocus()
                visibility = View.GONE
            }
        }
        val searchInputParent = searchInput.parent as? LinearLayout
        if (searchInputParent != null) {
            val closeBtnIndex = searchInputParent.indexOfChild(closeBtn)
            if (closeBtnIndex >= 0) {
                searchInputParent.addView(clearBtn, closeBtnIndex)
            }
        }

        searchInput.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val query = s?.toString() ?: ""
                searchJob?.cancel()
                clearBtn.visibility = if (query.isNotEmpty()) View.VISIBLE else View.GONE
                if (query.isBlank()) {
                    recyclerView.visibility = View.GONE
                    emptyHint.visibility = View.GONE
                    hintView.visibility = View.VISIBLE
                    showSearchHistory(hintView) { historyQuery ->
                        searchInput.setText(historyQuery)
                        searchInput.setSelection(historyQuery.length)
                    }
                    return
                }
                hintView.visibility = View.GONE
                searchJob = serviceScope.launch {
                    delay(100)
                    performOverlaySearch(query, recyclerView, emptyHint)
                }
            }
            override fun afterTextChanged(s: android.text.Editable?) {}
        })

        val adapter = OverlayResultAdapter { packageName, itemView ->
            itemView.animate()
                .scaleX(0.8f)
                .scaleY(0.8f)
                .alpha(0f)
                .setDuration(200)
                .setListener(object : AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: Animator) {
                        launchAppFromOverlay(packageName)
                    }
                })
                .start()
        }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        showSearchHistory(hintView) { historyQuery ->
            searchInput.setText(historyQuery)
            searchInput.setSelection(historyQuery.length)
        }

        return view
    }

    private fun saveSearchHistory(query: String) {
        if (query.isBlank()) return
        val prefs = getSharedPreferences(HISTORY_PREFS, MODE_PRIVATE)
        val saved = prefs.getString("history_items", "") ?: ""
        val history = if (saved.isNotBlank()) saved.split("|||").toMutableList() else mutableListOf()
        history.remove(query)
        history.add(0, query)
        while (history.size > MAX_HISTORY) history.removeAt(history.size - 1)
        prefs.edit().putString("history_items", history.joinToString("|||")).apply()
    }

    private fun getSearchHistory(): List<String> {
        val prefs = getSharedPreferences(HISTORY_PREFS, MODE_PRIVATE)
        val saved = prefs.getString("history_items", "") ?: ""
        return if (saved.isNotBlank()) saved.split("|||") else emptyList()
    }

    private fun showSearchHistory(hintView: TextView, onHistoryClick: (String) -> Unit) {
        val history = getSearchHistory()
        if (history.isEmpty()) {
            hintView.text = "输入应用名称搜索"
            hintView.setOnClickListener(null)
            return
        }
        hintView.text = "搜索历史：${history.joinToString("  |  ")}"
        hintView.setOnClickListener {
            try {
                val items = history.toTypedArray()
                android.app.AlertDialog.Builder(this, android.R.style.Theme_Material_Light_Dialog_Alert)
                    .setTitle("搜索历史")
                    .setItems(items) { _, which ->
                        onHistoryClick(items[which])
                    }
                    .show()
            } catch (_: Exception) {
                // Service 中弹出 Dialog 在某些系统版本可能失败，静默忽略
            }
        }
    }

    private suspend fun performOverlaySearch(
        query: String,
        recyclerView: RecyclerView,
        emptyHint: TextView
    ) {
        saveSearchHistory(query)
        val results = withContext(Dispatchers.Default) {
            searchEngine.search(query, allApps)
        }
        val adapter = recyclerView.adapter as OverlayResultAdapter
        if (results.isEmpty()) {
            recyclerView.visibility = View.GONE
            emptyHint.visibility = View.VISIBLE
        } else {
            recyclerView.visibility = View.VISIBLE
            emptyHint.visibility = View.GONE
        }
        adapter.submitList(results)
    }

    private fun launchAppFromOverlay(packageName: String) {
        try {
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                startActivity(intent)
                hideOverlayPanel()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "无法启动应用", Toast.LENGTH_SHORT).show()
        }
    }

    @Suppress("DEPRECATION")
    private fun getWindowType(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            WindowManager.LayoutParams.TYPE_PHONE
        }
    }
}
