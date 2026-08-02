# Meta-tag Index

## Function

The meta-tag index is GOTO's offline semantic layer. It maps natural requests such as “send a message”, “find a route”, or “play music” to app capabilities without a cloud model.

It combines 11 action intents, 20 app categories, synonym clusters, app capabilities, and local history. Tokens are extracted into actions, intents, relations, and optional targets; exact lexical evidence scores above broad category evidence.

When enabled, a natural-language query is tokenized and matched against app capabilities, categories, actions, and synonyms. A request such as `chat` may recall WeChat and QQ even when their names are absent from the query. When disabled, semantic candidates disappear while direct and fuzzy retrieval remain available.

Regression coverage includes missing-hit safety, toggle isolation, natural-language recall, and deterministic score merging.

## Design

- Exact tag match: strongest semantic score.
- Included phrase and synonym match: secondary recall.
- Intent/category match: broad fallback.
- User history: local ranking correction, never a replacement for retrieval evidence.

The module feeds HyperFuzzy and Smart Intuition while remaining independently switchable and inspectable.

## Algorithm

1. Tokenize the natural-language query into actions, intents, relations, and optional targets.
2. Match tokens against app capabilities, categories, actions, and synonym clusters.
3. Score candidates by evidence weight: exact tag match > included phrase / synonym match > intent / category match.
4. Apply local user history as a ranking correction only, never as a replacement for retrieval evidence.
5. Merge scores deterministically before feeding HyperFuzzy and Smart Intuition.

## Boundary

| Edge case | Handling strategy |
| --- | --- |
| Empty meta-tag database | Fall back to direct and fuzzy retrieval; no semantic candidates are produced. |
| No matching tags | Return an empty semantic candidate set; downstream retrieval remains available. |
| Tag classification conflict | Deterministic score merging resolves conflicts; the stronger lexical evidence wins. |
| Too many synonyms | Synonym clusters are capped; broad fallback still bounds recall. |
| Corrupted index | Index is treated as disabled; direct and fuzzy retrieval remain available. |
| localStorage failure | Persistence is skipped; the in-memory index continues to serve the current session. |
| Dynamic tag persistence | Tag updates are persisted best-effort and reloaded on next enable. |
| Tag vs fuzzy match conflict | Tag evidence scores above fuzzy evidence; deterministic merge preserves ordering. |

### Robustness Optimization

| Edge case | Detection | Recovery | Verification |
| --- | --- | --- | --- |
| Empty meta-tag database | Empty index check on enable | Disable semantic layer, keep fuzzy retrieval | Missing-hit safety regression |
| No matching tags | Empty candidate set after scoring | Return empty set, no crash | Natural-language recall regression |
| Tag classification conflict | Conflicting scores during merge | Deterministic merge, stronger evidence wins | Deterministic score merging regression |
| Too many synonyms | Synonym cluster size threshold | Cap cluster, keep broad fallback | Toggle isolation regression |
| Corrupted index | Index parse / integrity check | Treat as disabled | Missing-hit safety regression |
| localStorage failure | Storage write / read exception | Skip persistence, keep in-memory | Persistence acceptance test |
| Dynamic tag persistence | Write conflict on update | Best-effort persist, reload on enable | Toggle isolation regression |
| Tag vs fuzzy match conflict | Score tie during merge | Tag evidence wins by rule | Deterministic score merging regression |
