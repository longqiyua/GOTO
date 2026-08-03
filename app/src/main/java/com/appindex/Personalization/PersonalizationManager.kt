package com.appindex.Personalization

import android.content.Context
import android.content.SharedPreferences
import androidx.appcompat.app.AppCompatDelegate

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    个性化设置管理器 / Personalization Manager                  ║
 * ║                                                                              ║
 * ║  统一管理所有与"用户偏好"相关的持久化项：                                       ║
 * ║    ① 主题外观  — 深浅模式 / 强调色 / 背景色 / 卡片透明度                       ║
 * ║    ② 搜索参数  — 匹配阈值 / 容错权重 / 使用频率权重 / 刷新间隔                 ║
 * ║    ③ 键盘布局  — 26 键 QWERTY / 9 键 T9（见 [KeyboardLayout]）               ║
 * ║                                                                              ║
 * ║  之前散落在 theme/ThemeManager、search/KeyboardLayout、                      ║
 * ║  settings/ 多个文件中的偏好统一收口在此。                                       ║
 * ║                                                                              ║
 * ║  数据存储：SharedPreferences `appindex_personal`                              ║
 * ║  Provides: [PersonalizationProfile] immutable snapshot                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class PersonalizationManager(context: Context) {

    private val preferences: SharedPreferences =
        context.getSharedPreferences("appindex_personal", Context.MODE_PRIVATE)

    /** 双轨制打字速度跟踪器 */
    val typingSpeedTracker = TypingSpeedTracker(context)

    // ────────── 主题外观 / Theme & Appearance ──────────

    /** 是否为深色模式 */
    val isDarkMode: Boolean
        get() {
            if (isLightSensorMode) {
                return shouldBeDarkModeByTime()
            }
            return preferences.getString(KEY_THEME_MODE, MODE_LIGHT) == MODE_DARK
        }

    /** 是否启用光感模式 */
    val isLightSensorMode: Boolean
        get() = preferences.getBoolean(KEY_LIGHT_SENSOR_MODE, false)

    /** 手动设置的主题模式（光感模式关闭时使用） */
    val manualThemeMode: String
        get() = preferences.getString(KEY_THEME_MODE, MODE_LIGHT) ?: MODE_LIGHT

    private fun shouldBeDarkModeByTime(): Boolean {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        return hour >= 18 || hour < 6
    }

    /** 当前强调色名称 */
    val accentColorName: String
        get() = preferences.getString(KEY_ACCENT_COLOR, DEFAULT_ACCENT) ?: DEFAULT_ACCENT

    /** 当前强调色值（ARGB） */
    val accentColor: Int
        get() = ACCENT_COLORS[accentColorName] ?: ACCENT_COLORS[DEFAULT_ACCENT]!!

    /** 当前强调色深色变体（按下/激活态） */
    val accentColorVariant: Int
        get() = ACCENT_COLOR_VARIANTS[accentColorName] ?: ACCENT_COLOR_VARIANTS[DEFAULT_ACCENT]!!

    /** 当前背景色名称 */
    val backgroundColorName: String
        get() = preferences.getString(KEY_BACKGROUND_COLOR, DEFAULT_BACKGROUND) ?: DEFAULT_BACKGROUND

    /** 当前背景色值 */
    val backgroundColor: Int
        get() = BACKGROUND_COLORS[backgroundColorName] ?: BACKGROUND_COLORS[DEFAULT_BACKGROUND]!!

    /** 搜索卡片透明度 0-100 */
    val cardOpacity: Int
        get() = preferences.getInt(KEY_CARD_OPACITY, DEFAULT_CARD_OPACITY)

    // ────────── 搜索参数 / Search Parameters ──────────

    /** 搜索匹配阈值 0-50（值越大越严格） */
    val matchThreshold: Int
        get() = preferences.getInt(KEY_MATCH_THRESHOLD, DEFAULT_MATCH_THRESHOLD)

    /** 容错权重 0-100（值越大容错越激进） */
    val fuzzyWeight: Int
        get() = preferences.getInt(KEY_FUZZY_WEIGHT, DEFAULT_FUZZY_WEIGHT)

    /** 使用频率权重 0-100（值越大越偏向常用 App） */
    val usageWeight: Int
        get() = preferences.getInt(KEY_USAGE_WEIGHT, DEFAULT_USAGE_WEIGHT)

    /** 是否启用自适应刷新 */
    val isAdaptiveRefreshEnabled: Boolean
        get() = preferences.getBoolean(KEY_ADAPTIVE_REFRESH, true)

    /**
     * 获取刷新间隔（毫秒）
     * 如果启用了自适应刷新，则基于打字速度动态计算；否则返回手动设置值
     */
    val refreshIntervalMilliseconds: Int
        get() = if (isAdaptiveRefreshEnabled) {
            typingSpeedTracker.calculateAdaptiveInterval()
        } else {
            preferences.getInt(KEY_REFRESH_INTERVAL, DEFAULT_REFRESH_INTERVAL)
        }

    /** 当前打字速度显示字符串（双轨制） */
    val typingSpeedDisplay: String
        get() = typingSpeedTracker.getDisplaySpeed()

    /** 主速度值（根据系统语言） */
    val primaryTypingSpeed: Int
        get() = typingSpeedTracker.getPrimarySpeed()

    /** 主速度单位 */
    val primaryTypingUnit: String
        get() = typingSpeedTracker.getPrimaryUnit()

    /** 副速度值 */
    val secondaryTypingSpeed: Int
        get() = typingSpeedTracker.getSecondarySpeed()

    /** 副速度单位 */
    val secondaryTypingUnit: String
        get() = typingSpeedTracker.getSecondaryUnit()

    // ────────── 键盘布局 / Keyboard Layout ──────────

    /** 当前键盘布局 key（如 `qwerty_26` / `t9_9`） */
    val keyboardLayoutKey: String
        get() = preferences.getString(
            KEY_KEYBOARD_LAYOUT,
            KeyboardLayout.defaultForLanguage("").key
        ) ?: KeyboardLayout.QWERTY_26.key

    // ────────── 写操作 / Mutators ──────────

    fun toggleDarkMode() {
        if (isLightSensorMode) return
        val newMode = if (isDarkMode) MODE_LIGHT else MODE_DARK
        preferences.edit().putString(KEY_THEME_MODE, newMode).apply()
        applyThemeMode()
    }

    fun toggleLightSensorMode() {
        val newValue = !isLightSensorMode
        preferences.edit().putBoolean(KEY_LIGHT_SENSOR_MODE, newValue).apply()
        applyThemeMode()
    }

    fun setAccentColor(colorName: String) {
        if (ACCENT_COLORS.containsKey(colorName)) {
            preferences.edit().putString(KEY_ACCENT_COLOR, colorName).apply()
        }
    }

    fun setBackgroundColor(colorName: String) {
        if (BACKGROUND_COLORS.containsKey(colorName)) {
            preferences.edit().putString(KEY_BACKGROUND_COLOR, colorName).apply()
        }
    }

    fun setCardOpacity(opacity: Int) {
        preferences.edit().putInt(KEY_CARD_OPACITY, opacity.coerceIn(0, 100)).apply()
    }

    fun setMatchThreshold(value: Int) {
        preferences.edit().putInt(KEY_MATCH_THRESHOLD, value.coerceIn(0, 50)).apply()
    }

    fun setFuzzyWeight(value: Int) {
        preferences.edit().putInt(KEY_FUZZY_WEIGHT, value.coerceIn(0, 100)).apply()
    }

    fun setUsageWeight(value: Int) {
        preferences.edit().putInt(KEY_USAGE_WEIGHT, value.coerceIn(0, 100)).apply()
    }

    fun setRefreshInterval(intervalMilliseconds: Int) {
        preferences.edit().putInt(KEY_REFRESH_INTERVAL, intervalMilliseconds).apply()
    }

    /**
     * 切换自适应刷新开关
     */
    fun toggleAdaptiveRefresh() {
        val newValue = !isAdaptiveRefreshEnabled
        preferences.edit().putBoolean(KEY_ADAPTIVE_REFRESH, newValue).apply()
    }

    /**
     * 设置自适应刷新开关状态
     */
    fun setAdaptiveRefresh(enabled: Boolean) {
        preferences.edit().putBoolean(KEY_ADAPTIVE_REFRESH, enabled).apply()
    }

    /**
     * 设置键盘布局
     * @param layout 新的键盘布局
     */
    fun setKeyboardLayout(layout: KeyboardLayout) {
        preferences.edit().putString(KEY_KEYBOARD_LAYOUT, layout.key).apply()
    }

    /**
     * 将深浅模式立即应用到 AppCompatDelegate
     */
    fun applyThemeMode() {
        val nightMode = if (isDarkMode) {
            AppCompatDelegate.MODE_NIGHT_YES
        } else {
            AppCompatDelegate.MODE_NIGHT_NO
        }
        AppCompatDelegate.setDefaultNightMode(nightMode)
    }

    /**
     * 启动时恢复已保存的主题
     */
    fun applySavedTheme() {
        applyThemeMode()
    }

    /**
     * 生成不可变快照（用于跨模块传递）
     */
    fun snapshot(): PersonalizationProfile {
        val speed = typingSpeedTracker.getCurrentSpeed()
        return PersonalizationProfile(
            isDarkMode = isDarkMode,
            accentColor = accentColor,
            accentColorVariant = accentColorVariant,
            backgroundColor = backgroundColor,
            cardOpacity = cardOpacity,
            matchThreshold = matchThreshold,
            fuzzyWeight = fuzzyWeight,
            usageWeight = usageWeight,
            refreshIntervalMilliseconds = refreshIntervalMilliseconds,
            keyboardLayout = KeyboardLayout.fromKey(keyboardLayoutKey),
            isAdaptiveRefreshEnabled = isAdaptiveRefreshEnabled,
            primaryTypingSpeed = typingSpeedTracker.getPrimarySpeed(speed),
            primaryTypingUnit = typingSpeedTracker.getPrimaryUnit(),
            secondaryTypingSpeed = typingSpeedTracker.getSecondarySpeed(speed),
            secondaryTypingUnit = typingSpeedTracker.getSecondaryUnit()
        )
    }

    /**
     * 全部重置为默认值（含主题 / 搜索参数 / 键盘布局）
     */
    fun resetToDefault() {
        preferences.edit().clear().apply()
        applyThemeMode()
    }

    /**
     * 仅重置搜索相关参数
     */
    fun resetSearchParameters() {
        preferences.edit()
            .putInt(KEY_MATCH_THRESHOLD, DEFAULT_MATCH_THRESHOLD)
            .putInt(KEY_FUZZY_WEIGHT, DEFAULT_FUZZY_WEIGHT)
            .putInt(KEY_USAGE_WEIGHT, DEFAULT_USAGE_WEIGHT)
            .putInt(KEY_REFRESH_INTERVAL, DEFAULT_REFRESH_INTERVAL)
            .putBoolean(KEY_ADAPTIVE_REFRESH, true)
            .putString(KEY_KEYBOARD_LAYOUT, KeyboardLayout.QWERTY_26.key)
            .apply()
        // 同时重置打字速度统计
        typingSpeedTracker.resetStats()
    }

    // ────────── 静态配置 / Static Configuration ──────────

    companion object {
        // SharedPreferences Key 常量
        private const val KEY_THEME_MODE = "theme_mode"
        private const val KEY_LIGHT_SENSOR_MODE = "light_sensor_mode"
        private const val KEY_ACCENT_COLOR = "accent_color"
        private const val KEY_BACKGROUND_COLOR = "background_color"
        private const val KEY_CARD_OPACITY = "card_opacity"
        private const val KEY_MATCH_THRESHOLD = "match_threshold"
        private const val KEY_FUZZY_WEIGHT = "fuzzy_weight"
        private const val KEY_USAGE_WEIGHT = "usage_weight"
        private const val KEY_REFRESH_INTERVAL = "refresh_interval"
        private const val KEY_ADAPTIVE_REFRESH = "adaptive_refresh"
        private const val KEY_KEYBOARD_LAYOUT = "keyboard_layout"

        // 模式字符串
        private const val MODE_LIGHT = "light"
        private const val MODE_DARK = "dark"

        // 默认值
        private const val DEFAULT_ACCENT = "slate"
        private const val DEFAULT_BACKGROUND = "default"
        private const val DEFAULT_CARD_OPACITY = 100
        private const val DEFAULT_MATCH_THRESHOLD = 25
        private const val DEFAULT_FUZZY_WEIGHT = 50
        private const val DEFAULT_USAGE_WEIGHT = 30
        private const val DEFAULT_REFRESH_INTERVAL = 200

        /** 允许的键盘布局 key 集合 */
        val KEYBOARD_LAYOUT_KEYS: Set<String> = setOf(
            KeyboardLayout.QWERTY_26.key,
            KeyboardLayout.T9_9.key
        )

        /** 强调色预设（ARGB 整数）— 全部为低饱和度色系，搭配黑白灰 UI */
        val ACCENT_COLORS: Map<String, Int> = mapOf(
            "slate"    to 0xFF2E4E7E.toInt(),  // 沉稳蓝灰
            "steel"    to 0xFF4A6A8A.toInt(),  // 钢蓝
            "forest"   to 0xFF3D6B5E.toInt(),  // 森林绿灰
            "wine"     to 0xFF7E4E5E.toInt(),  // 酒红灰
            "dusk"     to 0xFF6E5A3E.toInt(),  // 暮色棕灰
            "graphite" to 0xFF5A5A6E.toInt(),  // 石墨紫灰
            "gold"     to 0xFFC8A84E.toInt()   // 金属金
        )

        /** 强调色深色变体（按下 / 激活态） */
        val ACCENT_COLOR_VARIANTS: Map<String, Int> = mapOf(
            "slate"    to 0xFF1E3A5E.toInt(),
            "steel"    to 0xFF3A5A7A.toInt(),
            "forest"   to 0xFF2D5B4E.toInt(),
            "wine"     to 0xFF6E3E4E.toInt(),
            "dusk"     to 0xFF5E4A2E.toInt(),
            "graphite" to 0xFF4A4A5E.toInt(),
            "gold"     to 0xFFA08030.toInt()
        )

        /** 强调色中文标签 */
        val ACCENT_COLOR_LABELS: Map<String, String> = mapOf(
            "slate"    to "沉稳蓝灰",
            "steel"    to "钢蓝",
            "forest"   to "森林绿灰",
            "wine"     to "酒红灰",
            "dusk"     to "暮色棕灰",
            "graphite" to "石墨紫灰",
            "gold"     to "金属金"
        )

        /** 强调色 HEX 字符串（用于预览 HTML） */
        val ACCENT_COLOR_HEX: Map<String, String> = mapOf(
            "slate"    to "#2E4E7E",
            "steel"    to "#4A6A8A",
            "forest"   to "#3D6B5E",
            "wine"     to "#7E4E5E",
            "dusk"     to "#6E5A3E",
            "graphite" to "#5A5A6E",
            "gold"     to "#C8A84E"
        )

        /** 背景色预设 */
        val BACKGROUND_COLORS: Map<String, Int> = mapOf(
            "default" to 0xFFF0EDE8.toInt(),  // 暖白
            "warm"    to 0xFFE8E4DD.toInt(),  // 暖灰
            "green"   to 0xFFD5E0D5.toInt(),  // 清新绿
            "blue"    to 0xFFDDE0E8.toInt(),  // 冷蓝
            "pink"    to 0xFFE8DDE0.toInt(),  // 淡粉
            "dark1"   to 0xFF2A2A2E.toInt(),  // 深色1
            "dark2"   to 0xFF1C1C20.toInt(),  // 深色2
            "dark3"   to 0xFF141418.toInt(),  // 深色3
            "dark4"   to 0xFF0D0D10.toInt()   // 纯黑
        )

        /** 背景色中文标签 */
        val BACKGROUND_COLOR_LABELS: Map<String, String> = mapOf(
            "default" to "暖白",
            "warm"    to "暖灰",
            "green"   to "清新绿",
            "blue"    to "冷蓝",
            "pink"    to "淡粉",
            "dark1"   to "深色1",
            "dark2"   to "深色2",
            "dark3"   to "深色3",
            "dark4"   to "纯黑"
        )
    }
}
