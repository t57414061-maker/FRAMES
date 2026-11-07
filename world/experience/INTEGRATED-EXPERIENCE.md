# FRAME World integrated experience — delivery notes

## Included in this branch
- Connects the existing cinematic intro, 3D carousel and entry transition to the reusable country profile renderer.
- Adapts every country/area row currently present in `world/data.js` into a normalized country catalog.
- Global search covers country names, capitals and indexed destination labels.
- Region collection browsing, random discovery, country favourites, a personal country journey board, recently explored countries and two-country comparison.
- Country profiles reuse existing researched destination summaries, exploration notes, photography notes, visitor cautions and HTTPS source links.
- Adds a structured-data validator for the future country → region → city → destination hierarchy.

## Existing source data limits
The current index stores country rows as flat arrays. This release deliberately does not guess which city or region a destination belongs to. It displays the existing index and marks missing editorial detail as pending. A country can have a broad list while still lacking complete source-backed profiles for every item.

## Not included / requires additional verified data
- A map or FRAME Earth globe with reliable destination coordinates.
- Destination-level journey routing and travel-time calculations.
- Verified photo population. The image registry foundation remains in separate draft PR #32; do not treat any unlicensed image as cleared.
- Full editorial research for every destination in all 196 country/area entries. This requires checking authoritative local, national, heritage and community sources, destination by destination.
- Translation content beyond the English-ready structure.
- Live prices, opening hours, booking and safety feeds.

These are not silently fabricated. The data model and UI are prepared for verified expansion.

## Local browser verification checklist
- Open `/FRAMES/world/` and skip or wait for the intro.
- Search for a country, capital and destination; change region filter.
- Enter a country from the carousel and from a discovery card; return with the country-page Back button.
- Save a country, add it to the journey board, reload and verify browser-local persistence.
- Check recently explored ordering and compare two countries.
- Test keyboard carousel navigation, reduced-motion preference, touch swipe and 320px width.
- Verify old Gallery routes and auth are unaffected.

## Release safety
This is a draft pull request. It does not change Supabase, authentication, uploads, downloads, Gallery or production. Merge/deploy only after review and real-device browser testing.
