/**
 * [INPUT]: 依赖 @/components/dialogs/AboutDialog
 * [OUTPUT]: 对外提供 AboutFinderDialog 组件
 * [POS]: components/dialogs 的兼容弹窗，Finder 移除后复用 AboutDialog 样式
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { AboutDialog } from "@/components/dialogs/AboutDialog";

interface AboutFinderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutFinderDialog({
  isOpen,
  onOpenChange,
}: AboutFinderDialogProps) {
  const kyoMetadata = {
    name: "Kyo",
    version: "1.0.0",
    creator: {
      name: "yeshu",
      url: "https://github.com/hiyeshu",
    },
    github: "https://github.com/hiyeshu/kyo.is",
    icon: "/favicon.svg",
  };

  return (
    <AboutDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      metadata={kyoMetadata}
    />
  );
}
