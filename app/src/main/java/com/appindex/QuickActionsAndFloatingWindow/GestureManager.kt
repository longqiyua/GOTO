package com.appindex.QuickActionsAndFloatingWindow

import android.content.Context
import android.content.SharedPreferences
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View
import java.util.UUID

/**
 * 手势操作管理器 v2（会员功能）
 *
 * 支持手势：
 * - 上滑（SWIPE_UP）→ 打开指定应用
 * - 下滑（SWIPE_DOWN）→ 打开指定应用
 * - 左滑（SWIPE_LEFT）→ 打开指定应用
 * - 右滑（SWIPE_RIGHT）→ 打开指定应用
 * - 双击（DOUBLE_TAP）→ 打开指定应用
 * - 自定义手势（CUSTOM）→ 用户录制的手势路径
 *
 * 手势录制流程：
 * 1. 用户点击"录制"按钮
 * 2. 用户在屏幕上绘制手势
 * 3. 系统记录手势路径点
 * 4. 用户点击"确定"保存
 * 5. 下次在任意位置执行相同手势即可启动应用
 */
class GestureManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("gesture_settings", Context.MODE_PRIVATE)

    enum class GestureType {
        SWIPE_UP, SWIPE_DOWN, SWIPE_LEFT, SWIPE_RIGHT, DOUBLE_TAP, CUSTOM
    }

    data class GestureConfig(
        val id: String,
        val gesture: GestureType,
        val packageName: String,
        val appLabel: String,
        val isEnabled: Boolean = true,
        // 自定义手势路径点（归一化坐标 0~1）
        val pathPoints: List<Pair<Float, Float>>? = null
    )

    // ─── 预设手势配置 ───

    fun getGestureConfig(gesture: GestureType): GestureConfig? {
        return getAllGestures().firstOrNull { it.gesture == gesture && it.isEnabled }
    }

    fun setGestureConfig(gesture: GestureType, packageName: String, appLabel: String) {
        val gestures = getAllGestures().toMutableList()
        // 移除相同类型的旧配置
        gestures.removeAll { it.gesture == gesture }
        gestures.add(GestureConfig(
            id = UUID.randomUUID().toString().take(8),
            gesture = gesture,
            packageName = packageName,
            appLabel = appLabel
        ))
        saveGestures(gestures)
    }

    fun disableGesture(gesture: GestureType) {
        val gestures = getAllGestures().toMutableList()
        val idx = gestures.indexOfFirst { it.gesture == gesture }
        if (idx >= 0) {
            gestures[idx] = gestures[idx].copy(isEnabled = false)
            saveGestures(gestures)
        }
    }

    fun clearGesture(gesture: GestureType) {
        val gestures = getAllGestures().toMutableList()
        gestures.removeAll { it.gesture == gesture }
        saveGestures(gestures)
    }

    // ─── 自定义手势（录制） ───

    /**
     * 保存录制的自定义手势
     */
    fun saveCustomGesture(
        packageName: String,
        appLabel: String,
        pathPoints: List<Pair<Float, Float>>
    ) {
        val gestures = getAllGestures().toMutableList()
        gestures.add(GestureConfig(
            id = UUID.randomUUID().toString().take(8),
            gesture = GestureType.CUSTOM,
            packageName = packageName,
            appLabel = appLabel,
            pathPoints = pathPoints
        ))
        saveGestures(gestures)
    }

    /**
     * 删除手势
     */
    fun deleteGesture(gestureId: String) {
        val gestures = getAllGestures().toMutableList()
        gestures.removeAll { it.id == gestureId }
        saveGestures(gestures)
    }

    /**
     * 获取所有手势配置
     */
    fun getAllGestures(): List<GestureConfig> {
        val json = prefs.getString("gestures_json", null) ?: return emptyList()
        return try { parseGestures(json) } catch (_: Exception) { emptyList() }
    }

    /**
     * 获取所有已启用的手势
     */
    fun getAllEnabledGestures(): List<GestureConfig> {
        return getAllGestures().filter { it.isEnabled }
    }

    // ─── 手势匹配 ───

    /**
     * 匹配滑动方向
     */
    fun matchSwipe(dx: Float, dy: Float): GestureConfig? {
        val absDx = kotlin.math.abs(dx)
        val absDy = kotlin.math.abs(dy)
        val gesture = when {
            absDy > absDx && dy < 0 -> GestureType.SWIPE_UP
            absDy > absDx && dy > 0 -> GestureType.SWIPE_DOWN
            absDx > absDy && dx < 0 -> GestureType.SWIPE_LEFT
            absDx > absDy && dx > 0 -> GestureType.SWIPE_RIGHT
            else -> return null
        }
        return getGestureConfig(gesture)
    }

    /**
     * 匹配自定义手势路径（简化版：比较方向序列）
     */
    fun matchCustomPath(points: List<Pair<Float, Float>>): GestureConfig? {
        if (points.size < 3) return null

        val customGestures = getAllGestures().filter {
            it.gesture == GestureType.CUSTOM && it.isEnabled && it.pathPoints != null
        }

        for (gesture in customGestures) {
            val stored = gesture.pathPoints!!
            if (isPathSimilar(points, stored)) {
                return gesture
            }
        }
        return null
    }

    /**
     * 简化路径相似度比较（基于方向序列匹配）
     */
    private fun isPathSimilar(
        input: List<Pair<Float, Float>>,
        stored: List<Pair<Float, Float>>
    ): Boolean {
        if (input.size < 2 || stored.size < 2) return false

        // 提取方向序列
        val inputDirs = extractDirections(input)
        val storedDirs = extractDirections(stored)

        if (inputDirs.isEmpty() || storedDirs.isEmpty()) return false

        // 简单比较：方向序列的编辑距离
        return calculateSimilarity(inputDirs, storedDirs) >= 0.45f
    }

    /**
     * 提取方向序列（U/D/L/R/N=无变化）
     */
    private fun extractDirections(points: List<Pair<Float, Float>>): List<Int> {
        val dirs = mutableListOf<Int>()
        for (i in 1 until points.size) {
            val dx = points[i].first - points[i - 1].first
            val dy = points[i].second - points[i - 1].second
            val threshold = 0.012f
            val dir = when {
                kotlin.math.abs(dy) > kotlin.math.abs(dx) && dy < -threshold -> 0 // UP
                kotlin.math.abs(dy) > kotlin.math.abs(dx) && dy > threshold -> 1  // DOWN
                kotlin.math.abs(dx) > kotlin.math.abs(dy) && dx < -threshold -> 2 // LEFT
                kotlin.math.abs(dx) > kotlin.math.abs(dy) && dx > threshold -> 3  // RIGHT
                else -> 4 // NO_CHANGE
            }
            if (dirs.isEmpty() || dir != dirs.last()) {
                dirs.add(dir)
            }
        }
        return dirs
    }

    /**
     * 计算两个方向序列的相似度（0~1）
     */
    private fun calculateSimilarity(a: List<Int>, b: List<Int>): Float {
        if (a.isEmpty() || b.isEmpty()) return 0f
        val maxLen = maxOf(a.size, b.size)
        var matches = 0
        val minLen = minOf(a.size, b.size)
        for (i in 0 until minLen) {
            if (a[i] == b[i]) matches++
        }
        return matches.toFloat() / maxLen
    }

    // ─── 手势检测器 ───

    fun createGestureDetector(context: Context, listener: GestureListener): GestureDetector {
        return GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
            override fun onFling(
                e1: MotionEvent?,
                e2: MotionEvent,
                velocityX: Float,
                velocityY: Float
            ): Boolean {
                if (e1 == null) return false
                val dx = e2.x - e1.x
                val dy = e2.y - e1.y
                if (kotlin.math.max(kotlin.math.abs(dx), kotlin.math.abs(dy)) < 100f) return false

                val config = matchSwipe(dx, dy)
                if (config != null) {
                    listener.onGestureDetected(config.gesture, config.packageName, config.appLabel)
                    return true
                }
                return false
            }

            override fun onDoubleTap(e: MotionEvent): Boolean {
                val config = getGestureConfig(GestureType.DOUBLE_TAP)
                if (config != null) {
                    listener.onGestureDetected(GestureType.DOUBLE_TAP, config.packageName, config.appLabel)
                    return true
                }
                return super.onDoubleTap(e)
            }
        })
    }

    // ─── 慢速拖拽手势检测 ───

    /**
     * 慢速手势追踪器
     *
     * GestureDetector 的 onFling 只检测快速滑动，无法检测长按+慢速拖拽。
     * 本追踪器通过手动跟踪 ACTION_DOWN/MOVE/UP 事件，
     * 当总移动距离 >= 80px 且速度不足以触发 fling 时，
     * 收集路径点并尝试匹配自定义手势。
     */
    inner class SlowGestureTracker(private val listener: GestureListener) {

        private val dragPoints = mutableListOf<Pair<Float, Float>>()
        private var isDragging = false
        private var downX = 0f
        private var downY = 0f
        private var totalDistance = 0f
        private var lastX = 0f
        private var lastY = 0f

        /** 触摸区域的宽高，用于归一化坐标，需在首次 DOWN 时设置 */
        private var viewWidth = 0
        private var viewHeight = 0

        private val MIN_DISTANCE = 48f   // 最小拖拽距离（px）
        private val MAX_FLING_VELOCITY = 1300f // 低于此速度视为慢速拖拽

        /**
         * 处理触摸事件，返回 true 表示识别到慢速自定义手势
         */
        fun processTouchEvent(view: View, ev: MotionEvent): Boolean {
            when (ev.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = ev.x
                    downY = ev.y
                    lastX = ev.x
                    lastY = ev.y
                    totalDistance = 0f
                    dragPoints.clear()
                    dragPoints.add(Pair(ev.x, ev.y))
                    isDragging = true
                    viewWidth = view.width
                    viewHeight = view.height
                }
                MotionEvent.ACTION_MOVE -> {
                    if (!isDragging) return false
                    val dx = ev.x - lastX
                    val dy = ev.y - lastY
                    totalDistance += kotlin.math.sqrt(dx * dx + dy * dy)
                    dragPoints.add(Pair(ev.x, ev.y))
                    lastX = ev.x
                    lastY = ev.y
                }
                MotionEvent.ACTION_UP -> {
                    if (!isDragging) return false
                    isDragging = false
                    // 计算整体速度
                    val dx = ev.x - downX
                    val dy = ev.y - downY
                    val duration = ev.eventTime - ev.downTime
                    val velocity = if (duration > 0) {
                        kotlin.math.sqrt(dx * dx + dy * dy) / (duration / 1000f)
                    } else 0f

                    // 只有慢速拖拽（非 fling）且距离足够才尝试匹配自定义手势
                    if (totalDistance >= MIN_DISTANCE && velocity < MAX_FLING_VELOCITY) {
                        // 归一化路径点
                        val normalized = if (viewWidth > 0 && viewHeight > 0) {
                            dragPoints.map { (x, y) ->
                                Pair(x / viewWidth, y / viewHeight)
                            }
                        } else {
                            dragPoints
                        }
                        // 尝试匹配自定义手势
                        val config = matchCustomPath(normalized)
                        if (config != null) {
                            listener.onGestureDetected(config.gesture, config.packageName, config.appLabel)
                            return true
                        }
                    }
                    dragPoints.clear()
                }
                MotionEvent.ACTION_CANCEL -> {
                    isDragging = false
                    dragPoints.clear()
                }
            }
            return false
        }
    }

    /**
     * 创建慢速手势追踪器
     */
    fun createSlowGestureTracker(listener: GestureListener): SlowGestureTracker {
        return SlowGestureTracker(listener)
    }

    // ─── 序列化 ───

    private fun saveGestures(gestures: List<GestureConfig>) {
        val arr = org.json.JSONArray()
        gestures.forEach { g ->
            val obj = org.json.JSONObject().apply {
                put("id", g.id)
                put("gesture", g.gesture.name)
                put("pkg", g.packageName)
                put("label", g.appLabel)
                put("enabled", g.isEnabled)
                if (g.pathPoints != null) {
                    val pts = org.json.JSONArray()
                    g.pathPoints.forEach { (x, y) ->
                        pts.put(org.json.JSONArray().apply { put(x); put(y) })
                    }
                    put("points", pts)
                }
            }
            arr.put(obj)
        }
        prefs.edit().putString("gestures_json", arr.toString()).apply()
    }

    private fun parseGestures(json: String): List<GestureConfig> {
        val arr = org.json.JSONArray(json)
        val gestures = mutableListOf<GestureConfig>()
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            val points = mutableListOf<Pair<Float, Float>>()
            val ptsArr = obj.optJSONArray("points")
            if (ptsArr != null) {
                for (j in 0 until ptsArr.length()) {
                    val pt = ptsArr.getJSONArray(j)
                    points.add(Pair(pt.getDouble(0).toFloat(), pt.getDouble(1).toFloat()))
                }
            }
            gestures.add(GestureConfig(
                id = obj.getString("id"),
                gesture = try { GestureType.valueOf(obj.getString("gesture")) } catch (_: Exception) { GestureType.CUSTOM },
                packageName = obj.getString("pkg"),
                appLabel = obj.getString("label"),
                isEnabled = obj.optBoolean("enabled", true),
                pathPoints = if (points.isNotEmpty()) points else null
            ))
        }
        return gestures
    }

    interface GestureListener {
        fun onGestureDetected(gesture: GestureType, packageName: String, appLabel: String)
    }
}
