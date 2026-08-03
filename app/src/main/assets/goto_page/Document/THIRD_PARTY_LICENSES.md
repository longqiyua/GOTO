# GOTO Third-Party Notices

Generated: 2026-07-22T18:33:31.974Z

Project license: **AGPL-3.0-only**. This inventory uses SPDX identifiers where available. It is generated from current source declarations and is not legal advice.

## Android runtime

### AndroidX Core KTX

- Identifier: `androidx.core:core-ktx`
- Version: 1.12.0
- License: `Apache-2.0`
- Copyright/rightsholder: The Android Open Source Project contributors
- Source: https://developer.android.com/jetpack/androidx/releases/core
- Scope: Android runtime
- Delivery: Bundled in the APK/AAB
- Required action: Retain copyright, license text, and any upstream NOTICE content.

### AndroidX AppCompat

- Identifier: `androidx.appcompat:appcompat`
- Version: 1.6.1
- License: `Apache-2.0`
- Copyright/rightsholder: The Android Open Source Project contributors
- Source: https://developer.android.com/jetpack/androidx/releases/appcompat
- Scope: Android runtime
- Delivery: Bundled in the APK/AAB
- Required action: Retain copyright, license text, and any upstream NOTICE content.

### AndroidX Activity KTX

- Identifier: `androidx.activity:activity-ktx`
- Version: 1.8.2
- License: `Apache-2.0`
- Copyright/rightsholder: The Android Open Source Project contributors
- Source: https://developer.android.com/jetpack/androidx/releases/activity
- Scope: Android runtime
- Delivery: Bundled in the APK/AAB
- Required action: Retain copyright, license text, and any upstream NOTICE content.

### Material Components for Android

- Identifier: `com.google.android.material:material`
- Version: 1.11.0
- License: `Apache-2.0`
- Copyright/rightsholder: Google LLC and Material Components contributors
- Source: https://github.com/material-components/material-components-android
- Scope: Android runtime
- Delivery: Bundled in the APK/AAB
- Required action: Retain copyright, license text, and any upstream NOTICE content.

### AndroidX Lifecycle ViewModel KTX

- Identifier: `androidx.lifecycle:lifecycle-viewmodel-ktx`
- Version: 2.7.0
- License: `Apache-2.0`
- Copyright/rightsholder: The Android Open Source Project contributors
- Source: https://developer.android.com/jetpack/androidx/releases/lifecycle
- Scope: Android runtime
- Delivery: Bundled in the APK/AAB
- Required action: Retain copyright, license text, and any upstream NOTICE content.

### AndroidX Lifecycle Runtime KTX

- Identifier: `androidx.lifecycle:lifecycle-runtime-ktx`
- Version: 2.7.0
- License: `Apache-2.0`
- Copyright/rightsholder: The Android Open Source Project contributors
- Source: https://developer.android.com/jetpack/androidx/releases/lifecycle
- Scope: Android runtime
- Delivery: Bundled in the APK/AAB
- Required action: Retain copyright, license text, and any upstream NOTICE content.

### AndroidX RecyclerView

- Identifier: `androidx.recyclerview:recyclerview`
- Version: 1.3.2
- License: `Apache-2.0`
- Copyright/rightsholder: The Android Open Source Project contributors
- Source: https://developer.android.com/jetpack/androidx/releases/recyclerview
- Scope: Android runtime
- Delivery: Bundled in the APK/AAB
- Required action: Retain copyright, license text, and any upstream NOTICE content.

### Kotlinx Coroutines Android

- Identifier: `org.jetbrains.kotlinx:kotlinx-coroutines-android`
- Version: 1.7.3
- License: `Apache-2.0`
- Copyright/rightsholder: JetBrains s.r.o. and Kotlin contributors
- Source: https://github.com/Kotlin/kotlinx.coroutines
- Scope: Android runtime
- Delivery: Bundled in the APK/AAB
- Required action: Retain copyright, license text, and any upstream NOTICE content.

## Build and compliance tools

### Kotlin Gradle Plugin

- Identifier: `org.jetbrains.kotlin.android`
- Version: 1.9.22
- License: `Apache-2.0`
- Copyright/rightsholder: JetBrains s.r.o. and Kotlin contributors
- Source: https://github.com/JetBrains/kotlin
- Scope: Build tool
- Delivery: Not shipped as an application component
- Required action: Retain notices when redistributing the tool; record version for reproducibility.

### Android Gradle Plugin

- Identifier: `com.android.application`
- Version: 8.2.0
- License: `Apache-2.0`
- Copyright/rightsholder: The Android Open Source Project contributors
- Source: https://android.googlesource.com/platform/tools/base/
- Scope: Build tool
- Delivery: Not shipped as an application component
- Required action: Retain notices when redistributing the tool; Android SDK terms are separate and are not represented as an open-source license.

### Gradle License Report

- Identifier: `com.github.jk1.dependency-license-report`
- Version: 3.1.4
- License: `Apache-2.0`
- Copyright/rightsholder: Evgeny Naumenko and contributors
- Source: https://github.com/jk1/Gradle-License-Report
- Scope: Compliance build tool
- Delivery: Runs during CI; not shipped to end users
- Required action: Retain notices if redistributed; review Unknown entries in every generated report.

## Pages, fonts, and platform

### markdown-it

- Identifier: `markdown-it`
- Version: 13.0.2
- License: `MIT`
- Copyright/rightsholder: Vitaly Puzrin, Alex Kocharin, and contributors
- Source: https://github.com/markdown-it/markdown-it
- Scope: GitHub Pages runtime
- Delivery: Loaded from jsDelivr with an exact version
- Required action: Retain the MIT copyright and permission notice in distributions.

### giscus client

- Identifier: `giscus`
- Version: service-managed / unpinned
- License: `MIT`
- Copyright/rightsholder: giscus contributors
- Source: https://github.com/giscus/giscus
- Scope: Optional GitHub Pages runtime
- Delivery: Loaded only after Say Hello is opened and valid public IDs are available
- Required action: Record the unpinned delivery risk; GitHub authentication, Discussions visibility, and giscus/GitHub privacy terms apply.

### Google Fonts families

- Identifier: `google-fonts`
- Version: Inter; JetBrains Mono; Noto Sans SC; Nunito; Poppins; Geist
- License: `OFL-1.1`
- Copyright/rightsholder: Inter — Rasmus Andersson; JetBrains Mono — JetBrains; Noto Sans SC — Google; Nunito — Vernon Adams; Poppins — Indian Type Foundry; Geist — Vercel contributors
- Source: https://fonts.google.com/
- Scope: GitHub Pages typography
- Delivery: Fetched from Google Fonts CSS/API; Poppins is also bundled locally in Android resources
- Required action: Preserve each font license and copyright notice; do not sell fonts by themselves; renamed modified versions may be required by OFL Reserved Font Name terms.

### SQLite

- Identifier: `sqlite`
- Version: Android platform supplied
- License: `blessing`
- Copyright/rightsholder: No copyright claimed by the SQLite authors
- Source: https://www.sqlite.org/copyright.html
- Scope: Platform capability
- Delivery: Provided by Android; not vendored as a separate GOTO binary
- Required action: No attribution required by SQLite, but platform terms still apply.

## Optional data sources

### HIT Synonym Cilin (Extended)

- Identifier: `hit-cilin`
- Version: not distributed
- License: `LicenseRef-HIT-Research-Only-Unverified`
- Copyright/rightsholder: Harbin Institute of Technology rightsholders
- Source: https://ir.hit.edu.cn/
- Scope: Optional user-imported data source
- Delivery: The full corpus is not distributed by GOTO
- Required action: Research-only or unclear commercial terms must be verified with the rightsholder before any redistribution or commercial use.

### Tencent AI Lab Chinese Word Vectors

- Identifier: `tencent-ai-word-vectors`
- Version: not distributed
- License: `LicenseRef-Tencent-AILab-Data-Terms`
- Copyright/rightsholder: Tencent AI Lab rightsholders
- Source: https://ai.tencent.com/ailab/nlp/en/embedding.html
- Scope: Optional user-imported data source
- Delivery: No vector corpus is distributed by GOTO
- Required action: Users must review the dataset terms before download, import, publication, or commercial use.

## External services

| Service | Purpose | Data boundary | Applicable terms |
|---|---|---|---|
| GitHub Pages | Static site hosting and deployment | Network metadata is processed by GitHub when the site is visited. | GitHub Terms and Privacy Statement |
| GitHub Discussions + giscus | Public Say Hello messages and reactions | Public messages, GitHub identity, reactions, and request metadata are processed only after the visitor opens/uses the feature. | GitHub and giscus terms/privacy |
| Google Fonts | Web font delivery | The browser may send IP address, user agent, referrer, and request metadata when font CSS/files are requested. | Google API terms and Privacy Policy |
| jsDelivr | Pinned markdown-it delivery | The browser sends ordinary CDN request metadata. | jsDelivr terms/privacy |
| Ko-fi | Optional sponsorship link | No data is sent until the visitor opens the external link. | Ko-fi terms/privacy |

## Compliance process

- The Pages workflow regenerates this file on every deployment and on a daily schedule.
- The Gradle license-report plugin inventories Android runtime transitive dependencies. Any Unknown entry requires manual resolution before release.
- Pull requests run GitHub dependency review for vulnerability and license changes.
- Upstream LICENSE and NOTICE texts remain authoritative. Preserve them in redistributions where required.
- Android SDK terms, external service terms, privacy policies, trademarks, and dataset terms are separate from open-source licenses.

Copyright © 2025–2026 GOTO Contributors.
