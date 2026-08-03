# PRD Product Requirements

## GOTO Mobile PRD v2.0

Version: 2.0  
Updated: 2026-07-01  
Status: Mobile product requirements baseline

### 1. Product overview

GOTO is a local-first mobile application launcher. Users reach an installed application through search, gestures or shortcut indexes with the shortest practical path. Computation and storage remain local and do not require a server.

### 2. Core scenarios

- Find an application such as WeChat with a name, prefix, pinyin or abbreviation.
- Return to the previous application through the floating entry.
- Search for a setting by its name or intent.
- Review weekly usage through local statistics and rankings.

### 3. Functional scope

The baseline includes tolerant search, pinyin and abbreviation matching, shortcut indexes, gesture entry, a draggable edge-snapping floating window, home cards, settings, accessibility, statistics, import/export and reset. Advanced capabilities include adaptive refresh, fuzzy matching and index-tree editing. Light Sense and Super Voice belong to Extensions.

### 4. Interaction and design

Touch targets remain at least 28×28px and settings rows at least 40px. Search, launch and navigation use a shared duplicate-click guard. The standard style uses neutral black, white and grey tones with one accent color. Light Sense may add restrained ceramic/jade material, soft light and texture without changing layout or behavior.

### 5. Technical constraints

The page is a zero-backend local interface using a local index pipeline, `data-i18n` translations and safe local persistence. The baseline viewport is 412×915, with support for tablets, landscape, foldables and flip devices. The Android host supplies installed-app facts through the existing bridge.

### 6. Non-functional requirements

Search should remain responsive on a normal candidate set, animations should complete quickly, data should persist after key actions, and malformed local data must not block startup. Application lists, search records and statistics remain local by default.

### Page title note

The directory continues to show “PRD Product Requirements”. “GOTO Mobile PRD v2.0” is the document subheading; this document change does not alter the phone preview or the three-column page structure.
