/**
 * [INPUT]: 依赖 components/layout/MenuBar，依赖 components/ui/menubar，依赖 stores/useThemeStore，依赖 i18n
 * [OUTPUT]: 对外提供 StickiesMenuBar 组件
 * [POS]: apps/stickies/components/ 菜单栏组件，提供便签创建/颜色/清理入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { MenuBar } from "@/components/layout/MenuBar";
import {
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
} from "@/components/ui/menubar";
import { useThemeStore } from "@/stores/useThemeStore";
import { useTranslation } from "react-i18next";
import { StickyColor } from "@/stores/useStickiesStore";

interface StickiesMenuBarProps {
  onClose: () => void;
  onShowHelp: () => void;
  onShowAbout: () => void;
  onNewNote: (color?: StickyColor) => void;
  onClearAll: () => void;
  selectedNoteId: string | null;
  onChangeColor: (id: string, color: StickyColor) => void;
  onDeleteNote: (id: string) => void;
}

const COLORS: { value: StickyColor; labelKey: string; hexVar: string }[] = [
  { value: "yellow", labelKey: "common.colors.yellow", hexVar: "var(--os-sticky-yellow)" },
  { value: "blue", labelKey: "common.colors.blue", hexVar: "var(--os-sticky-blue)" },
  { value: "green", labelKey: "common.colors.green", hexVar: "var(--os-sticky-green)" },
  { value: "pink", labelKey: "common.colors.pink", hexVar: "var(--os-sticky-pink)" },
  { value: "purple", labelKey: "common.colors.purple", hexVar: "var(--os-sticky-purple)" },
  { value: "orange", labelKey: "common.colors.orange", hexVar: "var(--os-sticky-orange)" },
];

export function StickiesMenuBar({
  onClose,
  onShowHelp,
  onShowAbout,
  onNewNote,
  onClearAll,
  selectedNoteId,
  onChangeColor,
  onDeleteNote,
}: StickiesMenuBarProps) {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isMacOsxTheme = currentTheme === "macosx";

  return (
    <MenuBar inWindowFrame={isXpTheme}>
      {/* File Menu */}
      <MenubarMenu>
        <MenubarTrigger className="text-md px-2 py-1 border-none focus-visible:ring-0">
          {t("common.menu.file", "文件")}
        </MenubarTrigger>
        <MenubarContent align="start" sideOffset={1} className="px-0">
          <MenubarItem onClick={() => onNewNote()} className="text-md h-6 px-3">
            {t("apps.stickies.menu.newNote", "新建便签")}
          </MenubarItem>
          <MenubarSeparator className="h-[2px] bg-black my-1" />
          <MenubarItem onClick={onClearAll} className="text-md h-6 px-3">
            {t("apps.stickies.menu.clearAll", "清除所有")}
          </MenubarItem>
          <MenubarSeparator className="h-[2px] bg-black my-1" />
          <MenubarItem onClick={onClose} className="text-md h-6 px-3">
            {t("common.menu.close", "关闭")}
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Note Menu */}
      <MenubarMenu>
        <MenubarTrigger className="text-md px-2 py-1 border-none focus-visible:ring-0">
          {t("apps.stickies.menu.note", "便签")}
        </MenubarTrigger>
        <MenubarContent align="start" sideOffset={1} className="px-0">
          <MenubarSub>
            <MenubarSubTrigger disabled={!selectedNoteId} className="text-md h-6 px-3">
              {t("apps.stickies.menu.color", "颜色")}
            </MenubarSubTrigger>
            <MenubarSubContent className="px-0">
              {COLORS.map((color) => (
                <MenubarItem
                  key={color.value}
                  onClick={() =>
                    selectedNoteId && onChangeColor(selectedNoteId, color.value)
                  }
                  className="text-md h-6 px-3 flex items-center gap-2"
                >
                  <span
                    className="w-4 h-3 border border-black/30 inline-block"
                    style={{ backgroundColor: color.hexVar }}
                  />
                  {t(color.labelKey, color.value)}
                </MenubarItem>
              ))}
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator className="h-[2px] bg-black my-1" />
          <MenubarItem
            disabled={!selectedNoteId}
            onClick={() => selectedNoteId && onDeleteNote(selectedNoteId)}
            className="text-md h-6 px-3"
          >
            {t("apps.stickies.menu.deleteNote", "删除便签")}
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Help Menu */}
      <MenubarMenu>
        <MenubarTrigger className="text-md px-2 py-1 border-none focus-visible:ring-0">
          {t("common.menu.help", "帮助")}
        </MenubarTrigger>
        <MenubarContent align="start" sideOffset={1} className="px-0">
          <MenubarItem onClick={onShowHelp} className="text-md h-6 px-3">
            {t("apps.stickies.menu.help", "Stickies 帮助")}
          </MenubarItem>
          {!isMacOsxTheme && (
            <>
              <MenubarSeparator className="h-[2px] bg-black my-1" />
              <MenubarItem onClick={onShowAbout} className="text-md h-6 px-3">
                {t("apps.stickies.menu.about", "关于 Stickies")}
              </MenubarItem>
            </>
          )}
        </MenubarContent>
      </MenubarMenu>
    </MenuBar>
  );
}
