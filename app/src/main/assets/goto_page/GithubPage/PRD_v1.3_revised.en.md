# GOTO Mobile — Product Requirements Document (PRD) v1.5

## 2026-07-21 interaction and information architecture baseline

The search field is Home's only primary interaction. It rests in the usable screen center and rises with a damped animation on first focus without changing width. Reminder and results remain one coordinated component; result height follows the actual result count.

Settings and documentation use this order: README, Basic Settings, Personalization, Shortcut Index, Statistics, Adaptive Refresh, Meta-tag Index, Smart Intuition, Accessibility, Data Management, then PRD. Every capability owns one documentation page. Advanced cards expose switches only and never expand.

Shortcut creation is Symbol → App → Quick/Standard → Save. Case sensitivity is automatic: a single variant is tolerant, while multiple case variants in one normalized group become exact. A saved row opens editing; its trailing switch only enables or disables it.

Every material/theme combination shares luminance-based accent contrast. Light Sense is an independent daylight-aware glass mode that restores the current Light or Dark theme when disabled.

## Product definition

GOTO is a lightweight, local-first mobile app launcher evolving into a deterministic action router. The search box is the sole primary interaction surface. Users can find apps by name, pinyin, English, typo-tolerant input, T9, capability, or intent.

## Priorities

| Capability | Requirement | Priority |
| --- | --- | --- |
| Search + HyperFuzzy | Multi-dimensional parallel matching, history correction, top 30 | P0 |
| HAC refresh | Adaptive debounce T1 and throttle T2 | P0 |
| Core UI + language | Welcome flow and complete Chinese/English state sync | P0 |
| Quick index + gestures | Standard and fast launch routes | P1 |
| Home cards | Recent 6, frequent 6, custom up to 12 | P1 |
| Personalization | Flat/neumorphic, light/dark, accent, clock, Light Sense | P1 |
| Meta-tags + Smart Intuition | Local intent matching and behavior learning | P1 |
| Smart Hint | Search-focus-only predictions; no floating window | P1 |

## Key interaction rules

- Home cards and the search box form one visual unit when cards are enabled.
- Focusing the search box moves the whole home-card unit away and opens the search state.
- Smart Hint is shown only after the first search-box click, during the FOCUS → TYPING transition.
- It contains a time-aware greeting and no more than two local predictions.
- Turning Smart Hint off leaves only search, compact status, and the ready cue.

## Non-functional requirements

- Search feedback should remain perceptually immediate; adaptive weight updates target ≤100 ms.
- All intelligent behavior is computed and stored locally.
- UI must support complete Chinese/English switching, clear light-theme typography, safe-area-aware secondary pages, and keyboard/touch accessibility.
- Search results are deterministic, explainable, and capped at 30.

The Chinese PRD remains the full normative source; this English edition provides the product scope and current interaction contract.
