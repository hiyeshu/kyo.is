import { OsThemeId } from "@/themes/types";

export interface TabStyleConfig {
  tabListClasses: string;
  tabTriggerClasses: string;
  tabContentClasses: string;
  separatorStyle: React.CSSProperties;
}

export function getTabStyles(currentTheme: OsThemeId): TabStyleConfig {
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isMacOSXTheme = currentTheme === "macosx";
  const isWindowsLegacyTheme = isXpTheme;

  const separatorColor = isMacOSXTheme
    ? "rgba(0, 0, 0, 0.2)"
    : isWindowsLegacyTheme
    ? "#808080"
    : "rgba(0, 0, 0, 0.2)";

  const tabListBase = `flex w-full ${
    isMacOSXTheme ? "" : "h-6"
  } space-x-0.5 shadow-none`;

  // macOS styling - use aqua-button CSS classes
  const tabListMacOSX = "aqua-tab-bar";
  const tabTriggerMacOSX = "aqua-tab";
  const tabContentMacOSX = "aqua-tab-content";

  const tabTriggerBase = `relative flex-1 ${isMacOSXTheme ? "" : "h-6"} px-2 ${
    isMacOSXTheme ? "" : "-mb-[1px]"
  } rounded-t shadow-none! text-[16px]`;
  const tabContentBase = `mt-0 h-[calc(100%-2rem)] ${
    isMacOSXTheme ? "" : "bg-white"
  } border border-black/20`;

  return {
    tabListClasses: `${tabListBase} ${isMacOSXTheme ? tabListMacOSX : ""}`,
    tabTriggerClasses: `${tabTriggerBase} ${isMacOSXTheme ? tabTriggerMacOSX : ""}`,
    tabContentClasses: `${tabContentBase} ${isMacOSXTheme ? tabContentMacOSX : ""}`,
    separatorStyle: { borderColor: separatorColor },
  };
}

export function getWindowsLegacyTabMenuClasses() {
  return "h-7! flex justify-start! p-0 -mt-1 -mb-[2px] bg-transparent shadow-none /* Windows XP/98 tab strip */";
}
