# Super Voice

## Function

> This is a planned feature. Settings exposes a Chinese-language plaque and places “In development” inside the right-hand button. No fake working toggle is presented.

<button class="doc-inline-demo" data-preview-action="settings" data-preview-target="superVoiceCard">Inspect the planned-feature state</button>

Super Voice is an independent preview card under the top-level **Extensions** category. It is currently in development and declares a Chinese-language scope.

### Purpose

Super Voice is planned to provide voice input for GOTO's single search entry point. It is currently in development. The planned first release supports Chinese only and does not introduce a second launcher surface.

### Design Philosophy: Conversational, Not Transactional

The core goal of Super Voice is not "replace the keyboard with your voice." It is to pull human–computer interaction out of the traditional three-step closed loop of "click → record → close voice," and turn it into a lightweight companion layer that supports **continuous dialogue, continuous operation** after a single activation.

| Dimension | Traditional voice assistant | Super Voice |
| --- | --- | --- |
| Trigger model | Tap mic → record → close each time | One activation holds a listening window; append commands on demand |
| Attention cost | Takes over the screen, forces focus on the voice panel | Non-intrusive; floats above the search box without obscuring candidates |
| Operation continuity | Single closed loop, restart every time | Within one session, multiple commands and multiple launches are allowed |
| Relationship with search | Replaces the search box | Reuses the search box; recognized text feeds the existing ranking pipeline |
| Failure handling | Modal error, forced retry | Silent fallback to keyboard input, no rhythm disruption |

The design principles can be summarized in three lines:

1. **Do not grab attention.** The voice layer is never the main-screen protagonist; the search box and candidates remain visible and tappable.
2. **Do not replace existing paths.** Recognized text still flows through the home search box's unified matching pipeline; no second ranking or second candidate renderer is introduced.
3. **Do not force closure.** Users may issue multiple commands within one voice session, or switch back to the keyboard at any time, without explicitly "closing voice."

## Design

### Current behavior

- The left-side plaque says “Chinese”; the right-side disabled button says only “In development”.
- It does not request microphone permission, start recording, or persist an enabled state.
- When released, queries and app launches will still use the home search field.
- Android microphone permission, offline models, and system speech-service availability depend on the eventual device implementation.

## Algorithm

Recognition logic is not yet implemented. The planned flow will capture audio from the Android microphone, delegate transcription to the system or a third-party speech service, and route the recognized text into the existing home search entry point without introducing a second launcher surface.

## Boundary

### Privacy and permissions

Before microphone access is implemented on Android, the app should explain why the permission is needed and update its privacy notice according to the actual system or third-party recognition service used. This preview does not request microphone access or upload voice data.

### Limitations

Super Voice is a preview feature limited to Chinese. Automatic language detection, multilingual models, and continuous conversation are outside the current scope.

### Robustness Optimization

| Edge case | Handling strategy |
|---|---|
| Voice recognition unavailable | Fall back to the home search field; keep the disabled “In development” state and avoid faking a working toggle. |
| Microphone permission denied | Continue without recording; never persist an enabled state or upload voice data. |
| Recognition timeout | Surface a clear timeout notice and let the user retry from the search field. |
| Empty recognition result | Discard empty transcripts and keep the search field unchanged; prompt retry. |
| Low accuracy in noisy environment | Rely on the system or third-party service noise handling; do not auto-submit low-confidence results. |
