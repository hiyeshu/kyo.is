import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useInterval } from "@/hooks/useInterval";
import { useEventListener } from "@/hooks/useEventListener";
import { AppleMenu } from "./AppleMenu";
import { AppMenu } from "./AppMenu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
} from "@/components/ui/menubar";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { StartMenu } from "./StartMenu";
import { useAppStoreShallow, useAudioSettingsStoreShallow, useDisplaySettingsStoreShallow } from "@/stores/helpers";
import { Slider } from "@/components/ui/slider";
import { SpeakerSimpleLow, SpeakerSimpleHigh, SpeakerSimpleSlash, Gear, CaretUp, DotsThree } from "@phosphor-icons/react";
import { useSound, Sounds } from "@/hooks/useSound";
import { useThemeStore } from "@/stores/useThemeStore";
import { getAppIconPath, appRegistry } from "@/config/appRegistry";
import type { AppId } from "@/config/appRegistry";
import type { AnyApp } from "@/apps/base/types";
import { ThemedIcon } from "@/components/shared/ThemedIcon";
import { useOffline } from "@/hooks/useOffline";
import { WifiSlash } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { getTranslatedAppName } from "@/utils/i18n";
import { useIsPhone } from "@/hooks/useIsPhone";
import { isTauri, isTauriWindows } from "@/utils/platform";

// Helper function to get app name (using translations)
const getAppName = (appId: string): string => {
  return getTranslatedAppName(appId as AppId);
};

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

interface MenuBarProps {
  children?: React.ReactNode;
  inWindowFrame?: boolean; // Add prop to indicate if MenuBar is inside a window
}

// Context to share scrolling state
const ScrollingContext = React.createContext<{
  isScrolling: boolean;
  preventInteraction: (e: React.MouseEvent | React.TouchEvent) => boolean;
}>({
  isScrolling: false,
  preventInteraction: () => false,
});

// Scrollable menu wrapper with fade masks for mobile
function ScrollableMenuWrapper({ children }: { children: React.ReactNode }) {
  const isPhone = useIsPhone();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track touch state for preventing accidental taps during scroll
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    hasMoved: boolean;
    startTime: number;
  } | null>(null);
  const hadRecentScrollRef = useRef(false);

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft: left, scrollWidth: width, clientWidth: cw } = scrollRef.current;
    setScrollLeft(left);
    setScrollWidth(width);
    setClientWidth(cw);
  }, []);

  const handleScroll = useCallback(() => {
    updateScrollState();
    hadRecentScrollRef.current = true;
    
    // Mark current touch as moved if there's an active touch
    if (touchStateRef.current) {
      touchStateRef.current.hasMoved = true;
    }
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    // Clear recent scroll flag after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      hadRecentScrollRef.current = false;
    }, 300);
  }, [updateScrollState]);

  // Check if interaction should be prevented
  const shouldPreventInteraction = useCallback(() => {
    // Prevent if there was recent scrolling
    if (hadRecentScrollRef.current) {
      return true;
    }
    // Prevent if current touch has moved
    if (touchStateRef.current?.hasMoved) {
      return true;
    }
    return false;
  }, []);

  const preventInteraction = useCallback((e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    if (shouldPreventInteraction()) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
    return false;
  }, [shouldPreventInteraction]);

  useEffect(() => {
    updateScrollState();
    const resizeObserver = new ResizeObserver(updateScrollState);
    if (scrollRef.current) {
      resizeObserver.observe(scrollRef.current);
    }
    return () => {
      resizeObserver.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [updateScrollState]);

  const canScrollLeft = scrollLeft > 0;
  const canScrollRight = scrollLeft < scrollWidth - clientWidth - 1;

  // Calculate mask gradients based on scroll position
  // In CSS masks: black = visible, transparent = hidden
  const getMaskImage = () => {
    if (!isPhone || scrollWidth <= clientWidth) {
      return undefined;
    }
    
    const fadeWidth = 24; // Width of fade in pixels
    
    if (canScrollLeft && canScrollRight) {
      // Both sides need fade: transparent edges, black middle
      return `linear-gradient(to right, transparent 0%, black ${fadeWidth}px, black calc(100% - ${fadeWidth}px), transparent 100%)`;
    } else if (canScrollLeft) {
      // Only left side needs fade: transparent left edge, black rest
      return `linear-gradient(to right, transparent 0%, black ${fadeWidth}px, black 100%)`;
    } else if (canScrollRight) {
      // Only right side needs fade: black start, transparent right edge
      return `linear-gradient(to right, black 0%, black calc(100% - ${fadeWidth}px), transparent 100%)`;
    }
    return undefined;
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      hasMoved: false,
      startTime: Date.now(),
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStateRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStateRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchStateRef.current.startY);
    
    // If any movement is significant, mark as moved
    if (deltaX > 3 || deltaY > 3) {
      touchStateRef.current.hasMoved = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Keep hasMoved state briefly to catch click events that fire after touchend
    const hadMoved = touchStateRef.current?.hasMoved;
    touchStateRef.current = null;
    
    if (hadMoved) {
      // Briefly keep the scroll prevention active
      hadRecentScrollRef.current = true;
      setTimeout(() => {
        hadRecentScrollRef.current = false;
      }, 100);
    }
  }, []);

  if (!isPhone) {
    return (
      <ScrollingContext.Provider value={{ isScrolling: false, preventInteraction: () => false }}>
        <div className="flex items-stretch h-full">
          {children}
        </div>
      </ScrollingContext.Provider>
    );
  }

  return (
    <ScrollingContext.Provider value={{ isScrolling: hadRecentScrollRef.current, preventInteraction }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 h-full overflow-x-auto overflow-y-hidden"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          maskImage: getMaskImage(),
          WebkitMaskImage: getMaskImage(),
          touchAction: "pan-x",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-stretch h-full min-w-max">
          {children}
        </div>
      </div>
    </ScrollingContext.Provider>
  );
}

interface ClockProps {
  enableExposeToggle?: boolean;
}

function Clock({ enableExposeToggle = false }: ClockProps) {
  const [time, setTime] = useState(new Date());
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const { i18n: i18nInstance } = useTranslation();
  
  // Get current locale from i18n (reactive to language changes)
  const currentLocale = i18nInstance.language || "en";
  
  // Determine if locale prefers 24-hour format
  const prefers24Hour = ["zh-TW", "ja", "de", "fr", "ko"].includes(currentLocale);
  
  // Handle click to toggle expose view
  const handleClick = () => {
    if (enableExposeToggle) {
      window.dispatchEvent(new CustomEvent("toggleExposeView"));
    }
  };

  // Update time every second using useInterval
  useInterval(() => setTime(new Date()), 1000);

  // Handle viewport resize using useEventListener
  useEventListener("resize", () => setViewportWidth(window.innerWidth));

  // Helper function to format time without leading zeros for 24h format
  const formatTime24h = (date: Date): string => {
    const hour = date.getHours();
    const minute = date.getMinutes().toString().padStart(2, "0");
    return `${hour}:${minute}`;
  };

  // Format the display based on theme and viewport width
  // Use "numeric" for hour to avoid leading zeros (e.g., "0:08" instead of "00:08")
  // "2-digit" would force leading zeros which Chinese/Japanese don't typically use
  const hourFormat = "numeric";
  
  let displayTime: string;

  if (isXpTheme) {
    // For XP/98 themes: use 24h for locales that prefer it, otherwise 12h
    if (prefers24Hour) {
      displayTime = formatTime24h(time);
    } else {
      displayTime = time.toLocaleTimeString(currentLocale, {
        hour: hourFormat,
        minute: "2-digit",
        hour12: true,
      });
    }
  } else if (viewportWidth <= 768) {
    // For mobile screens (≤ 768px): show date only (phone status bar already has time)
    const month = time.getMonth() + 1;
    const day = time.getDate();
    
    if (currentLocale.startsWith("zh")) {
      // Chinese (zh, zh-TW, zh-CN, etc.): "2月14日"
      displayTime = `${month}月${day}日`;
    } else if (currentLocale.startsWith("ja")) {
      // Japanese: "2月14日"
      displayTime = `${month}月${day}日`;
    } else if (currentLocale.startsWith("ko")) {
      // Korean: "2월14일"
      displayTime = `${month}월${day}일`;
    } else {
      // English and other locales: "Feb 14"
      const monthName = time.toLocaleDateString(currentLocale, { month: "short" });
      displayTime = `${monthName} ${day}`;
    }
  } else {
    // For larger screens (> 768px): full date and time
    const timeString = prefers24Hour 
      ? formatTime24h(time)
      : time.toLocaleTimeString(currentLocale, {
          hour: hourFormat,
          minute: "2-digit",
          hour12: true,
        });
    
    // Custom formatting for Chinese, Japanese, and Korean
    if (currentLocale.startsWith("zh")) {
      // Chinese format: "2月14日 周六 17:03"
      const month = time.getMonth() + 1;
      const day = time.getDate();
      const weekday = time.toLocaleDateString(currentLocale, { weekday: "short" });
      displayTime = `${month}月${day}日 ${weekday} ${timeString}`;
    } else if (currentLocale.startsWith("ja")) {
      // Japanese format: "2月14日 (土) 17:06"
      const month = time.getMonth() + 1;
      const day = time.getDate();
      const weekday = time.toLocaleDateString(currentLocale, { weekday: "short" });
      displayTime = `${month}月${day}日 (${weekday}) ${timeString}`;
    } else if (currentLocale.startsWith("ko")) {
      // Korean format: "2월14일 (토) 17:06"
      const month = time.getMonth() + 1;
      const day = time.getDate();
      const weekday = time.toLocaleDateString(currentLocale, { weekday: "short" });
      displayTime = `${month}월${day}일 (${weekday}) ${timeString}`;
    } else {
      // Default format for other locales: "Wed May 7 1:34 AM" or "Wed May 7 13:34"
      const shortWeekday = time.toLocaleDateString(currentLocale, { weekday: "short" });
      const month = time.toLocaleDateString(currentLocale, { month: "short" });
      const day = time.getDate();
      displayTime = `${shortWeekday} ${month} ${day} ${timeString}`;
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Window drag handle for Tauri
    <div
      role="presentation"
      className={`${isXpTheme ? "" : "ml-auto mr-1 sm:mr-2"}`}
      style={{
        textShadow:
          currentTheme === "macosx"
            ? "0 2px 3px rgba(0, 0, 0, 0.25)"
            : undefined,
      }}
      onClick={handleClick}
      title={enableExposeToggle ? "Click to show all windows (F3)" : undefined}
    >
      {displayTime}
    </div>
  );
}

// Kyo App Menu for desktop (macOS X theme only, when no app is active)
function KyoAppMenu() {
  const { t } = useTranslation();
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  const {
    instances,
    minimizeInstance,
    restoreInstance,
  } = useAppStoreShallow((s) => ({
    instances: s.instances,
    minimizeInstance: s.minimizeInstance,
    restoreInstance: s.restoreInstance,
  }));

  // Check if there are any minimized instances
  const hasMinimizedInstances = Object.values(instances).some(
    (inst) => inst.isOpen && inst.isMinimized
  );

  // Hide others - minimize all open app instances
  const handleHideOthers = () => {
    Object.values(instances).forEach((inst) => {
      if (inst.isOpen && !inst.isMinimized) {
        minimizeInstance(inst.instanceId);
      }
    });
  };

  // Show all - restore all minimized instances
  const handleShowAll = () => {
    Object.values(instances).forEach((inst) => {
      if (inst.isOpen && inst.isMinimized) {
        restoreInstance(inst.instanceId);
      }
    });
  };

  return (
    <>
      <MenubarMenu>
        <MenubarTrigger
          className="text-md px-2 py-1 border-none focus-visible:ring-0 app-menu-trigger"
          style={{ fontWeight: "bold" }}
        >
          Kyo
        </MenubarTrigger>
        <MenubarContent align="start" sideOffset={1} className="px-0">
          {/* About Kyo */}
          <MenubarItem
            onClick={() => setIsAboutDialogOpen(true)}
            className="text-md h-6 px-3"
          >
            {t("common.appMenu.aboutApp", { appName: "Kyo" })}
          </MenubarItem>

          <MenubarSeparator className="h-[2px] bg-black my-1" />

          {/* Hide Others */}
          <MenubarItem
            onClick={handleHideOthers}
            className="text-md h-6 px-3"
          >
            {t("common.appMenu.hideOthers")}
          </MenubarItem>

          {/* Show All - only when there are minimized windows */}
          {hasMinimizedInstances && (
            <MenubarItem
              onClick={handleShowAll}
              className="text-md h-6 px-3"
            >
              {t("common.appMenu.showAll")}
            </MenubarItem>
          )}
        </MenubarContent>
      </MenubarMenu>

      {/* About Dialog */}
      <AboutDialog
        isOpen={isAboutDialogOpen}
        onOpenChange={setIsAboutDialogOpen}
        metadata={kyoMetadata}
      />
    </>
  );
}

function DefaultMenuItems() {
  // No default menu items - apps should provide their own menus
  return null;
}

function VolumeControl() {
  const { masterVolume, setMasterVolume } = useAudioSettingsStoreShallow((s) => ({
    masterVolume: s.masterVolume,
    setMasterVolume: s.setMasterVolume,
  }));
  const { play: playVolumeChangeSound } = useSound(Sounds.VOLUME_CHANGE);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  const getVolumeIcon = () => {
    if (masterVolume === 0) {
      return <SpeakerSimpleSlash size={12} weight="fill" />;
    }
    if (masterVolume < 0.5) {
      return <SpeakerSimpleLow size={12} weight="fill" />;
    }
    return <SpeakerSimpleHigh size={12} weight="fill" />;
  };

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-7 text-md px-1 py-1 border-none focus-visible:ring-0 ${
            isXpTheme
              ? "hover:bg-white/20 active:bg-white/30"
              : "hover:bg-black/10 active:bg-black/20"
          } ${isXpTheme ? "" : "mr-2"}`}
          style={{
            color:
              isXpTheme && currentTheme === "win98" ? "#000000" : "inherit",
          }}
        >
          {getVolumeIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side={isXpTheme ? "top" : "bottom"}
        sideOffset={isXpTheme ? 8 : 1}
        className="p-2 pt-4 w-auto min-w-4 h-40 flex flex-col items-center justify-center"
        style={{ minWidth: "auto" }}
      >
        <Slider
          orientation="vertical"
          min={0}
          max={1}
          step={0.05}
          value={[masterVolume]}
          onValueChange={(v) => setMasterVolume(v[0])}
          onValueCommit={playVolumeChangeSound}
        />
        <Button
          variant="ghost"
          size="icon"
          className="mt-2 h-6 w-6 text-md border-none focus-visible:ring-0"
          onClick={() => {
            // Control panels not available in Kyo
            console.warn("Control panels not available in Kyo");
            setIsDropdownOpen(false);
          }}
        >
          <Gear className="h-4 w-4" weight="bold" />
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MenuBar({ children, inWindowFrame = false }: MenuBarProps) {
  // Get apps from registry
  const apps: AnyApp[] = useMemo(() => Object.values(appRegistry), []);
  const {
    getForegroundInstance,
    instances,

    bringInstanceToForeground,
    restoreInstance,
    foregroundInstanceId, // Add this to get the foreground instance ID
    exposeMode,
  } = useAppStoreShallow((s) => ({
    getForegroundInstance: s.getForegroundInstance,
    instances: s.instances,

    bringInstanceToForeground: s.bringInstanceToForeground,
    restoreInstance: s.restoreInstance,
    foregroundInstanceId: s.foregroundInstanceId, // Add this
    exposeMode: s.exposeMode,
  }));

  // Debug mode from display settings store
  const debugMode = useDisplaySettingsStoreShallow((s) => s.debugMode);

  const foregroundInstance = getForegroundInstance();
  const hasActiveApp = !!foregroundInstance;

  // Get current theme
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  
  // Check if on phone (must be called before any early returns)
  const isPhone = useIsPhone();

  // Tauri fullscreen detection (must be declared before any early returns)
  const isTauriApp = isTauri();
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Track fullscreen state in Tauri
  useEffect(() => {
    if (!isTauriApp) return;
    
    let unlisten: (() => void) | undefined;
    
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        
        // Get initial fullscreen state
        const fullscreen = await win.isFullscreen();
        setIsFullscreen(fullscreen);
        
        // Listen for fullscreen changes
        unlisten = await win.onResized(async () => {
          const fs = await win.isFullscreen();
          setIsFullscreen(fs);
        });
      } catch (error) {
        console.error("Error setting fullscreen state:", error);
      }
    })();
    
    return () => {
      unlisten?.();
    };
  }, [isTauriApp]);

  // Taskbar overflow handling (used for XP taskbar rendering)
  const runningAreaRef = useRef<HTMLDivElement>(null);
  const [visibleTaskbarIds, setVisibleTaskbarIds] = useState<string[]>([]);
  const [overflowTaskbarIds, setOverflowTaskbarIds] = useState<string[]>([]);

  const allTaskbarIds = useMemo(() => {
    return Object.values(instances)
      .filter((i) => i.isOpen)
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
      .map((i) => i.instanceId);
  }, [instances]);

  useEffect(() => {
    // Only calculate overflow for XP taskbar (not in window frames)
    if (!(isXpTheme && !inWindowFrame)) {
      setVisibleTaskbarIds([]);
      setOverflowTaskbarIds([]);
      return;
    }

    const container = runningAreaRef.current;
    if (!container) return;

    const MIN_WIDTH = 110; // minimum shrink width to preserve readability
    const GAP = 2; // right margin
    const BUTTON_TOTAL_MIN = MIN_WIDTH + GAP;
    const MORE_BTN_WIDTH = 40; // task-like overflow button total width

    const compute = () => {
      const containerWidth = container.clientWidth;
      const countWithoutMore = Math.max(
        0,
        Math.floor(containerWidth / BUTTON_TOTAL_MIN)
      );
      if (allTaskbarIds.length <= countWithoutMore) {
        setVisibleTaskbarIds(allTaskbarIds);
        setOverflowTaskbarIds([]);
        return;
      }
      const countWithMore = Math.max(
        1,
        Math.floor((containerWidth - MORE_BTN_WIDTH) / BUTTON_TOTAL_MIN)
      );
      setVisibleTaskbarIds(allTaskbarIds.slice(0, countWithMore));
      setOverflowTaskbarIds(allTaskbarIds.slice(countWithMore));
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(container);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [isXpTheme, inWindowFrame, allTaskbarIds]);

  // If inside window frame for XP/98, use plain style
  if (inWindowFrame && isXpTheme) {
    return (
      <Menubar
        className="flex items-center border-none bg-transparent space-x-0 rounded-none"
        style={{
          fontFamily: isXpTheme ? "var(--font-ms-sans)" : "var(--os-font-ui)",
          fontSize: "var(--os-text-xs)",
          paddingLeft: "6px",
          paddingRight: "2px",
          height: "var(--os-titlebar-height)",
          minHeight: "var(--os-titlebar-height)",
          maxHeight: "var(--os-titlebar-height)",
        }}
      >
        {children}
      </Menubar>
    );
  }

  // For XP/98 themes, render taskbar at bottom instead of top menubar
  if (isXpTheme && !inWindowFrame) {
    const taskbarBackground =
      currentTheme === "xp"
        ? "linear-gradient(0deg, #042b8e 0%, #0551f6 6%, #0453ff 51%, #0551f6 63%, #0551f6 81%, #3a8be8 90%, #0453ff 100%)"
        : "#c0c0c0";
    return (
      <div
        className="fixed bottom-0 left-0 right-0 px-0 z-50"
        style={{
          background: taskbarBackground,
          fontFamily: "var(--font-ms-sans)",
          fontSize: "var(--os-text-xs)",
          color: currentTheme === "xp" ? "#ffffff" : "#000000",
          userSelect: "none",
          width: "100vw",
          height: "calc(var(--os-taskbar-height) + env(safe-area-inset-bottom, 0px))",
          position: "fixed",
        }}
      >
      <div
        className="absolute left-0 right-0 flex items-center"
        style={{
          height: "var(--os-taskbar-height)",
          bottom: "env(safe-area-inset-bottom, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
          {/* Start Button */}
          <div className="flex items-center h-full">
            <StartMenu apps={apps} />
          </div>

          {/* Running Apps Area */}
          <div
            ref={runningAreaRef}
            className="flex-1 flex items-center gap-0.5 px-2 overflow-hidden h-full"
          >
            <AnimatePresence mode="popLayout">
            {(() => {
              const idsToRender =
                visibleTaskbarIds.length > 0 || overflowTaskbarIds.length > 0
                  ? visibleTaskbarIds
                  : allTaskbarIds;
              if (idsToRender.length === 0) return null;
              return idsToRender.map((instanceId) => {
                const instance = instances[instanceId];
                if (!instance || !instance.isOpen) return null;

                const isForeground = instanceId === foregroundInstanceId;
                const isMinimized = instance.isMinimized ?? false;

                // Get icon and label (Kyo only has bookmarks, no special handling needed)
                const displayIcon = getAppIconPath(instance.appId);
                const displayLabel = instance.title || getAppName(instance.appId);
                const isEmoji = false;

                return (
                  <motion.button
                    key={instanceId}
                    data-taskbar-item={instanceId}
                    layout
                    initial={{ scale: 0.8, opacity: 0, width: 0 }}
                    animate={{ scale: 1, opacity: 1, width: "auto" }}
                    exit={{ scale: 0.8, opacity: 0, width: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      mass: 0.8,
                    }}
                    className="px-2 gap-1 border-t border-y rounded-sm flex items-center justify-start"
                    onClick={() => {
                      // If minimized, restore it; otherwise just bring to foreground
                      if (isMinimized) {
                        restoreInstance(instanceId);
                      } else {
                        bringInstanceToForeground(instanceId);
                      }
                    }}
                    style={{
                      height: "85%",
                      flex: "0 1 160px",
                      minWidth: "110px",
                      marginTop: "2px",
                      marginRight: "2px",
                      background: isForeground && !isMinimized
                        ? currentTheme === "xp"
                          ? "#3980f4"
                          : "#c0c0c0"
                        : currentTheme === "xp"
                        ? "#1658dd"
                        : "#c0c0c0",
                      border:
                        currentTheme === "xp"
                          ? isForeground && !isMinimized
                            ? "1px solid #255be1"
                            : "1px solid #255be1"
                          : "none",
                      color: currentTheme === "xp" ? "#ffffff" : "#000000",
                      fontSize: "11px",
                      boxShadow:
                        currentTheme === "xp"
                          ? "2px 2px 5px rgba(255, 255, 255, 0.267) inset"
                          : isForeground && !isMinimized
                          ? "inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey"
                          : "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf",
                      transition: "background 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (currentTheme === "xp") {
                        if (isForeground && !isMinimized) {
                          e.currentTarget.style.background = "#4a92f9";
                          e.currentTarget.style.borderColor = "#2c64e3";
                        } else {
                          e.currentTarget.style.background = "#2a6ef1";
                          e.currentTarget.style.borderColor = "#1e56c9";
                        }
                      } else if (currentTheme === "win98" && (!isForeground || isMinimized)) {
                        e.currentTarget.style.boxShadow =
                          "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentTheme === "xp") {
                        if (isForeground && !isMinimized) {
                          e.currentTarget.style.background = "#3980f4";
                          e.currentTarget.style.borderColor = "#255be1";
                        } else {
                          e.currentTarget.style.background = "#1658dd";
                          e.currentTarget.style.borderColor = "#255be1";
                        }
                      } else if (currentTheme === "win98" && (!isForeground || isMinimized)) {
                        e.currentTarget.style.boxShadow =
                          "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf";
                      }
                    }}
                  >
                    {isEmoji ? (
                      <span
                        className="flex-shrink-0 flex items-center justify-center"
                        style={{
                          fontSize: "var(--os-text-lg)",
                          width: "var(--os-icon-taskbar)",
                          height: "var(--os-icon-taskbar)",
                        }}
                      >
                        {displayIcon}
                      </span>
                    ) : (
                      <ThemedIcon
                        name={displayIcon}
                        alt=""
                        className="flex-shrink-0 [image-rendering:pixelated]"
                        style={{ width: "var(--os-icon-taskbar)", height: "var(--os-icon-taskbar)" }}
                      />
                    )}
                    <span className="truncate" style={{ fontSize: "var(--os-text-base)" }}>
                      {displayLabel}
                    </span>
                  </motion.button>
                );
              });
            })()}
            </AnimatePresence>

            {/* Overflow menu button */}
            {overflowTaskbarIds.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="px-1 border-t border-y rounded-sm flex items-center justify-center"
                    style={{
                      height: "85%",
                      width: "36px",
                      marginTop: "2px",
                      marginRight: "2px",
                      background: currentTheme === "xp" ? "#1658dd" : "#c0c0c0",
                      border:
                        currentTheme === "xp" ? "1px solid #255be1" : "none",
                      color: currentTheme === "xp" ? "#ffffff" : "#000000",
                      fontSize: "11px",
                      boxShadow:
                        currentTheme === "xp"
                          ? "2px 2px 5px rgba(255, 255, 255, 0.267) inset"
                          : "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf",
                      transition: "all 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (currentTheme === "xp") {
                        e.currentTarget.style.background = "#2a6ef1";
                        e.currentTarget.style.borderColor = "#1e56c9";
                      } else if (currentTheme === "win98") {
                        e.currentTarget.style.boxShadow =
                          "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf";
                      }
                    }}
                    onMouseDown={(e) => {
                      if (currentTheme === "xp") {
                        e.currentTarget.style.background = "#4a92f9";
                        e.currentTarget.style.borderColor = "#2c64e3";
                      } else if (currentTheme === "win98") {
                        e.currentTarget.style.boxShadow =
                          "inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey";
                      }
                    }}
                    onMouseUp={(e) => {
                      if (currentTheme === "xp") {
                        // return to hover shade; mouseleave will handle base
                        e.currentTarget.style.background = "#2a6ef1";
                        e.currentTarget.style.borderColor = "#1e56c9";
                      } else if (currentTheme === "win98") {
                        // return to raised hover state
                        e.currentTarget.style.boxShadow =
                          "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentTheme === "xp") {
                        e.currentTarget.style.background = "#1658dd";
                        e.currentTarget.style.borderColor = "#255be1";
                      } else if (currentTheme === "win98") {
                        e.currentTarget.style.boxShadow =
                          "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf";
                      }
                    }}
                  >
                    <CaretUp className="h-4 w-4" weight="bold" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side={isXpTheme ? "top" : "bottom"}
                  sideOffset={4}
                  className="px-0"
                >
                  {overflowTaskbarIds.map((instanceId) => {
                    const instance = instances[instanceId];
                    if (!instance || !instance.isOpen) return null;

                    const isMinimized = instance.isMinimized ?? false;
                    const displayIcon = getAppIconPath(instance.appId);
                    const displayLabel = instance.title || getAppName(instance.appId);
                    const isEmoji = false;

                    return (
                      <DropdownMenuItem
                        key={instanceId}
                        onClick={() => {
                          // If minimized, restore it; otherwise just bring to foreground
                          if (isMinimized) {
                            restoreInstance(instanceId);
                          } else {
                            bringInstanceToForeground(instanceId);
                          }
                        }}
                        className="text-md h-6 px-3 flex items-center gap-2"
                      >
                        {isEmoji ? (
                          <span
                            className="flex-shrink-0 flex items-center justify-center"
                            style={{
                              fontSize: "var(--os-text-sm)",
                              width: "var(--os-icon-titlebar)",
                              height: "var(--os-icon-titlebar)",
                            }}
                          >
                            {displayIcon}
                          </span>
                        ) : (
                          <ThemedIcon
                            name={displayIcon}
                            alt=""
                            className="[image-rendering:pixelated]"
                            style={{ width: "var(--os-icon-titlebar)", height: "var(--os-icon-titlebar)" }}
                          />
                        )}
                        <span className="truncate" style={{ fontSize: "var(--os-text-xs)" }}>
                          {displayLabel}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* System Tray */}
          <div
            className="flex items-center gap-1 px-2 text-white border box-border flex items-center justify-end text-sm"
            style={{
              height: currentTheme === "win98" ? "85%" : "100%",
              marginTop: currentTheme === "win98" ? "2px" : "0px",
              marginRight: currentTheme === "win98" ? "4px" : "0px",
              background:
                currentTheme === "xp"
                  ? "linear-gradient(0deg, #0a5bc6 0%, #1198e9 6%, #1198e9 51%, #1198e9 63%, #1198e9 77%, #19b9f3 85%, #19b9f3 93%, #075dca 97%)"
                  : "#c0c0c0", // Flat gray for Windows 98
              boxShadow:
                currentTheme === "xp"
                  ? "2px -0px 3px #20e2fc inset"
                  : "inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey", // Windows 98 inset
              borderTop:
                currentTheme === "xp" ? "1px solid #075dca" : "transparent",
              borderBottom:
                currentTheme === "xp" ? "1px solid #0a5bc6" : "transparent",
              borderRight:
                currentTheme === "xp" ? "transparent" : "transparent",
              borderLeft:
                currentTheme === "xp" ? "1px solid #000000" : "transparent",
              paddingTop: currentTheme === "xp" ? "1px" : "0px",
            }}
          >
            <OfflineIndicator />
            <div className="hidden sm:flex">
              <VolumeControl />
            </div>
            <div
              className={`text-xs ${isXpTheme ? "font-bold" : "font-normal"} ${
                isXpTheme ? "" : "px-2"
              }`}
              style={{
                color:
                  currentTheme === "win98"
                    ? "#000000"
                    : isXpTheme
                    ? "#ffffff"
                    : "#000000",
                textShadow:
                  currentTheme === "xp"
                    ? "1px 1px 1px rgba(0,0,0,0.5)"
                    : currentTheme === "win98"
                    ? "none"
                    : currentTheme === "macosx"
                    ? "0 2px 3px rgba(0, 0, 0, 0.25)"
                    : "none",
              }}
            >
              <Clock />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default Mac-style top menubar
  // In Tauri with titleBarStyle: overlay, add clearance for traffic lights (but not in fullscreen)
  // Don't add clearance on Windows platform (Chromium - no traffic lights), only on Mac (WebKit)
  const isWindowsPlatform = isTauriWindows();
  const needsTrafficLightClearance = isTauriApp && !isFullscreen && !isWindowsPlatform && (currentTheme === "macosx");
  
  return (
    <div
      className={`fixed top-0 left-0 right-0 flex border-b-[length:var(--os-metrics-border-width)] border-os-menubar items-center font-os-ui ${exposeMode ? "z-[9997]" : "z-[10002]"}`}
      style={{
        background:
          currentTheme === "macosx"
            ? "rgba(248, 248, 248, 0.85)"
            : "var(--os-color-menubar-bg)",
        backgroundImage:
          currentTheme === "macosx" ? "var(--os-pinstripe-menubar)" : undefined,
        backdropFilter: currentTheme === "macosx" ? "blur(20px)" : undefined,
        WebkitBackdropFilter:
          currentTheme === "macosx" ? "blur(20px)" : undefined,
        boxShadow:
          currentTheme === "macosx"
            ? "0 2px 8px rgba(0, 0, 0, 0.15)"
            : undefined,
        fontFamily: "var(--os-font-ui)",
        color: "var(--os-color-menubar-text)",
        // Add extra left padding for macOS traffic lights in Tauri
        paddingLeft: needsTrafficLightClearance 
          ? "calc(78px + env(safe-area-inset-left, 0px))" 
          : "calc(0.5rem + env(safe-area-inset-left, 0px))",
        paddingRight: "calc(0.5rem + env(safe-area-inset-right, 0px))",
        // Make menubar taller in Tauri for better traffic light alignment
        height: needsTrafficLightClearance ? "32px" : "var(--os-metrics-menubar-height)",
        minHeight: needsTrafficLightClearance ? "32px" : "var(--os-metrics-menubar-height)",
        maxHeight: needsTrafficLightClearance ? "32px" : "var(--os-metrics-menubar-height)",
      }}
    >
      <ScrollableMenuWrapper>
        <Menubar 
          className="flex items-stretch border-none bg-transparent space-x-0 p-0 rounded-none h-full"
        >
          <AppleMenu />
          {/* App Menu - only shown in macOS X theme */}
          {currentTheme === "macosx" && hasActiveApp && foregroundInstance && (
            <AppMenu
              appId={foregroundInstance.appId}
              appName={appRegistry[foregroundInstance.appId]?.name || foregroundInstance.appId}
              instanceId={foregroundInstance.instanceId}
            />
          )}
          {/* Kyo App Menu - shown in macOS X theme when no app is active (desktop) */}
          {currentTheme === "macosx" && !hasActiveApp && (
            <KyoAppMenu />
          )}
          {hasActiveApp && children ? children : <DefaultMenuItems />}
        </Menubar>
      </ScrollableMenuWrapper>
      {/* Draggable spacer for Tauri window only */}
      {isTauriApp && (
        // biome-ignore lint/a11y/noStaticElementInteractions: Window drag handle for Tauri
        <div
          className="flex-1"
          style={{
            background: debugMode ? 'rgba(255, 0, 0, 0.3)' : undefined,
            minHeight: '100%',
          }}
          onMouseDown={async (e) => {
            if (e.buttons !== 1) return;
            try {
              const { getCurrentWindow } = await import("@tauri-apps/api/window");
              if (e.detail === 2) {
                await getCurrentWindow().toggleMaximize();
              } else {
                await getCurrentWindow().startDragging();
              }
            } catch {
              // Ignore errors - Tauri window APIs may not be available in browser
            }
          }}
        />
      )}
      <div className={`${isPhone ? "flex-shrink-0 px-2" : "ml-auto"} flex items-center`}>
        <OfflineIndicator />
        <ExposeButton />
        <div className="hidden sm:flex">
          <VolumeControl />
        </div>
        <Clock enableExposeToggle />
      </div>
    </div>
  );
}

function OfflineIndicator() {
  const isOffline = useOffline();
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  if (!isOffline) return null;

  return (
    <div
      className="flex items-center"
      style={{
        marginRight: isXpTheme ? "4px" : "8px",
        color:
          currentTheme === "win98"
            ? "#000000"
            : isXpTheme
            ? "#ffffff"
            : "var(--os-color-menubar-text)",
      }}
      title="You are currently offline"
    >
      <WifiSlash
        className={isXpTheme ? "h-3 w-3" : "h-4 w-4"}
        weight="bold"
        style={{
          opacity: 0.7,
        }}
      />
    </div>
  );
}

function ExposeButton() {
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  
  // Don't show on Windows themes (they have their own taskbar)
  if (isXpTheme) return null;

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("toggleExposeView"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center px-1.5 py-0.5"
      style={{
        marginRight: "4px",
      }}
      title="Mission Control (F3)"
      aria-label="Mission Control (F3)"
    >
      <DotsThree aria-hidden="true" className="h-4 w-4" weight="bold" />
    </button>
  );
}

