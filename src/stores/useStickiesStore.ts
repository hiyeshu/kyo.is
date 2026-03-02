/**
 * [INPUT]: 依赖 zustand create 与 persist 中间件，依赖浏览器 crypto，依赖 @/lib/cloudSync 云端写入
 * [OUTPUT]: 对外提供 useStickiesStore、StickyColor、StickyNote 类型
 * [POS]: stores/ 中便利贴状态中心，被 stickies 应用与聊天工具消费，每次变更同步写云端
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cloudUpsertItem, cloudDeleteItem, cloudDeleteByType } from "@/lib/cloudSync";
import { markLocalChange, trackDeletion } from "./useSyncStore";
import { useHistoryStore } from "./useHistoryStore";

export type StickyColor = "yellow" | "blue" | "green" | "pink" | "purple" | "orange";

// ─── 颜色轮换：新建便签自动取下一个颜色 ────────────────────────────
const COLOR_CYCLE: StickyColor[] = ["yellow", "blue", "green", "pink", "purple", "orange"];

function nextColor(current?: StickyColor): StickyColor {
  if (!current) return COLOR_CYCLE[0];
  const i = COLOR_CYCLE.indexOf(current);
  return COLOR_CYCLE[(i + 1) % COLOR_CYCLE.length];
}

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

// ─── 欢迎便签（首次使用时显示） ─────────────────────────────────────────────

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl+";

const WELCOME_CONTENT: Record<string, string> = {
  zh: `${mod}V 粘贴链接，自动收藏\n${mod}K 搜索一切\n直接打字也能搜\n桌面右键，更多可能`,
  en: `${mod}V paste a link, auto-saved\n${mod}K search everything\njust start typing to search\nright-click desktop for more`,
  ja: `${mod}V リンク貼り付け、自動保存\n${mod}K すべてを検索\nそのまま入力で検索\nデスクトップ右クリックで更に`,
  ko: `${mod}V 링크 붙여넣기, 자동 저장\n${mod}K 모든 것 검색\n바로 입력해서 검색\n바탕화면 우클릭으로 더 많은 기능`,
};

function getWelcomeContent(): string {
  const lang = typeof navigator !== "undefined" ? navigator.language : "en";
  if (lang.startsWith("zh")) return WELCOME_CONTENT.zh;
  if (lang.startsWith("ja")) return WELCOME_CONTENT.ja;
  if (lang.startsWith("ko")) return WELCOME_CONTENT.ko;
  return WELCOME_CONTENT.en;
}

function createWelcomeNote(): StickyNote {
  return {
    id: "welcome",
    content: getWelcomeContent(),
    color: "yellow",
    tags: [],
    onDesktop: true,
    position: { x: 340, y: 80 },
    size: DEFAULT_NOTE_SIZE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

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
    markLocalChange(id);
    cloudUpsertItem(noteToCloud(note));
    useHistoryStore.getState().addEntry({
      id: note.id, type: "note", title: note.content.slice(0, 60),
      content: note.content, tags: note.tags, createdAt: note.createdAt,
    });
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
      notes: [createWelcomeNote()],

      addNote: (
        color?: StickyColor,
        anchorId?: string | null,
        onDesktop: boolean = false
      ) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const existingNotes = get().notes;
        // 未指定颜色 → 取最后一张的下一个颜色，自动轮换
        const resolvedColor = color ?? nextColor(existingNotes[existingNotes.length - 1]?.color);
        const newNote: StickyNote = {
          id,
          content: "",
          color: resolvedColor,
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
          if (note) {
            markLocalChange(id);
            cloudUpsertItem(noteToCloud(note));
          }
        }
      },

      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
        }));
        markLocalChange(id);
        trackDeletion(id);
        cloudDeleteItem(id).catch((e) =>
          console.error("[stickies] delete failed:", e)
        );
        useHistoryStore.getState().markDeleted(id);
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
        get().notes.forEach((n) => trackDeletion(n.id));
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
