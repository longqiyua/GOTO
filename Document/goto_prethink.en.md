# GOTO Prethink: Query Guessing and Pre-association

GOTO Prethink is an independent fourth page-level capability. It is part of the pre-association category, while Engine, Base and Where remain the frozen fuzzy-index and reminder category.

```text
raw query -> Prethink parallel candidates -> one Engine competition -> Base / Where context
```

Prethink never rewrites the input. It keeps the original query as the highest-priority candidate and may propose at most five explainable alternatives. Candidates below `0.45` confidence are dropped.

```js
QueryCandidate {
  query: "chrome",
  confidence: 0.78,
  source: "KEYBOARD_CORRECTION",
  editCost: 0.22,
  explanation: "character swap + adjacent-key slip"
}
```

Supported sources include keyboard adjacency, character swaps, repeated or missing characters, Pinyin/English conversion, installed applications, and local search-click history. A model provider is an optional hidden integration point; it must return the same explainable DTO and never block the original query.

Every candidate enters the same Engine. Engine still owns final matching, ranking and explanation. Duplicate application paths use `highestPathScore - 0.1 * secondHighestPathScore` so multi-path recall cannot inflate scores.

The SuperGOTO card exposes the `GOTO Prethink 预处理` switch after Adaptive Refresh. JS, Kotlin and Rust share the DTO boundary; none of them modifies the frozen Engine, Base or Where implementation.

