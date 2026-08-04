# GOTO

> A local application search and launch tool built around one search field. You do not need to learn gestures or understand settings first: enter what you remember, then launch the app.

<div class="doc-story-intro">
  <strong>GOTO turns finding an app into one input.</strong>
  <p>Names, pinyin, English terms, tags, shortcut characters, and fuzzy input all converge on the same search field. Advanced features exist only to make that field faster, steadier, and more context-aware.</p>
</div>

## Understand it in 30 seconds

<div class="doc-story-flow">
  <button data-preview-action="home-ready" data-preview-target="searchCard"><b>01</b><span><strong>Open search</strong><small>Show the greeting state after the first tap</small></span></button>
  <button data-preview-action="home-search" data-preview-target="searchCard" data-preview-query="wps"><b>02</b><span><strong>Enter a clue</strong><small>Use wps to demonstrate ranking</small></span></button>
  <button data-preview-action="settings" data-preview-target="quickOpsCard"><b>03</b><span><strong>Create an index</strong><small>Bind a familiar character to an app</small></span></button>
  <button data-preview-action="stats" data-preview-target="statsThanksCard"><b>04</b><span><strong>Inspect feedback</strong><small>Only launches made inside GOTO count</small></span></button>
</div>

The complete logic is: **enter a clue → produce candidates → launch an app → improve the next local ranking**.

## The one product surface

GOTO is not its settings, cards, or charts. Its primary surface is the home search field.

1. The default state displays only the search field.
2. The first tap moves it upward and expands it into a greeting and prediction state.
3. Typing hides the greeting and expands the result area according to result count.
4. Clearing restores the greeting; tapping empty space again returns to the default state.
5. Launching a result produces a small global confirmation.

<button class="doc-inline-demo" data-preview-action="home-ready" data-preview-target="searchCard">Verify this state flow on the left</button>

## Four search paths

### 1. Direct matching

Exact, prefix, and containment matches over names, pinyin, English labels, and abbreviations are ranked by certainty.

### 2. Fuzzy matching

Character overlap, adjacent transposition, and keyboard distance handle mistakes. Adjacent transposition participates only after overlap exists and remains the lowest-priority signal.

### 3. Meta-tag indexing

Local tags map an intent such as “payment” or “documents” to apps. Direct name matches still win; tags only add candidates.

### 4. Shortcut indexing

The editor is declarative: **I want to open XX app by entering XX.** A single rule is case-compatible; case only becomes distinguishing when similar rules conflict.

<div class="doc-logic-callout"><b>Ranking rule</b><span>Certainty comes before intelligence. Explicit user choices come before inference. Behavioral signals may reorder existing candidates but must not invent results.</span></div>

## Why advanced features exist

- **Adaptive refresh** learns from five valid input samples, starts at 200 ms, and rejects a single deviation above 50%.
- **Smart intuition** uses time, launch frequency, and action chains for lightweight suggestions.
- **Statistics** records only after explicit activation and only for launches initiated inside GOTO.
- **Light Sense** uses location, time zone, and time of day to drive luminance, color temperature, glass transparency, and light direction.
- **Super Voice** is a planned "Extensions" preview feature. The goal is not to replace the keyboard but to pull voice interaction out of the traditional "tap → record → close" closed loop into a **conversational, non-intrusive** quick-action layer. Currently a placeholder only; no microphone permission is requested. See the dedicated "Features / Super Voice" page.

<button class="doc-inline-demo" data-preview-action="settings" data-preview-target="pioneerCard">Open advanced settings</button>

## The local feedback loop

A search is not a launch. A launch is recorded only after the user selects a candidate and GOTO initiates the app opening. Before statistics activation every value remains zero; after activation, unavailable metrics remain `null` until real samples exist.

<button class="doc-inline-demo" data-preview-action="stats" data-preview-target="statsIntelligenceCard">Inspect smart-intelligence signals</button>

## Why the interface is restrained

Standard mode uses Bauhaus order: grayscale hierarchy, one accent color, explicit borders, and a stable grid. Light Sense carries the material expression through translucent glass, time-aware color, and restrained glow. Layout and interaction stay identical across both.

## Where to continue

For use, read Basic Settings, Shortcut Index, and Adaptive Refresh. For the learning loop, read Statistics, Smart Intuition, and GOTO Engine. For data boundaries, read Data Management and Notices.
