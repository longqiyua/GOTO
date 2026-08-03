# Basic Settings

## Function

Basic Settings contains only language and Home Cards. Language changes update the interface, built-in sample library, and documentation together.

### Language scope

Language changes update Home, the sample app library, settings, statistics, empty states, feedback, and the documentation tree in one state transition. Current search input is preserved.

### Persistence and acceptance

Language is restored before Home Cards so the initial layout does not flash in the wrong language. Disabling every Home Card returns the search field to the usable screen center without changing width. Refreshing the page must preserve both settings.

The welcome screen defaults to English to match GitHub's international audience. Users can switch to Chinese at any time; the choice is persisted locally and takes precedence on subsequent visits.

## Design

### Home Cards

Home Cards and the search field form one search workspace. With cards disabled, the field rests in the usable screen center and rises with a damped motion after the first click. Recent, Frequent, and Custom cards can be enabled independently.

Recent and Frequent never generate preview statistics. Before Statistics activation they show a dependency notice; after activation they show `NULL` until real launches exist. Recent uses the current-hour history, while Frequent uses all-time totals.

### Custom app editor and default ordering

The circular plus button expands the Custom card itself. The editor reuses real app labels, icons, and brand colors from the device app library. Once the Android shell injects installed apps through `PackageManager`, device icons replace preview fixtures. Existing selections appear first with an `×` removal action; other apps use `+`. Additions and removals are committed together by the full-width Save button, with a limit of 12 apps.

The editor scrolls internally, and its search field and Save button share the same width. With an empty query, Chinese apps are prioritized by the common-use frequency of the first Han character, while Latin names use A–Z order. The mixed list caps Chinese candidates so one writing system does not consume the complete first viewport. During search, match relevance takes precedence and matched scripts are not capped.

## Algorithm

### Default discovery ordering

1. With an empty query, split candidates by script: Chinese (Han) and Latin.
2. Latin names are sorted A–Z.
3. Chinese apps are prioritized by the common-use frequency of the first Han character, scoped to the Ministry of Education's 2013 [Table of General Standard Chinese Characters](https://www.moe.gov.cn/jyb_sjzl/ziliao/A19/201306/t20130601_186002.html) and referencing Peking University's CCL corpus [modern Chinese character-frequency statistics](https://corpus.pku.edu.cn/statistics/ccl_corpus_statistics.html).
4. The mixed list caps Chinese candidates so one writing system does not consume the complete first viewport.
5. During search, match relevance takes precedence and matched scripts are not capped.
6. This ordering affects discovery only, never GOTO search relevance.

## Boundary

### Constraints

- Search remains the only primary action on Home.
- Switches only change state; long explanations live in documentation.
- Language is global and stored locally.

### Robustness Optimization

| Edge case | Detection | Recovery | Verification |
| --- | --- | --- | --- |
| Empty / null setting value | Null / empty check on read | Fall back to default language and default card state | Persistence acceptance test |
| Value out of range | Range validation on restore | Clamp to nearest valid value or reset to default | Persistence acceptance test |
| Persistence failure | Storage write / read exception | Keep in-memory state, retry on next save | Refresh preservation test |
| Conflicting settings | Cross-setting consistency check | Apply deterministic precedence (language > cards) | State transition test |
| Real-time apply failure | Apply callback error | Roll back to last committed state, surface notice | State transition test |
| Layout adaptation error | Layout measure exception | Fall back to centered single-field layout | Disable-all-cards acceptance test |
