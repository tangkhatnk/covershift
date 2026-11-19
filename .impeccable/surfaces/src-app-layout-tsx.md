---
version: 1
slug: "src-app-layout-tsx"
primary_target: "src/app/layout.tsx"
related_targets: ["src/app/page.tsx","src/app/shifts/page.tsx"]
---

# Surface brief: app shell (layout), home, shift feed

Scope: src/app/layout.tsx (AppShell, fonts, footer), related src/app/page.tsx (home, signed out) and src/app/shifts/page.tsx (shift feed). Mode: Operate for the shell and feed, Persuade for the home hero.

Audience and job: Vũng Tàu cafe/restaurant/homestay owners (many older, phone, often opened from Zalo) post shifts; students (15+) find and claim shifts; the operations team dispatches. Demo on 26/11/2026 is shown to a jury on a laptop or projector, so desktop must be good, not merely unbroken. Constraints: base font 18px, touch targets >= 3rem, WCAG AA, light only, no gradient/glass/shadow, spacing in multiples of 0.5rem, demo data only and labelled as such.

Unresolved: map of shifts and facilities (separate PR, MapLibre + OpenFreeMap); expand-in-place shift picking on the feed (no modal) lands after the shell.

## Direction contract

THESIS: "Phố cửa chớp" (shutter street). The shift is the unit of the product and a row of shutters is its picture: each shift reads as a strip of windows, closed shutter = person taken, open frame = a seat left, one dashed frame = the backup. The surface refuses the category default of a pastel marketplace of rounded cards with stock smiling students.

OWN-WORLD: wall yellow #F2C94C (title bands, selection, the one accent), shutter green #1F5C45 / deep #153F30 (chrome, primary buttons, closed shutters), lime-wash #F6F4E8 ground, ink #17231D, roof red #B0391F only for danger, sea blue #1C5F8A only for information. Hairline 1px #CFCAB2 rectangles with 6px radius, no shadows. Be Vietnam Pro for text, Barlow Condensed tabular for shift hours. Recognizable with content removed: yellow band over a hairline module with a tinted header strip, green rail, shutter glyphs.

STORY: A first-time visitor understands in seconds that every shift has a main person and a backup, that only verified venues post, and that it costs workers nothing. An owner believes the shift will be covered because the backup is drawn, not promised. They sign in with one tap and land on the feed or their venue's shifts.

FIRST VIEWPORT: Desktop 1280: left rail 15rem (shutter-deep) with role nav, right a wall-yellow band holding the headline and the Bắt đầu button at left, the sample shift module at right with its hours as the largest number on screen (Barlow Condensed tabular) and its Dãy cửa chớp beneath. Phone 390: dark top bar 3.5rem, headline, NO_FEE pill, primary button within the first screen, bottom nav 4.5rem for signed-in roles. Primary action is the full-width primary button directly under the lede.

FORM: Shell with rail (desktop) / bottom nav (phone), pages as stacked hairline modules, signature move "Dãy cửa chớp" (SlotStrip, always with readable text and the full word "Dự phòng"). Raises: shift hours as the biggest tabular numerals; a closed status dictionary (icon + word + tone per state, StateBadge); expand-in-place shift selection with no modal; map with few layers (later PR); module tab strips carry real data (state, job type), no eyebrow/kicker labels; spacing multiples of 0.5rem. seed:555c15dccdb641be (reference supplied by the lead; list position not supplied).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
