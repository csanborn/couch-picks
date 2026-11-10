# couch-picks spec

A 10-foot, remote-driven web app that turns a mood ("cozy rainy Sunday") into rows of things to watch. It exists to show TV front-end craft (spatial focus, performance, legibility) plus a small, well-validated AI integration.

## Goals

- Every interaction works with a D-pad: arrow keys, Enter, and Back (Backspace or Escape). No mouse needed.
- A home screen with a mood prompt and a few preset mood chips. Submitting produces several horizontal rows of picks.
- Each pick shows a title, year, a short "why this fits" blurb and generated art (CSS gradient plus initials, no images).
- Enter on a pick opens a detail overlay. Back closes it and puts focus back on the same pick.
- A spatial focus engine written for this project, kept pure (no React, no DOM) and unit tested.
- Picks come from `POST /api/picks`, which calls the Anthropic Messages API with structured output, validated with zod.
- With no API key the same endpoint returns deterministic demo rows seeded by the prompt, and the UI says so.

## Non-goals

- Real catalog data, posters, playback, accounts or persistence.
- Imitating any real streaming service's name, branding, layout or titles.
- Pointer-first or touch-first design (pointer clicks work, but the remote is the primary input).
- A production server. The endpoint runs as Vite middleware in dev and preview.

## Focus engine rules

- Focus moves to the geometrically nearest focusable in the pressed direction. Candidates must lie in that direction; distance along the axis counts less than drift across it.
- Moving into a row restores the column that row last had focus on.
- At an edge with no candidate, focus stays where it is.
- Empty rows contribute no focusables and are skipped.
- If the focused item disappears, focus falls back to a sensible neighbor. Focus is never lost while anything is focusable.
- The overlay is its own focus scope. Closing it restores the previous focus exactly.

## Performance and legibility

- Rows scroll with `transform`, never `scrollLeft`. Focus changes do not interleave layout reads and writes.
- Only the cards whose focus state changes re-render. Rows and cards are memoized.
- A high-contrast focus ring and a smooth scale, both on composited properties.
- `prefers-reduced-motion` turns transitions off.
- A 1920 by 1080 design canvas with title-safe padding, scaled to the window. Body text is at least 28 design pixels.

## Acceptance criteria

- `npm install && npm run dev` runs with no key and shows a "Demo data" badge after the first search.
- `npm run lint` (0 warnings), `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` all pass locally and in CI without secrets.
- Unit tests cover: nearest neighbor in all four directions, row memory, edges, empty rows, focus recovery, the mock generator's determinism and validity, request and model output parsing (including malformed output), and the endpoint handler with the SDK mocked.
- A Playwright journey types a mood, submits, moves around rows with the arrow keys, opens a detail with Enter, closes it with Backspace and with Escape, checks focus returns to the same card, and sees no console errors.
- The API key is read only from `ANTHROPIC_API_KEY` and is never committed. The model comes from `ANTHROPIC_MODEL`, default `claude-sonnet-5-5`.
