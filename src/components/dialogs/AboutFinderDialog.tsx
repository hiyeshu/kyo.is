/**
 * [STUB] 简化的关于对话框 — Finder 已移除，保留接口让 AppleMenu / StartMenu 编译
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AboutFinderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutFinderDialog({
  isOpen,
  onOpenChange,
}: AboutFinderDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>About</DialogTitle>
        </DialogHeader>
        <div className="text-center text-sm text-muted-foreground py-4">
          <p className="font-semibold text-foreground">Bookmark Board</p>
          <p className="mt-1">Your spatial bookmark manager</p>
          <p className="mt-2 text-xs opacity-60">Version 1.0</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
