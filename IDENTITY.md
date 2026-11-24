# IDENTITY (contract; every later phase obeys this file)

DIRECTION: D6 fieldbook
GROUND: #f5f2e6 botanical-cream
SURFACE: #ebe7d4
DEEP: #dfe2cc
LINE: #cfc9b4
INK: #26311f
ACCENT: #3d7a3d grass
ON_ACCENT: #f5f2e6
SECOND: #c9932a ochre
OK: #2e7d4f
WARN: #c9932a
BAD: #9c3b2a
FONT_DISPLAY: F1 Fraunces (next/font/google: Fraunces)
FONT_BODY: Source Sans 3 (next/font/google: Source_Sans_3)
FONT_MONO: none
STRUCTURE: S5 explorer-detail
ARCHETYPE: L4 bento
MOTION: M6 drop, prefix decaya-
KIT: K1 motion
RADIUS: sharp
HEADER: solid ground, border-b in LINE, sticky
LOGO_POLICY: brand-mark

## Why

The farm assigned this identity so that no two projects share a look, a route map or an interaction style. The most recent projects it differs from: Aevum Builder Challenge #1 (D7, S2, L7, K7); Open Agentic Web Challenge (D15, S3, L1, K2); Relate by Neo4j Hackathon (D20, S4, L6, K5). It is not a suggestion. Tie the product's own nouns to it; do not swap any row for a familiar one.

## Direction: D6 fieldbook

Botanical cream field guide: ruled lines, stamps, specimen labels.

Surface treatment: Ruled notebook lines, stamp-like rotated labels, specimen tags with a punched hole, 1px ink rules, no shadows.

Every hex in app/globals.css comes from the key block above. RADIUS sharp means 0 to 0.125rem on every card, panel and control. ON_ACCENT is the text color on an ACCENT fill. The semantic colors (OK, WARN, BAD) mark state only, never brand.

## Structure: S5 explorer-detail

Home is a browsable collection of the product's records; each record opens a rich detail page.

Route map (name the bracketed parts with the product's own words):
- `/` : the collection (gallery, list, map or table as the domain suggests) with filter and search
- `/<entity>/[slug]` : the detail page, where the core action and the wow moment live
- `/new` : the create or submit flow that adds a record
- `/about` : method and sponsor tech

Rules:
- the collection shows at least 8 seeded records, each with one real figure on its card or row
- filter and search state lives in the URL
- a newly created record appears in the collection immediately

## Archetype: L4 bento (the composition of the home route)

The hero is a 12-column grid of 5 to 7 unequal cells: one cell is the CTA, one is the live product, one is pure image; no traditional hero copy block exists.

MUSTs: no two cells share dimensions; the claim lives inside the largest cell; every cell has content, none is filler.
Bans: a lead paragraph above the grid; equal-width card rows.

## Motion: M6 drop (the entrance signature)

translateY(-14px) rotate(-1.5deg) to rest plus fade, cubic-bezier(0.34, 1.56, 0.64, 1), 520ms. One keyframe block implements it; every keyframe name starts with `decaya-`. A `prefers-reduced-motion: reduce` block disables it.

## Interaction kit: K1 motion

Motion (the successor of Framer Motion): layout animation, gestures and presence.

Packages for package.json dependencies: "motion": "^14.14.0".

Typical import: `import { motion, AnimatePresence, LayoutGroup, useMotionValue, useTransform } from "motion/react";`

Signature interactions (the scaffold ships the first; all three exist by the end of the frontend phase):
1. a shared-layout transition: the core result grows from its list or summary cell into the detail view with `layoutId`, no cut
2. a draggable or pointer-tracked hero artifact (`drag`, `whileHover`, `useMotionValue`) bound to a real seed value, so moving it changes the number on screen
3. `AnimatePresence` staging on the demo route: loading, result and error swap with exit animations, and list items stagger through `variants`

Rules:
- use `initial={false}` on content that must be readable in server HTML
- add the packages above to package.json `dependencies` (and `devDependencies` where listed) with exactly these ranges; the runner installs them
- every import of a kit package lives in a component that starts with `"use client"`
- server HTML must be readable with JavaScript off: never server-render content at opacity 0 or off screen; animate from the visible state or on interaction
- honor `prefers-reduced-motion: reduce`: the content and every control stay usable with motion off
- every interaction is driven by the real seed data; a decorative animation with no product meaning does not count as a signature

## Amendments (append-only; later phases add dated lines here, never edit anything above)
