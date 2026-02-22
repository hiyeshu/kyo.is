/**
 * [INPUT]: 依赖 zustand create 与 persist 中间件，依赖浏览器 crypto，依赖 @/lib/cloudSync 云端写入
 * [OUTPUT]: 对外提供 useStickiesStore、StickyColor、StickyNote 类型
 * [POS]: stores/ 中便利贴状态中心，被 stickies 应用与聊天工具消费，每次变更同步写云端
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cloudUpsertItem, cloudDeleteItem, cloudDeleteByType } from "@/lib/cloudSync";

export type StickyColor = "yellow" | "blue" | "green" | "pink" | "purple" | "orange";

export interface StickyNote {
  id: string;
  content: string;
  color: StickyColor;
  tags: string[];
  onDesktop: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  createdAt: number;
  updatedAt: number;
}

interface StickiesState {
  notes: StickyNote[];
  addNote: (color?: StickyColor, anchorId?: string | null, onDesktop?: boolean) => string;
  updateNote: (id: string, updates: Partial<Omit<StickyNote, "id" | "createdAt">>) => void;
  deleteNote: (id: string) => void;
  bringToFront: (id: string) => void;
  clearAllNotes: () => void;
}

const DEFAULT_NOTE_SIZE = { width: 220, height: 240 };

// ─── 云端字段映射 ─────────────────────────────────────────────────────────────

function noteToCloud(n: StickyNote) {
  return {
    id: n.id,
    type: "note" as const,
    text: n.content,
    color: n.color,
    tags: n.tags || [],
    on_desktop: n.onDesktop || false,
    created_at: new Date(n.createdAt).toISOString(),
    updated_at: new Date(n.updatedAt).toISOString(),
  };
}

const NOTE_FIELD_MAP: Record<string, string> = {
  content: "text",
  color: "color",
  tags: "tags",
  onDesktop: "on_desktop",
};

// ─── 内容同步 debounce（500ms，避免每次按键都写云端） ─────────────────────────

const contentSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debouncedContentSync(id: string) {
  const existing = contentSyncTimers.get(id);
  if (existing) clearTimeout(existing);
  contentSyncTimers.set(id, setTimeout(() => {
    contentSyncTimers.delete(id);
    const note = useStickiesStore.getState().notes.find((n) => n.id === id);
    if (!note || !note.content.trim()) return;
    cloudUpsertItem(noteToCloud(note));
  }, 500));
}

// Stack new notes with slight offset from existing notes
const getNextPosition = (existingNotes: StickyNote[], anchorId?: string | null) => {
  const baseX = 100;
  const baseY = 60; // Account for menu bar
  const offset = 25; // Offset for each new note
  const anchorOffsetX = DEFAULT_NOTE_SIZE.width + 16;
  const anchorOffsetY = 8;

  if (existingNotes.length === 0) {
    return { x: baseX, y: baseY };
  }

  const anchorNote = anchorId
    ? existingNotes.find((note) => note.id === anchorId)
    : undefined;

  // Prefer placing next to the selected note
  const referenceNote = anchorNote ?? existingNotes[existingNotes.length - 1];
  let newX = referenceNote.position.x + (anchorNote ? anchorOffsetX : offset);
  let newY = referenceNote.position.y + (anchorNote ? anchorOffsetY : offset);

  // Wrap around if going off screen
  const maxX = typeof window !== "undefined" ? window.innerWidth - DEFAULT_NOTE_SIZE.width - 50 : 600;
  const maxY = typeof window !== "undefined" ? window.innerHeight - DEFAULT_NOTE_SIZE.height - 50 : 400;

  if (newX > maxX) newX = baseX + (existingNotes.length % 5) * offset;
  if (newY > maxY) newY = baseY + (existingNotes.length % 5) * offset;

  return { x: newX, y: newY };
};

export const useStickiesStore = create<StickiesState>()(
  persist(
    (set, get) => ({
      notes: [],

      addNote: (
        color: StickyColor = "yellow",
        anchorId?: string | null,
        onDesktop: boolean = false
      ) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const existingNotes = get().notes;
        const newNote: StickyNote = {
          id,
          content: "",
          color,
          tags: [],
          onDesktop,
          position: getNextPosition(existingNotes, anchorId),
          size: DEFAULT_NOTE_SIZE,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          notes: [...state.notes, newNote],
        }));
        return id;
      },

      updateNote: (id, updates) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? { ...note, ...updates, updatedAt: Date.now() }
              : note
          ),
        }));
        const hasCloudField = Object.keys(updates).some((k) => NOTE_FIELD_MAP[k]);
        if (!hasCloudField) return;
        if ("content" in updates) {
          debouncedContentSync(id);
        } else {
          const note = get().notes.find((n) => n.id === id);
          if (note) cloudUpsertItem(noteToCloud(note));
        }
      },

      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
        }));
        cloudDeleteItem(id).catch((e) =>
          console.error("[stickies] delete failed:", e)
        );
      },

      bringToFront: (id) => {
        const { notes } = get();
        const noteIndex = notes.findIndex((n) => n.id === id);
        if (noteIndex === -1 || noteIndex === notes.length - 1) return;

        set((state) => {
          const newNotes = [...state.notes];
          const [note] = newNotes.splice(noteIndex, 1);
          newNotes.push(note);
          return { notes: newNotes };
        });
      },

      clearAllNotes: () => {
        set({ notes: [] });
        cloudDeleteByType("note").catch((e) =>
          console.error("[stickies] clearAll failed:", e)
        );
      },
    }),
    {
      name: "kyo:stickies-store",
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { notes?: StickyNote[] };
        if (version < 2 && state.notes) {
          // v1 → v2: 添加 tags 字段
          state.notes = state.notes.map((n) => ({ ...n, tags: n.tags ?? [] }));
        }
        if (version < 3 && state.notes) {
          // v2 → v3: 添加 onDesktop 字段
          state.notes = state.notes.map((n) => ({ ...n, onDesktop: n.onDesktop ?? false }));
        }
        return state as StickiesState;
      },
    }
  )
);
