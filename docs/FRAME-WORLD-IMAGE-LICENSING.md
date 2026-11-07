# FRAME World — Image Library & Rights Policy

## Purpose

FRAME World is a destination atlas and editorial photography experience. Its images must be authentic, traceable, appropriately licensed, accessible, and safe to publish. A photograph is not publishable merely because it is visible on a website or appears in a search result.

## Non-negotiable publishing rules

1. Verify the rights for each individual image, not just the website that hosts it.
2. Keep the original source/file-description page and the exact licence URL in the record.
3. Record the photographer/creator and the exact attribution wording required by the licence.
4. Prefer public-domain/CC0 material and Creative Commons licences that permit commercial reuse and adaptations (for example CC BY and CC BY-SA), subject to the individual file's terms.
5. Do not publish material marked non-commercial (NC), no-derivatives (ND), fair use, permission-only, or with unclear/missing rights unless written permission specifically covers FRAME World.
6. Do not use Google Images thumbnails, social-media reposts, Pinterest pins, or copied image URLs as evidence of permission.
7. Do not use Unsplash as a bulk source for this project: the Unsplash License prohibits compiling its images to create a similar or competing service. FRAME World is a curated destination-image atlas, so this restriction is material. See https://unsplash.com/license.
8. UNESCO World Heritage Centre gallery photographs are not a general stock library. UNESCO says those donated photos are for educational awareness and not commercial distribution; obtain separate permission where required. See https://whc.unesco.org/en/faq/7.
9. Never present AI-generated or illustrative artwork as a real photograph of a place, event, building, person, or cultural practice.
10. If a record is incomplete, expired, disputed, or uncertain, keep it unpublished and use a neutral visual fallback.

## Preferred source workflow

### First choice: Wikimedia Commons

Use the individual file-description page. Check the file's exact licence, creator, source, attribution requirements, and any additional restrictions. Commons contains files under different licences; do not assume every file has identical terms.

Useful references:
- Reuse guide: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
- FAQ: https://commons.wikimedia.org/wiki/Commons:FAQ/en
- Wikimedia Commons overview: https://wikimediafoundation.org/what-we-do/wikimedia-projects/commons/

### Other sources

- Official tourism boards, museums, parks, and heritage bodies: use only when that specific asset has a clear reuse statement or written permission.
- Public-domain government and institutional collections: verify the rights statement for the exact file and check third-party rights (people, artworks, trademarks, private property, and cultural restrictions).
- Photographer-contributed images: obtain a written licence or permission that explicitly covers website publication, resizing/cropping, caching/hosting, and the intended commercial status of FRAME World.

## Required metadata

Every published image record must include:

- `id`: stable unique identifier
- `entityType`: country, region, city, destination, or collection
- `entityId`: stable entity identifier (not a display label)
- `role`: hero, card, gallery, thumbnail, or map
- `assetUrl`: site-relative hosted asset path or approved HTTPS asset URL
- `sourcePageUrl`: original file/source page (not just a search result)
- `sourceName`: source organisation/platform
- `title`: original image title when supplied
- `creator`: photographer/creator, or an explicit public-domain/unknown-rights-holder note where appropriate
- `licenseName` and `licenseUrl`: exact licence
- `attribution`: exact credit line to display
- `alt`: concise, factual description of the image
- `verifiedAt`: date rights were checked (YYYY-MM-DD)
- `status`: approved, pending, or rejected
- Optional: width, height, focalPoint, countryCode, notes, permissionReference

Do not substitute a generic source homepage for the original image page. Keep attribution visible near the image or in an accessible image-credit panel.

## Image quality and editorial standards

- Prefer landscape 16:9 for country hero/card images; preserve the full-resolution original in the asset workflow.
- Provide responsive derivatives (small card, medium feature, large hero) and use modern formats where supported.
- Keep subject framing and focal point; do not crop out contextual details that change the meaning of cultural or religious imagery.
- Use lazy loading below the fold, explicit width/height or aspect ratio, and descriptive alt text.
- Avoid duplicate photographs across a country's hero and destination cards unless there is a clear editorial reason.
- A country hero should represent the country respectfully and recognisably; avoid stereotypes and avoid implying that one image represents the whole country.
- Do not show a destination photograph as proof that a destination is open, accessible, safe, or currently operating.

## Suggested directory layout

```text
world/
  images.js                 # shared image registry and validation
  images/
    countries/<iso-code>/
    destinations/<country-code>/
docs/
  FRAME-WORLD-IMAGE-LICENSING.md
```

Store approved image files locally in the repository when practical and when the licence permits redistribution. If an external asset URL is used, confirm hotlinking/embedding is permitted and keep a stable source-page URL. Do not place original full-resolution files in the public site if the licence only permits a limited display use.

## Approval checklist

Before changing an image from pending to approved:

- [ ] Exact file page opened and checked
- [ ] Creator and title recorded
- [ ] Licence and licence URL recorded
- [ ] Commercial use and required adaptations/crops are permitted for the intended use
- [ ] Attribution line prepared and displayed
- [ ] Third-party rights checked where relevant
- [ ] Image depicts the correct destination and is not misleading
- [ ] Alt text and dimensions recorded
- [ ] Asset URL works at mobile and desktop sizes
- [ ] Verification date recorded

## Current implementation status

The initial registry is intentionally empty. No image is approved by default, and no unverified photo is inserted as a placeholder. Populate country and destination images in researched batches after each file's rights are checked.
