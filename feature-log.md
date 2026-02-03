# Feature Log

Running log of what was built, when, and any decisions made along the way.

---

## 2026-01-31 — M0: Skeleton

### What shipped
- **Next.js 16 scaffold** — TypeScript, Tailwind CSS v4, ESLint 9, React 19, App Router
- **Supabase integration** — browser + server clients via `@supabase/ssr`, proxy-based auth session refresh
- **Custom auth pages** — sign-in, sign-up, forgot-password (email/password via Supabase Auth)
- **App shell** — sidebar on desktop, bottom nav on mobile. Four tabs: New Entry, Timeline, Tags, Settings
- **Dark mode** — class-based Tailwind v4 (`@custom-variant`), ThemeProvider with localStorage persistence, anti-flash blocking script. System/light/dark toggle on Settings page.
- **Crypto module** — `lib/crypto.ts` with AES-256-GCM encrypt/decrypt, PBKDF2 key derivation (600k iterations), key-check blob for passphrase verification. `lib/crypto-utils.ts` for base64/hex encoding.
- **Postgres schema** — `key_checks`, `entries`, `tags`, `entry_tags`, `media` tables with RLS policies scoped to `auth.uid()`
- **Storage** — `encrypted-media` Supabase Storage bucket with folder-based RLS
- **Tooling** — Prettier + `prettier-plugin-tailwindcss`, CSP + security headers in `next.config.ts`

### Decisions made
- **PBKDF2 over Argon2id** for key derivation — native Web Crypto, no WASM dependency. Revisit in M4.
- **Tags stored plaintext** in DB — enables server-side filtering. Encryption is an open question.
- **Client-side auth calls** (not server actions) — since the crypto layer needs the browser anyway.
- **No CI yet** — deferred GitHub Actions to a later milestone.
- **Email confirmation disabled** for dev — Supabase's built-in email has tight rate limits on free tier.

### Issues hit
- Next.js 16 renamed `middleware.ts` → `proxy.ts` and the exported function from `middleware` → `proxy`. Docs page 404'd; figured it out from error messages.
- Node 16 can't run Next.js 16 or TypeScript 5. Required upgrade to Node 20+.

### Commits
- `e50b0c0` — Initial commit from Create Next App
- `420c894` — chore: add project roadmap
- `9844297` — feat: M0 skeleton — auth, app shell, crypto, schema
- `5a54b08` — fix: rename middleware.ts to proxy.ts for Next.js 16

---

## 2026-01-31 — M1: Encrypted Text Entries End-to-End

### What shipped
- **KeyProvider** — blocking passphrase setup/unlock modals. CryptoKey held in memory only, cleared on sign-out and page reload.
- **Entry CRUD** — `lib/entries.ts` with `createEntry`, `listEntries`, `getEntry`, `listTags`. All entry content encrypted client-side (AES-256-GCM) before hitting Supabase. bytea columns round-tripped as base64.
- **New Entry page** — textarea + emoji mood picker (5-point, tap-to-toggle) + chip-style tag input (comma/Enter to add, backspace/click-x to remove). Encrypts and saves, redirects to timeline.
- **Timeline page** — decrypted entry cards with date, mood emoji, body preview (line-clamp-3), tag chips. Horizontal tag filter bar reading `?tag=` param. Loading skeletons and empty state. 50-entry limit (pagination deferred).
- **Entry detail view** — `/timeline/[id]` with full decrypted body, mood, tags, date. Back button, not-found state.
- **Tags page** — lists all user tags, each links to filtered timeline. Empty state if none.
- **Export/Import** — JSON export (decrypted array), Markdown zip export (one .md per entry with YAML frontmatter), JSON import with validation. All in Settings page.
- **Keyboard shortcut** — Cmd/Ctrl+N navigates to new entry from anywhere in the app.
- **Reusable components** — MoodPicker, TagInput, EntryCard, EmptyState, loading skeletons.

### Decisions made
- **Blocking unlock modal** — key must be in memory before any app content renders. Simpler than decrypt-on-demand.
- **Single master key** (not per-entry) — good enough for M1, revisit if needed.
- **Tags duplicated** — plaintext in DB for server-side filtering, also inside encrypted blob for export fidelity.
- **Mood as 1-5 integer** inside encrypted blob — emoji is just display mapping.
- **50-entry limit** on timeline — no pagination yet, deferred.
- **JSZip** for markdown export — lightweight, no server-side processing needed.

---

## 2026-01-31 — CI + Unit Tests

### What shipped
- **GitHub Actions CI** — runs lint, type-check, format check, unit tests, and build on push/PR to main. Placeholder Supabase env vars for build step.
- **Vitest** — unit test runner with path alias support.
- **Crypto tests** — encrypt/decrypt round-trip, wrong-key rejection, unicode handling, empty string, unique IVs, key-check verify/reject (9 tests).
- **Export tests** — import JSON parsing: valid input, optional fields, non-string tag filtering, error cases (8 tests).
- Renamed `TODO.md` → `todo.md` and `README.md` → `readme.md`. Updated readme with project docs, todo with M0/M1 completion status.

---

## 2026-01-31 — Playwright + Integration Tests

### What shipped
- **Playwright smoke tests** — 4 tests covering landing page, unauthenticated redirect, sign-in page, and sign-up page. Runs against dev server with configurable `TEST_PORT` (default 3002).
- **Integration tests** — `entries.integration.test.ts` exercises create → list → getEntry round-trip against a real Supabase instance. Verifies tag filtering. Cleans up test entries in `afterAll`. Gracefully skips when `TEST_USER_*` env vars are missing.
- **E2E entry-flow test** — full sign-in → unlock passphrase → create entry → verify on timeline → view detail → export JSON. Also skips without credentials.
- **Vitest integration config** — separate `vitest.integration.config.ts` that loads `.env.local` vars via Vite's `loadEnv`.
- **Test scripts** — `test:integration` and `test:e2e` npm scripts added.
- Updated `.env.local.example` with `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_PASSPHRASE`.

### Issues hit
- Vitest picked up Playwright `e2e/*.spec.ts` files and crashed on `@playwright/test` imports. Fixed by adding `"e2e/**"` to vitest exclude.
- Dev server port conflicts — ports 3000 and 3001 occupied by other apps. Made Playwright config use `TEST_PORT` env var defaulting to 3002.

---

## 2026-02-01 — M1 Polish: Activities, Edit/Delete, Mood Chart, Quick Entry

### What shipped
- **Activities system** — `lib/activities.ts` with CRUD + 20 default activities seeded on first access. `activities` table with emoji + name per user. `ActivityInput` dropdown with multi-select and in-line "add new" feature.
- **Edit entry** — `EditEntryModal` component. Decrypt → edit body/mood/tags/activities → re-encrypt → update. Escape/backdrop to close.
- **Delete entry** — delete button on entry detail page with confirm dialog. Hard delete from DB.
- **Mood chart** — `MoodChart` SVG component on timeline. 24-hour trend line + 10-day rolling average. Color-coded mood dots.
- **Quick entry modal** — `QuickEntryModal` triggered by Cmd/Ctrl+N. Quick mood picker (7 emojis with color dots) + activity toggles. Creates entry with mood + activities, empty body. "Write full entry" button to go to full form.
- **Timeline styling** — entries grouped by year > month > day with headers. Mood emoji in left gutter with connector lines. Day-of-week headers with ordinal suffixes ("Monday the 3rd").
- **Drink count integration** — `lib/drinks.ts` fetches daily drink counts from external Neon DB. Displayed next to day headers in timeline.
- **Session persistence** — encryption key cached in sessionStorage (raw key bytes), survives page reloads within a tab. Cleared on sign-out.
- **Daylio CSV import** — parses Daylio export format, maps moods (awful→1, bad→2, meh→3, good→4, rad→6), splits activities by `|` or `,`, preserves timestamps.
- **Header redesign** — top nav bar with logo and "New Entry" button.
- **PWA support** — web app manifest, service worker registration, app icons. Installable on mobile/desktop.
- **Entry limit removed** — timeline loads all entries (was capped at 50).
- **Mood scale expanded** — 0-6 scale (added neutral 0 and excited 6) instead of original 1-5.
- **Allow empty body** — entries can be mood/activity-only (no text required).

### Decisions made
- **Activities stored in encrypted blob** — activity names in the blob, definitions (name + emoji) in plaintext `activities` table for UI display.
- **Hard delete** — no soft-delete for now, simpler UX. Soft-delete column exists in schema but unused.
- **External drink tracking** — separate Neon Postgres DB, read-only integration. Not part of the encrypted journal data model.
- **Session key caching** — acceptable trade-off for UX. Key is raw bytes in sessionStorage, scoped to tab. Cleared on sign-out.

### Commits
- `3dec985`..`b733ce2` — 25 commits covering activities, edit/delete, mood chart, quick entry, timeline styling, drink integration, PWA, Daylio import, and various fixes.

---

## 2026-02-03 — M2: Encrypted Image Attachments

### What shipped
- **Media library** — `lib/media.ts` with full image pipeline: EXIF stripping via OffscreenCanvas re-render, resize to max 2048px, JPEG compression (0.85 quality), AES-256-GCM encryption, upload to Supabase Storage (`encrypted-media` bucket), download + decrypt on demand, object URL lifecycle management.
- **Image picker component** — `ImagePicker` with file input (accept `image/*`, up to 4), preview thumbnails, remove buttons, drag-and-drop support. Reused in both new entry and edit modal.
- **New entry with images** — images selected in form, uploaded after entry creation. Each image processed → encrypted → uploaded separately with unique IV.
- **Entry detail images** — fetches + decrypts media on load. Responsive grid (1-col for single image, 2-col for multiple). Click-to-lightbox overlay with full-size view. Object URLs revoked on unmount.
- **Timeline media indicator** — image icon + count displayed on entry cards with attachments. Media counts fetched via single query (RLS-scoped, no `.in()` filter to avoid URL length limits).
- **Edit entry with images** — loads existing decrypted images, allows removing existing and adding new (up to 4 total). Removed images deleted from storage + DB on save, new images uploaded.
- **Export with media** — markdown zip export includes `media/` folder with decrypted JPEG files. Markdown entries reference images via `![](media/filename.jpg)`. Media decrypted on-the-fly during export.
- **Delete cleanup** — deleting an entry also deletes associated media from Supabase Storage and the `media` table.

### Decisions made
- **EXIF stripping via canvas** — re-render through OffscreenCanvas strips all EXIF/GPS metadata with zero dependencies. Converts everything to JPEG.
- **No separate thumbnails** — full images displayed at CSS-constrained sizes. Avoids storing two encrypted blobs per image. Acceptable for a personal journal with low image counts.
- **RLS-scoped media count query** — instead of `.in(entry_id, [...uuids])` which hit Supabase's URL length limit (400 error with many entries), query all user media rows and count client-side. RLS ensures only the user's data is returned.
- **Object URL lifecycle** — created on decrypt, revoked on component unmount or after export use. Prevents memory leaks.
- **Sequential image upload** — images uploaded one at a time after entry creation. Parallel upload possible but sequential is simpler and avoids race conditions with the media table.

### Issues hit
- **Supabase `.in()` URL length limit** — the initial `getMediaCounts` used `.in("entry_id", entryIds)` which generated a GET URL with hundreds of UUIDs. Supabase/PostgREST returned 400 Bad Request. Fixed by querying all user media (RLS-scoped) instead.

### Files added
- `src/lib/media.ts` — media encryption/upload/download/delete library
- `src/components/image-picker.tsx` — reusable image picker component

### Files modified
- `src/lib/entries.ts` — added `mediaCount` to `DecryptedEntry`, fetch counts in `listEntries`/`getEntry`
- `src/components/entry-card.tsx` — image count indicator with SVG icon
- `src/components/edit-entry-modal.tsx` — image management (view/add/remove existing)
- `src/app/(app)/new-entry/page.tsx` — image picker + upload on save
- `src/app/(app)/timeline/[id]/page.tsx` — image display, lightbox, media cleanup on delete
- `src/lib/export.ts` — markdown zip includes media folder
- `src/app/(app)/settings/page.tsx` — passes supabase/key to export for media
