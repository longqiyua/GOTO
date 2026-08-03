# Light Sense

## Function

> Light Sense is an independent material system, not an automatic dark theme. Location, time zone, and time of day jointly drive luminance, color temperature, glass opacity, blur strength, and light direction.

<button class="doc-inline-demo" data-preview-action="settings" data-preview-target="lightSenseCard">Open Light Sense on the left</button>

<div class="doc-story-flow">
  <button data-preview-action="light-sense-preview" data-preview-target="lightSenseCard" data-preview-query="390"><b>06:30</b><span><strong>Dawn</strong><small>Light glass warms as the source rises from a low angle.</small></span></button>
  <button data-preview-action="light-sense-preview" data-preview-target="lightSenseCard" data-preview-query="720"><b>12:00</b><span><strong>Noon</strong><small>Brightness and clarity peak without reducing text contrast.</small></span></button>
  <button data-preview-action="light-sense-preview" data-preview-target="lightSenseCard" data-preview-query="1110"><b>18:30</b><span><strong>Dusk</strong><small>Ambient warmth increases without producing a yellow screen.</small></span></button>
  <button data-preview-action="light-sense-preview" data-preview-target="lightSenseCard" data-preview-query="1380"><b>23:00</b><span><strong>Night</strong><small>Dark translucent glass takes over and text reverses automatically.</small></span></button>
</div>

Light Sense and Super Voice are grouped under the top-level **Extensions** category while remaining independent feature cards.

Light Sense is GOTO's visual comfort layer. It preserves the current card hierarchy and adjusts its existing color tokens and brightness using location/time or a custom timezone. It does not stack another card skin or full-screen glow layer.

## Design

Users can select UTC-12 through UTC+12 and optionally authorize location for sunrise and sunset. The slider explicitly previews 00:00 through 23:59, while "Return to live time" restores the current zoned time. Day and night preserve identical geometry.

The Light Sense panel uses a single-column hierarchy for location and timezone, sun phase, 24-hour color temperature, and presets. Closing the panel does not disable the feature.

- Four ceilings: Cool 6500K, Natural 5500K, Warm 3400K, Candle 2700K.
- Seven day phases smoothly vary warmth, blur, brightness, opacity, and grayscale.
- Auto mode follows sunrise/sunset; manual mode locks the selected preset.
- Warm saturation is clamped to avoid an obvious yellow cast.

## Algorithm

Light Sense always computes material state on a 24-hour minute scale in the selected zone; the 12/24-hour preference only formats the smart reminder clock.

## Boundary

While enabled, Light Sense has priority over the base light/dark palette. It is not a fixed black theme: selected timezone, sun phase, and preview time drive the same material model across the phone and documentation, while text contrast remains protected.

### Robustness Optimization

| Edge case | Handling strategy |
|---|---|
| Light sensor unavailable | Fall back to timezone and time-of-day computation; material state derives from sun phase without sensor input. |
| Abnormal light values | Clamp luminance and color temperature to the four-ceiling range; reject out-of-bounds sensor readings. |
| Day/night transition突变 | Smoothly interpolate warmth, blur, brightness, opacity, and grayscale across the seven day phases to avoid abrupt shifts. |
| Light sense vs dark mode conflict | Light Sense takes priority over the base light/dark palette while enabled; disabling restores the base palette. |
| Card width abnormal in light sense mode | Preserve the current card hierarchy and geometry; Light Sense adjusts only color tokens and brightness, not layout. |
| Sensor permission denied | Continue with manual timezone selection and auto sun-phase computation; skip location-based sunrise/sunset. |
