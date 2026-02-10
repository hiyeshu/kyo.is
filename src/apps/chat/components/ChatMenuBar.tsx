/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 ChatMenuBar 组件
 * [POS]: apps/chat/components 的菜单栏组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useTranslation } from "react-i18next";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";

interface ChatMenuBarProps {
  onClose: () => void;
  onShowHelp: () => void;
}

export function ChatMenuBar({ onClose, onShowHelp }: ChatMenuBarProps) {
  const { t } = useTranslation();

  return (
    <Menubar className="border-b">
      <MenubarMenu>
        <MenubarTrigger>{t("common.menu.file", "文件")}</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onClose}>
            {t("common.menu.close", "关闭")}
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>{t("common.menu.help", "帮助")}</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onShowHelp}>
            {t("common.menu.help", "帮助")}
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
