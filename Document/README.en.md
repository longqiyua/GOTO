# GOTO

> One input, direct access. GOTO is a local-first app search and launcher: type the name, spelling, abbreviation, or keyword you remember, then get to the app with less friction.

<div class="doc-story-intro">
  <strong>Make finding an app a short, calm, predictable action.</strong>
  <p>GOTO keeps the experience focused: the search field is always close, results are easy to confirm, and recent and common entries evolve with real use.</p>
</div>

## Understand GOTO in 30 seconds

The home screen centers on one action: open the search field, type what you want, and choose a result. You do not need to remember where an app sits on the launcher or navigate through a large menu.

<button class="doc-inline-demo" data-preview-action="home-ready">View the home screen preview</button>

1. **Open search**: the field expands downward with a stable area for results.
2. **Type what you remember**: names, English, Chinese, pinyin, abbreviations, tags, and common fuzzy input are supported.
3. **Confirm the result**: result cards prefer the real app name and system icon. If an icon cannot be read, GOTO uses a consistent neutral-gray placeholder instead of inventing one.
4. **Launch**: on Android, GOTO uses system capabilities to launch the real app; the web preview shows the corresponding interaction state.

## What GOTO does for you

### Find apps faster

Type a full name, a Chinese name, a pinyin fragment, or only the part you remember. GOTO organizes candidates into readable cards and keeps the most likely target easy to confirm.

When nothing matches, the empty state keeps a fixed size and position so the page does not jump as the message changes. Edit the query or return to the home screen to use recent and common entries.

<button class="doc-inline-demo" data-preview-action="home-search" data-preview-query="chrome">Try search in the preview</button>

### Recent and common entries evolve with you

Home cards are not fixed demo data. Recent entries prioritize the most-used apps in the current time period and use nearby-period data when needed; common entries reflect the highest usage across periods.

When there is no history, GOTO explains that there is nothing to display instead of filling the screen with fake apps. With real use, the cards become your personal launch surface.

### Adjust the experience without learning a system

Basic settings, personalization, accessibility, and light-sense mode are deliberately small adjustments. Language, clock display, seconds, theme, motion, and card treatment can be changed in settings. Reset returns to clear defaults, including English, a 12-hour clock, and seconds disabled.

<button class="doc-inline-demo" data-preview-action="settings">View settings in the preview</button>

Light-sense mode changes atmosphere, not search behavior. It adds a restrained glazed, misted material response based on the device environment. Without location permission it falls back to a conservative timezone estimate. System permission prompts explain the request, and basic search remains available if permission is declined.

### Put reminders in the right context

GOTO Where is the proactive reminder layer. With notification permission, it uses time, the foreground app, and recent behavior to decide when a reminder is appropriate and can send a real system notification. It does not rewrite your query or invent apps.

### Keep advanced power out of the way

SuperGOTO groups advanced capabilities behind one switch. When enabled, you can progressively use adaptive refresh, GOTO Prethink, fuzzy matching, metadata indexing, simulated intelligence, and super voice. When disabled, the home screen stays simple.

GOTO Prethink proposes a small set of possible query readings before search without changing the original input. The final result is still confirmed by the search flow. Component boundaries and implementation details belong in Architecture, not in this user-facing introduction.

<button class="doc-inline-demo" data-preview-action="supergoto">View advanced settings in the preview</button>

## A steadier everyday experience

### Real apps, real entry points

The Android app reads installed apps, names, icons, and launchable activities from the device. It does not ship a device-independent fake app list. If an icon cannot be obtained, a consistent gray placeholder is shown while the real name and launch state are preserved.

### Built for different screens

GOTO is designed for phones, tablets, foldables, and Flip devices. It adapts to the actual window and safe areas instead of nesting a fixed web page inside the phone. Search, cards, status bars, and bottom areas keep independent spacing rules through orientation changes.

### Clear state feedback

Launching an app produces a short confirmation. No results, missing permissions, empty statistics, and unavailable icons each have their own explanation. Motion has a gentle buffer and damping without blocking input or delaying launches.

### Local-first and permission-aware

App data, usage statistics, settings, and search history stay on the device by default. When notification, location, or app information is needed, GOTO uses the system permission flow and keeps basic features usable without it. Permissions can be revoked in system settings.

<button class="doc-inline-demo" data-preview-action="stats">View statistics in the preview</button>

## The document and phone preview work together

The right-hand document is more than a text page. Selected sections provide a “view in phone preview” action that moves the left preview to the related page or state, connecting the explanation to the experience. The Android app follows the same experience contract while connecting to real system capabilities.

Document sources live in `Document/` and are rendered into the right-hand content area. Product explanations can therefore evolve without hard-coding every sentence into page scripts.

## Continue reading

- **Architecture**: responsibilities and boundaries for Page, Prethink, Engine, Where, Base, and the Android host.
- **PRD**: user goals, feature inventory, acceptance criteria, and release scope.
- **Feature documents**: focused behavior for settings, statistics, light-sense mode, accessibility, and data management.
- **UI and interaction specification**: search, cards, feedback, and responsive rules.
- **Open-source notices**: dependencies and corresponding notices.

GOTO is designed to make the next launch feel closer to: think of it, go to it.
