# Development

## Local Development

```bash
bun install
cp .dev.vars.example .dev.vars
bun run dev
bun run dev:worker
```

Open `http://localhost:5173`.

## Build

```bash
bun run check:migration
bun run build
bun run verify:worker
bun run test
bun run types:worker
```

`check:migration` is the migration gate. It checks Cloudflare Worker config, Supabase/DeepSeek env names, migration files, static asset size, and legacy provider entry residue. It reports missing variable names without printing secret values.

`types:worker` generates `src/worker/env.d.ts` from `.dev.vars.example`. Rerun it after changing Worker bindings or environment variable names.

`bun run test` verifies the current Cloudflare Worker API by default: static assets, SPA fallback, CORS, unauthorized access, input validation, and compatibility API routes. The old serverless API, chat-room, lyrics, and TTS tests are no longer production-entry tests.

## Cloudflare Deploy

```bash
wrangler login
bun run configure:cloudflare-env
bun run types:worker
bun run check:migration
bun run verify:worker
bun run test
bun run deploy:cloudflare
KYO_BASE_URL=https://kyo.is bun run verify:worker
```

Before deploy, complete:

- `wrangler login`
- Local `.dev.vars` or `.env.local` contains: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `DEEPSEEK_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

`configure:cloudflare-env` writes these four values as Cloudflare Worker secrets without printing the values.

## Project Structure

```
src/
  apps/          Six app modules
  components/    Shared components
  config/        App registry, themes, wallpapers
  hooks/         Custom hooks
  lib/           Utilities
  stores/        Zustand stores
  styles/        Global styles
  types/         TypeScript types
```

## Rules

- All text through `t()` function. No hardcoding.
- All colors through CSS variables. No hardcoding.
- Global state with Zustand. Local state with `useState`.
- File system through `useFileSystem` hook. Never touch IndexedDB directly.
- Function over 20 lines? Rethink.
- Indentation over 3 levels? Refactor.

## Desktop App

```bash
bun run tauri:dev
bun run tauri:build
```

## Documentation

```bash
bun run scripts/generate-docs.ts
```

Edit Markdown files under `docs/zh/` or `docs/en/`, run the command above, push to deploy.
