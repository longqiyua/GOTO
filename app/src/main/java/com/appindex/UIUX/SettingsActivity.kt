package com.appindex.UIUX

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.appindex.R
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.appindex.databinding.ActivitySettingsBinding
import com.appindex.model.SearchMode
import com.appindex.Personalization.KeyboardLayout
import com.appindex.Personalization.PersonalizationManager
import com.appindex.QuickActionsAndFloatingWindow.ShortcutManager
import com.appindex.Utility.FontHelper
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

/**
 * 设置页面
 */
class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private val viewModel: SearchViewModel by viewModels<SearchViewModel>()

    // 自适应刷新参数卡片视图（通过 include 引入，需手动绑定）
    private var paramTAvg: TextView? = null
    private var paramSigma: TextView? = null
    private var paramPMax: TextView? = null
    private var paramErrorRate: TextView? = null
    private var paramT1: TextView? = null
    private var paramT2: TextView? = null
    private var paramAdaptive: TextView? = null
    private var paramSample: TextView? = null
    private var paramBackspace: TextView? = null
    private var paramSpeedDisplay: TextView? = null
    private var adaptiveParamsHint: TextView? = null
    private var btnRetestSpeed: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupViews()
        observeViewModel()
        setupSwipeNavigation()
    }

    private fun setupSwipeNavigation() {
        val scrollView = binding.root.getChildAt(0) // ScrollView
        if (scrollView == null) return
        var startX = 0f
        scrollView.setOnTouchListener { _, event ->
            when (event.action) {
                android.view.MotionEvent.ACTION_DOWN -> { startX = event.x }
                android.view.MotionEvent.ACTION_UP -> {
                    val dx = event.x - startX
                    if (dx < -120f) {
                        // 左滑 → 统计页面
                        startActivity(Intent(this, RankingActivity::class.java))
                        overridePendingTransition(android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                    }
                }
            }
            false
        }
    }

    private fun setupViews() {
        // 返回
        binding.btnBack.setOnClickListener { finish() }

        // 会员名牌：仅展示，不可点击

        // 深色模式切换（使用 SwitchCompat）
        binding.darkModeToggle.setOnClickListener {
            viewModel.toggleDarkMode()
        }

        // 悬浮条开关（免费功能）
        binding.overlayToggle.setOnClickListener {
            toggleOverlayService()
        }

        // 生成强调色圆点
        buildAccentColorGrid()

        // 生成背景颜色圆点
        buildBgColorGrid()

        // 搜索卡片透明度
        setupCardOpacitySlider()

        // 自定义壁纸
        binding.wallpaperToggle.setOnClickListener {
            showWallpaperPicker()
        }

        // 模糊匹配引擎开关
        // Fuzzy Match Engine toggle
        binding.searchEngineCard.setOnClickListener {
            val isExpanded = binding.paramSection.isVisible
            if (!isExpanded) {
                viewModel.toggleSearchMode()
                animateCardExpand(binding.searchEngineCard, binding.paramSection)
            } else {
                animateCardCollapse(binding.searchEngineCard, binding.paramSection)
                viewModel.toggleSearchMode()
            }
            updateSuperMatchUI()
        }

        // 搜索参数滑块
        setupParamSliders()

        // 26 键 / 9 键 切换 UI
        setupKeyboardLayoutUI()

        // 绑定自适应刷新参数卡片视图（include 引入）
        binding.root.findViewById<TextView?>(R.id.paramTAvg)?.let { paramTAvg = it }
        binding.root.findViewById<TextView?>(R.id.paramSigma)?.let { paramSigma = it }
        binding.root.findViewById<TextView?>(R.id.paramPMax)?.let { paramPMax = it }
        binding.root.findViewById<TextView?>(R.id.paramErrorRate)?.let { paramErrorRate = it }
        binding.root.findViewById<TextView?>(R.id.paramT1)?.let { paramT1 = it }
        binding.root.findViewById<TextView?>(R.id.paramT2)?.let { paramT2 = it }
        binding.root.findViewById<TextView?>(R.id.paramAdaptive)?.let { paramAdaptive = it }
        binding.root.findViewById<TextView?>(R.id.paramSample)?.let { paramSample = it }
        binding.root.findViewById<TextView?>(R.id.paramBackspace)?.let { paramBackspace = it }
        binding.root.findViewById<TextView?>(R.id.paramSpeedDisplay)?.let { paramSpeedDisplay = it }
        binding.root.findViewById<TextView?>(R.id.adaptiveParamsHint)?.let { adaptiveParamsHint = it }
        binding.root.findViewById<TextView?>(R.id.btnRetestSpeed)?.let {
            btnRetestSpeed = it
            it.setOnClickListener { viewModel.retestTypingSpeed() }
        }

        // 恢复默认参数
        binding.btnResetParams.setOnClickListener {
            viewModel.resetSearchParameters()
            loadParamValues()
            Toast.makeText(this, "参数已恢复默认", Toast.LENGTH_SHORT).show()
        }

        // 快捷绑定
        binding.btnAddShortcut.setOnClickListener {
            showAddShortcutDialog()
        }

        // 清空数据
        binding.btnClearData.setOnClickListener {
            showClearDataConfirmDialog()
        }

        // 启动排名
        binding.btnGoRanking.setOnClickListener {
            startActivity(Intent(this, RankingActivity::class.java))
        }

        // 手势录制
        binding.btnGoGesture.setOnClickListener {
            showGestureSetupDialog()
        }

        // 文件夹管理
        binding.btnGoFolder.setOnClickListener {
            showFolderManageDialog()
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  强调色网格
    // ═══════════════════════════════════════════════════════════

    private fun buildAccentColorGrid() {
        val grid = binding.accentColorGrid
        grid.removeAllViews()

        val colors = PersonalizationManager.ACCENT_COLORS
        val labels = PersonalizationManager.ACCENT_COLOR_LABELS
        val currentAccent = viewModel.accentColorName
        val density = resources.displayMetrics.density

        for ((name, color) in colors) {
            val outerSize = (32 * density).toInt()
            val innerSize = (22 * density).toInt()

            val container = FrameLayout(this).apply {
                layoutParams = LinearLayout.LayoutParams(outerSize, outerSize).apply {
                    marginEnd = (8 * density).toInt()
                }
            }

            val innerDot = View(this).apply {
                layoutParams = FrameLayout.LayoutParams(innerSize, innerSize).apply {
                    gravity = Gravity.CENTER
                }
                setBackgroundColor(color)
            }

            if (name == currentAccent) {
                val ring = View(this).apply {
                    layoutParams = FrameLayout.LayoutParams(outerSize, outerSize)
                    setBackgroundResource(com.appindex.R.drawable.accent_selected_ring)
                }
                container.addView(ring)
            }

            container.addView(innerDot)

            container.setOnClickListener {
                viewModel.setAccentColor(name)
                Toast.makeText(this, "强调色已切换为${labels[name]}", Toast.LENGTH_SHORT).show()
                recreate()
            }

            grid.addView(container)
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  背景颜色网格
    // ═══════════════════════════════════════════════════════════

    private fun buildBgColorGrid() {
        val grid = binding.bgColorGrid
        grid.removeAllViews()

        val colors = PersonalizationManager.BACKGROUND_COLORS
        val labels = PersonalizationManager.BACKGROUND_COLOR_LABELS
        val currentBackground = viewModel.backgroundColorName
        val density = resources.displayMetrics.density

        for ((name, color) in colors) {
            val outerSize = (32 * density).toInt()
            val innerSize = (22 * density).toInt()

            val container = FrameLayout(this).apply {
                layoutParams = LinearLayout.LayoutParams(outerSize, outerSize).apply {
                    marginEnd = (6 * density).toInt()
                }
            }

            val innerDot = View(this).apply {
                layoutParams = FrameLayout.LayoutParams(innerSize, innerSize).apply {
                    gravity = Gravity.CENTER
                }
                setBackgroundColor(color)
            }

            // 深色背景加边框
            val isDarkBg = name.startsWith("dark")
            if (isDarkBg) {
                innerDot.foreground = getDrawable(android.R.drawable.dialog_holo_light_frame)
            }

            if (name == currentBackground) {
                val ring = View(this).apply {
                    layoutParams = FrameLayout.LayoutParams(outerSize, outerSize)
                    setBackgroundResource(com.appindex.R.drawable.accent_selected_ring)
                }
                container.addView(ring)
            }

            container.addView(innerDot)

            container.setOnClickListener {
                viewModel.setBackgroundColor(name)
                Toast.makeText(this, "背景色已切换为${labels[name]}", Toast.LENGTH_SHORT).show()
                recreate()
            }

            grid.addView(container)
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  搜索卡片透明度
    // ═══════════════════════════════════════════════════════════

    private fun setupCardOpacitySlider() {
        binding.cardOpacitySlider.progress = viewModel.cardOpacity
        binding.cardOpacityValue.text = "${viewModel.cardOpacity}%"

        binding.cardOpacitySlider.setOnSeekBarChangeListener(object : android.widget.SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: android.widget.SeekBar?, progress: Int, fromUser: Boolean) {
                binding.cardOpacityValue.text = "$progress%"
            }
            override fun onStartTrackingTouch(seekBar: android.widget.SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: android.widget.SeekBar?) {
                viewModel.setCardOpacity(binding.cardOpacitySlider.progress)
            }
        })
    }

    // ═══════════════════════════════════════════════════════════
    //  壁纸选择
    // ═══════════════════════════════════════════════════════════

    private fun showWallpaperPicker() {
        val options = arrayOf("从相册选择", "移除壁纸")
        AlertDialog.Builder(this)
            .setTitle("自定义壁纸")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> {
                        val intent = Intent(Intent.ACTION_PICK).apply {
                            type = "image/*"
                        }
                        try {
                            startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(this, "无法打开相册", Toast.LENGTH_SHORT).show()
                        }
                    }
                    1 -> {
                        // 移除壁纸
                        getSharedPreferences("appindex_theme", MODE_PRIVATE)
                            .edit().remove("wallpaper_uri").apply()
                        binding.wallpaperStatus.text = "未设置"
                        Toast.makeText(this, "壁纸已移除", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }

    // ═══════════════════════════════════════════════════════════
    //  模糊匹配引擎 UI / Fuzzy Match Engine UI
    // ═══════════════════════════════════════════════════════════

    private fun updateSuperMatchUI() {
        val isFuzzyEngine = viewModel.searchMode.value == SearchMode.FUZZY_ENGINE
        binding.superMatchSwitch.isChecked = isFuzzyEngine
        binding.paramSection.isVisible = isFuzzyEngine
        binding.superMatchOffHint.isVisible = !isFuzzyEngine
        // 同步主入口的 SwiftCompat 状态由主卡片的点击事件处理
    }

    /**
     * 26 键 / 9 键 布局切换 / 26-key / 9-key layout toggle.
     * 两个 chip + 一个 SwitchCompat 双向同步；同时持久化到 PersonalizationManager。
     * The two chips and the SwitchCompat are bi-directionally synced and persisted.
     */
    private fun setupKeyboardLayoutUI() {
        val current = KeyboardLayout.fromKey(viewModel.personalizationManager.keyboardLayoutKey)
        updateKeyboardLayoutUI(current)

        binding.keyboardLayoutQwert.setOnClickListener {
            applyKeyboardLayoutChange(KeyboardLayout.QWERTY_26)
        }
        binding.keyboardLayoutT9.setOnClickListener {
            applyKeyboardLayoutChange(KeyboardLayout.T9_9)
        }
        binding.keyboardLayoutSwitch.setOnCheckedChangeListener { _, isChecked ->
            val target = if (isChecked) KeyboardLayout.T9_9 else KeyboardLayout.QWERTY_26
            applyKeyboardLayoutChange(target)
        }
    }

    private fun applyKeyboardLayoutChange(layout: KeyboardLayout) {
        viewModel.personalizationManager.setKeyboardLayout(layout)
        // 把布局同步给搜索引擎（如果已经实例化）
        // Sync the layout to the search engine, if instantiated.
        try {
            viewModel.applyKeyboardLayout(layout)
        } catch (e: Exception) {
            // 引擎尚未初始化也没关系 / engine not initialised yet is fine
        }
        updateKeyboardLayoutUI(layout)
        val msg = when (layout) {
            KeyboardLayout.QWERTY_26 -> "已切换到 26 键 QWERTY"
            KeyboardLayout.T9_9 -> "已切换到 9 键 T9 / Switched to 9-key T9"
        }
        android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_SHORT).show()
    }

    private fun updateKeyboardLayoutUI(layout: KeyboardLayout) {
        binding.keyboardLayoutQwert.isSelected = layout == KeyboardLayout.QWERTY_26
        binding.keyboardLayoutT9.isSelected = layout == KeyboardLayout.T9_9
        binding.keyboardLayoutSwitch.isChecked = layout == KeyboardLayout.T9_9
        binding.keyboardLayoutBadge.text = when (layout) {
            KeyboardLayout.QWERTY_26 -> "26 键 / QWERTY"
            KeyboardLayout.T9_9 -> "9 键 / T9"
        }
    }

    private fun setupParamSliders() {
        loadParamValues()

        // 匹配阈值 +/-
        binding.btnThresholdMinus.setOnClickListener {
            val v = (viewModel.matchThreshold - 1).coerceAtLeast(0)
            viewModel.setMatchThreshold(v)
            binding.matchThresholdValue.text = v.toString()
        }
        binding.btnThresholdPlus.setOnClickListener {
            val v = (viewModel.matchThreshold + 1).coerceAtMost(50)
            viewModel.setMatchThreshold(v)
            binding.matchThresholdValue.text = v.toString()
        }

        // 容错权重 +/-
        binding.btnFuzzyMinus.setOnClickListener {
            val v = (viewModel.fuzzyWeight - 1).coerceAtLeast(0)
            viewModel.setFuzzyWeight(v)
            binding.fuzzyWeightValue.text = v.toString()
        }
        binding.btnFuzzyPlus.setOnClickListener {
            val v = (viewModel.fuzzyWeight + 1).coerceAtMost(100)
            viewModel.setFuzzyWeight(v)
            binding.fuzzyWeightValue.text = v.toString()
        }

        // 使用频率加权 +/-
        binding.btnUsageMinus.setOnClickListener {
            val v = (viewModel.usageWeight - 1).coerceAtLeast(0)
            viewModel.setUsageWeight(v)
            binding.usageWeightValue.text = v.toString()
        }
        binding.btnUsagePlus.setOnClickListener {
            val v = (viewModel.usageWeight + 1).coerceAtMost(100)
            viewModel.setUsageWeight(v)
            binding.usageWeightValue.text = v.toString()
        }
    }

    private fun loadParamValues() {
        binding.matchThresholdValue.text = viewModel.matchThreshold.toString()
        binding.fuzzyWeightValue.text = viewModel.fuzzyWeight.toString()
        binding.usageWeightValue.text = viewModel.usageWeight.toString()
        // 刷新间隔显示：包含完整编排参数
        val params = viewModel.searchParams.value
        val paramText = params?.formatDisplay() ?: "采样中..."
        binding.refreshIntervalText.text = "${viewModel.refreshIntervalMilliseconds}ms · ${paramText}"
    }

    // ═══════════════════════════════════════════════════════════
    //  会员名牌（仅展示）
    // ═══════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════
    //  ViewModel 观察
    // ═══════════════════════════════════════════════════════════

    private fun observeViewModel() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {

                // 会员状态
                launch {
                    viewModel.memberProfile.collect { profile ->
                        binding.memberCard.isVisible = true
                        binding.titleText.isVisible = false
                        binding.regDateText.text = profile.registerDateText
                        binding.badgeBrandText.text = "SuperGOTO"
                        binding.badgeIdText.text = profile.memberId
                        FontHelper.applyBrandFont(this@SettingsActivity, binding.badgeBrandText)
                    }
                }

                // 统计数据
                launch {
                    viewModel.searchCount.collect { count ->
                        binding.statSearchCount.text = if (count > 0) count.toString() else "—"
                    }
                }
                launch {
                    viewModel.openCount.collect { count ->
                        binding.statOpenCount.text = if (count > 0) count.toString() else "—"
                    }
                }
                launch {
                    // 使用天数（从 memberProfile 的 daysUsed 获取）
                    viewModel.memberProfile.collect { profile ->
                        val days = profile.daysUsed
                        binding.statDaysUsed.text = if (days > 0) days.toString() else "—"
                    }
                }
                launch {
                    // 累计输入字符（从 usageTimeText 推算或显示 —）
                    viewModel.usageTimeText.collect { text ->
                        binding.statCharsTyped.text = if (text != "0秒" && text.isNotBlank()) text else "—"
                    }
                }

                // 搜索模式
                launch {
                    viewModel.searchMode.collect {
                        updateSuperMatchUI()
                    }
                }

                // 搜索编排参数 — 设置页面实时更新
                launch {
                    viewModel.searchParams.collect {
                        loadParamValues()
                    }
                }
            }
        }

        // 深色模式状态 → SwitchCompat
        binding.darkModeSwitch.isChecked = viewModel.isDarkMode

        // 悬浮条状态 → SwitchCompat
        binding.overlaySwitch.isChecked = isOverlayServiceRunning()

        // 模糊匹配引擎 UI 状态
        updateSuperMatchUI()

        // 壁纸状态
        val wallpaperUri = getSharedPreferences("appindex_theme", MODE_PRIVATE)
            .getString("wallpaper_uri", null)
        binding.wallpaperStatus.text = if (wallpaperUri != null) "已设置" else "未设置"

        // 快捷绑定
        refreshShortcutList()
    }

    // ═══════════════════════════════════════════════════════════
    //  快捷绑定
    // ═══════════════════════════════════════════════════════════

    private fun showAddShortcutDialog() {
        val apps = viewModel.getShortcutBindableApps()
        if (apps.isEmpty()) {
            Toast.makeText(this, "没有可绑定的应用", Toast.LENGTH_SHORT).show()
            return
        }

        val labels = apps.map { it.label }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle("选择应用")
            .setItems(labels) { _, which ->
                val selectedApp = apps[which]
                showKeywordInputDialog(selectedApp)
            }
            .show()
    }

    private fun showKeywordInputDialog(app: com.appindex.model.AppInfo) {
        val input = android.widget.EditText(this).apply {
            hint = "输入绑定字符（如 w）"
            setSingleLine(true)
            maxLines = 1
            textSize = 16f
            setPadding(48, 24, 48, 24)
        }

        AlertDialog.Builder(this)
            .setTitle("绑定 ${app.label}")
            .setView(input)
            .setPositiveButton("绑定") { _, _ ->
                val keyword = input.text.toString().trim()
                if (keyword.isBlank()) {
                    Toast.makeText(this, "请输入绑定字符", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (keyword.length > 10) {
                    Toast.makeText(this, "绑定字符最多10个", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                viewModel.addShortcutBinding(keyword, app.packageName, app.label)
                Toast.makeText(this, "已绑定 '$keyword' → ${app.label}", Toast.LENGTH_SHORT).show()
                refreshShortcutList()
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun refreshShortcutList() {
        val bindings = viewModel.getShortcutBindings()
        val list = binding.shortcutList
        list.removeAllViews()
        val density = resources.displayMetrics.density

        for (binding in bindings) {
            val item = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, (6 * density).toInt(), 0, (6 * density).toInt())
            }

            val keywordText = TextView(this).apply {
                text = binding.keyword
                textSize = 14f
                setTextColor(getColor(com.appindex.R.color.accent))
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                setPadding(0, 0, (12 * density).toInt(), 0)
            }

            val arrowText = TextView(this).apply {
                text = "→"
                textSize = 12f
                setTextColor(getColor(com.appindex.R.color.text_tertiary))
                setPadding(0, 0, (8 * density).toInt(), 0)
            }

            val appText = TextView(this).apply {
                text = binding.appLabel
                textSize = 13f
                setTextColor(getColor(com.appindex.R.color.text_primary))
                layoutParams = LinearLayout.LayoutParams(
                    0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f
                )
            }

            val countText = if (binding.useCount > 0) {
                TextView(this).apply {
                    text = "×${binding.useCount}"
                    textSize = 10f
                    setTextColor(getColor(com.appindex.R.color.text_tertiary))
                    setPadding(0, 0, (10 * density).toInt(), 0)
                }
            } else null

            val deleteBtn = TextView(this).apply {
                text = "✕"
                textSize = 13f
                setTextColor(getColor(com.appindex.R.color.text_tertiary))
                setPadding((8 * density).toInt(), 0, 0, 0)
                setOnClickListener {
                    viewModel.removeShortcutBinding(binding.keyword)
                    refreshShortcutList()
                }
            }

            item.addView(keywordText)
            item.addView(arrowText)
            item.addView(appText)
            countText?.let { item.addView(it) }
            item.addView(deleteBtn)
            list.addView(item)
        }

        binding.shortcutCount.text = "${bindings.size}"
        binding.btnAddShortcut.isVisible = true
    }

    // ═══════════════════════════════════════════════════════════
    //  悬浮条服务
    // ═══════════════════════════════════════════════════════════

    private fun toggleOverlayService() {
        val intent = Intent(this, com.appindex.QuickActionsAndFloatingWindow.OverlaySearchService::class.java)
        if (isOverlayServiceRunning()) {
            stopService(intent)
            getSharedPreferences("overlay_prefs", MODE_PRIVATE)
                .edit().putBoolean("floating_bar_enabled", false).apply()
            binding.overlaySwitch.isChecked = false
            Toast.makeText(this, "悬浮条已关闭", Toast.LENGTH_SHORT).show()
        } else {
            if (android.provider.Settings.canDrawOverlays(this)) {
                try {
                    startForegroundService(intent)
                } catch (_: Exception) {
                    // Android 12+ 后台启动前台服务可能被限制
                }
                getSharedPreferences("overlay_prefs", MODE_PRIVATE)
                    .edit().putBoolean("floating_bar_enabled", true).apply()
                binding.overlaySwitch.isChecked = true
                Toast.makeText(this, "悬浮条已开启", Toast.LENGTH_SHORT).show()
            } else {
                AlertDialog.Builder(this)
                    .setTitle("需要权限")
                    .setMessage("桌面悬浮条需要「显示在其他应用上层」权限")
                    .setPositiveButton("去设置") { _, _ ->
                        val overlayIntent = Intent(
                            android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:$packageName")
                        )
                        startActivity(overlayIntent)
                    }
                    .setNegativeButton("取消", null)
                    .show()
            }
        }
    }

    private fun isOverlayServiceRunning(): Boolean {
        val manager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        @Suppress("DEPRECATION")
        return manager.getRunningServices(100).any {
            it.service.className == com.appindex.QuickActionsAndFloatingWindow.OverlaySearchService::class.java.name
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  清空数据
    // ═══════════════════════════════════════════════════════════

    private fun showClearDataConfirmDialog() {
        AlertDialog.Builder(this)
            .setTitle("清空数据")
            .setMessage("将清空以下内容：\n\n• 搜索历史\n• 快捷绑定\n• 使用统计（搜索次数、打开次数、使用时长）\n• 主题设置\n\n注册日期将重置为今天\n\n会员权益将保留")
            .setPositiveButton("确认清空") { _, _ ->
                viewModel.clearAllData()
                Toast.makeText(this, "数据已清空", Toast.LENGTH_SHORT).show()
                refreshShortcutList()
                recreate()
            }
            .setNegativeButton("取消", null)
            .show()
    }

    // ═══════════════════════════════════════════════════════════
    //  手势设置
    // ═══════════════════════════════════════════════════════════

    private fun showGestureSetupDialog() {
        val gestureManager = com.appindex.QuickActionsAndFloatingWindow.GestureManager(this)
        val gestures = gestureManager.getAllEnabledGestures()

        // 预设手势类型列表
        val presetGestures = com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType.entries
            .filter { it != com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType.CUSTOM }

        // 构建列表项：预设手势 + 已录制的自定义手势
        val items = mutableListOf<String>()

        // 预设手势区域
        for (gestureType in presetGestures) {
            val existing = gestures.firstOrNull { it.gesture == gestureType }
            val name = getGestureName(gestureType)
            if (existing != null) {
                items.add("$name → ${existing.appLabel}")
            } else {
                items.add("$name → 未设置")
            }
        }

        // 自定义手势区域
        val customGestures = gestures.filter { it.gesture == com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType.CUSTOM }
        for (cg in customGestures) {
            items.add("自定义 → ${cg.appLabel}")
        }

        items.add("➕ 录制自定义手势")

        AlertDialog.Builder(this)
            .setTitle("手势快捷启动")
            .setItems(items.toTypedArray()) { _, which ->
                when {
                    // 点击"录制自定义手势"
                    which == items.size - 1 -> {
                        showAppPickerForGesture(gestureManager, isCustom = true)
                    }
                    // 点击预设手势（0~4）
                    which < presetGestures.size -> {
                        val gestureType = presetGestures[which]
                        val existing = gestures.firstOrNull { it.gesture == gestureType }
                        if (existing != null) {
                            // 已绑定，弹出操作选项
                            AlertDialog.Builder(this)
                                .setTitle(getGestureName(gestureType))
                                .setItems(arrayOf("重新绑定应用", "删除手势")) { _, action ->
                                    when (action) {
                                        0 -> showAppPickerForGesture(gestureManager, gestureType = gestureType)
                                        1 -> {
                                            gestureManager.clearGesture(gestureType)
                                            Toast.makeText(this, "已删除", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                                .show()
                        } else {
                            // 未绑定，选择应用
                            showAppPickerForGesture(gestureManager, gestureType = gestureType)
                        }
                    }
                    // 点击自定义手势
                    else -> {
                        val customIdx = which - presetGestures.size
                        if (customIdx < customGestures.size) {
                            val cg = customGestures[customIdx]
                            AlertDialog.Builder(this)
                                .setTitle("自定义手势")
                                .setItems(arrayOf("删除「${cg.appLabel}」手势")) { _, _ ->
                                    gestureManager.deleteGesture(cg.id)
                                    Toast.makeText(this, "已删除", Toast.LENGTH_SHORT).show()
                                }
                                .show()
                        }
                    }
                }
            }
            .show()
    }

    private fun showAppPickerForGesture(
        gestureManager: com.appindex.QuickActionsAndFloatingWindow.GestureManager,
        gestureType: com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType? = null,
        isCustom: Boolean = false
    ) {
        val pm = packageManager
        val apps = pm.getInstalledApplications(0)
            .filter { pm.getLaunchIntentForPackage(it.packageName) != null }
            .sortedBy { pm.getApplicationLabel(it).toString() }
            .take(30)
            .map { Pair(it.packageName, pm.getApplicationLabel(it).toString()) }

        val names = apps.map { it.second }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle("选择要启动的应用")
            .setItems(names) { _, which ->
                val (pkg, label) = apps[which]
                if (isCustom) {
                    // 跳转到手势录制页面
                    startActivity(GestureRecordActivity.newIntent(this, pkg, label))
                } else if (gestureType != null) {
                    // 绑定预设手势
                    gestureManager.setGestureConfig(gestureType, pkg, label)
                    Toast.makeText(this, "${getGestureName(gestureType)} → $label", Toast.LENGTH_SHORT).show()
                }
            }
            .show()
    }

    // ═══════════════════════════════════════════════════════════
    //  文件夹管理
    // ═══════════════════════════════════════════════════════════

    private fun showFolderManageDialog() {
        val folderManager = com.appindex.QuickActionsAndFloatingWindow.FolderManager(this)
        val folders = folderManager.getAllFolders()

        val items = folders.map { f ->
            "${f.name}（${f.apps.size}/9个应用）"
        }.toTypedArray()

        val allItems = if (items.isEmpty()) {
            arrayOf("暂无文件夹，点击创建")
        } else {
            items + "➕ 创建新文件夹"
        }

        AlertDialog.Builder(this)
            .setTitle("文件夹管理")
            .setItems(allItems) { _, which ->
                if (items.isEmpty() || which == allItems.size - 1) {
                    showCreateFolderDialog(folderManager)
                } else if (which < folders.size) {
                    showEditFolderDialog(folderManager, folders[which])
                }
            }
            .setNegativeButton("切换显示模式", null)
            .show()
    }

    private fun showCreateFolderDialog(folderManager: com.appindex.QuickActionsAndFloatingWindow.FolderManager) {
        AlertDialog.Builder(this)
            .setTitle("创建文件夹")
            .setMessage("输入文件夹名称")
            .setPositiveButton("创建") { _, _ ->
                val folder = com.appindex.QuickActionsAndFloatingWindow.FolderManager.Folder(
                    id = java.util.UUID.randomUUID().toString().take(8),
                    name = "新文件夹",
                    apps = emptyList()
                )
                folderManager.addFolder(folder)
                Toast.makeText(this, "文件夹已创建", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun showEditFolderDialog(
        folderManager: com.appindex.QuickActionsAndFloatingWindow.FolderManager,
        folder: com.appindex.QuickActionsAndFloatingWindow.FolderManager.Folder
    ) {
        val appList = folder.apps.joinToString("\n") { "• ${it.appLabel}" }
        AlertDialog.Builder(this)
            .setTitle(folder.name)
            .setMessage("已添加 ${folder.apps.size}/9 个应用\n$appList")
            .setPositiveButton("添加应用") { _, _ ->
                showAppPickerForFolder(folderManager, folder)
            }
            .setNeutralButton("删除文件夹") { _, _ ->
                folderManager.deleteFolder(folder.id)
                Toast.makeText(this, "文件夹已删除", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("关闭", null)
            .show()
    }

    private fun showAppPickerForFolder(
        folderManager: com.appindex.QuickActionsAndFloatingWindow.FolderManager,
        folder: com.appindex.QuickActionsAndFloatingWindow.FolderManager.Folder
    ) {
        val pm = packageManager
        val apps = pm.getInstalledApplications(0)
            .filter { pm.getLaunchIntentForPackage(it.packageName) != null }
            .sortedBy { pm.getApplicationLabel(it).toString() }
            .take(30)
            .map { Pair(it.packageName, pm.getApplicationLabel(it).toString()) }

        val names = apps.map { it.second }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle("选择应用（${folder.apps.size}/9）")
            .setItems(names) { _, which ->
                val (pkg, label) = apps[which]
                if (folder.apps.size < 9) {
                    val updated = folder.copy(
                        apps = folder.apps + com.appindex.QuickActionsAndFloatingWindow.FolderManager.AppEntry(pkg, label)
                    )
                    folderManager.updateFolder(updated)
                    Toast.makeText(this, "已添加 $label", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "文件夹已满（最多9个）", Toast.LENGTH_SHORT).show()
                }
            }
            .show()
    }

    private fun getGestureName(gesture: com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType): String {
        return when (gesture) {
            com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType.SWIPE_UP -> "上滑"
            com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType.SWIPE_DOWN -> "下滑"
            com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType.SWIPE_LEFT -> "左滑"
            com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType.SWIPE_RIGHT -> "右滑"
            com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType.DOUBLE_TAP -> "双击"
            com.appindex.QuickActionsAndFloatingWindow.GestureManager.GestureType.CUSTOM -> "自定义"
        }
    }

    private fun animateCardExpand(card: View, content: View) {
        content.isVisible = true
        content.measure(View.MeasureSpec.makeMeasureSpec(card.width, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
        val targetHeight = content.measuredHeight
        content.layoutParams.height = 0
        content.requestLayout()

        content.animate()
            .translationY(0f)
            .alpha(1f)
            .setDuration(300)
            .setInterpolator(android.view.animation.DecelerateInterpolator())
            .start()

        card.animate()
            .scaleY(1f)
            .setDuration(300)
            .setInterpolator(android.view.animation.DecelerateInterpolator())
            .withEndAction {
                content.layoutParams.height = ViewGroup.LayoutParams.WRAP_CONTENT
                content.requestLayout()
            }
            .start()
    }

    private fun animateCardCollapse(card: View, content: View) {
        content.measure(View.MeasureSpec.makeMeasureSpec(card.width, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
        val startHeight = content.measuredHeight

        content.animate()
            .translationY(-startHeight / 2f)
            .alpha(0f)
            .setDuration(250)
            .setInterpolator(android.view.animation.AccelerateInterpolator())
            .start()

        card.animate()
            .scaleY(1f)
            .setDuration(250)
            .setInterpolator(android.view.animation.AccelerateInterpolator())
            .withEndAction {
                content.isVisible = false
                content.layoutParams.height = 0
                content.requestLayout()
            }
            .start()
    }
}



