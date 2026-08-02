# Personalization

## Function

Personalization manages theme, clock controls, and accent color. It no longer exposes a separate visual-style selector.

## Design

### First-run welcome

The welcome ritual combines the Standard Bauhaus grid with Braun SK4 instrument discipline. Brand, time scale, greeting, language, appearance, and entry form one direct path. The greeting follows local time; choosing a language synchronizes the interface, sample library, and documentation. Light and Dark can be previewed before entering. The entry action stays solid and avoids attention-seeking glow.

<button class="doc-inline-demo" data-preview-action="welcome" data-preview-target="welcomeScreen">Experience the welcome screen on the left</button>

### One base style

- Standard is the only base style: a strict Bauhaus grid, five grayscale levels, one accent, explicit boundaries, and no floating shadows.
- The former Material option is folded into Light Sense and cannot be selected independently.
- Light Sense adds daylight-aware translucent material to the same layout and restores Standard plus the previous Light or Dark theme when disabled.

### Default baseline

Light + Standard is the default. Standard uses five grayscale levels, one accent, solid surfaces, and visible outlines without shadows, glass, glare, or floating hover motion. Material owns all depth effects while preserving the same layout.

## Algorithm

### Contrast and accent selection

1. Compute luminance from the selected accent color.
2. Select foreground color from luminance so buttons, switches, selected segments, and tags share one readable foreground.
3. Accent management uses a circular plus that rotates into an X.
4. New colors append to the end of a six-item list.
5. A seventh color removes the oldest entry (FIFO eviction).
6. Enabling clock seconds updates Home time immediately and remains independent from 12/24-hour format.

## Boundary

### Robustness Optimization

| Edge case | Detection | Recovery | Verification |
| --- | --- | --- | --- |
| Empty personalization data (cold start) | Empty store on first run | Apply Light + Standard default baseline | First-run welcome test |
| Unrecognized keyboard layout | Layout identifier mismatch | Fall back to default layout, keep greeting flow | First-run welcome test |
| Corrupted config file | Parse / integrity check on load | Discard corrupt file, restore default baseline | Default baseline test |
| Expired snapshot | Snapshot version / timestamp check | Discard snapshot, rebuild from defaults | Persistence acceptance test |
| SharedPreferences access failure | Read / write exception | Keep in-memory state, retry on next save | Persistence acceptance test |
| Extreme weight values | Weight range validation | Clamp to valid range, recompute contrast | Contrast selection test |
