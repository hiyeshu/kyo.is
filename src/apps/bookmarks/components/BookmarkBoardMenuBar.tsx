/**
 * [INPUT]: @/components/ui/menubar, @/stores/useThemeStore
 * [OUTPUT]: BookmarkBoardMenuBar 组件
 * [POS]: bookmark-board 的菜单栏，被 BookmarkBoardApp 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
} from "@/components/ui/menubar";
import { useThemeStore } from "@/stores/useThemeStore";
import { useTranslation } from "react-i18next";

interface Props {
  onAddBookmark: () => void;
  onAddFolder: () => void;
  onResetBookmarks: () => void;
  onShowHelp: () => void;
  onShowAbout: () => void;
  onClose?: () => void;
}

export function BookmarkBoardMenuBar({
  onAddBookmark,
  onAddFolder,
  onResetBookmarks,
  onShowHelp,
  onShowAbout,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((s) => s.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  return (
    <Menubar
      className={`border-none bg-transparent space-x-0 rounded-none ${
        isXpTheme ? "h-[var(--os-titlebar-height)]" : "h-[var(--os-metrics-menubar-height)]"
      }`}
      style={{
        fontFamily: isXpTheme ? "var(--font-ms-sans)" : "var(--os-font-ui)",
        fontSize: "var(--os-text-xs)",
        paddingLeft: isXpTheme ? "6px" : "0.5rem",
        paddingRight: isXpTheme ? "2px" : "0.5rem",
      }}
    >
      {/* ── File ─────────────────────────────────── */}
      <MenubarMenu>
        <MenubarTrigger className="text-md px-2 py-1 border-none focus-visible:ring-0">
          {t("common.menu.file")}
        </MenubarTrigger>
        <MenubarContent align="start" sideOffset={1} className="px-0">
          <MenubarItem onClick={onAddBookmark} className="text-md h-6 px-3">
            {t("common.menu.addBookmark", "Add Bookmark")}
          </MenubarItem>
          <MenubarItem onClick={onAddFolder} className="text-md h-6 px-3">
            {t("common.menu.newFolder", "New Folder")}
          </MenubarItem>
          <MenubarSeparator className="h-[2px] bg-black my-1" />
          <MenubarItem onClick={onResetBookmarks} className="text-md h-6 px-3">
            {t("common.menu.resetToDefaults", "Reset to Defaults")}
          </MenubarItem>
          <MenubarSeparator className="h-[2px] bg-black my-1" />
          <MenubarItem onClick={onClose} className="text-md h-6 px-3">
            {t("common.menu.close")}
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* ── Help ─────────────────────────────────── */}
      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-md focus-visible:ring-0">
          {t("common.menu.help")}
        </MenubarTrigger>
        <MenubarContent align="start" sideOffset={1} className="px-0">
          <MenubarItem onClick={onShowHelp} className="text-md h-6 px-3">
            {t("apps.bookmarks.help.title", "Bookmark Board Help")}
          </MenubarItem>
          <MenubarSeparator className="h-[2px] bg-black my-1" />
          <MenubarItem onClick={onShowAbout} className="text-md h-6 px-3">
            {t("common.appMenu.aboutApp", { appName: t("apps.bookmarks.name", "Bookmark Board") })}
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
