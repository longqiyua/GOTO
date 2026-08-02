# GOTO Engine

> Version: **V2.1 update**  
> The local app search and intent-recognition engine behind GOTO. The GUI is just a shell — all search, learning, and recommendation logic lives in the engine.

## Positioning

- Pure frontend IIFE module; only depends on `window`, `localStorage`, `Date`, `Map`/`Set`.
- Runs in browser, Electron, Android WebView, iOS WKWebView.
- Exposes APIs via `engine.installGlobals()` to `window.GOTOEngine` and `window._xxx` helpers.

## What has been migrated in

- `goto-engine.js`
  - Search pipeline: **exact match → prefix index → fuzzy match**
  - Trie prefix-tree index (supports exact and prefix expansion recall)
  - Simulated-intelligence tag lexicon
  - Local learning records
  - Negative-feedback weight adjustment
  - Pending index library
  - Chain-of-Action Routing context interface
  - Unified search entry `runSearchPipeline`

## Search pipeline

```
runSearchPipeline(query, apps)
    ├── exactSearch(query, apps)      # exact term match
    ├── prefixSearch(query, apps)     # Trie prefix expansion
    └── fuzzySearch(query, apps)      # fuzzy fallback
```

## Index structure

- `byInitial` / `byT9` / `byPrefix` / `byChar` / `byAppId` inverted indexes
- **Trie prefix-tree index**: nodes contain `children`, `ids` (all apps under the prefix), and `terminals` (apps ending exactly at the node)

## Trie index extension interface (hidden entry)

```js
GOTOEngine.trieIndex.insert(term, appOrId)     // dynamic insert
GOTOEngine.trieIndex.remove(term, appOrId)     // dynamic remove
GOTOEngine.trieIndex.exactSearch(term)         // returns Set<id>
GOTOEngine.trieIndex.prefixSearch(prefix)      // returns Set<id>
GOTOEngine.trieIndex.rebuild()                 // rebuild from current dataset
GOTOEngine.trieIndex.getRoot()                 // get root node
```

Global shortcuts:

```js
_trieInsert(term, appOrId)
_trieRemove(term, appOrId)
_trieExactSearch(term)
_triePrefixSearch(prefix)
_trieRebuild()
_trieGetRoot()
_exactSearch(query, apps)
_prefixSearch(query, apps)
```

## Current integration

`AppIndex/preview.html` already loads:

```html
<script src="GOTO-Engine/goto-engine.js"></script>
```

and uses the unified entry `runSearchPipeline`.

## Next migration steps

1. Continue trimming remaining page-state logic inside `_onSearch`
2. Make the `Pioneer -> Simulated Intelligence` panel read entirely from `GOTOEngine`
3. Unify `Chain-of-Action Routing` home cards and subsequent floating-window strategies on the same rule engine
4. Split time-bucket statistics, association rules, and PRO info injection into independent sub-modules
