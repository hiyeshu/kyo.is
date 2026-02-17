import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ThemedIcon } from "@/components/shared/ThemedIcon";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getTranslatedAppName, AppId } from "@/utils/i18n";

interface AboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: {
    name: string;
    version: string;
    creator: {
      name: string;
      url: string;
    };
    github: string;
    icon: string;
    description?: string;
  };
  appId?: AppId;
}

export function AboutDialog({
  isOpen,
  onOpenChange,
  metadata,
  appId,
}: AboutDialogProps) {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((state) => state.current);
  const liveVersion = useAppStore((s) => s.ryOSVersion);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  const displayName = appId ? getTranslatedAppName(appId) : metadata.name;
  const displayVersion = liveVersion || metadata.version;

  // 尝试从 i18n 获取描述，回退到 metadata.description
  const i18nDesc = appId ? t(`apps.${appId}.description`, "") : "";
  const displayDescription = i18nDesc || metadata.description || "";

  const dialogContent = (
    <div className="flex flex-col items-center justify-center space-y-3 py-6 px-6">
      <ThemedIcon
        name={metadata.icon}
        alt={displayName}
        className="w-16 h-16"
        style={{ imageRendering: "-webkit-optimize-contrast" }}
      />
      <div
        className={cn(
          "text-center space-y-1",
          isXpTheme
            ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
            : "font-geneva-12 text-[10px]"
        )}
        style={{
          fontFamily: isXpTheme
            ? '"Pixelated MS Sans Serif", "ArkPixel", Arial'
            : undefined,
          fontSize: isXpTheme ? "11px" : undefined,
        }}
      >
        <div
          className={cn(
            "!text-2xl font-medium",
            isXpTheme
              ? "font-['Trebuchet MS'] !text-[15px]"
              : "font-apple-garamond"
          )}
        >
          {displayName}
        </div>
        <p className="text-gray-500">{t("common.dialog.version")} {displayVersion}</p>
        {displayDescription && (
          <p className="text-gray-600 pt-1 max-w-[240px] leading-relaxed">{displayDescription}</p>
        )}
      </div>
      <div
        className={cn(
          "flex items-center gap-3 pt-1 text-center",
          isXpTheme ? "text-[10px]" : "text-[9px] font-geneva-12"
        )}
      >
        {metadata.creator.url ? (
          <a
            href={metadata.creator.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {metadata.creator.name}
          </a>
        ) : metadata.creator.name ? (
          <span className="text-gray-400">{metadata.creator.name}</span>
        ) : null}
        {metadata.github && (
          <>
            <span className="text-gray-300">·</span>
            <a
              href={metadata.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              GitHub
            </a>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("w-fit min-w-[280px] max-w-[360px]", isXpTheme && "p-0 overflow-hidden")}
        style={isXpTheme ? { fontSize: "11px" } : undefined}
      >
        {isXpTheme ? (
          <>
            <DialogHeader>{t("common.dialog.aboutApp", { appName: displayName })}</DialogHeader>
            <div className={`window-body ${isXpTheme ? "p-2 px-4" : "p-4"}`}>
              {dialogContent}
            </div>
          </>
        ) : currentTheme === "macosx" ? (
          <>
            <DialogHeader>{t("common.dialog.aboutApp", { appName: displayName })}</DialogHeader>
            {dialogContent}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-normal text-[16px]">
                {t("common.dialog.aboutApp", { appName: displayName })}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("common.dialog.informationAboutApp")}
              </DialogDescription>
            </DialogHeader>
            {dialogContent}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
