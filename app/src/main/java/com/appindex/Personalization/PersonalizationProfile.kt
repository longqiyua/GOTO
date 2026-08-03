package com.appindex.Personalization

/**
 * 个性化设置不可变快照
 * Immutable snapshot of all personalization settings. Use this when you need to pass
 * the user's current preferences to other modules (search engine, UI rendering, etc.)
 * without exposing the mutable [PersonalizationManager] directly.
 *
 * @property isDarkMode                        是否深色模式
 * @property accentColor                       当前强调色（ARGB）
 * @property accentColorVariant                当前强调色深色变体
 * @property backgroundColor                   当前背景色（ARGB）
 * @property cardOpacity                       卡片透明度 0-100
 * @property matchThreshold                    搜索匹配阈值 0-50
 * @property fuzzyWeight                       容错权重 0-100
 * @property usageWeight                       使用频率权重 0-100
 * @property refreshIntervalMilliseconds       刷新间隔（毫秒）
 * @property keyboardLayout                    当前键盘布局
 */
data class PersonalizationProfile(
    val isDarkMode: Boolean = false,
    val accentColor: Int = 0xFF2E4E7E.toInt(),
    val accentColorVariant: Int = 0xFF1E3A5E.toInt(),
    val backgroundColor: Int = 0xFFF0EDE8.toInt(),
    val cardOpacity: Int = 100,
    val matchThreshold: Int = 25,
    val fuzzyWeight: Int = 50,
    val usageWeight: Int = 30,
    val refreshIntervalMilliseconds: Int = 200,
    val keyboardLayout: KeyboardLayout = KeyboardLayout.QWERTY_26,
    // ─── 双轨打字速度 ───
    val isAdaptiveRefreshEnabled: Boolean = true,
    val primaryTypingSpeed: Int = 0,
    val primaryTypingUnit: String = "字/分钟",
    val secondaryTypingSpeed: Int = 0,
    val secondaryTypingUnit: String = "WPM"
) {
    /** 卡片透明度对应的不透明度（0.0-1.0） */
    val cardAlpha: Float
        get() = cardOpacity / 100f

    /** 打字速度双轨显示字符串 */
    val typingSpeedDisplay: String
        get() = "$primaryTypingSpeed $primaryTypingUnit | $secondaryTypingSpeed $secondaryTypingUnit"
}
