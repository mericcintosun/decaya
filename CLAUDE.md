# CLAUDE.md

Read `IDENTITY.md` first (it is law for color, fonts, routes, layout and motion), then `HANDOFF.md` and `DEMO.md`.

## Commands

- `npm run dev`: local dev server at http://localhost:3000
- `npm run build`: production build with type checking; keep it green after every change
- `npm run seed`: writes `fixtures/seed.json` from `lib/data/seed.ts` (deterministic, runs with `tsx`)

## Stack pitfalls

- Next.js 15 App Router: `params` and `searchParams` are Promises in pages and route handlers; `await` them.
- Tailwind v4: no `tailwind.config`, no `@tailwind` directives. Tokens live in `app/globals.css` (`@theme`). Use token classes, never raw hex.
- TypeScript strict is on.
- `motion/react` is imported only in files that start with `"use client"`. Use `initial={false}` on content that must be readable in server HTML.
- Data goes through `getAdapter()` in `lib/adapter.ts`. Do not import seed literals into pages or components.

## Never touch

- `public/illustrations/*`, `public/logo.svg`, `app/opengraph-image.tsx`, `app/icon.svg`
- Anything above the Amendments line in `IDENTITY.md`
- Secrets: never commit `.env` files. No second animation library. No theme toggle. No pages outside `DEMO.md`.

## Vercel guardrails

- No runtime filesystem writes in app code (`scripts/` may write, request code may not).
- `useSearchParams` only inside a `Suspense` boundary.
- No Node-only APIs in edge paths.
- No custom server, no `output: export`.
- Every `process.env` key read in code is mirrored in `.env.example`.

## Writing rules

Plain English, no em or en dashes, no hype words. Label predictions as predictions. Seed rooms are illustrative, never presented as measurements the team took.

when compacting preserve the list of modified files and test commands
