# FRAME World — Phase 4 country experience

## Purpose
A reusable, standalone country-profile renderer for the country selected from the cinematic experience. This phase establishes the country-page contract and legacy-data adapter without changing the live World page.

## Files
- `country-experience.js` — exposes `FrameCountryExperience.render(root, country, options)` and `fromLegacy(row, researchIndex, meta)`.
- `country-experience.css` — isolated styles; every selector is prefixed `fwc-`.

## Current repository data adapter
The current `world/data.js` uses rows shaped as `[countryName, capital, destination1, ...]`. Use:
```js
var row = window.FRAME_WORLD_DATA.europe.find(function (r) { return r[0] === 'Albania'; });
var country = FrameCountryExperience.fromLegacy(
  row,
  window.FRAME_WORLD_RESEARCH,
  { region: 'Europe' }
);
FrameCountryExperience.render(document.querySelector('#country-profile'), country, {
  onBack: function () { /* return to carousel */ }
});
```
The adapter copies only existing labels and researched fields. It does not infer region/city placement, official names, history, opening hours, prices, or travel advice.

## Future structured country contract
A fully researched country record may add:
- `id`, `isoCode`, `name`, `officialName`, `capital`, `region`
- `summary`, `history`, `significance`, `bestTimeToVisit`, `visitorInfo`
- `source: { name, url }`
- `regions: [{ id, name, cities: [{ id, name, destinations: [...] }], destinations: [...] }]`
- `destinations: [{ id, name, category, summary, history, significance, explore, photography, bestTimeToVisit, visitorInfo, source: { name, url } }]`

Only show optional fields when verified data exists. Unknown facts stay absent; incomplete destination profiles are explicitly marked as research pending. Do not treat the legacy flat destination list as a geographic hierarchy.

## Safety and integration
- Uses DOM text nodes/textContent for editorial content; source links are accepted only over HTTPS.
- No backend, Supabase, authentication, Gallery, country source data, or live page changes.
- No image is added; `heroImage` is optional and should only be supplied from the approved image registry after rights verification.
- This module is not yet wired to the cinematic carousel. Integration should happen after review of both modules and their browser tests.
- Draft PR only. Do not merge or deploy without explicit user approval.

## Verification checklist
- [ ] Node syntax check
- [ ] Render Albania from legacy data; verify researched summaries/source links appear only where available
- [ ] Render a country with no research; verify pending state and no invented details
- [ ] Render structured regions/cities/destinations
- [ ] Test keyboard focus, back callback, long names and 320px mobile width
- [ ] Confirm source links reject non-HTTPS URLs
