# Accessibility

## Function

The master switch controls the accessibility group. Options include stronger contrast, reduced motion, larger touch targets, and assistive labels.

## Design

Each target card expands from itself instead of expanding its parent card. Settings show only capability names, current state, and required controls. Explanatory subtitles live in this document. Color-vision and low-vision cards expand from themselves, while Reduced Motion removes decorative overshoot but preserves necessary spatial transitions. Every control must expose a readable name, visible focus, and a state that does not rely on color alone.

## Algorithm

Turning the master switch off suspends the effects without deleting the selected color-vision and low-vision modes. Turning it on restores the most recent selections. Selecting the active option again clears that individual mode.

## Boundary

Acceptance requires visible keyboard focus, non-color state cues, and no hidden primary actions.

### Robustness Optimization

| Edge case | Handling strategy |
|---|---|
| Accessibility service not enabled | Detect the missing service and prompt the user to enable it; suspend effects without clearing selections. |
| Gesture recognition failure | Fall back to standard touch targets; never leave the user without an actionable control. |
| Accessibility feature conflict | Let the master switch suspend conflicting effects; preserve selections and restore them on re-enable. |
| Service crash | Keep the UI operable through standard controls; surface a non-blocking notice and avoid relying on color alone. |
| Permission revoked | Suspend accessibility effects gracefully, retain selections, and prompt re-grant on next activation. |
