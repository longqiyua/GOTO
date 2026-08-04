import com.github.jk1.license.filter.SpdxLicenseBundleNormalizer
import com.github.jk1.license.render.InventoryHtmlReportRenderer

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.github.jk1.dependency-license-report")
}

android {
    namespace = "com.appindex"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.appindex"
        minSdk = 26
        targetSdk = 34
        versionCode = 2
        versionName = "V1.0 update2"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }

    sourceSets {
        getByName("main") {
            java.srcDirs("src/main/java", "../predev")
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.activity:activity-ktx:1.8.2")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    // SQLite支持（Android内置，无需额外依赖）

    // GOTO Where Phase 3: WorkManager（延迟/周期性任务调度）
    implementation("androidx.work:work-runtime-ktx:2.9.0")

    // v2.1: 嵌入 GOTO Engine Kotlin 模块（四层架构）
    // L1 自适应刷新 / L2 模糊匹配 / L3 模拟智能 / L4 梳理层（PersonalReranker）
    // 通过 settings.gradle.kts include(":goto-engine") 引入
    implementation(project(":goto-engine"))

    // 单元测试
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    testImplementation("org.json:json:20231013")
}


licenseReport {
    configurations = arrayOf("releaseRuntimeClasspath")
    renderers = arrayOf(InventoryHtmlReportRenderer("android-dependencies.html", "GOTO Android runtime dependencies"))
    filters = arrayOf(SpdxLicenseBundleNormalizer())
}
