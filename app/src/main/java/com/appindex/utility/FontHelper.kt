package com.appindex.Utility

import android.content.Context
import android.graphics.Typeface
import android.widget.TextView
import androidx.core.content.res.ResourcesCompat
import com.appindex.R

/**
 * 字体辅助工具
 *
 * SuperGOTO 品牌文字 → Poppins (Bold)
 * 会员编号 (U00001) → JetBrains Mono (Bold)
 * 统计页面数字 → Outfit（几何无衬线，适合数字展示）
 *
 * 字体文件放置在 res/font/ 目录：
 *   - res/font/poppins_bold.xml
 *   - res/font/outfit.xml（font-family，含 400/600/700 权重）
 *
 * 如果字体资源不存在，则使用默认字体（不影响功能）
 */
object FontHelper {
    private var poppinsBold: Typeface? = null
    private var jetbrainsMonoBold: Typeface? = null
    private var outfit: Typeface? = null
    private var initialized = false

    /**
     * 初始化字体（懒加载，只执行一次）
     */
    private fun init(context: Context) {
        if (initialized) return
        initialized = true
        try {
            poppinsBold = ResourcesCompat.getFont(context, R.font.poppins_bold)
        } catch (_: Exception) {
            // 字体资源不存在，使用默认字体
        }
        try {
            // JetBrains Mono 字体文件需放入 res/font/ 目录
            // 如果不存在则使用等宽字体作为替代
            jetbrainsMonoBold = Typeface.MONOSPACE
        } catch (_: Exception) {}
        try {
            outfit = ResourcesCompat.getFont(context, R.font.outfit)
        } catch (_: Exception) {
            // Outfit 字体不存在，使用默认字体
        }
    }

    /**
     * 设置 SuperGOTO 品牌文字字体（Poppins Bold）
     */
    fun applyBrandFont(context: Context, textView: TextView) {
        init(context)
        poppinsBold?.let { textView.typeface = it }
    }

    /**
     * 设置会员编号字体（JetBrains Mono Bold / 等宽替代）
     */
    fun applyMemberIdFont(context: Context, textView: TextView) {
        init(context)
        jetbrainsMonoBold?.let { textView.typeface = it }
    }

    /**
     * 设置统计页面数字字体（Outfit）
     * 用于使用天数、搜索次数、打开次数、排名编号等数字展示
     */
    fun applyOutfitFont(context: Context, textView: TextView) {
        init(context)
        outfit?.let { textView.typeface = it }
    }
}
