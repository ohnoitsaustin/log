# Log

A private, encrypted-by-default personal journal. All entry content is encrypted client-side with AES-256-GCM before it ever reaches the server. You hold the keys.

## Principles

- **Encryption by default** — the server is a dumb store. Passphrase-derived keys, never stored server-side.
- **No streaks, no gamification** — witness, not fix. No badges, no nudges, zero notifications.
- **Exportable forever** — one-click JSON or Markdown export. No lock-in.
- **Tag-heavy** — free-text tags on every entry. Filter by tag across the timeline.
- **Capture-first** — creating an entry is fast and frictionless.

## Tech stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Framework  | Next.js 16 (App Router) + TypeScript + React 19 |
| Styling    | Tailwind CSS v4                                 |
| Auth       | Supabase Auth (email/password)                  |
| Database   | Supabase Postgres + RLS                         |
| Storage    | Supabase Storage (encrypted media bucket)       |
| Encryption | Web Crypto API (AES-256-GCM + PBKDF2)          |
| Export     | JSZip (client-side zip generation)              |
| Hosting    | Vercel                                          |

## Getting started

```bash
# Prerequisites: Node >= 20, npm
nvm use 20

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# Run Supabase migrations (requires Supabase CLI)
supabase db push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
├── app/
│   ├── (auth)/          # Sign-in, sign-up, forgot-password
│   ├── (app)/           # Authenticated app routes
│   │   ├── new-entry/   # Entry creation form
│   │   ├── timeline/    # Entry list + detail view
│   │   ├── tags/        # Tag listing
│   │   └── settings/    # Theme, export, import
│   └── layout.tsx       # Root layout, fonts, metadata
├── components/          # Shared UI components
├── lib/
│   ├── crypto.ts        # AES-256-GCM + PBKDF2 key derivation
│   ├── crypto-utils.ts  # Base64/hex encoding helpers
│   ├── entries.ts       # Entry CRUD (encrypt/decrypt + Supabase)
│   ├── export.ts        # JSON/Markdown export, JSON import
│   └── supabase/        # Supabase client helpers
└── proxy.ts             # Auth session refresh (Next.js 16 proxy)
```

## Milestones

See [todo.md](todo.md) for the full roadmap.

- **M0 — Skeleton**: Auth, app shell, crypto module, schema. Done.
- **M1 — Encrypted Text Entries**: Entry CRUD, timeline, tags, export/import. Done.
- **M2 — Images, Context, Search**: Upcoming.
- **M3 — Analytics / Observations**: Upcoming.
- **M4 — Hardening**: Upcoming.
