/**
 * [INPUT]: 依赖 stores/useStickiesStore, stores/useAppStore, framer-motion
 * [OUTPUT]: 对外提供 StickyNotesLayer 组件
 * [POS]: components/layout/ 的便签统一渲染层，便签是桌面一等公民，永远可用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { useStickiesStore } from "@/stores/useStickiesStore";
import { useAppStore } from "@/stores/useAppStore";
import { StickyNote } from "@/apps/stickies/components/StickyNote";
import { useCallback, useState } from "react";

/**
 * StickyNotesLayer - 便签统一渲染层
 * 
 * 设计哲学：便签是桌面的一等公民，不依赖 stickies 应用是否打开
 * - 便签永远渲染在桌面层（通过 portal）
 * - 永远可拖动、可编辑、可删除
 * - stickies 应用只是"便签管理器"（提供菜单栏操作）
 * 
 * 单一真相源：useStickiesStore
 */
export function StickyNotesLayer() {
  const notes = useStickiesStore((state) => state.notes);
  const updateNote = useStickiesStore((state) => state.updateNote);
  const deleteNote = useStickiesStore((state) => state.deleteNote);
  const bringToFront = useStickiesStore((state) => state.bringToFront);
  
  // 当前选中的便签
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const handleNoteSelect = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
    bringToFront(noteId);
    
    // 如果 stickies 应用打开了，通知它选中状态变化
    // 这样菜单栏的"删除便签"、"更换颜色"等操作能知道操作哪个便签
    window.dispatchEvent(new CustomEvent("stickies:noteSelected", { detail: { noteId } }));
  }, [bringToFront]);

  const handleNoteUpdate = useCallback((noteId: string, updates: Parameters<typeof updateNote>[1]) => {
    updateNote(noteId, updates);
  }, [updateNote]);

  const handleNoteDelete = useCallback((noteId: string) => {
    deleteNote(noteId);
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }
  }, [deleteNote, selectedNoteId]);

  // 只渲染 onDesktop 的便签，或者当 stickies 应用打开时渲染所有便签
  const isStickiesOpen = useAppStore((state) => 
    Object.values(state.instances).some(
      (inst) => inst.appId === "stickies" && inst.isOpen
    )
  );

  // 计算 z-index
  // 便签层在窗口之下（z-index 1），但当 stickies 应用打开时提升到窗口层级
  const getZIndexForNote = useCallback((noteId: string) => {
    if (!isStickiesOpen) {
      // stickies 未打开：所有便签在 z-index 1（桌面之上，窗口之下）
      return 1;
    }
    // stickies 打开：便签提升到窗口层级，选中的在最上面
    const baseZ = 40;
    const index = notes.findIndex((n) => n.id === noteId);
    if (noteId === selectedNoteId) {
      return baseZ + notes.length + 1;
    }
    return baseZ + index;
  }, [isStickiesOpen, notes, selectedNoteId]);
  
  const visibleNotes = isStickiesOpen 
    ? notes  // stickies 打开时显示所有便签
    : notes.filter((note) => note.onDesktop);  // 否则只显示桌面便签

  if (visibleNotes.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      {visibleNotes.map((note) => (
        <StickyNote
          key={note.id}
          note={note}
          onSelect={() => handleNoteSelect(note.id)}
          onUpdate={(updates) => handleNoteUpdate(note.id, updates)}
          onDelete={() => handleNoteDelete(note.id)}
          zIndex={getZIndexForNote(note.id)}
          // 便签是一等公民：选中即可操作，不依赖 stickies 应用是否打开
          isForeground={note.id === selectedNoteId}
        />
      ))}
    </AnimatePresence>,
    document.body
  );
}
