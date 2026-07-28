package com.appindex.UIUX

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.appindex.BasicSearch.MetaTagEngine
import com.appindex.license.LicenseManager
import com.appindex.model.AppInfo
import com.appindex.model.MemberProfile
import com.appindex.model.SearchMode
import com.appindex.model.SearchResult
import com.appindex.QuickActionsAndFloatingWindow.HotApplicationsManager
import com.appindex.Personalization.KeyboardLayout
import com.appindex.Personalization.PersonalizationManager
import com.appindex.Personalization.TypingSpeedTracker
import com.appindex.prediction.SmartPredictionEngine
import com.appindex.AdaptiveRefresh.SearchOrchestrator
import com.appindex.BasicSearch.SearchService
import com.appindex.QuickActionsAndFloatingWindow.ShortcutManager
import com.appindex.StatisticsData.UsageStatisticsManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * 搜索 ViewModel — 仅负责UI状态管理，搜索逻辑委托给 SearchService
 * 
 * 职责划分：
 * - UI层状态管理（搜索结果、搜索模式、会员状态等）
 * - 与SearchService通信
 * - 管理其他功能模块（预测引擎、高频应用、快捷绑定等）
 */
class SearchViewModel(application: Application) : AndroidViewModel(application) {

    // ─── 搜索服务（核心解耦）───
    private val searchService = SearchService.getInstance(application)

    // ─── 功能模块 ───
    private val licenseManager = LicenseManager(application)
    private val usageStatisticsManager = UsageStatisticsManager(application)
    val personalizationManager: PersonalizationManager = PersonalizationManager(application)

    // ─── 搜索编排器（可丢弃搜索 + 防抖/节流）───
    private val searchOrchestrator = SearchOrchestrator(
        searchService = searchService,
        typingSpeedTracker = personalizationManager.typingSpeedTracker,
        scope = viewModelScope
    ).apply {
        onParamsUpdated = { params ->
            _searchParams.value = params
        }
    }
    private val shortcutManager = ShortcutManager(application)
    private val predictionEngine = SmartPredictionEngine(application)
    private val hotApplicationsManager = HotApplicationsManager(application)

    // ─── 搜索状态 ───
    private val _isIndexing = MutableStateFlow(false)
    val isIndexing: StateFlow<Boolean> = _isIndexing

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query

    private val _results = MutableStateFlow<List<SearchResult>>(emptyList())
    val results: StateFlow<List<SearchResult>> = _results

    private val _allApps = MutableStateFlow<List<AppInfo>>(emptyList())
    val allApps: StateFlow<List<AppInfo>> = _allApps

    private val _searchTime = MutableStateFlow(0L)
    val searchTime: StateFlow<Long> = _searchTime

    // ─── 搜索模式 ───
    private val _searchMode = MutableStateFlow(SearchMode.STANDARD)
    val searchMode: StateFlow<SearchMode> = _searchMode

    // ─── 会员状态 ───
    private val _memberProfile = MutableStateFlow(loadMemberProfile())
    val memberProfile: StateFlow<MemberProfile> = _memberProfile

    val isMember: Boolean get() = true

    // ─── 授权校验状态 ───
    private val _licenseCheckMessage = MutableStateFlow("")
    val licenseCheckMessage: StateFlow<String> = _licenseCheckMessage

    // ─── 破解检测 ───
    private val _isPiratedUser = MutableStateFlow(false)
    val isPiratedUser: StateFlow<Boolean> = _isPiratedUser

    // ─── 统计数据 ───
    private val _searchCount = MutableStateFlow(usageStatisticsManager.totalSearchCount)
    val searchCount: StateFlow<Int> = _searchCount

    private val _openCount = MutableStateFlow(usageStatisticsManager.totalOpenCount)
    val openCount: StateFlow<Int> = _openCount

    private val _usageTimeText = MutableStateFlow(usageStatisticsManager.formattedUsageTime)
    val usageTimeText: StateFlow<String> = _usageTimeText

    // ─── 主题状态 ───
    val isDarkMode: Boolean get() = personalizationManager.isDarkMode
    val accentColorName: String get() = personalizationManager.accentColorName

    // ─── 快捷绑定状态 ───
    private val _shortcutLaunch = MutableStateFlow<ShortcutManager.ShortcutBinding?>(null)
    val shortcutLaunch: StateFlow<ShortcutManager.ShortcutBinding?> = _shortcutLaunch

    private val _shortcutBindings = MutableStateFlow(shortcutManager.getAllBindings())
    val shortcutBindings: StateFlow<List<ShortcutManager.ShortcutBinding>> = _shortcutBindings

    // ─── 搜索历史 ───
    private val _searchHistory = MutableStateFlow(loadSearchHistory())
    val searchHistory: StateFlow<List<String>> = _searchHistory

    // ─── 智能预测栏状态 ───
    private val _predictions = MutableStateFlow<List<SmartPredictionEngine.PredictionSlot>>(emptyList())
    val predictions: StateFlow<List<SmartPredictionEngine.PredictionSlot>> = _predictions

    // ─── 高频应用栏状态 ───
    private val _hotApps = MutableStateFlow<List<HotApplicationsManager.HotApplicationStat>>(emptyList())
    val hotApps: StateFlow<List<HotApplicationsManager.HotApplicationStat>> = _hotApps

    private val _hotAppsDuration = MutableStateFlow(hotApplicationsManager.statisticsDurationHours)
    val hotAppsDuration: StateFlow<Int> = _hotAppsDuration

    private val _hotAppsConfigured = MutableStateFlow(hotApplicationsManager.hasConfigured)
    val hotAppsConfigured: StateFlow<Boolean> = _hotAppsConfigured

    // ─── 打字速度状态（双轨制）───
    private val _typingSpeedDisplay = MutableStateFlow(personalizationManager.typingSpeedDisplay)
    val typingSpeedDisplay: StateFlow<String> = _typingSpeedDisplay

    private val _primaryTypingSpeed = MutableStateFlow(personalizationManager.primaryTypingSpeed)
    val primaryTypingSpeed: StateFlow<Int> = _primaryTypingSpeed

    private val _primaryTypingUnit = MutableStateFlow(personalizationManager.primaryTypingUnit)
    val primaryTypingUnit: StateFlow<String> = _primaryTypingUnit

    private val _isAdaptiveRefreshEnabled = MutableStateFlow(personalizationManager.isAdaptiveRefreshEnabled)
    val isAdaptiveRefreshEnabled: StateFlow<Boolean> = _isAdaptiveRefreshEnabled

    // ─── 搜索编排参数（防抖/节流/自适应延迟）───
    private val _searchParams = MutableStateFlow<SearchOrchestrator.SearchParams?>(null)
    val searchParams: StateFlow<SearchOrchestrator.SearchParams?> = _searchParams

    private var searchJob: Job? = null

    // ─── 应用安装/卸载监听 ───
    private val appChangeReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == Intent.ACTION_PACKAGE_ADDED ||
                intent?.action == Intent.ACTION_PACKAGE_REMOVED
            ) {
                rebuildIndex()
            }
        }
    }

    init {
        personalizationManager.applySavedTheme()
        usageStatisticsManager.recordApplicationOpen()
        _openCount.value = usageStatisticsManager.totalOpenCount
        _isPiratedUser.value = licenseManager.isPirated

        if (licenseManager.isActivated && !licenseManager.isPirated) {
            _searchMode.value = SearchMode.FUZZY_ENGINE
            searchService.setSearchMode(SearchMode.FUZZY_ENGINE)
        }

        // 订阅搜索服务状态
        subscribeToSearchService()

        refreshHotApps()
        performOnlineCheck()

        // 注册应用变化监听
        registerAppChangeReceiver()
    }

    /**
     * 订阅搜索服务状态变化
     */
    private fun subscribeToSearchService() {
        viewModelScope.launch {
            // 监听索引状态
            searchService.isIndexing.collect { indexing ->
                _isIndexing.value = indexing
            }
        }

        viewModelScope.launch {
            // 监听搜索结果
            searchService.searchResults.collect { results ->
                _results.value = results
            }
        }

        viewModelScope.launch {
            // 监听搜索耗时
            searchService.searchTime.collect { time ->
                _searchTime.value = time
            }
        }

        viewModelScope.launch {
            // 监听应用列表
            searchService.allApps.collect { apps ->
                _allApps.value = apps
                refreshPredictions()
            }
        }
    }

    /**
     * 注册应用变化广播接收器
     */
    private fun registerAppChangeReceiver() {
        try {
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_PACKAGE_ADDED)
                addAction(Intent.ACTION_PACKAGE_REMOVED)
                addDataScheme("package")
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                getApplication<Application>().registerReceiver(appChangeReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                getApplication<Application>().registerReceiver(appChangeReceiver, filter)
            }
        } catch (_: Exception) {}
    }

    override fun onCleared() {
        super.onCleared()
        try {
            getApplication<Application>().unregisterReceiver(appChangeReceiver)
        } catch (_: Exception) {}
        // 结束打字速度跟踪会话
        personalizationManager.typingSpeedTracker.endSession()
        // 释放搜索编排器
        searchOrchestrator.release()
    }

    /**
     * 在线授权校验
     */
    private fun performOnlineCheck() {
        viewModelScope.launch {
            _isPiratedUser.value = licenseManager.isPirated

            val status = licenseManager.checkOnAppLaunch()
            when (status) {
                LicenseManager.VerifyStatus.OK -> {
                    _memberProfile.value = loadMemberProfile()
                    _searchMode.value = SearchMode.FUZZY_ENGINE
                    searchService.setSearchMode(SearchMode.FUZZY_ENGINE)
                    _licenseCheckMessage.value = ""
                    _isPiratedUser.value = false
                    syncDataToCloud()
                }
                LicenseManager.VerifyStatus.OFFLINE -> {
                    if (licenseManager.isActivated) {
                        _licenseCheckMessage.value = ""
                    }
                }
                LicenseManager.VerifyStatus.DEVICE_CONFLICT -> {
                    _searchMode.value = SearchMode.STANDARD
                    searchService.setSearchMode(SearchMode.STANDARD)
                    _memberProfile.value = MemberProfile()
                    _licenseCheckMessage.value = "授权码已在其他设备使用，请重新激活"
                }
                LicenseManager.VerifyStatus.NO_LICENSE -> {
                    _licenseCheckMessage.value = ""
                    _isPiratedUser.value = false
                }
            }
        }
    }

    /**
     * 同步数据到云端
     */
    private suspend fun syncDataToCloud() {
        val code = licenseManager.currentLicenseCode ?: return
        val apiClient = com.appindex.license.LicenseApiClient(getApplication())
        val delta = usageStatisticsManager.getDeltaSinceLastSync()

        if (delta.addDay == 0 && delta.addCharacter == 0 && delta.addTime == 0 && delta.applicationLaunches.length() == 0) return

        val result = apiClient.updateUserData(
            licenseCode = code,
            addDay = delta.addDay,
            addChar = delta.addCharacter,
            addTime = delta.addTime,
            appLaunches = delta.applicationLaunches
        )

        if (result.code == 0) {
            usageStatisticsManager.markSynced()
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  搜索功能（委托给 SearchService）
    // ═══════════════════════════════════════════════════════════

    fun rebuildIndex() {
        searchService.rebuildIndex()
    }

    fun refreshPredictions() {
        val apps = _allApps.value
        if (apps.isNotEmpty()) {
            _predictions.value = predictionEngine.getPredictions(apps)
        }
    }

    fun refreshHotApps() {
        _hotApps.value = hotApplicationsManager.getHotApplications(5)
    }

    fun toggleHotAppsDuration() {
        val newDuration = hotApplicationsManager.toggleDuration()
        _hotAppsDuration.value = newDuration
        hotApplicationsManager.hasConfigured = true
        _hotAppsConfigured.value = true
        refreshHotApps()
    }

    fun setHotAppsConfigured() {
        hotApplicationsManager.hasConfigured = true
        _hotAppsConfigured.value = true
    }

    fun getCurrentTimeSlotLabel(): String {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        return when (hour) {
            in 6..11 -> "早间时段"
            in 12..17 -> "午间时段"
            in 18..23 -> "晚间时段"
            else -> "深夜时段"
        }
    }

    fun onQueryChanged(newQuery: String, isBackspace: Boolean = false) {
        _query.value = newQuery

        // 优先检查快捷绑定
        val shortcut = shortcutManager.matchShortcut(newQuery)
        if (shortcut != null) {
            _shortcutLaunch.value = shortcut
            _results.value = emptyList()
            return
        }

        _shortcutLaunch.value = null

        // 空查询直接返回
        if (newQuery.isBlank()) {
            _results.value = emptyList()
            searchOrchestrator.submitSearch("", _searchMode.value)
            return
        }

        // 使用 SearchOrchestrator 进行可丢弃搜索（防抖 + 节流）
        // 新输入会自动取消旧的搜索任务和计时器
        if (isBackspace) {
            personalizationManager.typingSpeedTracker.recordInput("", isBackspace = true)
        }
        searchOrchestrator.submitSearch(newQuery, _searchMode.value)
        saveSearchHistory(newQuery)
    }

    /**
     * 更新打字速度显示状态
     */
    private fun updateTypingSpeedDisplay() {
        _typingSpeedDisplay.value = personalizationManager.typingSpeedTracker.getDisplaySpeed()
        _primaryTypingSpeed.value = personalizationManager.typingSpeedTracker.getPrimarySpeed()
        _primaryTypingUnit.value = personalizationManager.typingSpeedTracker.getPrimaryUnit()
    }

    /**
     * 切换自适应刷新开关
     */
    fun toggleAdaptiveRefresh() {
        personalizationManager.toggleAdaptiveRefresh()
        _isAdaptiveRefreshEnabled.value = personalizationManager.isAdaptiveRefreshEnabled
    }

    /**
     * 获取完整计时统计参数
     */
    fun getTypingStats(): TypingSpeedTracker.TimingStats {
        return personalizationManager.typingSpeedTracker.getTimingStats()
    }

    /**
     * 重新测试打字速度（重置当前会话统计）
     */
    fun retestTypingSpeed() {
        personalizationManager.typingSpeedTracker.resetStats()
        _searchParams.value = null
        _typingSpeedDisplay.value = "0 字/分钟 | 0 WPM"
        _primaryTypingSpeed.value = 0
    }

    /**
     * 获取当前打字速度结果
     */
    fun getCurrentTypingSpeed(): TypingSpeedTracker.SpeedResult {
        return personalizationManager.typingSpeedTracker.getCurrentSpeed()
    }

    /**
     * 获取系统语言是否中文
     */
    fun isChineseLocale(): Boolean = personalizationManager.typingSpeedTracker.isChineseLocale

    fun toggleSearchMode(): Boolean {
        if (_searchMode.value == SearchMode.STANDARD) {
            _searchMode.value = SearchMode.FUZZY_ENGINE
            searchService.setSearchMode(SearchMode.FUZZY_ENGINE)
        } else {
            _searchMode.value = SearchMode.STANDARD
            searchService.setSearchMode(SearchMode.STANDARD)
        }
        
        if (_query.value.isNotBlank()) {
            searchJob?.cancel()
            searchJob = viewModelScope.launch {
                searchService.search(_query.value, _searchMode.value)
            }
        }
        return true
    }

    // ═══════════════════════════════════════════════════════════
    //  授权码激活
    // ═══════════════════════════════════════════════════════════

    suspend fun activateLicense(code: String): LicenseManager.ActivateResult {
        val result = licenseManager.activate(code)
        if (result.code == 1) {
            _memberProfile.value = loadMemberProfile()
            _searchMode.value = SearchMode.FUZZY_ENGINE
            searchService.setSearchMode(SearchMode.FUZZY_ENGINE)
            _licenseCheckMessage.value = ""
            _isPiratedUser.value = false

            val apiClient = com.appindex.license.LicenseApiClient(getApplication())
            apiClient.initUserData(code)
        }
        return result
    }

    suspend fun transferActivateLicense(code: String): LicenseManager.ActivateResult {
        val result = licenseManager.transferActivate(code)
        if (result.code == 1) {
            _memberProfile.value = loadMemberProfile()
            _searchMode.value = SearchMode.FUZZY_ENGINE
            searchService.setSearchMode(SearchMode.FUZZY_ENGINE)
            _licenseCheckMessage.value = ""
            _isPiratedUser.value = false

            val apiClient = com.appindex.license.LicenseApiClient(getApplication())
            apiClient.initUserData(code)
        }
        return result
    }

    fun deactivateLicense() {
        licenseManager.deactivate()
        _memberProfile.value = MemberProfile()
        _searchMode.value = SearchMode.STANDARD
        searchService.setSearchMode(SearchMode.STANDARD)
    }

    // ═══════════════════════════════════════════════════════════
    //  主题切换
    // ═══════════════════════════════════════════════════════════

    fun toggleDarkMode() { personalizationManager.toggleDarkMode() }

    fun setAccentColor(colorName: String): Boolean {
        personalizationManager.setAccentColor(colorName)
        return true
    }

    fun setBackgroundColor(colorName: String) { personalizationManager.setBackgroundColor(colorName) }
    val backgroundColorName: String get() = personalizationManager.backgroundColorName

    fun setCardOpacity(opacity: Int) { personalizationManager.setCardOpacity(opacity) }
    val cardOpacity: Int get() = personalizationManager.cardOpacity

    fun setMatchThreshold(value: Int) { personalizationManager.setMatchThreshold(value) }
    val matchThreshold: Int get() = personalizationManager.matchThreshold

    fun setFuzzyWeight(value: Int) { personalizationManager.setFuzzyWeight(value) }
    val fuzzyWeight: Int get() = personalizationManager.fuzzyWeight

    fun setUsageWeight(value: Int) { personalizationManager.setUsageWeight(value) }
    val usageWeight: Int get() = personalizationManager.usageWeight

    val refreshIntervalMilliseconds: Int get() = personalizationManager.refreshIntervalMilliseconds

    fun resetSearchParameters() { personalizationManager.resetSearchParameters() }

    // ═══════════════════════════════════════════════════════════
    //  统计
    // ═══════════════════════════════════════════════════════════

    fun onSessionEnd() {
        usageStatisticsManager.recordSessionEnd()
        _usageTimeText.value = usageStatisticsManager.formattedUsageTime
    }

    fun recordApplicationLaunch(packageName: String, label: String) {
        usageStatisticsManager.recordApplicationLaunch(packageName, label)
        searchService.recordAppUsage(packageName)
        predictionEngine.recordRecentApp(packageName, label)
        hotApplicationsManager.recordApplicationLaunch(packageName, label)
        refreshPredictions()
        refreshHotApps()
    }

    fun applyKeyboardLayout(layout: KeyboardLayout) {
        // 键盘布局设置（如需可传递给搜索服务）
    }

    fun recordPredictionClick(packageName: String) {
        predictionEngine.recordPredictionClick(packageName)
    }

    // ═══════════════════════════════════════════════════════════
    //  内部方法
    // ═══════════════════════════════════════════════════════════

    private fun loadMemberProfile(isOffline: Boolean = false): MemberProfile {
        return if (licenseManager.isActivated) {
            MemberProfile(
                isMember = true,
                memberId = licenseManager.memberId,
                licenseCode = licenseManager.currentLicenseCode ?: "",
                orderId = licenseManager.orderId,
                registerTimestamp = licenseManager.registerTimestamp,
                isOffline = isOffline
            )
        } else {
            MemberProfile()
        }
    }

    fun getAppCount(): Int = searchService.getAppCount()

    // ─── 搜索历史 ───

    private fun loadSearchHistory(): List<String> {
        val prefs = getApplication<Application>().getSharedPreferences("search_history", Context.MODE_PRIVATE)
        val saved = prefs.getString("history_items", "") ?: ""
        return if (saved.isNotBlank()) saved.split("|||") else emptyList()
    }

    private fun saveSearchHistory(query: String) {
        if (query.isBlank() || query.length < 2) return
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            val prefs = getApplication<Application>().getSharedPreferences("search_history", Context.MODE_PRIVATE)
            val saved = prefs.getString("history_items", "") ?: ""
            val history = if (saved.isNotBlank()) saved.split("|||").toMutableList() else mutableListOf()
            history.remove(query)
            history.add(0, query)
            while (history.size > 5) history.removeAt(history.size - 1)
            prefs.edit().putString("history_items", history.joinToString("|||")).apply()
            _searchHistory.value = history
        }
    }

    fun clearSearchHistory() {
        val prefs = getApplication<Application>().getSharedPreferences("search_history", Context.MODE_PRIVATE)
        prefs.edit().remove("history_items").apply()
        _searchHistory.value = emptyList()
    }

    // ═══════════════════════════════════════════════════════════
    //  清空数据
    // ═══════════════════════════════════════════════════════════

    fun clearAllData() {
        clearSearchHistory()
        shortcutManager.clearAll()
        _shortcutBindings.value = emptyList()
        usageStatisticsManager.clearAll()
        _searchCount.value = 0
        _openCount.value = 0
        _usageTimeText.value = "0秒"
        personalizationManager.resetToDefault()
        personalizationManager.typingSpeedTracker.resetStats()
        _typingSpeedDisplay.value = "0 字/分钟 | 0 WPM"
        _primaryTypingSpeed.value = 0
        _isAdaptiveRefreshEnabled.value = true
        licenseManager.resetRegistrationDate()
        _memberProfile.value = loadMemberProfile()
        _query.value = ""
        _results.value = emptyList()

        viewModelScope.launch {
            val code = licenseManager.currentLicenseCode ?: return@launch
            val apiClient = com.appindex.license.LicenseApiClient(getApplication())
            apiClient.clearUserData(code)
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  快捷绑定
    // ═══════════════════════════════════════════════════════════

    fun consumeShortcutLaunch() {
        _shortcutLaunch.value = null
    }

    fun addShortcutBinding(keyword: String, packageName: String, appLabel: String): Boolean {
        val success = shortcutManager.addBinding(keyword, packageName, appLabel, isMember)
        if (success) {
            _shortcutBindings.value = shortcutManager.getAllBindings()
        }
        return success
    }

    fun removeShortcutBinding(keyword: String) {
        shortcutManager.removeBinding(keyword)
        _shortcutBindings.value = shortcutManager.getAllBindings()
    }

    fun getShortcutBindings(): List<ShortcutManager.ShortcutBinding> = shortcutManager.getAllBindings()

    fun getMaxBindings(): Int = shortcutManager.getMaxBindings(isMember)

    fun getShortcutBindableApps(): List<AppInfo> {
        return _allApps.value.sortedBy { it.label }
    }
}
