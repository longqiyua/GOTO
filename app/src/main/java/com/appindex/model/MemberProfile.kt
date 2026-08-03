package com.appindex.model

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * 会员档案
 *
 * 金色名牌格式：SuperGOTO U00001
 * - SuperGOTO: 固定前缀（金色显示）
 * - U00001: 会员编号，U + 5位数字
 * - 同一授权码在不同设备上共享同一编号
 * - 设备随便换，同一时刻仅一台可用
 */
data class MemberProfile(
    val isMember: Boolean = true,
    val memberId: String = "U00001",
    val licenseCode: String = "",
    val orderId: String = "",
    val registerTimestamp: Long = System.currentTimeMillis(),
    val isOffline: Boolean = false
) {
    val badgeText: String
        get() = if (isMember) "SuperGOTO $memberId" else ""

    val isValid: Boolean
        get() = isMember && memberId.startsWith("U") && memberId.length == 6

    /** 注册日期格式化文本 */
    val registerDateText: String
        get() {
            if (registerTimestamp <= 0) return ""
            return DATE_FORMAT.format(Date(registerTimestamp))
        }

    /** 使用天数 */
    val daysUsed: Int
        get() {
            if (registerTimestamp <= 0) return 0
            val diff = System.currentTimeMillis() - registerTimestamp
            return TimeUnit.MILLISECONDS.toDays(diff).toInt().coerceAtLeast(0)
        }

    val daysUsedText: String
        get() = if (isMember) "${daysUsed}天" else ""

    /** 完整名牌信息 */
    val badgeFullText: String
        get() = if (isMember) "SuperGOTO $memberId · ${daysUsed}天" else ""

    companion object {
        private val DATE_FORMAT = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    }
}
