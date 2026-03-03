/**
 * [INPUT]: 依赖 @/components/ui/dialog, @/stores/useBookmarkStore, @/lib/linkMeta
 * [OUTPUT]: 对外提供 AddWebsiteDialog 组件，用于添加网站到书签（macOS 主题自动 inDock）
 * [POS]: components/dialogs/ 的网站添加对话框，被 Dock 和 Desktop 组件调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";
import { useBookmarkStore, getFaviconUrl as getBookmarkFaviconUrl } from "@/stores/useBookmarkStore";
import { fetchLinkMeta } from "@/lib/linkMeta";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { warmPreview } from "@/components/layout/BookmarkHoverCard";

interface AddWebsiteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWebsiteDialog({
  isOpen,
  onOpenChange,
}: AddWebsiteDialogProps) {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((state) => state.current);
  const addBookmark = useBookmarkStore((state) => state.addBookmark);

  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isMacTheme = currentTheme === "macosx";

  const getFaviconUrl = (websiteUrl: string): string => {
    try {
      const urlObj = new URL(websiteUrl);
      // 根据用户地区自动选择 favicon 服务
      return getBookmarkFaviconUrl(urlObj.hostname);
    } catch {
      return "";
    }
  };

  const getWebsiteTitle = (websiteUrl: string): string => {
    try {
      const urlObj = new URL(websiteUrl);
      return urlObj.hostname.replace(/^www\./, "");
    } catch {
      return "Website";
    }
  };

  const normalizeUrl = (input: string): string => {
    let normalized = input.trim();
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }
    return normalized;
  };

  const handleSubmit = async () => {
    if (!url.trim()) {
      setErrorMessage("Please enter a URL");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const normalizedUrl = normalizeUrl(url);
      new URL(normalizedUrl); // validate URL

      const faviconUrl = getFaviconUrl(normalizedUrl);
      const title = getWebsiteTitle(normalizedUrl);

      // 创建书签（macOS 主题直接固定到 Dock）
      const bookmarkId = addBookmark(title, normalizedUrl, faviconUrl, {
        inDock: isMacTheme,
      });
      warmPreview(normalizedUrl);

      // 3. 后台异步获取元数据，更新 title 和 favicon
      const userId = (await supabase.auth.getSession()).data.session?.user?.id;
      fetchLinkMeta(normalizedUrl, { bookmarkId, userId })
        .then((meta) => {
          const updates: Record<string, unknown> = {};
          if (meta.title) updates.title = meta.title;
          // favicon 由服务端 writeBackToKyoItems 以 base64 写入，客户端不再覆盖
          if (meta.summary) updates.summary = meta.summary;
          if (meta.tags?.length) updates.tags = meta.tags;
          if (Object.keys(updates).length > 0) {
            useBookmarkStore.getState().updateBookmark(bookmarkId, updates);
          }
        })
        .catch(() => {
          // 元数据获取失败不影响书签创建，服务端已直写 kyo_items
        });

      // 成功
      setUrl("");
      onOpenChange(false);
    } catch (error) {
      setErrorMessage("Invalid URL. Please enter a valid website address.");
    } finally {
      setIsLoading(false);
    }
  };

  const dialogContent = (
    <div className={isXpTheme ? "p-2 px-4" : "p-4 px-6"}>
      <p
        className={cn(
          "text-gray-500 mb-2",
          isXpTheme
            ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
            : "font-geneva-12 text-[12px]"
        )}
        style={{
          fontFamily: isXpTheme
            ? '"Pixelated MS Sans Serif", "ArkPixel", Arial'
            : undefined,
          fontSize: isXpTheme ? "11px" : undefined,
        }}
        id="dialog-description"
      >
        {isMacTheme 
          ? t("common.desktop.addWebsiteDescDock", "輸入網站網址以新增至 Dock")
          : t("common.desktop.addWebsiteDescDesktop", "輸入網站網址以新增至桌面")
        }
      </p>
      <Input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && !isLoading) {
            handleSubmit();
          }
        }}
        placeholder="example.com"
        className={cn(
          "shadow-none",
          isXpTheme
            ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
            : "font-geneva-12 text-[12px]"
        )}
        style={{
          fontFamily: isXpTheme
            ? '"Pixelated MS Sans Serif", "ArkPixel", Arial'
            : undefined,
          fontSize: isXpTheme ? "11px" : undefined,
        }}
        disabled={isLoading}
      />
      {errorMessage && (
        <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
      )}
      <DialogFooter className="mt-4 gap-1 sm:justify-end">
        <div className="flex flex-col-reverse gap-2 w-full sm:w-auto sm:flex-row">
          <Button
            variant={isMacTheme ? "secondary" : "retro"}
            onClick={() => {
              setUrl("");
              setErrorMessage(null);
              onOpenChange(false);
            }}
            disabled={isLoading}
            className={cn(
              "w-full sm:w-auto",
              !isMacTheme && "h-7",
              isXpTheme
                ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                : "font-geneva-12 text-[12px]"
            )}
            style={{
              fontFamily: isXpTheme
                ? '"Pixelated MS Sans Serif", "ArkPixel", Arial'
                : undefined,
              fontSize: isXpTheme ? "11px" : undefined,
            }}
          >
            {t("common.dialog.cancel")}
          </Button>
          <Button
            variant={isMacTheme ? "default" : "retro"}
            onClick={handleSubmit}
            disabled={isLoading}
            className={cn(
              "w-full sm:w-auto",
              !isMacTheme && "h-7",
              isXpTheme
                ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                : "font-geneva-12 text-[12px]"
            )}
            style={{
              fontFamily: isXpTheme
                ? '"Pixelated MS Sans Serif", "ArkPixel", Arial'
                : undefined,
              fontSize: isXpTheme ? "11px" : undefined,
            }}
          >
            {isLoading 
              ? t("common.loading.default", "新增中...")
              : isMacTheme 
                ? t("common.desktop.addToDock", "加入 Dock") 
                : t("common.desktop.addToDesktop", "加入桌面")}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-w-[500px]", isXpTheme && "p-0 overflow-hidden")}
        style={isXpTheme ? { fontSize: "11px" } : undefined}
        onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
      >
        {isXpTheme ? (
          <>
            <DialogHeader>{t("common.desktop.addWebsite", "新增網站")}</DialogHeader>
            <div className="window-body">{dialogContent}</div>
          </>
        ) : currentTheme === "macosx" ? (
          <>
            <DialogHeader>{t("common.desktop.addWebsite", "新增網站")}</DialogHeader>
            {dialogContent}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-normal text-[16px]">
                {t("common.desktop.addWebsite", "新增網站")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("common.desktop.addWebsiteDescDock", "輸入網站網址以新增至 Dock")}
              </DialogDescription>
            </DialogHeader>
            {dialogContent}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
