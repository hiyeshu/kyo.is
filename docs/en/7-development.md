# Development

## Local Development

```bash
bun install
bun run dev:vercel
```

Open `http://localhost:5173`.

## Build

```bash
bun run build
```

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
