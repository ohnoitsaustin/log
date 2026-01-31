# Log — Personal Encrypted Journal / Lifelog

## Product North Star

- **A private, encrypted-by-default journal** that captures moments without judging them.
- Optimized for fast capture: text, tags, optional photos, context fields (mood, energy, location, weather).
- "Witness, not fix" — the app observes patterns; it never gamifies, scores, or streaks.
- All data is client-side encrypted; the server is a dumb store. You hold the keys.
- Exportable forever: JSON, Markdown, and detached media. No lock-in.
- Analytics surface gentle observations ("you tend to write more on rainy days") — never prescriptions.

---

## Non-Negotiables

| Principle                        | What it means                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Encryption by default**        | All entry content + media encrypted client-side (AES-256-GCM via Web Crypto API). Supabase never sees plaintext. Keys derived from user passphrase via Argon2id / PBKDF2, never stored server-side. |
| **No streaks / no gamification** | No streak counters, no points, no badges, no "you missed a day" nudges. Zero notifications.                                                                                                         |
| **No notifications**             | The app never pings you. You come to it when you want to.                                                                                                                                           |
| **Exportable forever**           | One-click export: encrypted vault → decrypted JSON + Markdown + media folder. Works offline.                                                                                                        |
| **Tag-heavy taxonomy**           | Every entry has explicit user tags. Derived/auto tags come later (M3). Free-text tags, no forced categories.                                                                                        |
| **Capture-first UX**             | The creation flow is ≤2 taps/clicks to start writing. Analytics and browsing live in separate views.                                                                                                |
| **Open local-first spirit**      | Even though we use Supabase, the architecture should allow a future local-only / self-hosted mode.                                                                                                  |

---

## Milestones

### M0 — Skeleton

> **Goal:** Repo builds, deploys to Vercel, has basic auth and empty shell pages.

#### UI/UX

- [x] Landing / marketing page (minimal — can be a single "Log in" button for now)
- [x] Auth pages: sign-up, sign-in, forgot-password (Supabase Auth UI or custom)
- [x] App shell with sidebar/bottom-nav: **New Entry**, **Timeline**, **Tags**, **Settings**
- [x] Dark mode support from day one (Tailwind `dark:` classes)
- [x] Responsive: mobile-first, works on desktop

#### Data Model & Storage

- [x] Supabase project provisioned (dev + staging)
- [x] Initial Postgres schema migration (see schema draft below)
- [x] Row-Level Security (RLS) policies: users can only access their own rows
- [x] Supabase Storage bucket for encrypted media blobs

#### Encryption & Key Management

- [x] Spike: Web Crypto API — confirm AES-256-GCM + PBKDF2/Argon2id works in all target browsers
- [x] Design key derivation flow (passphrase → master key → per-entry key or single key?)
- [x] Stub encryption/decryption utility module (`lib/crypto.ts`)

#### Export/Import

- [x] (nothing yet — just ensure schema supports future export)

#### Testing

- [x] ESLint + Prettier configured and passing
- [x] CI pipeline: GitHub Actions — lint, type-check, test, build
- [ ] Playwright or Cypress stub for smoke test *(deferred)*

#### Security Notes

- [x] `.env.local` for Supabase keys; never commit secrets
- [x] Supabase anon key is public; service-role key only in server-side functions
- [x] CSP headers configured in `next.config.ts`

#### Definition of Done — M0

- App deploys to Vercel and loads without errors.
- User can sign up, sign in, and sign out via Supabase Auth.
- Empty shell pages render behind auth guard.
- CI passes (lint + type-check + build).
- Encryption utility module exists with a working `encrypt` / `decrypt` round-trip test.

---

### M1 — Encrypted Text Entries End-to-End

> **Goal:** Users can create, read, list, tag, and export text entries. All content is encrypted client-side.

#### UI/UX

- [x] **New Entry** page: large text area, tag input (comma-separated or chip-style), optional mood/energy selector
- [x] **Timeline** page: reverse-chronological list of entries (decrypt on read)
- [x] Entry detail view (tap to expand / full page)
- [x] Inline tag display with filter-by-tag
- [x] Empty states and loading skeletons
- [x] Keyboard shortcut: `Cmd+N` / `Ctrl+N` → new entry

#### Data Model & Storage

- [x] `entries` table populated: `id`, `user_id`, `encrypted_blob`, `iv`, `created_at`, `updated_at`
- [x] `tags` table + `entry_tags` join table
- [x] Indexes on `user_id`, `created_at`, tag name
- [x] Soft-delete column (`deleted_at`) for entries

#### Encryption & Key Management

- [x] Passphrase setup flow on first login (derive master key, store encrypted key-check blob)
- [x] Encrypt entry body + metadata JSON client-side before INSERT
- [x] Decrypt entry on SELECT client-side
- [x] Passphrase unlock screen on app load (key held in memory only, never persisted)
- [x] Handle wrong-passphrase gracefully (key-check blob verification)

#### Export/Import

- [x] Export all entries as decrypted JSON (array of `{ date, body, tags, mood?, ... }`)
- [x] Export all entries as Markdown files (one `.md` per entry, YAML frontmatter)
- [x] Download as `.zip` via JSZip or similar
- [x] Import from JSON (re-encrypt on import)

#### Testing

- [x] Unit tests: crypto round-trip (encrypt → decrypt = original)
- [x] Unit tests: export/import JSON parsing
- [ ] Integration test: create entry → list → read back → matches *(deferred)*
- [ ] E2E test: full create → list → export flow *(deferred)*

#### Security Notes

- [x] Verify no plaintext leaks into network tab / Supabase logs
- [x] Ensure passphrase is never sent to server
- [x] Rate-limit auth attempts (Supabase built-in)

#### Definition of Done — M1

- User can create a text entry with tags; it is encrypted before leaving the browser.
- Timeline lists entries; tapping one decrypts and displays it.
- Filter-by-tag works.
- Export to JSON and Markdown produces correct, decrypted output.
- Import from JSON re-encrypts and stores entries.
- All tests pass.

---

### M2 — Images, Context Fields, Search & Filter

> **Goal:** Entries can include photos and structured context (mood, energy, location, weather). Search and filtering are usable.

#### UI/UX

- [ ] Image attachment on new entry (camera or file picker, up to 4 images)
- [ ] Image thumbnails in timeline; full-size in detail view
- [ ] Context fields: mood (emoji or 1-5 scale), energy (1-5), location (optional text), weather (optional text or auto)
- [ ] Search bar: full-text search over decrypted entries (client-side index)
- [ ] Advanced filter: date range, tags, mood range, has-image
- [ ] Edit entry flow (decrypt → edit → re-encrypt → update)
- [ ] Delete entry flow (soft-delete, with undo toast)

#### Data Model & Storage

- [ ] `media` table: `id`, `entry_id`, `user_id`, `storage_path`, `encrypted_key`, `mime_type`, `created_at`
- [ ] Encrypted media blobs stored in Supabase Storage (or Cloudinary later)
- [ ] Context fields: add `encrypted_context` column to `entries` or store in the encrypted blob
- [ ] Client-side search index (e.g., MiniSearch or Fuse.js over decrypted entries cached in memory)

#### Encryption & Key Management

- [ ] Encrypt images client-side before upload (chunked if large)
- [ ] Decrypt images on demand for display (cache decrypted blob in memory / object URL)
- [ ] Context fields encrypted inside the entry blob (not queryable server-side — by design)

#### Export/Import

- [ ] Export includes media files in a `media/` folder inside the zip
- [ ] Markdown export embeds `![](media/filename.ext)` references
- [ ] Import supports entries with media attachments

#### Testing

- [ ] Unit tests: image encrypt/decrypt round-trip
- [ ] Integration test: create entry with image → read back → image displays
- [ ] E2E test: search returns correct results
- [ ] E2E test: export with media produces valid zip

#### Security Notes

- [ ] Image EXIF stripping before encryption (prevent location leaks)
- [ ] Max upload size enforced client-side and via Supabase Storage policies
- [ ] Object URLs revoked after use to prevent memory leaks

#### Definition of Done — M2

- Entries support up to 4 attached images, encrypted and stored.
- Context fields (mood, energy, location, weather) are captured and displayed.
- Client-side search works across all decrypted entries.
- Advanced filter by date, tags, mood, and has-image works.
- Edit and soft-delete work correctly.
- Export includes media.

---

### M3 — Analytics / Observations + Derived Tags

> **Goal:** The app gently surfaces patterns. Derived tags are auto-suggested. Still no gamification.

#### UI/UX

- [ ] **Insights** page: gentle trend cards ("You wrote 12 entries this month", "Most common tag: `work`")
- [ ] Tag frequency chart (bar or word-cloud)
- [ ] Mood/energy over time chart (line or scatter, smoothed)
- [ ] "On this day" feature (entries from same date in past years)
- [ ] Derived tag suggestions: after saving, suggest tags based on content (client-side NLP or simple keyword match)
- [ ] All analytics computed client-side from decrypted data — nothing server-queryable

#### Data Model & Storage

- [ ] `derived_tags` or store suggestions in entry blob
- [ ] Optional: local IndexedDB cache for faster analytics on large datasets

#### Encryption & Key Management

- [ ] No changes — analytics computed post-decryption in memory
- [ ] Ensure no analytics data is persisted unencrypted (no localStorage plaintext caches)

#### Export/Import

- [ ] Export includes derived tags in JSON output
- [ ] Analytics data is not exported (it's computed, not stored)

#### Testing

- [ ] Unit tests: trend calculation functions
- [ ] Unit tests: derived tag suggestion logic
- [ ] E2E test: insights page renders charts with sample data
- [ ] Accessibility: charts have `aria-label` descriptions

#### Security Notes

- [ ] Confirm no plaintext summary data is cached in localStorage / sessionStorage
- [ ] Client-side NLP model (if used) must not phone home

#### Definition of Done — M3

- Insights page shows meaningful trends from user data.
- Derived tag suggestions appear and can be accepted or dismissed.
- All computation is client-side; no plaintext analytics server-side.
- Charts are accessible.

---

### M4 — Hardening

> **Goal:** Production-quality security, performance, accessibility, and backup strategy.

#### UI/UX

- [ ] Accessibility audit: keyboard navigation, screen reader, contrast ratios (WCAG 2.1 AA)
- [ ] Performance audit: Lighthouse score ≥ 90 on mobile
- [ ] Skeleton loading states everywhere
- [ ] Offline support: service worker caches app shell; entries queue for sync
- [ ] Settings page: change passphrase, manage export, danger zone (delete account)

#### Data Model & Storage

- [ ] Database backup strategy documented (Supabase daily backups + user-initiated export)
- [ ] Data retention policy: soft-deleted entries purged after 30 days (configurable)
- [ ] Migration tooling: versioned migrations with Supabase CLI

#### Encryption & Key Management

- [ ] Passphrase change flow: re-derive key, re-encrypt all entries (background job with progress bar)
- [ ] Key rotation strategy documented
- [ ] Emergency recovery: encrypted recovery key flow (print-and-store)
- [ ] Audit: ensure no plaintext in network requests, logs, or browser storage

#### Export/Import

- [ ] Encrypted vault export (export the raw encrypted blobs + salt so you can restore without re-encrypting)
- [ ] Cross-device restore from vault export
- [ ] Export scheduling (optional: weekly export reminder — not a notification, just a settings toggle)

#### Testing

- [ ] Full E2E test suite covering all milestones
- [ ] Penetration test checklist (manual)
- [ ] Load test: 10,000 entries, measure decrypt/render time
- [ ] Accessibility tests: axe-core in CI

#### Security Notes

- [ ] Threat model review (see below)
- [ ] Dependency audit: `npm audit` in CI, Dependabot enabled
- [ ] Rate limiting on API routes (Vercel edge middleware or Supabase)
- [ ] CORS locked to production domain
- [ ] Subresource Integrity (SRI) for CDN assets if any

#### Definition of Done — M4

- WCAG 2.1 AA compliance on all pages.
- Lighthouse mobile score ≥ 90.
- Passphrase change re-encrypts all entries successfully.
- Encrypted vault export and restore works cross-device.
- Threat model reviewed and documented.
- All CI checks pass including accessibility.

---

## Postgres Schema Draft

```sql
-- Users are managed by Supabase Auth (auth.users).
-- All app tables reference auth.users.id.

-- Encrypted key-check blob: used to verify passphrase correctness.
CREATE TABLE key_checks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salt          bytea NOT NULL,          -- salt for key derivation
  iv            bytea NOT NULL,          -- IV for the check blob
  check_blob    bytea NOT NULL,          -- encrypt("LOG_CHECK") with derived key
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Journal entries. The server only sees ciphertext.
CREATE TABLE entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_blob bytea NOT NULL,         -- AES-256-GCM ciphertext (body + context JSON)
  iv            bytea NOT NULL,          -- unique IV per entry
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,             -- soft delete
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE INDEX idx_entries_user_created ON entries(user_id, created_at DESC);

-- Tags are stored in plaintext for server-side filtering.
-- DECISION: if this leaks too much metadata, encrypt tag names too (see open questions).
CREATE TABLE tags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE entry_tags (
  entry_id      uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id        uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

-- Media attachments (encrypted blobs in Supabase Storage).
CREATE TABLE media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,           -- path in Supabase Storage bucket
  iv            bytea NOT NULL,          -- IV for this media blob
  mime_type     text NOT NULL,           -- e.g., "image/jpeg"
  size_bytes    bigint,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_entry ON media(entry_id);
```

---

## Threat Model (Lite)

### What we protect against

| Threat                                                           | Mitigation                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Server-side data breach** (Supabase DB or storage compromised) | All entry content + media is AES-256-GCM encrypted client-side. Attacker gets ciphertext only.            |
| **Supabase admin / insider access**                              | Same as above — server never sees plaintext. Keys derived from user passphrase, never stored server-side. |
| **Network eavesdropping**                                        | HTTPS everywhere (Vercel + Supabase enforce TLS).                                                         |
| **Cross-site scripting (XSS)**                                   | CSP headers, React's built-in escaping, no `dangerouslySetInnerHTML` without sanitization.                |
| **Cross-site request forgery (CSRF)**                            | Supabase uses JWTs (no cookies for API auth by default), mitigating CSRF.                                 |
| **Unauthorized access to other users' data**                     | Supabase RLS policies: every query is scoped to `auth.uid()`.                                             |
| **Brute-force passphrase guessing**                              | Argon2id/PBKDF2 with high iteration count makes offline brute-force expensive.                            |

### What we do NOT protect against (accepted risks)

| Risk                                                                          | Why accepted                                                                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Compromised client device** (malware, keylogger)                            | Out of scope — if the device is owned, all bets are off.                                               |
| **User forgets passphrase**                                                   | By design — we cannot recover data without the passphrase. Recovery key (M4) mitigates partially.      |
| **Metadata leakage** (timestamps, entry count, tag names if stored plaintext) | Acceptable trade-off for server-side filtering. Can encrypt tags later if needed (see open questions). |
| **Denial of service on Supabase**                                             | Supabase/Vercel infrastructure handles this; not in our threat model.                                  |
| **Side-channel attacks on Web Crypto**                                        | Extremely unlikely in browser context; accepted.                                                       |

### Assumptions

- User's device and browser are not compromised.
- HTTPS is enforced end-to-end (Vercel + Supabase).
- Supabase Auth is correctly configured (email confirmation, rate limiting).
- The user chooses a strong passphrase (we can enforce minimum length / entropy check).
- We trust the Web Crypto API implementation in modern browsers.

---

## Decisions / Open Questions

1. ~~**Passphrase reset:**~~ Deferred to M4. No recovery key yet — data is unrecoverable if passphrase is forgotten.
2. **Tag encryption:** Tags are currently plaintext in the DB for server-side filtering. Should we encrypt tag names too? This would make server-side tag filtering impossible (all filtering client-side).
3. **Multiple devices:** How do we handle the passphrase across devices? Re-enter on each device? Sync a key-wrapped blob?
4. **Offline / local-first:** Should we add IndexedDB caching of decrypted entries for offline use in M2 or M4? What sync strategy?
5. ~~**Key derivation function:**~~ Resolved: PBKDF2 with 600k iterations (native Web Crypto). Revisit Argon2id in M4.
6. ~~**Per-entry keys vs. single master key:**~~ Resolved: single master key for now. Simpler, sufficient for M1.
7. ~~**Mood / energy scale:**~~ Resolved: 5-point emoji picker (1-5 stored as integer, displayed as emoji). Energy deferred to M2.
8. **Auto-context capture:** Should we auto-capture weather and location (with permission)? Or always manual? Privacy implications of location APIs.
9. **Supabase Edge Functions:** Do we need any server-side logic (e.g., cleanup cron, email export), or can everything be client-side + RLS?
10. **Image processing pipeline:** Encrypt-then-upload vs. upload-then-encrypt? EXIF stripping before or after encryption? Max image dimensions / compression before encryption?

---

## Tech Stack Summary

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| Framework    | Next.js (App Router) + TypeScript                    |
| Styling      | Tailwind CSS                                         |
| Auth         | Supabase Auth (email/password; social optional)      |
| Database     | Supabase Postgres                                    |
| File Storage | Supabase Storage (→ Cloudinary later for transforms) |
| Encryption   | Web Crypto API (AES-256-GCM) + PBKDF2 or Argon2id    |
| Export       | JSZip (client-side zip generation)                   |
| Search       | MiniSearch or Fuse.js (client-side)                  |
| Charts       | Recharts or Chart.js (client-side)                   |
| Testing      | Vitest (unit) + Playwright (E2E)                     |
| CI/CD        | GitHub Actions → Vercel                              |
| Hosting      | Vercel                                               |
