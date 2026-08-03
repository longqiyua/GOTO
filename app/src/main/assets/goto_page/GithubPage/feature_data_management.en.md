# Data & Configuration

## Function

The “Take a screenshot?” action captures only the phone preview and composes a PNG with the GOTO wordmark and generation time. It works without requiring an online renderer, blocks duplicate clicks while rendering, and restores the action with an error message if export fails.

Reset Settings and Clear Statistics capture the active Light or Dark theme when their progress overlay opens. The overlay keeps that appearance while storage is cleared, preventing a flash to the opposite theme. A small non-interactive metal plaque below the log displays `Focus , And More` and `Lesong` in Geist.

### Purpose

Data & Configuration manages settings, statistics, preference vectors, and backups. Data remains local by default. Imports are validated, exports are versioned, and destructive actions are isolated by data domain.

## Design

### Configuration packages

Configuration exports include language, theme, material style, accent color, Home Cards, accessibility, advanced feature states, Shortcut Index entries, and other local preferences. The current schema is `goto-transfer` v2.

- JSON is the canonical round-trip format.
- TXT contains the same structured payload for convenient review and copying.
- CSV uses `key,value` rows and can also be imported.
- PNG is a branded human-readable summary and is not an import format.

WebDAV passwords and S3 credentials are deliberately excluded. Legacy JSON containing only the former `goto_settings` object remains importable.

### Statistics packages

Statistics exports contain recorded local behavior only: searches, app launches, hourly buckets, Shortcut Index activations, Smart Intuition memory, and engine feedback. Predictions are never presented as history.

Importing statistics refreshes the panel immediately. Clearing statistics also removes all four time-of-day character buckets and shortcut counters so old values cannot return after reload.

### Preference vectors

The vector workbench supports preview, JSON export, validated import, and copying.

## Algorithm

Imports reject invalid structures, inconsistent dimensions, `NaN`, and infinite values. The import pipeline validates schema and version compatibility before any write and isolates each package to its declared domain so cross-domain overwrites cannot occur. Exports are versioned with the `goto-transfer` schema and carry full package metadata, enabling JSON, TXT, and CSV to round-trip within the same software version.

## Boundary

### Reset and clear boundaries

- Reset Settings restores interface and feature configuration.
- Clear Statistics removes statistics and learning memory while retaining authorization and interface preferences.
- Imports may only write to their declared domain; a statistics package cannot overwrite configuration and vice versa.

### Acceptance criteria

1. JSON, TXT, and CSV exports round-trip in the same software version.
2. Empty, malformed, or cross-domain files are rejected with a clear message.
3. Packages contain `schema`, `version`, `kind`, `exportedAt`, and `data`.
4. PNG uses the GOTO brand and never exposes individual configuration values.
5. Clearing statistics resets both the current panel and the state after reload.

### Robustness Optimization

| Edge case | Handling strategy |
|---|---|
| Empty export data | Produce a valid package with an empty `data` field and a clear “no data” notice; do not fail the export. |
| Invalid import file format | Reject the file with a clear message before parsing; never partial-import an unrecognized format. |
| Incompatible import version | Detect schema/version mismatch and reject with guidance; legacy `goto_settings`-only JSON remains importable. |
| Corrupted backup | Abort import on parse failure, leave local data untouched, and surface a clear error. |
| Migration failure | Roll back to the pre-migration state and report the failing step; no partial writes across domains. |
| Oversized export data | Stream or paginate the export; block duplicate clicks while rendering and restore the action on failure. |
