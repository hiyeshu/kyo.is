/**
 * [INPUT]: Menubar components
 * [OUTPUT]: ControlPanelsMenuBar 组件
 * [POS]: Settings 应用的菜单栏
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";

interface ControlPanelsMenuBarProps {
  onClose: () => void;
  onShowHelp: () => void;
  onShowAbout: () => void;
}

export function ControlPanelsMenuBar({
  onClose,
  onShowHelp,
  onShowAbout,
}: ControlPanelsMenuBarProps) {
  return (
    <Menubar className="border-b border-black/10 px-2 py-0.5 rounded-none h-6">
      <MenubarMenu>
        <MenubarTrigger className="font-bold">File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={onClose}>Close Window</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>Help</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={onShowHelp}>Settings Help</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={onShowAbout}>About Settings</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
