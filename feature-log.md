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
