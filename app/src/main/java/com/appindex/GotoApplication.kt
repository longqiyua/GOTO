package com.appindex

import android.app.Application
import com.appindex.base.GotoBaseRuntime
import com.appindex.where.WhereCompositionRoot

/** GOTO App host: initializes all App-owned component entry points. */
class GotoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        EngineInitializer.initialize(this)
        GotoBaseRuntime.initialize(this)
        GotoEngineRuntime.initialize(this)
        // Prepare Where's permission, signal, scheduler and notification adapters.
        // Starting the reminder service remains an explicit user action.
        WhereCompositionRoot.initialize(this)
    }
}
