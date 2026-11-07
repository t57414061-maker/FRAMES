# FRAME World · Experience (Phases 2–3)

Covers the cinematic intro, the 3D country carousel and the country entry transition.
Adds only this folder. It does not change world/index.html, data.js, research.js, Gallery, Supabase or auth.

## Files
- `frame-experience.css`: styles, all classes prefixed `fwx-`
- `frame-experience.js`: behaviour, exposes `FrameExperience.init(options)`
- `test.html`: standalone harness with demo data (not from data.js)

## Integrate (after the Phase 1 audit)
1. Copy this folder to `world/experience/`.
2. In `world/index.html` `<head>`: `<link rel="stylesheet" href="experience/frame-experience.css">`
3. Where the carousel should appear: `<main id="frame-carousel" class="fwx-root"></main>`
4. Before `</body>`, after the root element:
```html
<script src="experience/frame-experience.js"></script>
<script>
  FrameExperience.init({
    root: '#frame-carousel',
    countries: toCarouselCountries(window.FRAME_COUNTRIES), // adapter, written after the audit
    onEnter: function (country) { /* Phase 4: open the country page */ }
  });
</script>
```
The adapter maps the existing data.js fields to the shape below. It is not written yet, because data.js has not been audited.

## Options
- `root`: element or selector. Required.
- `countries`: array. Required.
- `onEnter(country, button)`: called when the entry transition finishes. Without it, the overlay stays open with a Back button.
- `intro`: default `true`. Set `false` to skip the intro.
- `introOnce`: default `true`. The intro plays once per browser (stored in localStorage, guarded with try/catch).
- `autoplay`: default `false`. Paused on hover and focus, and disabled for reduced motion.
- `interval`: autoplay delay in ms, default `6000`.
- `label`: accessible name for the carousel, default `Countries`.

## Country shape
- `code`: ISO 3166-1 alpha-2 (used for the flag and for `go()`)
- `name`: required
- `capital`: optional
- `flag`: optional emoji. If omitted, it is derived from `code`.
- `image`: optional full-bleed URL. Only use it with a verified source and licence.
- `credit`: optional, shown on the card as "Photo: …"
- `accent`: optional hex colour for the card and entry atmosphere

## API
- `go(indexOrCodeOrName)`, `next()`, `prev()`
- `setOrder('curated' | 'alpha')`: alphabetical browsing, keeps the current country selected
- `enter()`, `exit()`, `current()`
- Event: `document` receives `frameworld:enter` with the country as `detail`.

## Not included (later phases)
- Search (Phase 8), favourites and recents
- Landmark and destination data (Phase 5)
- Ambient sound (planned as off by default, not built)
- Maps (Phase 6)

## Testing notes
Not yet run in a browser. Check these on:
- Desktop Chrome, Firefox and Safari; iOS Safari; Android Chrome
- Intro: plays, and Skip or Esc ends it. With `introOnce`, it does not replay on reload.
- Carousel: arrows, swipe (48px threshold), click a side card to centre it, arrow keys, A–Z toggle keeps the selected country
- Entry: the card lifts, expands to full screen, the title appears, Back returns focus to the card
- Reduced motion (OS setting): no movement, transitions are instant
- No horizontal overflow at 320px width, and clear of notches (safe-area insets)
- Screen reader: the active country is announced and every button has a name
- Performance with all 193 countries: only cards within two positions load images, and animation stays smooth

Tuning points to review on real devices:
- The entry starts as a window the size of the card, so the image framing differs slightly from the card photo.
- Intro timing (about 4.6s total) and card spacing (`--cw`, `--gap`, `--ch` in the CSS).