![kyois](https://github.com/user-attachments/assets/87b89269-d74c-4c18-972a-94647f6a1b29)
[English](./README.md) | [中文](./README.zh-CN.md)


#  Kyo.is

**Your bookmarks are your desktop.**

Kyo.is is a personal web portal where links become your operating system. In a world where CLI and AI compress every entry point—where Notion, Figma, ChatGPT are all just URLs—you don't need to download anything anymore. You just need a place to put them.

**[Live Demo → kyo.is](https://kyo.is)**

---

## Philosophy

### Defocus as Entry Point

The moment you open your browser should feel like coming home, not clocking in. Kyo.is embraces blur, stillness, and negative space. It's not a productivity dashboard. It's a room you live in.

### Link as Universal Container

A link can hold anything—a tool, a document, a video, an AI assistant. When everything becomes a link, the browser becomes the OS, and your homepage becomes your desktop.

### Information Emerges Through Use

Information doesn't enter your mind through compression and retrieval. It grows through organizing, using, and wanting. Your desire to save a link *is* the meaning of that link.

---

## What Kyo.is is NOT

| | Kyo.is | Cubox |
|--|--------|-------|
| **Metaphor** | Room | Warehouse |
| **Core action** | Live with | Capture & retrieve |
| **Psychology** | "It's here when I need it" | "I saved it but haven't read it" |

| | Kyo.is | iTab |
|--|--------|------|
| **Content** | Only what you choose | External feeds |
| **Information flow** | You → Desktop | World → You |
| **Changes when** | Only when you change it | Every day (trending updates) |

> Cubox asks: "Where did you save that?"  
> iTab asks: "What's trending today?"  
> **Kyo.is asks: "What do you want on your desk?"**

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Layer 1: Surface — What you see            │
│  Wallpaper + Dock + Quick Access            │
│  ← This is your "desktop"                   │
├─────────────────────────────────────────────┤
│  Layer 2: Portal — What you trigger         │
│  ⌘K — The only entry point you need         │
│  ← This is your "command center"            │
├─────────────────────────────────────────────┤
│  Layer 3: Depth — Where you go deep         │
│  Chat / Notes / Custom Applets              │
│  ← This is your "private space"             │
└─────────────────────────────────────────────┘
```

---

## Features

### Surface Layer
- 🖼️ **Wallpapers** — Static & video wallpapers with blur effects
- 🎯 **Dock** — macOS-style dock for your most-used links
- ✨ **Glassmorphism** — Frosted glass UI

### Portal Layer
- ⌨️ **⌘K** — The only entry point you need
- 🔖 **Bookmarks** — Your links, your way
- 🖱️ **Drag & Drop** — Arrange your digital space

### Depth Layer *(Coming Soon)*
- 💬 **Personal AI** — Understands your link collection, not generic chat
- 📝 **Quick Notes** — Markdown notes on your desktop

---

## Roadmap

```
Phase 1: Foundation (Current)
├── Clean up legacy code
├── PWA optimization
├── Enhanced bookmarks: drag-sort, edit, import
└── ⌘K upgrade

Phase 2: Personal Portal
├── Quick Links mode: bookmark grid on desktop
├── Link preview on hover
├── Dock enhancement
└── Mobile-first layout

Phase 3: Private Space
├── Personal AI: search bookmarks, summarize links
├── Quick Notes
└── Applet framework
```

---

## Tech Stack

- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui, Framer Motion
- **State:** Zustand
- **Storage:** IndexedDB, LocalStorage
- **AI:** Vercel AI SDK
- **Audio:** Tone.js
- **Deployment:** Vercel

---

## Development

```bash
bun install
bun run dev
bun run build
```

---

## Why "Kyo"?

鏡 (kyō) — mirror.

Your digital space should reflect you, not the world's noise.

---

## License

AGPL-3.0 — See [LICENSE](./LICENSE)

This project is forked from [ryokun6/ryos](https://github.com/ryokun6/ryos) — A Web-Based Agentic AI OS

---

*Information doesn't enter your mind through compression.*  
*It grows through organizing, using, and wanting.*
