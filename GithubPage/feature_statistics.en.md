# Statistics

## Function

> Statistics is not a pre-filled dashboard. Every value remains zero before activation. After activation, only launches initiated inside GOTO count, and unavailable charts remain `null` until real samples exist.

<button class="doc-inline-demo" data-preview-action="stats" data-preview-target="statsThanksCard">Open statistics on the left</button>

### Metrics

- Searches: valid search refreshes after activation.
- Launches: actual app launches from results, Home Cards, or Shortcut Index.
- Input samples: valid values in the four time-of-day buckets.
- Daily average: calculated from recorded local history, never predictions.
- Shortcut Index: successful Quick Launch and Standard Pin matches.

Gesture shortcuts have left the current product scope and are absent from the page, exports, and current documentation.

## Design

### Signals for smart intuition

The page derives first-choice hit rate, search-to-launch conversion, action-chain stability, and 24-hour profile coverage from verified local records. These signals indicate whether the system has enough evidence; they never fill gaps with demo values.

<button class="doc-inline-demo" data-preview-action="stats" data-preview-target="statsIntelligenceCard">Locate intelligence signals</button>

### Clear-data confirmation

Clear Statistics is a standalone action outside the chart cards. It expands into an explanation and countdown, then exposes explicit Confirm and Cancel choices. The operation clears statistics, behavior memory, and activation state while preserving authorization and ordinary settings.

## Algorithm

### Home Card data relationship

- Recent aggregates the 24 hourly buckets that match the current local hour, then ranks real launches for that time context.
- Frequent ranks all-time launch totals and does not use fixture data or predictions.
- Both cards refresh after activation, launch recording, clearing statistics, and configuration changes.
- Statistics disabled: dependency notice. Statistics enabled with no matching data: `NULL`.

### Real-time updates

Searches, launches, and Shortcut Index matches use event-driven writes and refresh the model immediately. A lightweight one-second synchronizer keeps hidden views current, so recording never depends on whether the Statistics page is open.

### Smart Statistical App Launch Ranking

Unlike the 24-hour hourly ranking (strictly segmented by hour), the smart ranking dynamically clusters time segments based on GOTO usage intervals.

#### Segmentation Logic

1. **GOTO launch events as cut points only**: Time points where the user launches an app via GOTO serve as segment boundaries.
2. **Minimum-interval filter**: Adjacent GOTO launches less than 5 minutes apart are treated as continuous operations within the same segment and do not form a new cut point.
3. **Maximum-interval truncation**: When the gap between adjacent cut points exceeds 6 hours, that segment is skipped to avoid overly long segments.
4. **Overlapping segments allowed**: A boundary point belongs to both the preceding and following segments.
5. **Apps may appear in multiple segments**: The same app can recur in the Top 5 of multiple segments.

#### Example

The user launches WeChat via GOTO at 13:02 and launches TikTok via GOTO again at 18:02 → a segment 13:02–18:02 is formed. All app launches within that segment (including non-GOTO launches) are counted toward the ranking.

#### Data Display

Each segment shows:
- Time range (e.g. 13:02–18:02)
- Total launches and duration
- Top 5 app ranking (sorted by launch count, descending)

This card runs independently alongside the 24-hour hourly ranking card without interference.

## Boundary

### Activation boundary

Statistics is inactive by default. Recording starts only after the user completes the long-press activation on the Statistics page.

Before activation, statistic counters display `0`; Home Card data areas display `This feature requires Statistics`. First activation creates a clean baseline, and activation cannot be transferred through configuration imports. After activation, an empty data source displays `NULL` rather than sample content.

### Acceptance criteria

1. All values remain zero before activation, including with legacy test data present.
2. A search, launch, or Shortcut Index match updates its metric immediately after activation.
3. Actions performed while the Statistics page is closed appear without delay when it is reopened.
4. Clearing statistics resets both the visible panel and persisted counters.
5. Recent changes with the local-hour bucket; Frequent remains an all-time ranking.

### Robustness Optimization

| Edge Case | Handling |
|----------|----------|
| Empty statistics data (cold start) | All counters stay at zero; charts display `NULL` rather than sample or demo content. |
| Excessive data volume (>10000 records) | Aggregation and ranking continue to work; totals are computed from the full local history. |
| Cross-day statistics | Daily average is calculated from recorded local history per day; no predictions fill gaps. |
| Time period crossing midnight | 24-hour profile coverage wraps around local hours; Recent aggregates the matching hourly buckets. |
| Empty or abnormal app names | Excluded from rankings; no fixture data or predictions substitute for missing names. |
| localStorage storage failure | In-memory counters keep recording; the one-second synchronizer retries persistence when storage recovers. |
| Too many smart ranking time segments | Only the four time-of-day buckets are accepted; extra segments are ignored. |
| Tied rankings | Stable ties preserve deterministic order across refreshes and configuration changes. |
