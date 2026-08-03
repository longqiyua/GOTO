package com.goto.base

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.util.concurrent.ConcurrentHashMap

/**
 * GOTO Base — 数据加载与缓存（Kotlin 版）
 *
 * 使用 Android Context 的 assets 或外部文件系统加载 data/ 目录。
 * 内存缓存，线程安全（ConcurrentHashMap）。
 */
class Persistence private constructor(
    private val assetBase: String?,     // assets 路径（如 "GOTO Base/data"）
    private val fileBase: File?,        // 文件系统路径（如 /sdcard/GOTO Base/data）
    private val cache: ConcurrentHashMap<String, String> = ConcurrentHashMap()
) {

    /** 读取文本文件（同步）。 */
    fun readText(relPath: String): String {
        cache[relPath]?.let { return it }

        val text = when {
            fileBase != null -> File(fileBase, relPath).readText(Charsets.UTF_8)
            assetBase != null -> {
                // 通过 ClassLoader 读取 assets（需在 Android 环境下）
                throw UnsupportedOperationException(
                    "Assets 读取需在 Android 环境下由 Context.assets.open 完成，" +
                        "请使用 Persistence.fromAssets(context, assetBase) 并调用 readTextFromAssets"
                )
            }
            else -> throw IllegalStateException("Persistence 未配置路径")
        }

        cache[relPath] = text
        return text
    }

    /** 读取 JSON 文件。 */
    fun readJSON(relPath: String): JSONObject {
        return JSONObject(readText(relPath))
    }

    /** 列出目录下的文件名。 */
    fun listFiles(relDir: String): List<String> {
        if (fileBase != null) {
            val dir = File(fileBase, relDir)
            if (!dir.exists()) return emptyList()
            return dir.listFiles()
                ?.filter { !it.name.startsWith(".") }
                ?.map { "$relDir/${it.name}".replace("//", "/") }
                ?: emptyList()
        }
        return emptyList()
    }

    fun clearCache() = cache.clear()

    companion object {
        /** 从文件系统路径创建（如 externalFilesDir 或绝对路径）。 */
        fun fromFile(dataPath: String): Persistence =
            Persistence(assetBase = null, fileBase = File(dataPath))

        /** 从 Android assets 创建（需在 Android 环境下）。
         *  注意：assets 读取需 Context.assets，此处仅记录路径，
         *  实际读取由调用方在 Android 环境下完成。 */
        fun fromAssets(assetBase: String): Persistence =
            Persistence(assetBase = assetBase, fileBase = null)

        /** Android 推荐用法：优先用 externalFilesDir，fallback 到 assets。 */
        fun fromContext(context: Context, dataPath: String): Persistence {
            val file = File(dataPath)
            return if (file.exists()) fromFile(dataPath)
            else fromAssets(dataPath)
        }
    }
}
