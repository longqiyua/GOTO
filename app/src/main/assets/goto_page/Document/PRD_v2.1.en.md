# GOTO Product Requirements

Version: 2.1 (Page source edition)  
Date: 2026-08-02  
Status: Page and Android preview synchronization baseline

## 1. Positioning

GOTO is a local-first mobile launcher. A single clue—name, pinyin, abbreviation, tag or fuzzy input—should be enough to find and launch an app. Shortcuts, contextual ranking and local feedback reduce the next interaction cost.

The promise is a shorter launch path, lower attention cost and explainable local intelligence. GOTO is not a cloud search service, does not install apps, and does not turn an opaque recommendation into a confirmed result.

## 2. Boundaries and source of truth

- `GOTO Page/` is the only source for the page, docs and page preview.
- `GOTO/app/src/main/assets/goto_page/` is the synchronized Android WebView copy.
- Kotlin injects installed apps through the existing bridge; Page owns presentation and interaction.
- GOTO Engine handles recall, matching and ranking; GOTO Base owns facts, settings and events; GOTO Where handles context and presentation weight.
- Engine, Base and Where are frozen for this release. Their implementations must not change.

## 3. Core flow

1. Focus the search box.
2. Enter a name, pinyin, abbreviation, tag or fuzzy clue.
3. Engine returns candidates with match reason, order and latency.
4. Where may use time, foreground app and recent behavior to adjust presentation.
5. The user launches a result; Kotlin starts the app and records a local event.
6. Base stores configuration and events; statistics provide feedback without inventing results.

## 4. Requirements

### Search and launch (P0)

Support Chinese/English names, package IDs, pinyin, initials, aliases and typo-tolerant input. Show explainable match types, provide dismissible empty-state suggestions, and support confirm-to-launch and instant-launch modes.

### Shortcuts and floating entry (P0)

Users can bind short strings to apps or settings. Conflicts must be explicit. The floating entry supports search, a configurable double-tap and edge snapping with actionable permission errors.

### Light Sense (P1)

Daylight or time-based theme transitions must be smooth, readable and stable. Provide manual disable, dawn/noon/dusk/night previews and reduced motion support.

### Docs and phone preview linkage (P1)

Document actions should open the corresponding left preview state, scroll the target into view and briefly highlight it. Actions must not silently change user settings.

### GOTO Music (P1)

The directory Music button must prepare and play a real local demo track on the first click. It shares the same state machine as the full Music document, supports pause, preserves audio when leaving the page, and validates every playlist path against `GOTO Page/music/`.

## 5. Experience constraints

Keep the existing two-column layout and phone preview. Polish radius, spacing, shadows and light transitions without a redesign. Respect reduced motion. Keep the Music entry fixed at the bottom of the document tree and provide bundle fallbacks for docs and music.

## 6. Acceptance

- Page opens at `http://127.0.0.1:4173/index.html`.
- Directory Music plays and pauses from the bottom button.
- Playlist paths resolve to real files.
- README, architecture or PRD can trigger visible phone-preview feedback.
- The document bundle covers all Markdown/HTML docs.
- Page and Android assets are synchronized; frozen component directories are unchanged.
- Light Sense remains readable and stable in manual, preview and reduced-motion states.

## 7. Release

GitHub Pages publishes the `GOTO Page/` source to the `site` branch. Preview first, generate and check the document bundle, then synchronize Android assets. Earlier PRDs remain historical context; this version is the active page baseline.
