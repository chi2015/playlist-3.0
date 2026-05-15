# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server on port 5173 (proxies `/api` → `http://localhost:3000`).
- `npm run build` — type-check (`tsc -b`) then build to `dist/`. Type errors fail the build.
- `npm run preview` — serve the built `dist/`.

There is no test runner, linter, or formatter configured. TypeScript runs in strict mode with `noUnusedLocals` and `noUnusedParameters` — unused imports/vars will break `npm run build`.

## Backend contract

The app is frontend-only and assumes a separate backend at `http://localhost:3000`. All requests go through a single endpoint, [src/api.ts](src/api.ts):

- `POST /api/playlist` with `Content-Type: application/x-www-form-urlencoded`.
- Body is form-encoded params plus an `action` field (`current`, `latest`, `next`, `prev`, `top100`, `top10artists`, `upload`, `delete`).
- Response shape: `{ ok?, date?, pl_date?, year?, list?, error? }`.

Song `title` and `artist` strings come back HTML-entity-encoded and are rendered with `dangerouslySetInnerHTML` (see [src/components/Song.tsx](src/components/Song.tsx)); [src/utils.ts](src/utils.ts) `htmlDecode` is used when generating the PDF.

## Architecture

All state lives in [src/App.tsx](src/App.tsx). The rest of the tree is presentational.

**Three view modes** (`Mode` in [src/types.ts](src/types.ts)):
- `main` — single playlist for `actualDate`, grouped into A/B/C lists by score (47/28/23) via [Playlist](src/components/Playlist.tsx) → [Sublist](src/components/Sublist.tsx).
- `top100` — top 100 songs for `top100year`.
- `top10artists` — top 10 artists for `top100year`.

**Three independent caches** keyed by date or year:
- `storage: Record<string, Item[]>` — playlists by `YYYY-MM-DD`.
- `top100Storage: Record<number, Item[]>` — top 100 by year.
- `top10Storage: Record<number, Item[]>` — top 10 artists by year.

Fetches are gated on cache hits — every navigation handler checks the cache before calling `remote(...)`. After an `upload` or `delete`, the relevant year entries in `top100Storage` / `top10Storage` are invalidated (see `updateData`, `deletePlaylist`).

**Ref-mirrored state pattern.** `storageRef`, `top100StorageRef`, `top10StorageRef`, `modeRef`, `top100yearRef` mirror state into refs. Effects read from the refs so they don't list `storage` etc. as dependencies — adding those deps would refire fetches every time the cache changes. When adding new effects that need to read these values, follow the same pattern instead of expanding dependency arrays.

**Decoration on insert.** `addToStorage` runs `decorateList` ([src/utils.ts](src/utils.ts)) which compares each item against the previous week's playlist (`prevDate(forDate)`) and stamps `item_class` as `pl-new` / `pl-up` / `pl-down`. This drives the colored indicator in `Song`. Decoration happens once at cache-insert time, not on render.

**Swipe / drag-drop / resize** are wired as document-level listeners in `useEffect` in `App.tsx`. The swipe handler reads `moveRef.current` so the listener doesn't reattach on every render; same trick for `uploadFileRef`.

**Countdown mode** (`top100` of the current/future year) hides items below `countdownNum` and decrements with a button click — used to reveal a year-end top 100 one position at a time.

## Styling and assets

CSS is **not** imported as modules — [public/playlist2.css](public/playlist2.css) and [public/modal.css](public/modal.css) are referenced directly from [index.html](index.html) and served as static files. Class names in components (`list-item`, `item-info`, `pl-new`, `pl-up`, `pl-down`, `pl-dragover-new`, `move-left`/`move-right`, etc.) must match those stylesheets — don't rename without updating the CSS.

Icons (`pl-favicon.png`, `menu.png`, `star.png`, `triangle.png`, `calendar-icon.png`, `loading-icon.gif`, `upload-icon.png`) live in [public/](public/) and are referenced by URL, not imported.

## PDF generation

[src/pdf.ts](src/pdf.ts) uses `pdfmake` with manually wired VFS fonts. The two `@ts-expect-error` imports are deliberate — pdfmake's typings vary across versions. The PDF buckets songs by the same score thresholds (47/28/23 → A/B/C) used by the main view.

## Porting notes

Comments in `App.tsx` reference Vue (`"Mirrors Vue"`, `"port of initTouchEvents"`, `"port of initDragAndDropEvents"`) and there's a `TODO` about replacing the native `<select>` with a `react-select` equivalent. This codebase is a React port of a previous Vue app; if behavior seems odd, the original Vue semantics may be the reason.
