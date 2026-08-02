# HAC Adaptive Refresh

## Function

HAC (Heuristic Adaptive Control) keeps search responsive while avoiding redundant refreshes. It learns from the five latest valid input intervals and combines adaptive debounce T1 with throttle T2.

Manual test, background learning, parameter inspection, customization, and reset are all supported.

## Design

### Runtime path

- Input rhythm is sampled once from real key intervals; completed searches no longer duplicate samples, and the disabled state does not learn in the background.
- Clearing the field is a state restoration action, so it bypasses debounce, removes stale results immediately, and restores the greeting card.
- Off: search refreshes immediately and HAC does not change scheduling.
- On: valid intervals enter the five-sample window; debounce and throttle limits are recalculated after each accepted sample.

### Settings interaction

- Turning the master switch on expands the parameter menu; turning it off collapses the menu.
- While enabled, the menu remains expanded across refreshes, settings re-entry, and unrelated operations.
- Auto Detect samples only real user input. Turning it off stops learning and applies the T1/T2 sliders.
- The panel exposes the five latest valid intervals, Tavg, pmax, sigma, correction E, T1, and T2.
- Fewer than five valid intervals always use 200 ms and show how many samples remain.
- Moving either slider enters manual mode. Restore Test Data loads the latest valid five-sample result; Reset Defaults clears samples and restores 200 ms Auto Detect.

## Algorithm

```text
T1 = clamp(pmax × (1 + E), Tavg × 2, 400 ms)
T2 = clamp(Tavg + σ, 30 ms, Tavg × 1.5)
```

- `pmax`: smoothed longest recent interval.
- `Tavg`: average interval.
- `σ`: timing variance.
- `E`: backspace ratio, capped at 0.5.

Before five valid samples, both controls start at 200 ms. Samples deviating by more than 50% are ignored, and consecutive `pmax` changes are smoothed over three values.

Backspace raises the correction factor but never above `0.5`.

### Scheduling Logic

```text
On input trigger:
  if (time since last trigger < T2):
    delay = T2 - elapsed
  else:
    delay = T1
  combined delay = max(T1, throttle wait)
```

### Fast-Input Direct Rendering

When user input is detected to be extremely fast (consecutive key interval < 50 ms) and the current query highly matches the previous frame (character overlap ratio ≥ 80%), T1/T2 debounce and throttle are bypassed and rendering is triggered immediately:

```text
if (lastInterval < 50ms && overlapRatio(query, lastQuery) >= 0.8):
    skipAdaptiveRefresh()    // direct render
    return
```

This path maximizes software fluency and responsiveness, avoiding the "lag feel" caused by debounce delays during high-frequency input. Direct rendering only takes effect when Enhanced Smart Intuition is enabled, and does not pollute the HAC sampling pool.

### Hesitation Compensation Delay (Δ_hesitate)

When input triggers either of the following two correction types, a **hesitation compensation delay** Δ_hesitate is stacked on top of the original debounce formula to prevent correction results from being overwritten by fast subsequent input:

```text
combined delay = max(T1, throttle wait) + Δ_hesitate
```

#### Trigger Conditions

| Trigger Type | Detection Condition | Δ_hesitate Calculation |
| --- | --- | --- |
| Adjacent-swap (Swap) correction | Adjacent characters in the query have keyboard distance ≤ 1 (e.g. `weixni` → `weixin`) | `min(80ms, swapHits × 40ms)` |
| Gaussian key-distance decay | Query length ≥ 3 and the standard deviation of the key-distance sequence triggers the decay threshold | `min(100ms, gaussianDecay × 120ms)` |

#### Calculation Examples

```text
Query "weixni" (1 adjacent swap xn→nx):
  swapHits = 1
  Δ_hesitate = min(80, 1 × 40) = 40ms

Query "qweert" (2 adjacent swaps + distance decay):
  swapHits = 2, gaussianDecay = 0.6
  Δ_hesitate = min(80, 2 × 40) + min(100, 0.6 × 120) = 80 + 72 = 152ms
```

#### Design Principles

1. **Upper-bound clamping**: Δ_hesitate caps at 80 ms (Swap) or 100 ms (Gaussian decay) per trigger, avoiding excessive delay.
2. **Stackable**: When both trigger conditions are met, Δ_hesitate is the sum of both, still constrained by the overall upper bound (≤ 180 ms).
3. **Linked with misfire filtering**: Fast launches triggered during Δ_hesitate are treated as misfires, sharing the same repetition-correction logic as adaptive refresh, and are not written into learning samples.
4. **No sample-pool pollution**: Input intervals during Δ_hesitate do not participate in Tavg/σ/pmax calculation, preventing correction scenarios from inflating the baseline delay.

## Boundary

- The calculated debounce never exceeds `400 ms`, and throttle never falls below `30 ms`.
- Regression coverage includes cold start, formula output, boundary clamping, error correction, and the disabled bypass path.

### Robustness Optimization

| Edge Case | Handling |
|----------|----------|
| Extremely fast consecutive input (< 10ms interval) | Ignored as an anomalous sample (>50% deviation); falls back to the 200 ms baseline until enough valid samples accumulate. |
| Backspace ratio exceeds 50% | Correction factor E is capped at 0.5; additional backspaces cannot push the debounce multiplier higher. |
| Paste long text triggering single input | Treated as a single sample without distorting rhythm; downstream debounce keeps using the existing five-sample window. |
| Sample contaminated by anomalous values | Samples deviating by more than 50% from the running average are dropped and never enter the window. |
| localStorage storage failure | Falls back to in-memory defaults with the 200 ms baseline; learning continues without persistence until storage recovers. |
| Input method switch causing rhythm change | Consecutive `pmax` values are smoothed over three samples to absorb sudden rhythm shifts. |
