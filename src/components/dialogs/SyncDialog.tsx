/**
 * [INPUT]: 依赖 @/components/ui/dialog、@/stores/useSyncStore、@/stores/useThemeStore、react-i18next
 * [OUTPUT]: 对外提供 SyncDialog 组件，登录后数据同步弹窗
 * [POS]: components/dialogs 的同步弹窗，被 App.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";
import { useSyncStore } from "@/stores/useSyncStore";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { CloudArrowUp, CloudArrowDown, Spinner } from "@phosphor-icons/react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function SyncDialog() {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isMacOsxTheme = currentTheme === "macosx";
  
  const {
    showDialog,
    status,
    localCount,
    cloudCount,
    errorMessage,
    uploadToCloud,
    downloadFromCloud,
    closeDialog,
  } = useSyncStore();

  const isSyncing = status === "syncing" || status === "checking";

  const dialogTitle = t("common.sync.title", "数据同步");
  const dialogDescription = t("common.sync.description", "检测到本地和云端都有数据，请选择保留哪一份：");

  // 翻译错误消息
  const translatedError = errorMessage
    ? errorMessage === "ERROR_NOT_AUTHENTICATED"
      ? t("common.sync.errorNotAuthenticated", "未登录，请先登录")
      : errorMessage.includes("not valid JSON")
        ? t("common.sync.errorApiNotAvailable", "API 服务不可用，请使用 bun run dev:vercel 启动")
        : errorMessage
    : null;

  const dialogContent = (
    <div className="flex flex-col items-center py-5 px-6 gap-4">
      {/* 说明文字 */}
      <p className={cn(
        "text-center text-gray-600",
        isXpTheme ? "text-[11px]" : "text-[12px]"
      )}>
        {dialogDescription}
      </p>

      {/* 数据对比 */}
      <div className="flex items-center justify-center gap-8 py-2">
        {/* 本地数据 */}
        <div className="text-center">
          <div className={cn("font-medium mb-1", isXpTheme ? "text-[11px]" : "text-[12px]")}>
            {t("common.sync.local", "本地数据")}
          </div>
          <div className={cn("text-gray-500", isXpTheme ? "text-[10px]" : "text-[11px]")}>
            {t("common.sync.bookmarkCount", "{{count}} 个书签", { count: localCount.bookmarks })}
          </div>
          <div className={cn("text-gray-500", isXpTheme ? "text-[10px]" : "text-[11px]")}>
            {t("common.sync.noteCount", "{{count}} 个便签", { count: localCount.notes })}
          </div>
        </div>

        {/* 分隔 */}
        <div className="text-gray-300 text-[12px]">vs</div>

        {/* 云端数据 */}
        <div className="text-center">
          <div className={cn("font-medium mb-1", isXpTheme ? "text-[11px]" : "text-[12px]")}>
            {t("common.sync.cloud", "云端数据")}
          </div>
          <div className={cn("text-gray-500", isXpTheme ? "text-[10px]" : "text-[11px]")}>
            {t("common.sync.bookmarkCount", "{{count}} 个书签", { count: cloudCount.bookmarks })}
          </div>
          <div className={cn("text-gray-500", isXpTheme ? "text-[10px]" : "text-[11px]")}>
            {t("common.sync.noteCount", "{{count}} 个便签", { count: cloudCount.notes })}
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {translatedError && (
        <p className="text-center text-red-500 text-[11px]">{translatedError}</p>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-1">
        <Button
          variant="retro"
          onClick={uploadToCloud}
          disabled={isSyncing}
          className={cn("h-8 px-4 flex items-center gap-2", isXpTheme ? "text-[11px]" : "text-[12px]")}
        >
          {isSyncing ? (
            <Spinner className="h-4 w-4 animate-spin" />
          ) : (
            <CloudArrowUp className="h-4 w-4" weight="bold" />
          )}
          {t("common.sync.useLocal", "使用本地数据")}
        </Button>

        <Button
          variant="retro"
          onClick={downloadFromCloud}
          disabled={isSyncing}
          className={cn("h-8 px-4 flex items-center gap-2", isXpTheme ? "text-[11px]" : "text-[12px]")}
        >
          {isSyncing ? (
            <Spinner className="h-4 w-4 animate-spin" />
          ) : (
            <CloudArrowDown className="h-4 w-4" weight="bold" />
          )}
          {t("common.sync.useCloud", "使用云端数据")}
        </Button>
      </div>

      {/* 提示 */}
      <p className={cn("text-center text-gray-400 pt-1", isXpTheme ? "text-[9px]" : "text-[10px]")}>
        {t("common.sync.warning", "选择后另一份数据将被覆盖，此操作不可撤销")}
      </p>
    </div>
  );

  return (
    <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent
        className={cn("w-fit min-w-[360px] max-w-[420px]", isXpTheme && "p-0 overflow-hidden")}
        style={isXpTheme ? { fontSize: "11px" } : undefined}
        aria-describedby="sync-dialog-description"
      >
        {/* 无障碍：隐藏的 Title 和 Description */}
        <VisuallyHidden>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription id="sync-dialog-description">{dialogDescription}</DialogDescription>
        </VisuallyHidden>

        {/* 可见的 Header（包含主题样式的标题栏） */}
        {(isXpTheme || isMacOsxTheme) && (
          <DialogHeader>{dialogTitle}</DialogHeader>
        )}

        {isXpTheme ? (
          <div className="window-body">{dialogContent}</div>
        ) : (
          dialogContent
        )}
      </DialogContent>
    </Dialog>
  );
}
