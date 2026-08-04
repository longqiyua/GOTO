package com.appindex

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.appindex.Rerank.BaseReaderPort
import com.appindex.Rerank.BaseWriterPort
import com.appindex.Rerank.EngineBaseBridge
import com.appindex.Rerank.FeedbackChainEvent
import com.appindex.base.GotoBaseRuntime
import com.appindex.component.DefaultEngineFacade
import com.appindex.component.GotoEngineFacade
import org.json.JSONArray
import org.json.JSONObject

/**
 * App-owned runtime composition for the Kotlin Engine module.
 *
 * This class is only an adapter. It does not copy or replace Engine, Base,
 * Where, or Prethink algorithms. It wires the existing Engine facade to the
 * App-owned Base persistence boundary and exposes a single readiness snapshot.
 */
object GotoEngineRuntime {
    private const val TAG = "GotoEngineRuntime"
    private const val PREFS = "goto_engine_runtime"
    private const val FEEDBACK_KEY = "feedback_chain"

    @Volatile
    private var engine: DefaultEngineFacade? = null

    @Volatile
    private var state = State()

    @Synchronized
    fun initialize(context: Context): State {
        if (state.initialized) return state

        return try {
            val appContext = context.applicationContext
            val facade = DefaultEngineFacade(appContext)
            facade.setBaseBridge(EngineBaseBridge(
                reader = PreferencesBaseReader(appContext),
                writer = PreferencesBaseWriter(appContext)
            ))
            engine = facade
            state = State(
                initialized = true,
                facadeReady = true,
                baseBridgeReady = facade.baseBridgeStatus().available,
                ragVectorStoreReady = GotoBaseRuntime.status().loaded,
                ragModelAssetPresent = GotoBaseRuntime.status().modelAssetPresent
            )
            Log.i(TAG, "Kotlin Engine facade + Base bridge READY: $state")
            state
        } catch (error: Throwable) {
            state = State(error = error.message ?: error.javaClass.simpleName)
            Log.e(TAG, "Kotlin Engine runtime initialization failed", error)
            state
        }
    }

    fun facade(): GotoEngineFacade? = engine

    fun status(): State = state

    data class State(
        val initialized: Boolean = false,
        val facadeReady: Boolean = false,
        val baseBridgeReady: Boolean = false,
        val ragVectorStoreReady: Boolean = false,
        val ragModelAssetPresent: Boolean = false,
        val error: String? = null,
    )

    private class PreferencesBaseReader(context: Context) : BaseReaderPort {
        private val prefs: SharedPreferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        override fun getAffinities(query: String, packages: List<String>): Any? =
            JSONObject().apply {
                put("query", query)
                put("packages", JSONArray(packages))
                put("items", JSONObject(prefs.getString("affinities", "{}") ?: "{}"))
            }.toString()

        override fun getHeatmap(): Any? = prefs.getString("heatmap", "{}") ?: "{}"
        override fun getHourlyRanking(): Any? = prefs.getString("hourly_ranking", "{}") ?: "{}"
        override fun getTransitionMatrix(): Any? = prefs.getString("transition_matrix", "{}") ?: "{}"
        override fun getUserContext(): Any? = prefs.getString("user_context", "{}") ?: "{}"

        override fun getRecentFeedback(query: String, limit: Int): Any? {
            val all = JSONArray(prefs.getString(FEEDBACK_KEY, "[]") ?: "[]")
            val result = JSONArray()
            for (index in (all.length() - 1 downTo 0).take(limit)) {
                val event = all.opt(index) ?: continue
                if (query.isBlank() || event.toString().contains(query, ignoreCase = true)) {
                    result.put(event)
                }
            }
            return result.toString()
        }
    }

    private class PreferencesBaseWriter(context: Context) : BaseWriterPort {
        private val prefs: SharedPreferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        override fun recordFeedbackChainEvent(event: FeedbackChainEvent): String? {
            val all = JSONArray(prefs.getString(FEEDBACK_KEY, "[]") ?: "[]")
            val eventId = "feedback-${System.currentTimeMillis()}"
            all.put(JSONObject().apply {
                put("eventId", eventId)
                put("query", event.query)
                put("normalizedQuery", event.normalizedQuery)
                put("clickedPackage", event.clickedPackage)
                put("clickedAppName", event.clickedAppName)
                put("clickedRank", event.clickedRank)
                put("candidateCount", event.candidateCount)
                put("matchMode", event.matchMode)
                put("hour", event.context.hour)
                put("weekday", event.context.weekday)
                put("timestamp", System.currentTimeMillis())
            })
            val start = maxOf(0, all.length() - 500)
            val bounded = JSONArray()
            for (index in start until all.length()) bounded.put(all.get(index))
            prefs.edit().putString(FEEDBACK_KEY, bounded.toString()).apply()
            return eventId
        }
    }
}
