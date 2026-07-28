package com.appindex.UIUX

import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.appindex.R
import com.appindex.StatisticsData.UsageStatisticsManager

/**
 * 使用统计页面
 *
 * 独立页面，多卡片布局，与设置页风格一致
 * 卡片1：概览（使用天数/搜索次数/打开次数/使用时长/累计字符）
 * 卡片2：应用启动排名 Top 5（条形图）
 * 卡片3：全部排名（展开后显示）
 */
class RankingActivity : AppCompatActivity() {

    private lateinit var top5Container: LinearLayout
    private lateinit var allRankContainer: LinearLayout
    private lateinit var allRankCard: LinearLayout
    private lateinit var btnShowAll: TextView

    private val usageStatisticsManager by lazy { UsageStatisticsManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ranking)

        top5Container = findViewById(R.id.top5Container)
        allRankContainer = findViewById(R.id.allRankContainer)
        allRankCard = findViewById(R.id.allRankCard)
        btnShowAll = findViewById(R.id.btnShowAll)

        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }

        // 右滑 → 设置页面
        val scrollView = (findViewById<android.view.View>(android.R.id.content) as android.view.ViewGroup).getChildAt(0)
        var startX = 0f
        scrollView.setOnTouchListener { _, event ->
            when (event.action) {
                android.view.MotionEvent.ACTION_DOWN -> { startX = event.x }
                android.view.MotionEvent.ACTION_UP -> {
                    val dx = event.x - startX
                    if (dx > 120f) {
                        startActivity(Intent(this, SettingsActivity::class.java))
                        overridePendingTransition(android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                    }
                }
            }
            false
        }

        btnShowAll.setOnClickListener {
            if (allRankCard.visibility == View.GONE) {
                allRankCard.visibility = View.VISIBLE
                btnShowAll.text = "收起全部排名"
                buildAllRanking()
            } else {
                allRankCard.visibility = View.GONE
                btnShowAll.text = "查看全部排名"
            }
        }

        populateOverview()
        buildTop5()
    }

    /**
     * 填充概览卡片数据
     */
    private fun populateOverview() {
        val days = calculateDaysUsed()
        findViewById<TextView>(R.id.statDaysUsed).text = if (days > 0) days.toString() else "—"
        findViewById<TextView>(R.id.statSearchCount).text = if (usageStatisticsManager.totalSearchCount > 0) usageStatisticsManager.totalSearchCount.toString() else "—"
        findViewById<TextView>(R.id.statOpenCount).text = if (usageStatisticsManager.totalOpenCount > 0) usageStatisticsManager.totalOpenCount.toString() else "—"
        findViewById<TextView>(R.id.statUsageTime).text = if (usageStatisticsManager.totalUsageSeconds > 0) usageStatisticsManager.formattedUsageTime else "—"
        findViewById<TextView>(R.id.statCharsTyped).text = if (usageStatisticsManager.totalCharacterCount > 0) usageStatisticsManager.totalCharacterCount.toString() else "—"
    }

    /**
     * 计算使用天数（从注册日期到今天）
     */
    private fun calculateDaysUsed(): Int {
        val prefs = getSharedPreferences("appindex_license", MODE_PRIVATE)
        val regTs = prefs.getLong("register_timestamp", 0L)
        if (regTs <= 0) return 0
        val now = System.currentTimeMillis()
        return ((now - regTs) / (1000 * 60 * 60 * 24)).toInt().coerceAtLeast(0)
    }

    /**
     * 解析 App_Launches 并排序
     */
    private fun getSortedLaunches(): List<AppLaunchItem> {
        val launches = usageStatisticsManager.getApplicationLaunches()
        val items = mutableListOf<AppLaunchItem>()
        val pm = packageManager

        for (i in 0 until launches.length()) {
            val obj = launches.getJSONObject(i)
            val pkg = obj.getString("packageName")
            val label = obj.optString("label", pkg)
            val times = obj.optInt("OpenTimes", 0)
            if (times > 0) {
                val icon = try {
                    pm.getApplicationIcon(pkg)
                } catch (_: Exception) {
                    null
                }
                items.add(AppLaunchItem(pkg, label, times, icon))
            }
        }

        return items.sortedByDescending { it.times }
    }

    /**
     * 构建 Top 5 条形图
     */
    private fun buildTop5() {
        top5Container.removeAllViews()
        val items = getSortedLaunches().take(5)
        if (items.isEmpty()) {
            top5Container.addView(TextView(this).apply {
                text = "暂无启动记录"
                textSize = 14f
                setTextColor(ContextCompat.getColor(this@RankingActivity, R.color.text_tertiary))
                gravity = Gravity.CENTER
                setPadding(0, 32, 0, 32)
            })
            btnShowAll.visibility = View.GONE
            return
        }
        val maxTimes = items.first().times
        val accentColor = ContextCompat.getColor(this, R.color.accent)
        items.forEachIndexed { index, item ->
            top5Container.addView(buildBarRow(item, index + 1, maxTimes, accentColor))
        }
    }

    /**
     * 构建全部排名
     */
    private fun buildAllRanking() {
        allRankContainer.removeAllViews()
        val items = getSortedLaunches()
        if (items.isEmpty()) return
        val maxTimes = items.first().times
        val accentColor = ContextCompat.getColor(this, R.color.accent)

        items.forEachIndexed { index, item ->
            allRankContainer.addView(buildBarRow(item, index + 1, maxTimes, accentColor))
        }
    }

    /**
     * 构建单行条形图
     * 布局：[排名] [图标] [应用名] [条形图] [次数]
     */
    private fun buildBarRow(item: AppLaunchItem, rank: Int, maxTimes: Int, accentColor: Int): LinearLayout {
        val density = resources.displayMetrics.density
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, (8 * density).toInt(), 0, (8 * density).toInt())
        }

        // 排名编号
        val rankText = TextView(this).apply {
            text = "$rank"
            textSize = 13f
            gravity = Gravity.CENTER
            setTextColor(if (rank <= 3) accentColor else ContextCompat.getColor(context, R.color.text_tertiary))
            layoutParams = LinearLayout.LayoutParams((28 * density).toInt(), LinearLayout.LayoutParams.WRAP_CONTENT)
        }

        // 图标（圆形裁剪 + 主题色边框）
        val iconSize = (36 * density).toInt()
        val iconWrapper = LinearLayout(this).apply {
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(iconSize, iconSize).apply {
                marginStart = (8 * density).toInt()
            }
            setBackgroundResource(R.drawable.icon_circle_bg)
            background?.setTint(accentColor)
            setPadding((2 * density).toInt(), (2 * density).toInt(), (2 * density).toInt(), (2 * density).toInt())
        }
        val iconView = ImageView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                (iconSize - 4 * density).toInt(), (iconSize - 4 * density).toInt()
            )
            setImageDrawable(item.icon)
            if (item.icon == null) {
                setImageResource(android.R.drawable.sym_def_app_icon)
            }
        }
        iconWrapper.addView(iconView)

        // 应用名
        val nameText = TextView(this).apply {
            text = item.label
            textSize = 13f
            setTextColor(ContextCompat.getColor(context, R.color.text_primary))
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            layoutParams = LinearLayout.LayoutParams((80 * density).toInt(), LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                marginStart = (8 * density).toInt()
            }
        }

        // 条形图（进度条）
        val barContainer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(0, (16 * density).toInt(), 1f).apply {
                marginStart = (8 * density).toInt()
            }
        }
        val barBg = View(this).apply {
            setBackgroundColor(ContextCompat.getColor(context, R.color.divider))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT
            )
        }
        val barFill = View(this).apply {
            setBackgroundColor(accentColor)
            val ratio = if (maxTimes > 0) item.times.toFloat() / maxTimes else 0f
            layoutParams = LinearLayout.LayoutParams(
                (ratio * 1000).toInt(), LinearLayout.LayoutParams.MATCH_PARENT
            ).apply { weight = 1000f }
        }
        barContainer.addView(barBg)
        barContainer.addView(barFill)

        // 次数
        val countText = TextView(this).apply {
            text = "${item.times}次"
            textSize = 12f
            setTextColor(ContextCompat.getColor(context, R.color.text_secondary))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                marginStart = (8 * density).toInt()
            }
        }

        row.addView(rankText)
        row.addView(iconWrapper)
        row.addView(nameText)
        row.addView(barContainer)
        row.addView(countText)

        return row
    }

    data class AppLaunchItem(
        val packageName: String,
        val label: String,
        val times: Int,
        val icon: Drawable?
    )
}
