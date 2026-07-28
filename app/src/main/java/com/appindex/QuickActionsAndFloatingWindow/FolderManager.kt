package com.appindex.QuickActionsAndFloatingWindow

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray

/**
 * 文件夹管理器
 *
 * 文件夹：一个大卡片内最多9个应用（3×3九宫格）
 * 普通用户：最多1个文件夹
 * 会员：无限文件夹
 *
 * 用户可自由选择显示快速启动框或文件夹模式
 */
class FolderManager(context: Context) {

    companion object {
        private const val PREFS_NAME = "folder_settings"
        private const val KEY_FOLDERS = "folders_json"
        private const val KEY_DISPLAY_MODE = "display_mode" // "quick_launch" or "folder"
        private const val KEY_QUICK_LAUNCH_ENABLED = "quick_launch_enabled"
        private const val MAX_FREE_FOLDERS = 1
        private const val MAX_APPS_PER_FOLDER = 9
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * 文件夹数据
     */
    data class Folder(
        val id: String,
        val name: String,
        val apps: List<AppEntry>,  // 最多9个
        val timestamp: Long = System.currentTimeMillis()
    )

    data class AppEntry(
        val packageName: String,
        val appLabel: String
    )

    enum class DisplayMode {
        QUICK_LAUNCH,  // 快速启动框
        FOLDER         // 文件夹模式
    }

    // ─── 显示模式 ───

    /** 获取当前显示模式 */
    fun getDisplayMode(): DisplayMode {
        val mode = prefs.getString(KEY_DISPLAY_MODE, "quick_launch") ?: "quick_launch"
        return if (mode == "folder") DisplayMode.FOLDER else DisplayMode.QUICK_LAUNCH
    }

    /** 设置显示模式 */
    fun setDisplayMode(mode: DisplayMode) {
        prefs.edit().putString(KEY_DISPLAY_MODE, mode.name.lowercase()).apply()
    }

    /** 快速启动框是否启用 */
    fun isQuickLaunchEnabled(): Boolean {
        return prefs.getBoolean(KEY_QUICK_LAUNCH_ENABLED, true)
    }

    /** 设置快速启动框启用状态 */
    fun setQuickLaunchEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_QUICK_LAUNCH_ENABLED, enabled).apply()
    }

    // ─── 文件夹 CRUD ───

    /** 获取所有文件夹 */
    fun getAllFolders(): List<Folder> {
        val json = prefs.getString(KEY_FOLDERS, null) ?: return emptyList()
        return try { parseFolders(json) } catch (_: Exception) { emptyList() }
    }

    /** 添加文件夹 */
    fun addFolder(folder: Folder, isMember: Boolean = true): Boolean {
        val folders = getAllFolders().toMutableList()
        folders.add(folder)
        saveFolders(folders)
        return true
    }

    /** 更新文件夹 */
    fun updateFolder(folder: Folder) {
        val folders = getAllFolders().toMutableList()
        val idx = folders.indexOfFirst { it.id == folder.id }
        if (idx >= 0) {
            folders[idx] = folder
            saveFolders(folders)
        }
    }

    /** 删除文件夹 */
    fun deleteFolder(folderId: String) {
        val folders = getAllFolders().toMutableList()
        folders.removeAll { it.id == folderId }
        saveFolders(folders)
    }

    /** 获取文件夹数量 */
    fun getFolderCount(): Int = getAllFolders().size

    /** 获取最大文件夹数 */
    fun getMaxFolders(isMember: Boolean = true): Int {
        return Int.MAX_VALUE
    }

    /** 清空所有文件夹 */
    fun clearAll() {
        prefs.edit().remove(KEY_FOLDERS).apply()
    }

    // ─── 序列化 ───

    private fun saveFolders(folders: List<Folder>) {
        val arr = JSONArray()
        folders.forEach { folder ->
            val obj = org.json.JSONObject().apply {
                put("id", folder.id)
                put("name", folder.name)
                put("timestamp", folder.timestamp)
                val apps = JSONArray()
                folder.apps.forEach { app ->
                    apps.put(org.json.JSONObject().apply {
                        put("packageName", app.packageName)
                        put("appLabel", app.appLabel)
                    })
                }
                put("apps", apps)
            }
            arr.put(obj)
        }
        prefs.edit().putString(KEY_FOLDERS, arr.toString()).apply()
    }

    private fun parseFolders(json: String): List<Folder> {
        val arr = JSONArray(json)
        val folders = mutableListOf<Folder>()
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            val appsArr = obj.optJSONArray("apps") ?: JSONArray()
            val apps = mutableListOf<AppEntry>()
            for (j in 0 until appsArr.length()) {
                if (apps.size >= MAX_APPS_PER_FOLDER) break
                val appObj = appsArr.getJSONObject(j)
                apps.add(AppEntry(
                    packageName = appObj.getString("packageName"),
                    appLabel = appObj.getString("appLabel")
                ))
            }
            folders.add(Folder(
                id = obj.getString("id"),
                name = obj.getString("name"),
                apps = apps,
                timestamp = obj.optLong("timestamp", System.currentTimeMillis())
            ))
        }
        return folders
    }
}
