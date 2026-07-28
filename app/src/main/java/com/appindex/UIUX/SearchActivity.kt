package com.appindex.UIUX

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.GridLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import com.appindex.databinding.ActivitySearchBinding
import com.appindex.QuickActionsAndFloatingWindow.GestureManager
import com.appindex.model.SearchMode
import com.appindex.QuickActionsAndFloatingWindow.ShortcutManager
import com.appindex.Utility.FontHelper
import kotlinx.coroutines.launch

/**
 * 主搜索 Activity
 *
 * 设计：搜索框置顶 + 键盘自动弹出 → 输入后下方出结果
 * 右侧圆形详情按钮：点击进入设置页，长按弹出模式切换
 *
 * 新增功能：
 * - 手势操作（会员）：上滑/下滑/左滑/右滑/双击打开应用
 * - 快速启动框：底部显示快捷绑定入口（普通4槽/会员12槽）
 */
class SearchActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySearchBinding
    private val viewModel: SearchViewModel by viewModels()
    private lateinit var adapter: AppListAdapter

    // 手势管理器（会员功能）
    private lateinit var gestureManager: GestureManager
    private lateinit var gestureDetector: GestureDetector
    private lateinit var slowGestureTracker: GestureManager.SlowGestureTracker

    // 快速启动框
    private lateinit var quickLaunchGrid: GridLayout

    // 预测栏槽位视图缓存
    private val predictionSlotViews = mutableListOf<android.widget.LinearLayout>()
    private val predictionIconViews = mutableListOf<android.widget.ImageView>()
    private val predictionLabelViews = mutableListOf<android.widget.TextView>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySearchBinding.inflate(layoutInflater)
        setContentView(binding.root)

        gestureManager = GestureManager(this)
        setupGestureDetector()
        setupRecyclerView()
        setupSearchInput()
        setupDetailButton()
        setupPredictionBar()
        setupHotAppsBar()
        setupQuickLaunchGrid()
        observeViewModel()

        // 打开页面后自动弹出键盘
        binding.searchInput.postDelayed({ showKeyboard() }, 300)

        // 首次启动默认开启悬浮条（免费功能）
        checkAndStartFloatingBar()
    }

    /**
     * 设置手势检测器（会员功能）
     */
    private fun setupGestureDetector() {
        val gestureListener = object : GestureManager.GestureListener {
            override fun onGestureDetected(
                gesture: GestureManager.GestureType,
                packageName: String,
                appLabel: String
            ) {
                launchApp(packageName)
                Toast.makeText(this@SearchActivity, "手势打开: $appLabel", Toast.LENGTH_SHORT).show()
            }
        }
        gestureDetector = gestureManager.createGestureDetector(this, gestureListener)
        slowGestureTracker = gestureManager.createSlowGestureTracker(gestureListener)
        // 注意：手势检测通过 dispatchTouchEvent 分发，不使用 root.setOnTouchListener
        // setOnTouchListener 会干扰子 View（如 btnDetail）的点击事件
    }

    /**
     * 重写 dispatchTouchEvent 进行手势检测
     * 不使用 root.setOnTouchListener，避免干扰子 View 的点击事件分发
     */
    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        gestureDetector.onTouchEvent(ev)
        // 慢速拖拽手势检测：长按+慢速拖动匹配自定义手势
        slowGestureTracker.processTouchEvent(binding.root, ev)
        return super.dispatchTouchEvent(ev)
    }

    /**
     * 设置智能预测栏（软稳定机制：3时段+2全天）
     */
    private fun setupPredictionBar() {
        // 缓存预测栏槽位视图
        predictionSlotViews.apply {
            add(binding.slot1)
            add(binding.slot2)
            add(binding.slot3)
            add(binding.slot4)
            add(binding.slot5)
        }
        predictionIconViews.apply {
            add(binding.slot1Icon)
            add(binding.slot2Icon)
            add(binding.slot3Icon)
            add(binding.slot4Icon)
            add(binding.slot5Icon)
        }
        predictionLabelViews.apply {
            add(binding.slot1Label)
            add(binding.slot2Label)
            add(binding.slot3Label)
            add(binding.slot4Label)
            add(binding.slot5Label)
        }

        // 设置点击监听
        for (i in 0 until 5) {
            predictionSlotViews[i].setOnClickListener {
                val predictions = viewModel.predictions.value
                if (i < predictions.size) {
                    val prediction = predictions[i]
                    launchApp(prediction.packageName)
                    viewModel.recordPredictionClick(prediction.packageName)
                }
            }
        }
    }

    /**
     * 刷新预测栏显示
     */
    private fun refreshPredictionBar() {
        val predictions = viewModel.predictions.value
        if (predictions.isEmpty()) {
            binding.predictionBar.isVisible = false
            return
        }

        binding.predictionBar.isVisible = true
        binding.timeSlotLabel.text = viewModel.getCurrentTimeSlotLabel()

        for (i in 0 until 5) {
            if (i < predictions.size) {
                val prediction = predictions[i]
                predictionSlotViews[i].isVisible = true
                predictionLabelViews[i].text = prediction.label.take(4)

                // 加载图标
                try {
                    val icon = packageManager.getApplicationIcon(prediction.packageName)
                    predictionIconViews[i].setImageDrawable(icon)
                } catch (_: Exception) {
                    predictionIconViews[i].setImageResource(android.R.drawable.sym_def_app_icon)
                }

                // 全天高频（软稳定）显示特殊标记
                if (prediction.slotType == com.appindex.prediction.SmartPredictionEngine.SlotType.ALL_DAY) {
                    predictionSlotViews[i].alpha = 1.0f
                } else {
                    predictionSlotViews[i].alpha = 0.9f
                }
            } else {
                predictionSlotViews[i].isVisible = false
            }
        }
    }

    /**
     * 设置高频应用统计栏（搜索框下方索引栏）
     */
    private fun setupHotAppsBar() {
        // 时效切换按钮
        binding.hotAppsDurationBtn.setOnClickListener {
            viewModel.toggleHotAppsDuration()
        }
    }

    /**
     * 刷新高频应用栏显示
     */
    private fun refreshHotAppsBar() {
        val hotApps = viewModel.hotApps.value
        val configured = viewModel.hotAppsConfigured.value

        if (!configured) {
            // 第一次进入，显示提示
            binding.hotAppsBar.isVisible = true
            binding.hotAppsDurationBtn.text = "点击设置"
            binding.hotAppsContainer.removeAllViews()
            
            val hintView = TextView(this).apply {
                text = "点击设置统计时效（1小时/2小时）"
                textSize = 12f
                setTextColor(ContextCompat.getColor(this@SearchActivity, com.appindex.R.color.text_tertiary))
                setPadding(8, 8, 8, 8)
            }
            binding.hotAppsContainer.addView(hintView)
            return
        }

        if (hotApps.isEmpty()) {
            binding.hotAppsBar.isVisible = false
            return
        }

        binding.hotAppsBar.isVisible = true
        binding.hotAppsDurationBtn.text = viewModel.hotAppsDuration.value.toString() + "小时"
        binding.hotAppsContainer.removeAllViews()

        val density = resources.displayMetrics.density
        val iconSize = (36 * density).toInt()
        val padding = (8 * density).toInt()

        for (app in hotApps) {
            val slot = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
                setPadding(padding, 4, padding, 4)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }

            val iconView = ImageView(this).apply {
                layoutParams = LinearLayout.LayoutParams(iconSize, iconSize)
                try {
                    val icon = packageManager.getApplicationIcon(app.packageName)
                    setImageDrawable(icon)
                } catch (_: Exception) {
                    setImageResource(android.R.drawable.sym_def_app_icon)
                }
                // 圆角图标
                background = ContextCompat.getDrawable(this@SearchActivity, com.appindex.R.drawable.rounded_icon_bg)
                clipToOutline = true
            }

            val nameView = TextView(this).apply {
                text = app.label.take(4)
                textSize = 10f
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
                gravity = android.view.Gravity.CENTER
                setTextColor(ContextCompat.getColor(this@SearchActivity, com.appindex.R.color.text_primary))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (2 * density).toInt()
                }
            }

            slot.addView(iconView)
            slot.addView(nameView)

            slot.setOnClickListener {
                launchApp(app.packageName)
            }

            binding.hotAppsContainer.addView(slot)
        }
    }

    /**
     * 设置快速启动框（底部快捷绑定入口）
     * 普通用户：1行4槽位
     * 会员：3行12槽位
     * 
     * 与预测栏、文件夹共存，排版协调
     */
    private fun setupQuickLaunchGrid() {
        quickLaunchGrid = GridLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                // 与预测栏保持一致的边距
                setMargins(16, 8, 16, 16)
            }
            columnCount = 4
        }

        // 添加到布局底部
        (binding.root as? LinearLayout)?.addView(quickLaunchGrid)

        refreshQuickLaunchGrid()
    }

    /**
     * 刷新快速启动框
     */
    private fun refreshQuickLaunchGrid() {
        quickLaunchGrid.removeAllViews()

        val maxSlots = 12
        val rowCount = 3

        quickLaunchGrid.rowCount = rowCount

        val bindings = viewModel.shortcutBindings.value.take(maxSlots)
        val density = resources.displayMetrics.density

        bindings.forEach { binding ->
            val slot = createQuickLaunchSlot(binding, density)
            quickLaunchGrid.addView(slot)
        }

        val emptySlots = maxSlots - bindings.size
        repeat(emptySlots) {
            val emptySlot = createEmptySlot(density)
            quickLaunchGrid.addView(emptySlot)
        }

        quickLaunchGrid.isVisible = true
    }

    /**
     * 创建快捷启动槽位
     */
    private fun createQuickLaunchSlot(
        binding: ShortcutManager.ShortcutBinding,
        density: Float
    ): LinearLayout {
        val slotSize = (64 * density).toInt()
        val iconSize = (40 * density).toInt()

        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            layoutParams = GridLayout.LayoutParams().apply {
                width = slotSize
                height = slotSize
            }
            setPadding(4, 4, 4, 4)

            // 应用图标
            val iconView = ImageView(context).apply {
                layoutParams = LinearLayout.LayoutParams(iconSize, iconSize)
                try {
                    val icon = packageManager.getApplicationIcon(binding.packageName)
                    setImageDrawable(icon)
                } catch (_: Exception) {
                    setImageResource(android.R.drawable.sym_def_app_icon)
                }
                background = ContextCompat.getDrawable(context, android.R.drawable.dialog_holo_light_frame)
            }

            // 应用名称
            val nameView = TextView(context).apply {
                text = binding.appLabel.take(4)
                textSize = 10f
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
                gravity = android.view.Gravity.CENTER
                setTextColor(ContextCompat.getColor(context, com.appindex.R.color.text_primary))
            }

            addView(iconView)
            addView(nameView)

            setOnClickListener {
                launchApp(binding.packageName)
            }

            setOnLongClickListener {
                // 长按删除
                AlertDialog.Builder(context)
                    .setTitle("删除快捷绑定")
                    .setMessage("删除 ${binding.appLabel} 的快捷绑定？")
                    .setPositiveButton("删除") { _, _ ->
                        viewModel.removeShortcutBinding(binding.keyword)
                        refreshQuickLaunchGrid()
                    }
                    .setNegativeButton("取消", null)
                    .show()
                true
            }
        }
    }

    /**
     * 创建空槽位（+号）
     */
    private fun createEmptySlot(density: Float): LinearLayout {
        val slotSize = (64 * density).toInt()

        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            layoutParams = GridLayout.LayoutParams().apply {
                width = slotSize
                height = slotSize
            }
            setPadding(4, 4, 4, 4)

            val plusView = TextView(context).apply {
                text = "+"
                textSize = 24f
                gravity = android.view.Gravity.CENTER
                setTextColor(ContextCompat.getColor(context, com.appindex.R.color.text_tertiary))
            }

            addView(plusView)

            setOnClickListener {
                // 跳转到设置页添加快捷绑定
                startActivity(Intent(context, SettingsActivity::class.java))
            }
        }
    }

    /**
     * 检查并启动桌面悬浮条
     * 默认开启，用户可在设置中关闭
     */
    private fun checkAndStartFloatingBar() {
        val prefs = getSharedPreferences("overlay_prefs", MODE_PRIVATE)
        val enabled = prefs.getBoolean("floating_bar_enabled", true)
        if (enabled && android.provider.Settings.canDrawOverlays(this)) {
            try {
                val intent = Intent(this, com.appindex.QuickActionsAndFloatingWindow.OverlaySearchService::class.java)
                startForegroundService(intent)
            } catch (_: Exception) {
                // Android 12+ 后台启动前台服务可能被限制，静默忽略
            }
        }
    }

    private fun setupRecyclerView() {
        adapter = AppListAdapter { result ->
            launchApp(result.appInfo.packageName)
        }
        binding.recyclerView.apply {
            layoutManager = LinearLayoutManager(this@SearchActivity)
            adapter = this@SearchActivity.adapter
            // 列表项动画配置
            itemAnimator = androidx.recyclerview.widget.DefaultItemAnimator().apply {
                supportsChangeAnimations = false
                addDuration = 150
                moveDuration = 150
                changeDuration = 0
            }
        }
    }

    private fun setupSearchInput() {
        binding.searchInput.apply {
            setOnEditorActionListener { _, actionId, _ ->
                if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                    viewModel.onQueryChanged(text.toString())
                    hideKeyboard()
                    true
                } else false
            }
            addTextChangedListener(object : android.text.TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                    // 检测退格键：字符减少或替换为更少字符
                    val isBackspace = count < before || (count == 0 && before > 0)
                    viewModel.onQueryChanged(s?.toString() ?: "", isBackspace)
                }
                override fun afterTextChanged(s: android.text.Editable?) {}
            })
        }
    }

    /**
     * 设置圆形详情按钮
     * - 搜索框有内容时显示 "✕" 清除按钮
     * - 搜索框为空时显示 "☰" 进入设置页
     * - 长按 → 弹出模式切换对话框
     */
    private fun setupDetailButton() {
        // 点击：有内容时清除搜索框，无内容时进入设置页
        binding.btnDetail.setOnClickListener {
            // 如果搜索框有内容，先清除
            if (binding.searchInput.text.isNotBlank()) {
                binding.searchInput.text.clear()
                viewModel.onQueryChanged("")
                binding.btnDetail.text = "☰"
            } else {
                startActivity(Intent(this, SettingsActivity::class.java))
            }
        }

        binding.btnTestWelcome.setOnClickListener {
            getSharedPreferences("appindex_settings", MODE_PRIVATE)
                .edit()
                .putBoolean("welcome_completed", false)
                .apply()
            val intent = Intent(this, WelcomeActivity::class.java)
            intent.putExtra("force_show", true)
            startActivity(intent)
            finish()
        }
        // 长按弹出模式切换
        binding.btnDetail.setOnLongClickListener {
            showModeSwitchDialog()
            true
        }
    }

    /**
     * 弹出搜索模式切换对话框
     */
    private fun showModeSwitchDialog() {
        val currentMode = viewModel.searchMode.value
        val options = if (currentMode == SearchMode.STANDARD) {
            arrayOf("标准模式（当前）", "⚡ 模糊匹配引擎 / Fuzzy Match Engine")
        } else {
            arrayOf("标准模式", "⚡ 模糊匹配引擎（当前）")
        }
        AlertDialog.Builder(this)
            .setTitle("搜索模式 / Search Mode")
            .setItems(options) { _, which ->
                if (which == 1) {
                    viewModel.toggleSearchMode()
                } else if (currentMode == SearchMode.FUZZY_ENGINE) {
                    viewModel.toggleSearchMode()
                }
            }
            .show()
    }

    private fun observeViewModel() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {

                // 搜索结果
                launch {
                    viewModel.results.collect { results ->
                        adapter.setCurrentQuery(viewModel.query.value)
                        adapter.submitList(results)
                        binding.emptyView.isVisible = results.isEmpty() && viewModel.query.value.isNotBlank()
                        binding.recyclerView.isVisible = results.isNotEmpty()

                        // 有搜索结果时隐藏预测栏、高频栏和快速启动框，无结果时显示
                        val isBlank = viewModel.query.value.isBlank()
                        binding.predictionBar.isVisible = isBlank && viewModel.predictions.value.isNotEmpty()
                        binding.hotAppsBar.isVisible = isBlank
                        quickLaunchGrid.isVisible = isBlank
                    }
                }

                // 智能预测栏
                launch {
                    viewModel.predictions.collect { predictions ->
                        refreshPredictionBar()
                        // 预测栏只在搜索框为空时显示
                        binding.predictionBar.isVisible = predictions.isNotEmpty() && viewModel.query.value.isBlank()
                    }
                }

                // 高频应用栏
                launch {
                    viewModel.hotApps.collect { hotApps ->
                        refreshHotAppsBar()
                        // 高频栏只在搜索框为空时显示
                        binding.hotAppsBar.isVisible = viewModel.query.value.isBlank()
                    }
                }

                // 高频栏配置状态
                launch {
                    viewModel.hotAppsConfigured.collect { configured ->
                        if (!configured) {
                            // 第一次进入，显示提示
                            refreshHotAppsBar()
                        }
                    }
                }

                // 索引状态
                launch {
                    viewModel.isIndexing.collect { indexing ->
                        binding.loadingView.isVisible = indexing
                        binding.searchInput.isEnabled = !indexing
                    }
                }

                // 搜索耗时 + 编排参数一体化显示
                launch {
                    viewModel.searchTime.collect { time ->
                        if (time > 0 && viewModel.query.value.isNotBlank()) {
                            val modeText = if (viewModel.searchMode.value == SearchMode.FUZZY_ENGINE) "⚡模糊匹配引擎" else "标准"
                            val params = viewModel.searchParams.value
                            val paramText = params?.formatDisplay() ?: ""
                            binding.searchTime.text = "${time}ms · ${modeText} · ${paramText}"
                            binding.searchTime.isVisible = true
                        } else {
                            binding.searchTime.isVisible = false
                        }
                    }
                }

                // 搜索编排参数 — 实时更新显示
                launch {
                    viewModel.searchParams.collect { params ->
                        if (viewModel.query.value.isNotBlank() && binding.searchTime.isVisible) {
                            val time = viewModel.searchTime.value
                            val modeText = if (viewModel.searchMode.value == SearchMode.FUZZY_ENGINE) "⚡模糊匹配引擎" else "标准"
                            val paramText = params?.formatDisplay() ?: ""
                            binding.searchTime.text = "${time}ms · ${modeText} · ${paramText}"
                        }
                    }
                }

                // 所有应用
                launch {
                    viewModel.allApps.collect { apps ->
                        if (apps.isNotEmpty()) {
                            binding.hintText.text = "已索引 ${apps.size} 个应用，输入名称或拼音搜索"
                            binding.hintText.isVisible = viewModel.query.value.isBlank()
                        }
                    }
                }

                // 搜索历史
                launch {
                    viewModel.searchHistory.collect { history ->
                        if (history.isNotEmpty() && viewModel.query.value.isBlank()) {
                            binding.hintText.text = buildHistoryText(history)
                            binding.hintText.isVisible = true
                        } else if (viewModel.query.value.isBlank()) {
                            binding.hintText.text = "已索引 ${viewModel.getAppCount()} 个应用，输入名称或拼音搜索"
                            binding.hintText.isVisible = viewModel.allApps.value.isNotEmpty()
                        }
                    }
                }

                launch {
                    viewModel.memberProfile.collect { profile ->
                        binding.memberBadgeBar.isVisible = true
                        binding.memberBadgeBrand.text = "SuperGOTO "
                        binding.memberBadgeId.text = profile.memberId
                        binding.memberDeviceHint.text = "${profile.daysUsed}天"
                        FontHelper.applyBrandFont(this@SearchActivity, binding.memberBadgeBrand)
                        FontHelper.applyMemberIdFont(this@SearchActivity, binding.memberBadgeId)
                        refreshQuickLaunchGrid()
                    }
                }

                // 快捷绑定变化时刷新快速启动框
                launch {
                    viewModel.shortcutBindings.collect {
                        refreshQuickLaunchGrid()
                    }
                }

                // 授权校验提示（仅显示重要状态，不频繁打扰）
                launch {
                    viewModel.licenseCheckMessage.collect { msg ->
                        // 只显示设备冲突等重要提示，不显示普通校验信息
                        if (msg.contains("其他设备") || msg.contains("冲突")) {
                            binding.licenseCheckBar.text = msg
                            binding.licenseCheckBar.isVisible = true
                        } else {
                            binding.licenseCheckBar.isVisible = false
                        }
                    }
                }

                // 破解检测提示：仅机器码不匹配时显示（极不显眼）
                launch {
                    viewModel.isPiratedUser.collect { isPirated ->
                        binding.pirateHint.isVisible = isPirated
                    }
                }

                // 搜索框内容变化时更新按钮图标
                launch {
                    viewModel.query.collect { query ->
                        binding.btnDetail.text = if (query.isNotBlank()) "✕" else "☰"
                    }
                }

                // 快捷绑定启动
                launch {
                    viewModel.shortcutLaunch
                        .collect { shortcut ->
                            if (shortcut != null) {
                                launchApp(shortcut.packageName)
                                binding.searchInput.text.clear()
                                viewModel.onQueryChanged("")
                                // 消费后重置，防止 Activity 重建时重复触发
                                viewModel.consumeShortcutLaunch()
                            }
                        }
                }
            }
        }
    }

    override fun onStop() {
        super.onStop()
        viewModel.onSessionEnd()
    }

    override fun onResume() {
        super.onResume()
        // 返回页面时刷新快速启动框（可能添加了新的快捷绑定）
        refreshQuickLaunchGrid()
    }

    /**
     * 显示软键盘
     */
    private fun showKeyboard() {
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        binding.searchInput.requestFocus()
        imm.showSoftInput(binding.searchInput, InputMethodManager.SHOW_IMPLICIT)
    }

    /**
     * 隐藏软键盘
     */
    private fun hideKeyboard() {
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(binding.searchInput.windowToken, 0)
    }

    /**
     * 构建搜索历史显示文本
     */
    private fun buildHistoryText(history: List<String>): String {
        return "最近搜索: ${history.joinToString(" · ")}"
    }

    private fun launchApp(packageName: String) {
        try {
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                val appInfo = packageManager.getApplicationInfo(packageName, 0)
                val label = packageManager.getApplicationLabel(appInfo).toString()
                playLaunchTransition(label) {
                    startActivity(intent)
                    // 记录应用启动（用于云端 App_Launches 统计）
                    viewModel.recordApplicationLaunch(packageName, label)
                }
            } else {
                startActivity(Intent(
                    android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$packageName")
                ))
            }
        } catch (e: Exception) {
            Toast.makeText(this, "无法启动应用", Toast.LENGTH_SHORT).show()
        }
    }

    private fun playLaunchTransition(appLabel: String, onLaunched: () -> Unit) {
        val decor = window.decorView as? ViewGroup ?: run {
            onLaunched()
            return
        }

        val overlay = androidx.appcompat.widget.AppCompatTextView(this).apply {
            text = appLabel
            textSize = 18f
            setTextColor(android.graphics.Color.WHITE)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(48, 48, 48, 48)
            alpha = 0f
            scaleX = 0.92f
            scaleY = 0.92f
            background = android.graphics.drawable.GradientDrawable().apply {
                cornerRadius = 36f
                setColor(android.graphics.Color.parseColor("#D96A2B"))
                setStroke(1, android.graphics.Color.parseColor("#55FFFFFF"))
            }
            elevation = 24f
        }

        val container = android.widget.FrameLayout(this).apply {
            setBackgroundColor(android.graphics.Color.parseColor("#D9000000"))
            alpha = 0f
            addView(overlay, android.widget.FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.CENTER
            })
        }

        decor.addView(container, ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))

        container.animate()
            .alpha(1f)
            .setDuration(120)
            .start()

        overlay.animate()
            .alpha(1f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(180)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .withEndAction {
                onLaunched()
                container.animate()
                    .alpha(0f)
                    .setDuration(120)
                    .withEndAction { decor.removeView(container) }
                    .start()
            }
            .start()
    }
}
