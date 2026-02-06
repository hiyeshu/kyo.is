/**
 * [INPUT]: @/components/ui/menubar, @/components/layout/MenuBar, @/stores/useThemeStore
 * [OUTPUT]: BookmarkBoardMenuBar 组件
 * [POS]: bookmark-board 的菜单栏，被 BookmarkBoardApp 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
} from "@/components/ui/menubar";
import { MenuBar } from "@/components/layout/MenuBar";
import { useThemeStore } from "@/stores/useThemeStore";

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
  const currentTheme = useThemeStore((s) => s.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  return (
    <MenuBar inWindowFrame={isXpTheme}>
      {/* ── File ─────────────────────────────────── */}
      <MenubarMenu>
        <MenubarTrigger className="text-md px-2 py-1 border-none focus-visible:ring-0">
          File
        </MenubarTrigger>
        <MenubarContent align="start" sideOffset={1} className="px-0">
          <MenubarItem onClick={onAddBookmark} className="text-md h-6 px-3">
            Add Bookmark
          </MenubarItem>
          <MenubarItem onClick={onAddFolder} className="text-md h-6 px-3">
            New Folder
          </MenubarItem>
          <MenubarSeparator className="h-[2px] bg-black my-1" />
          <MenubarItem onClick={onResetBookmarks} className="text-md h-6 px-3">
            Reset to Defaults
          </MenubarItem>
          <MenubarSeparator className="h-[2px] bg-black my-1" />
          <MenubarItem onClick={onClose} className="text-md h-6 px-3">
            Close
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* ── Help ─────────────────────────────────── */}
      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-md focus-visible:ring-0">
          Help
        </MenubarTrigger>
        <MenubarContent align="start" sideOffset={1} className="px-0">
          <MenubarItem onClick={onShowHelp} className="text-md h-6 px-3">
            Bookmark Board Help
          </MenubarItem>
          <MenubarSeparator className="h-[2px] bg-black my-1" />
          <MenubarItem onClick={onShowAbout} className="text-md h-6 px-3">
            About Bookmark Board
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </MenuBar>
  );
}
