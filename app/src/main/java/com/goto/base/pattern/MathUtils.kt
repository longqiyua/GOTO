package com.goto.base.pattern

import kotlin.math.min
import kotlin.math.pow

/**
 * 数学辅助函数
 *
 * 对齐 goto-base builder patterns 中的 median / percentile / round 工具函数。
 * 所有函数均为纯函数，无副作用。
 */

/**
 * 计算中位数。
 *
 * - 空数组返回 0
 * - 奇数长度取中间元素
 * - 偶数长度取中间两个的平均并四舍五入（对齐 JS Math.round 行为）
 *
 * 注意：与 JS 版本一致，本函数不会先排序，调用方需传入已排序数组（用于 percentile）或
 * 内部会排序（用于 median）。为对齐 JS median 的 `arr.slice().sort()` 行为，
 * 本函数内部会先复制再排序。
 *
 * @param arr 原始数组（不会被修改）
 * @return 中位数（Long，与 JS 的整数分钟/毫秒场景一致）
 */
fun median(arr: List<Long>): Long {
    if (arr.isEmpty()) return 0L
    val sorted = arr.sorted()
    val mid = sorted.size / 2
    return if (sorted.size % 2 == 0) {
        // 偶数：取中间两个的平均并四舍五入（对齐 JS Math.round）
        Math.round((sorted[mid - 1] + sorted[mid]) / 2.0)
    } else {
        sorted[mid]
    }
}

/**
 * 计算中位数（Int 版本，用于分钟场景）。
 */
fun medianInt(arr: List<Int>): Int {
    if (arr.isEmpty()) return 0
    val sorted = arr.sorted()
    val mid = sorted.size / 2
    return if (sorted.size % 2 == 0) {
        // 偶数：对齐 JS Math.round((a+b)/2)
        Math.round((sorted[mid - 1] + sorted[mid]) / 2.0).toInt()
    } else {
        sorted[mid]
    }
}

/**
 * 计算分位数（P90 等）。
 *
 * 对齐 JS percentile：idx = min(len-1, floor(p * len))，返回 sortedArr[idx]。
 * 调用方必须传入已排序的数组。
 *
 * @param sortedArr 已排序数组
 * @param p 分位概率（0..1），如 0.9 表示 P90
 * @return 对应分位的值
 */
fun percentile(sortedArr: List<Long>, p: Double): Long {
    if (sortedArr.isEmpty()) return 0L
    val idx = min(sortedArr.size - 1, (p * sortedArr.size).toInt())
    return sortedArr[idx]
}

/**
 * 四舍五入到指定小数位数。
 *
 * 对齐 JS round：round(v * 10^digits) / 10^digits。
 *
 * @param v 原始值
 * @param digits 小数位数（默认 4）
 * @return 四舍五入后的值
 */
fun round(v: Double, digits: Int = 4): Double {
    val f = 10.0.pow(digits.toDouble())
    return Math.round(v * f) / f
}

/**
 * 安全解析 ISO 时间戳为毫秒。
 *
 * @param iso ISO 8601 字符串
 * @return 毫秒数，解析失败返回 null
 */
fun parseIsoToMs(iso: String?): Long? {
    if (iso.isNullOrEmpty()) return null
    return try {
        java.time.Instant.parse(iso).toEpochMilli()
    } catch (e: Exception) {
        null
    }
}

/**
 * 将毫秒数转为 ISO 8601 字符串（UTC）。
 */
fun msToIso(ms: Long): String {
    return java.time.Instant.ofEpochMilli(ms).toString()
}
