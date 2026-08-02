# GOTO Page standalone deployment

`GOTO Page/` is the GitHub Pages source directory. Publish the contents of this folder as the site root; `index.html` is the canonical entry point and all runtime assets use relative paths. No parent-directory path is required by the page runtime. The folder includes `.nojekyll` so GitHub Pages serves the static asset tree without Jekyll filtering.

## Local check

From the repository root, serve this folder with any static server, for example:

```text
python -m http.server 4173 --directory "GOTO Page"
```

Then open `/index.html`. The page can fall back to `Document/document-bundle.js` when individual Markdown files are unavailable, so static hosting does not need a server-side Markdown API. The optional Electron shell is outside the GitHub Pages runtime and is not required for deployment. Do not rename the entry file after publishing; GitHub Pages resolves `/` through `index.html`.

## Boundary

The page may load the local copies of `GOTO-Engine/` and `GOTO-Base/` already contained in this folder. `GOTO Engine`, `GOTO Base`, and `GOTO Where` remain frozen; standalone cleanup must not merge or rewrite their implementations.
