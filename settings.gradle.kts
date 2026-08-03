pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "GOTO"
include(":app")

// v2.1: 嵌入 GOTO Engine Kotlin 模块（四层架构：自适应刷新 / 模糊匹配 / 模拟智能 / 梳理层）。
// Engine 已内置到本仓库的 modules/goto-engine-kotlin，GOTO 复制到其他位置后仍可独立解析。
// 指向 app/ 子目录：该目录的 build.gradle.kts 为模块级配置（android library），
// 源码通过 srcDirs("../src/main/java") 引用同一模块内的 src/main/java。
// 避免加载模块项目级 build.gradle.kts（含 plugins version，会与宿主项目冲突）。
include(":goto-engine")
project(":goto-engine").projectDir = file("modules/goto-engine-kotlin/app")
