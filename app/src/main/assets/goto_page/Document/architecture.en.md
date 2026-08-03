# GOTO Core Architecture

> Start here. **GOTO Page is the page source; GOTO Engine, GOTO Base and GOTO Where are frozen components.** The page may present, compose and call them, but it must not reimplement them.

<div class="doc-story-intro">
  <span class="doc-story-kicker">Four layers</span>
  <strong>Input enters Page, Engine computes candidates, Where adds context, and Base stores facts.</strong>
  <p>The Android host provides installed apps and events. Page owns readable interaction and preview. Core components remain isolated and testable.</p>
</div>

## Responsibilities

### GOTO Engine — from clues to candidates

Engine is the search computation layer. It accepts input, an application index and optional context, then returns candidates with scores and explanations.

- Exact, prefix, pinyin/abbreviation, fuzzy recall and ranking belong here.
- Engine does not store preferences and does not access the Android database directly.
- Results must remain explainable. Page can show the reason and latency, but must not redefine score semantics.

<button class="doc-inline-demo" data-preview-action="engine-api" data-preview-target="engineApiOutput" data-preview-query="weix">Query Engine from the preview</button>

<pre id="engineApiOutput" data-engine-output>Waiting for the document action…</pre>

### GOTO Base — facts and contracts

Base is the local data and configuration boundary: app facts, user settings, behavior events, and import/export records. It does not make product decisions for Page.

The Base implementation and data contract are frozen. Page work may add documentation, validation messages and visual feedback, but must not change storage semantics.

### GOTO Where — context and situation

Where uses time, foreground app, recent behavior and preferences to choose how existing candidates should be presented. It may adjust contextual weight, but it cannot invent an app or replace Engine search.

The Where implementation is frozen. Page consumes its existing output and explains “why this is shown now”.

## Page and Kotlin synchronization

| Layer | Source | Rule |
| --- | --- | --- |
| Page source | `GOTO Page/` | Edit here first, then generate the bundle |
| Android WebView assets | `GOTO/app/src/main/assets/goto_page/` | Sync with the page sync script |
| Android host | `GOTO/app/src/main/java/.../GotoWebActivity.kt` | Change only when the bridge contract changes |
| Engine / Base / Where | Frozen component directories | Do not change in this editing pass |

Allowed: documentation, PRD, page-level layout polish, transitions, preview linkage, error states, music entry and synchronization tooling. Not allowed: changing core algorithms, data contracts, context semantics or bridge field meaning.
