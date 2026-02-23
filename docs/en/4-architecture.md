# Architecture

Kyo has no router. No page transitions. The entire app is a desktop.

Navigation means opening and closing windows — the same way you use a computer.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite + Bun |
| Styling | Tailwind CSS v4 + Framer Motion |
| State | Zustand |
| Storage | IndexedDB + LocalStorage |
| AI | Vercel AI SDK + Dify |
| Audio | Tone.js + Web Audio API |
| Deploy | Vercel |
| Desktop | Tauri 2.0 |

## Data Flow

```
User action → Zustand Store → React re-render
                  ↓
             IndexedDB persistence
```

No Redux. No Context nesting hell. No Provider wrapping madness. Zustand is the single source of truth. Components subscribe to the slice they need. That's it.

## Window System

Every app is a window instance. The window manager handles: dragging, resizing, minimizing, z-index layering, multiple instances.

Windows are not routes. They are UI state. The URL doesn't change. The browser back button doesn't close windows. This is intentional.

## Virtual File System

IndexedDB backend. Access through the `useFileSystem` hook.

Never touch IndexedDB directly. That's the rule.
