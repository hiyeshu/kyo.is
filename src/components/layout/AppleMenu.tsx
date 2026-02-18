import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { LoginDialog } from "@/components/dialogs/LoginDialog";
import { LogoutDialog } from "@/components/dialogs/LogoutDialog";
import { AppId, appRegistry } from "@/config/appRegistry";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAppStore, RecentDocument } from "@/stores/useAppStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { ThemedIcon } from "@/components/shared/ThemedIcon";
import { getTranslatedAppName } from "@/utils/i18n";

// Helper to check if an icon is an emoji
const isEmojiIcon = (icon?: string): boolean => {
  if (!icon) return false;
  if (icon.startsWith("/") || icon.startsWith("http")) return false;
  return icon.length <= 10;
};

// Helper to get icon path for a document based on its name/extension
const getDocumentIconPath = (doc: RecentDocument): string => {
  // If doc has a custom icon that's a path, use it
  if (doc.icon && (doc.icon.startsWith("/") || doc.icon.startsWith("http"))) {
    return doc.icon;
  }
  
  const name = doc.name.toLowerCase();
  
  // Image files
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(name)) {
    return "image.png";
  }
  
  // Text/document files
  if (/\.(txt|md|rtf)$/.test(name)) {
    return "file-text.png";
  }
  
  // HTML/App files
  if (/\.(html|htm|app)$/.test(name)) {
    return "applet.png";
  }
  
  // Music files
  if (/\.(mp3|wav|m4a|ogg|flac|aac)$/.test(name)) {
    return "music.png";
  }
  
  // Video files
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(name)) {
    return "movies.png";
  }
  
  return "file.png";
};

export function AppleMenu() {
  const { t } = useTranslation();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const launchApp = useLaunchApp();
  const currentTheme = useThemeStore((state) => state.current);
  const isMacOsxTheme = currentTheme === "macosx";

  // Kyo metadata for About dialog
  const kyoMetadata = {
    name: "Kyo",
    version: "1.0.0",
    creator: {
      name: "Yeshu",
      url: "https://github.com/hiyeshu",
    },
    github: "https://github.com/hiyeshu/kyo.is",
    icon: "/favicon.svg",
  };

  // Recent items from store
  const recentApps = useAppStore((state) => state.recentApps);
  const recentDocuments = useAppStore((state) => state.recentDocuments);

  // Auth state from Supabase
  const { user, signOut } = useAuthStore();
  const userEmail = user?.email;

  const handleAppClick = (appId: string) => {
    launchApp(appId as AppId);
  };

  const handleDocumentClick = (path: string, appId: AppId) => {
    launchApp(appId, { initialData: { path } });
  };

  const handleSystemPreferences = () => {
    launchApp("control-panels");
  };

  // Get top 5 recent apps
  const topRecentApps = recentApps.slice(0, 5);
  // Get top 5 recent documents
  const topRecentDocuments = recentDocuments.slice(0, 5);

  return (
    <>
      <MenubarMenu>
        <MenubarTrigger
          className={cn(
            "border-none focus-visible:ring-0 flex items-center justify-center",
            isMacOsxTheme ? "px-1" : "px-3"
          )}
        >
          {isMacOsxTheme ? (
            <ThemedIcon
              name="apple.png"
              alt="Apple Menu"
              style={{ width: "var(--os-icon-apple)", height: "var(--os-icon-apple)" }}
            />
          ) : (
            "\uf8ff" //
          )}
        </MenubarTrigger>
        <MenubarContent align="start" sideOffset={1} className="px-0">
          {/* About This Computer */}
          <MenubarItem
            onClick={() => setAboutOpen(true)}
            className="text-md h-6 px-3"
          >
            {t("common.appleMenu.aboutThisComputer")}
          </MenubarItem>

          {/* Login / User info */}
          {userEmail ? (
            <MenubarItem disabled className="text-md h-6 px-3 opacity-60">
              {userEmail}
            </MenubarItem>
          ) : (
            <MenubarItem
              onClick={() => setLoginOpen(true)}
              className="text-md h-6 px-3"
            >
              {t("common.appleMenu.login")}
            </MenubarItem>
          )}

          <MenubarSeparator className="h-[2px] bg-black my-1" />

          {/* System Preferences */}
          <MenubarItem
            onClick={handleSystemPreferences}
            className="text-md h-6 px-3"
          >
            {t("apps.control-panels.name")}
          </MenubarItem>

          <MenubarSeparator className="h-[2px] bg-black my-1" />

          {/* Recent Items submenu */}
          <MenubarSub>
            <MenubarSubTrigger className="text-md h-6 px-3">
              {t("common.appleMenu.recentItems")}
            </MenubarSubTrigger>
            <MenubarSubContent className="min-w-[200px]">
              {/* Recent Apps section */}
              {topRecentApps.length > 0 ? (
                topRecentApps.map((recent) => {
                  const app = appRegistry[recent.appId];
                  if (!app) return null;
                  return (
                    <MenubarItem
                      key={`app-${recent.appId}-${recent.timestamp}`}
                      onClick={() => handleAppClick(recent.appId)}
                      className="text-md h-6 px-3 flex items-center gap-2"
                    >
                      {typeof app.icon === "string" ? (
                        <div className="w-4 h-4 flex items-center justify-center">
                          {app.icon}
                        </div>
                      ) : (
                        <ThemedIcon
                          name={app.icon.type === "image" ? app.icon.src : "/icons/default/application.png"}
                          alt={getTranslatedAppName(recent.appId)}
                          className="w-4 h-4 [image-rendering:pixelated]"
                        />
                      )}
                      {getTranslatedAppName(recent.appId)}
                    </MenubarItem>
                  );
                })
              ) : (
                <MenubarItem disabled className="text-md h-6 px-3 text-gray-400">
                  {t("common.appleMenu.noRecentApps")}
                </MenubarItem>
              )}

              <MenubarSeparator className="h-[2px] bg-black my-1" />

              {/* Recent Documents section */}
              {topRecentDocuments.length > 0 ? (
                topRecentDocuments.map((recent) => {
                  const iconPath = getDocumentIconPath(recent);
                  const isEmoji = isEmojiIcon(recent.icon);
                  
                  return (
                    <MenubarItem
                      key={`doc-${recent.path}-${recent.timestamp}`}
                      onClick={() => handleDocumentClick(recent.path, recent.appId)}
                      className="text-md h-6 px-3 flex items-center gap-2"
                    >
                      {isEmoji ? (
                        <span className="w-4 h-4 flex items-center justify-center text-sm">
                          {recent.icon}
                        </span>
                      ) : (
                        <ThemedIcon
                          name={iconPath}
                          alt="Document"
                          className="w-4 h-4 [image-rendering:pixelated]"
                        />
                      )}
                      <span className="truncate max-w-[180px]">{recent.name}</span>
                    </MenubarItem>
                  );
                })
              ) : (
                <MenubarItem disabled className="text-md h-6 px-3 text-gray-400">
                  {t("common.appleMenu.noRecentDocuments")}
                </MenubarItem>
              )}
            </MenubarSubContent>
          </MenubarSub>

          {/* Logout (only when logged in) */}
          {userEmail && (
            <>
              <MenubarSeparator className="h-[2px] bg-black my-1" />
              <MenubarItem onClick={() => setLogoutOpen(true)} className="text-md h-6 px-3">
                {t("common.appleMenu.logOut", { username: userEmail })}
              </MenubarItem>
            </>
          )}
        </MenubarContent>
      </MenubarMenu>

      {/* Dialogs */}
      <AboutDialog
        isOpen={aboutOpen}
        onOpenChange={setAboutOpen}
        metadata={kyoMetadata}
      />
      <LoginDialog
        isOpen={loginOpen}
        onOpenChange={setLoginOpen}
      />
      <LogoutDialog
        isOpen={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => {
          signOut();
          setLogoutOpen(false);
        }}
      />
    </>
  );
}
