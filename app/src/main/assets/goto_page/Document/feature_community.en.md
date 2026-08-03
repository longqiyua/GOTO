# Support & Community

## Function

> Sponsor and Say Hello have been relocated to the Sponsor & Contact page at the bottom of the document tree, presented as two side-by-side cards. They belong to the GitHub Pages presentation layer, not the Android phone UI, and do not create a second product entry point.

<div class="doc-story-flow">
  <button data-preview-action="community" data-preview-target="community-page" data-preview-query="sponsor"><b>01</b><span><strong>Open Sponsor</strong><small>Jump to the Sponsor & Contact page to view WeChat Pay, Alipay, and Ko-fi options.</small></span></button>
  <button data-preview-action="community" data-preview-target="community-page" data-preview-query="hello"><b>02</b><span><strong>Open Say Hello</strong><small>Jump to the Sponsor & Contact page to prepare an optional contact card and enter the discussion board.</small></span></button>
</div>

## Design

### Sponsor

The Sponsor card sits above the Say Hello card in a single vertical flow on the Sponsor & Contact page. It keeps only WeChat Pay, Alipay, Ko-fi, badge download, and a centered purpose note; it does not collect sponsor contact details. QR codes are loaded from the project `收款码` folder and appear only after the visitor opens the page. Ko-fi points to `https://ko-fi.com/longqiyua`.

Contact information is optional and stays in local browser storage by default. The fixed purpose statement is:

> Sponsorship is used only to support the independent developer in maintaining and improving GOTO.

### Say Hello

The board uses giscus, which stores public messages in the project’s GitHub Discussions. GitHub authentication and repository permissions govern posting and replies; GOTO does not keep a separate public-message database.

The optional name and contact fields form a local contact card. Nothing is published unless the visitor deliberately copies that card into a public giscus message.

## Algorithm

### Activation requirements

giscus requires a repository name, repository ID, category name, and category ID. At deployment, the GitHub Pages workflow resolves the public repository and `Announcements` category node IDs through the GitHub GraphQL API and writes `Preview/community-config.js`; no access token is shipped to the browser. Discussions must be enabled, the giscus App must be installed, and the category must remain available. Otherwise Say Hello stays in a safe pending state.

## Boundary

### Privacy boundary

- QR images are static assets.
- The optional contact card stays in browser storage by default.
- Ko-fi, GitHub, and giscus are third-party services governed by their own terms and privacy policies.
- Their presence does not imply partnership, authorization, or endorsement.

### Pages and notice synchronization

Every default-branch deployment, manual run, and daily schedule regenerates the open-source use statement and Android runtime transitive-dependency report. Application dependencies, build tools, web runtime, fonts, datasets, and external services are recorded separately. Any `Unknown` or non-standard `LicenseRef` entry requires manual review.

### Robustness Optimization

| Edge case | Handling strategy |
|---|---|
| giscus load failure | Keep Say Hello in a safe pending state; never expose tokens or block the rest of the page. |
| User not logged in GitHub | Prompt sign-in via giscus/GitHub; posting and replies follow repository permissions. |
| Contact info save failure | Fall back to in-memory fields for the session; never publish the card without explicit copy. |
| QR code image load failure | Hide the broken slot silently and keep the remaining payment options usable. |
| Empty message content | Disable submit until non-empty content is entered; reject whitespace-only posts. |
