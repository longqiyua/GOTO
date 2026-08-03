# GOTO Page source note

This directory is the active page source for the GitHub Pages branch and for the Android WebView preview.

- Entry: `GOTO Page/index.html`
- Documents: `GOTO Page/Document/`
- Bundle generator: `scripts/generate-githubpages-bundle.js`
- Android mirror: `GOTO/app/src/main/assets/goto_page/`
- Sync command: `powershell -ExecutionPolicy Bypass -File scripts/sync-goto-page-to-android.ps1`

The old migration note pointed at `goto-pages-next/`; that path is no longer the page authority. Engine, Base and Where remain frozen components and are not modified by page work.
