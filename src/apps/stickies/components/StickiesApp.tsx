/**
 * [INPUT]: 依赖 react hooks，依赖 AppProps，依赖 stickies 逻辑，依赖 dialogs，依赖 appMetadata
 * [OUTPUT]: 对外提供 StickiesApp 组件（轻量级管理器，便签由 StickyNotesLayer 统一渲染）
 * [POS]: apps/stickies/components/ 的主组件，便签管理器（菜单栏操作、对话框），便签渲染委托给 StickyNotesLayer
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useCallback } from "react";
import { StickiesMenuBar } from "./StickiesMenuBar";
import { AppProps } from "@/apps/base/types";
import { useStickiesLogic } from "../hooks/useStickiesLogic";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { appMetadata } from "../metadata";
import { useAppStore } from "@/stores/useAppStore";

export function StickiesApp({
  isWindowOpen,
  onClose: _onClose,
  isForeground,
  instanceId,
  initialData,
}: AppProps) {
  const closeAppInstance = useAppStore((state) => state.closeAppInstance);

  const {
    translatedHelpItems,
    isHelpDialogOpen,
    setIsHelpDialogOpen,
    isAboutDialogOpen,
    setIsAboutDialogOpen,
    isXpTheme,
    notes,
    selectedNoteId,
    handleCreateNote,
    handleDeleteNote,
    handleChangeColor,
    clearAllNotes,
    bringToFront,
    setSelectedNoteId,
  } = useStickiesLogic();

  // Handle close - directly close the app instance
  // Stickies doesn't use WindowFrame, so we call closeAppInstance directly
  const handleClose = useCallback(() => {
    if (instanceId) {
      closeAppInstance(instanceId);
    }
  }, [instanceId, closeAppInstance]);

  // Listen for close requests from external sources (dock, menu bar, etc.)
  // Stickies doesn't use WindowFrame, so we need to handle this event ourselves
  useEffect(() => {
    if (!instanceId) return;

    const handleRequestClose = () => {
      handleClose();
    };

    window.addEventListener(
      `requestCloseWindow-${instanceId}`,
      handleRequestClose
    );

    return () => {
      window.removeEventListener(
        `requestCloseWindow-${instanceId}`,
        handleRequestClose
      );
    };
  }, [instanceId, handleClose]);

  // Create a new note when app is opened and no notes exist
  useEffect(() => {
    if (isWindowOpen && notes.length === 0) {
      handleCreateNote();
    }
  }, [isWindowOpen]);

  useEffect(() => {
    if (!isWindowOpen) return;
    if (!initialData || typeof initialData !== "object") return;
    const focusNoteId = (initialData as { focusNoteId?: string }).focusNoteId;
    if (!focusNoteId) return;
    setSelectedNoteId(focusNoteId);
    bringToFront(focusNoteId);
  }, [bringToFront, initialData, isWindowOpen, setSelectedNoteId]);

  // Listen for note selection from StickyNotesLayer
  useEffect(() => {
    if (!isWindowOpen) return;
    
    const handleNoteSelected = (e: Event) => {
      const customEvent = e as CustomEvent<{ noteId: string }>;
      if (customEvent.detail?.noteId) {
        setSelectedNoteId(customEvent.detail.noteId);
      }
    };
    
    window.addEventListener("stickies:noteSelected", handleNoteSelected);
    return () => {
      window.removeEventListener("stickies:noteSelected", handleNoteSelected);
    };
  }, [isWindowOpen, setSelectedNoteId]);

  const menuBar = (
    <StickiesMenuBar
      onClose={handleClose}
      onShowHelp={() => setIsHelpDialogOpen(true)}
      onShowAbout={() => setIsAboutDialogOpen(true)}
      onNewNote={handleCreateNote}
      onClearAll={clearAllNotes}
      selectedNoteId={selectedNoteId}
      onChangeColor={handleChangeColor}
      onDeleteNote={handleDeleteNote}
    />
  );

  if (!isWindowOpen) return null;

  return (
    <>
      {/* Menu bar for macOS/System7 themes - provides operations for selected note */}
      {!isXpTheme && isForeground && menuBar}

      {/* Sticky notes are now rendered by StickyNotesLayer in App.tsx */}
      {/* This component only manages: menu bar operations, dialogs, selection sync */}

      {/* Dialogs */}
      <HelpDialog
        isOpen={isHelpDialogOpen}
        onOpenChange={setIsHelpDialogOpen}
        appId="stickies"
        helpItems={translatedHelpItems}
      />
      <AboutDialog
        isOpen={isAboutDialogOpen}
        onOpenChange={setIsAboutDialogOpen}
        metadata={appMetadata}
        appId="stickies"
      />
    </>
  );
}
