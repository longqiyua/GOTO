package com.appindex.base

import android.content.Context
import android.util.Log
import com.goto.base.SemanticSearch
import org.json.JSONObject

/**
 * App-owned GOTO Base entry point.
 *
 * The Base algorithms remain the copied authoritative Kotlin sources under
 * com.goto.base. This class only owns Android asset loading and lifecycle so
 * the App does not depend on the documentation Page or an external folder.
 */
object GotoBaseRuntime {
    private const val TAG = "GotoBaseRuntime"
    private const val VECTOR_ASSET = "rag/vector-store.json"
    private const val INDEX_ASSET = "rag/rag-index.json"
    private const val MODEL_CONFIG_ASSET = "rag/model/config.json"
    private const val MODEL_ASSET = "rag/model/bge-small-zh-v1.5.onnx"

    @Volatile
    private var state = State()
    private var semantic: SemanticSearch? = null

    @Synchronized
    fun initialize(context: Context): State {
        if (state.loaded) return state
        return try {
            val vectorJson = context.assets.open(VECTOR_ASSET).bufferedReader().use { JSONObject(it.readText()) }
            // Keep the shipped index and model metadata observable at runtime.
            context.assets.open(INDEX_ASSET).bufferedReader().use { JSONObject(it.readText()) }
            val modelConfig = context.assets.open(MODEL_CONFIG_ASSET).bufferedReader().use { JSONObject(it.readText()) }
            val modelAssetPresent = context.assets.open(MODEL_ASSET).use { it.available() > 0 }

            val search = SemanticSearch()
            search.load(vectorJson)
            semantic = search
            state = State(
                loaded = search.isLoaded(),
                vectorCount = search.size(),
                dimension = search.dim(),
                model = modelConfig.optString("model", search.model()),
                source = VECTOR_ASSET,
                modelAssetPresent = modelAssetPresent
            )
            Log.i(TAG, "GOTO Base Kotlin READY: $state")
            state
        } catch (error: Throwable) {
            state = State(error = error.message ?: error.javaClass.simpleName)
            Log.e(TAG, "GOTO Base Kotlin RAG initialization failed", error)
            state
        }
    }

    fun status(): State = state

    fun searchByVector(query: DoubleArray, limit: Int = 10): List<Pair<String, Double>> =
        semantic?.searchByVector(query, limit) ?: emptyList()

    data class State(
        val loaded: Boolean = false,
        val vectorCount: Int = 0,
        val dimension: Int = 0,
        val model: String = "",
        val source: String = "",
        val modelAssetPresent: Boolean = false,
        val error: String? = null,
    )
}
