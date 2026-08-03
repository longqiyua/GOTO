# Shortcut Index

## Function

The search field is GOTO's only core interaction surface. Shortcut Index enhances that input flow; gesture shortcuts are no longer part of the current product scope.

Shortcut Index maps a symbol sequence to an app. Its editor is declarative: “I want to open **this app** by entering **this key**.” Choose the app, enter the key, select Quick Launch or Standard Pin, and save.

Shortcut launches reuse the same launch, statistics, and action-chain pipeline as search, so they still train local frequency and next-action predictions. Conflicting bindings remain user-editable and deterministic. Gesture shortcuts are outside the current product scope.

## Design

The app picker and key input share one continuous sentence-like surface instead of repeated field labels. Launch mode remains a separate two-option row. Save always spans the editor width; when editing an existing index, Delete appears below Save at the same width.

The master switch and item switches use the same control language. Enabling the master enables every item; disabling it disables every item. Enabling an item also enables the master, while disabling the last active item disables the master. Adjacent mode buttons only switch between Quick and Standard behavior.

Tap a saved row to edit it. The trailing switch only enables or disables the item, and delete is available only in editing state.

## Algorithm

### Case handling and conflict resolution

1. Normalize each key by case.
2. If a normalized group has only a single variant, match input without case sensitivity (tolerant matching).
3. If variants such as `w` and `W` coexist in the same normalized group, switch that group to exact matching.
4. Removing the conflicting variant restores tolerant matching for the group.
5. Bindings remain deterministic and user-editable at every step.

## Boundary

### Robustness Optimization

| Edge case | Detection | Recovery | Verification |
| --- | --- | --- | --- |
| Empty shortcut list | Empty list check on render | Show empty state, keep master switch available | Toggle isolation test |
| Folder apps > 9 | Folder app count check | Cap to supported count, surface notice | Editor acceptance test |
| Gesture recording interrupted | Interruption event during record | Discard partial recording, restore previous state | Out-of-scope safety test |
| No hot app data | Missing hot-app payload | Skip hot-app shortcut, keep rest of list | Pipeline reuse test |
| Shortcut conflict | Duplicate normalized key on save | Apply exact-matching rule, surface conflict | Case handling regression |
| localStorage failure | Storage write / read exception | Keep in-memory state, retry on next save | Persistence acceptance test |
