package com.appindex

import android.app.Application
import com.appindex.base.GotoBaseRuntime

/** GOTO App host: initializes all App-owned component entry points. */
class GotoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        EngineInitializer.initialize(this)
        GotoBaseRuntime.initialize(this)
    }
}
