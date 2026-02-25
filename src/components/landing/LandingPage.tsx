/**
 * [INPUT]: 依赖 @/lib/i18n、framer-motion（motion/useMotionValue/useTransform/useSpring）、react-i18next、@/hooks/useIsMobile
 * [OUTPUT]: 对外提供 LandingPage 组件
 * [POS]: components/landing 的产品开屏页，Dock 悬停放大 + 便利贴可拖动旋转 + DemoShowcase 场景轮播
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, changeLanguage } from "@/lib/i18n";
import type { SupportedLanguage } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/useIsMobile";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onEnter: () => void;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

// 桌面图标：右侧纵向排列
const DESKTOP_ICONS = [
  { label: "myBookmarks", icon: "/icons/macosx/sites.png", isApp: true },
  { label: "Notion", icon: "https://www.notion.so/images/favicon.ico", isApp: false },
];

// Dock 图标
const DOCK_ICONS = [
  "/icons/macosx/sites.png",
  "/icons/macosx/question.png",
  "/icons/macosx/control-panels.png",
];

// 粘贴动画：新增的书签
const PASTE_BOOKMARKS = [
  { label: "Linear", icon: "https://linear.app/favicon.ico" },
  { label: "Figma", icon: "https://static.figma.com/app/icon/1/favicon.ico" },
  { label: "Vercel", icon: "https://vercel.com/favicon.ico" },
];

// 搜索动画：搜索场景
const SEARCH_SCENARIOS = [
  {
    query: "S",
    bookmarks: [
      { title: "Notion", url: "notion.so", favicon: "https://www.notion.so/images/favicon.ico" },
      { title: "Cursor", url: "cursor.com", favicon: "https://cursor.com/marketing-static/apple-touch-icon.png" },
    ],
    selectedIdx: 1, // Cursor (0: Notion, 1: Cursor)
  },
];

const FEATURES = [
  { key: "windowManager", color: "yellow" },
  { key: "ai", color: "blue" },
  { key: "bookmarks", color: "pink" },
  { key: "themes", color: "green" },
] as const;

// Aqua theme sticky note colors
const STICKY_COLORS: Record<string, { bg: string; border: string }> = {
  yellow: { bg: "#fff59e", border: "#e1d460" },
  blue:   { bg: "#d2ebfb", border: "#8cbddd" },
  green:  { bg: "#d3f3d3", border: "#8ad18a" },
  pink:   { bg: "#ffd0e0", border: "#f99bbf" },
};

// ─── Dock 悬停放大常量 ──────────────────────────────────────────────────────
const DOCK_MAGNIFY_DISTANCE = 80;   // 影响半径 px
const DOCK_BASE_SIZE = 32;          // 基础尺寸 px
const DOCK_MAX_SIZE = 48;           // 最大尺寸 px (1.5x)
const DOCK_MOBILE_SIZE = 16;        // 移动端固定尺寸 px

// ─── 便利贴旋转角度 ─────────────────────────────────────────────────────────
const STICKY_ROTATIONS = [-2.5, 1.8, -1.2, 3.0];

// ─── useDraggable：原生 pointer 拖拽，不受布局重排影响 ─────────────────────

function useDraggable(enabled: boolean) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const origin = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    origin.current = { x: e.clientX - x.get(), y: e.clientY - y.get() };
    setDragging(true);
  }, [enabled, x, y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    x.set(e.clientX - origin.current.x);
    y.set(e.clientY - origin.current.y);
  }, [dragging, x, y]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return { x, y, dragging, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}

// ─── DockIcon 组件：距离感应放大 ────────────────────────────────────────────

function DockIcon({ src, mouseX, isMobile }: {
  src: string;
  mouseX: import("framer-motion").MotionValue<number>;
  isMobile: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return Infinity;
    return val - (bounds.left + bounds.width / 2);
  });

  const targetSize = useTransform(distance, (dist) => {
    if (isMobile) return DOCK_MOBILE_SIZE;
    const abs = Math.abs(dist);
    if (abs > DOCK_MAGNIFY_DISTANCE) return DOCK_BASE_SIZE;
    const t = 1 - abs / DOCK_MAGNIFY_DISTANCE;
    return DOCK_BASE_SIZE + t * (DOCK_MAX_SIZE - DOCK_BASE_SIZE);
  });

  const size = useSpring(targetSize, { mass: 0.15, stiffness: 170, damping: 18 });

  return (
    <motion.img
      ref={ref}
      src={src}
      alt=""
      className="drop-shadow-sm"
      style={{ width: size, height: size }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

// ─── KyoFace：面部跟随鼠标 + 浮动呼吸 ──────────────────────────────────

function KyoFace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const faceX = useMotionValue(0);
  const faceY = useMotionValue(0);
  // 更软的 spring，像漂浮在液体里
  const smoothX = useSpring(faceX, { stiffness: 60, damping: 12, mass: 0.8 });
  const smoothY = useSpring(faceY, { stiffness: 60, damping: 12, mass: 0.8 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // 偏移范围 ±5px，更灵动
      const dx = Math.max(-5, Math.min(5, (e.clientX - cx) / 50));
      const dy = Math.max(-5, Math.min(5, (e.clientY - cy) / 50));
      faceX.set(dx);
      faceY.set(dy);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [faceX, faceY]);

  return (
    <motion.div
      ref={containerRef}
      className="relative w-[72px] h-[72px]"
      // 整体浮动呼吸
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: "drop-shadow(0 2px 8px rgba(63,156,255,0.25))" }}
    >
      {/* 背景 icon（不含面部） */}
      <img src="/favicon-bg.svg" alt="Kyo" className="w-full h-full" />
      {/* 面部几何线条：跟随鼠标偏移 */}
      <motion.svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 500 500"
        fill="none"
        style={{ x: smoothX, y: smoothY }}
      >
        {/* 嘴巴 */}
        <path d="M182.502 309.499H152.752V339.249H182.502V368.999H301.502V339.249H331.252V309.499H301.502V339.249H182.502V309.499Z" fill="black"/>
        {/* 鼻子 L 形 */}
        <path d="M271.751 131H242.001V250H212.25V279.75H271.751V131Z" fill="black"/>
        {/* 右眼 */}
        <rect x="361.002" y="131" width="29.7501" height="59.5001" fill="black"/>
        {/* 左眼 */}
        <rect x="123" y="131" width="29.7501" height="59.5001" fill="black"/>
      </motion.svg>
    </motion.div>
  );
}

// ─── Animation ──────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

// ─── Aqua Window ────────────────────────────────────────────────────────────
// macOS Aqua spec: #E8E8E8 bg, 0.5px border rgba(0,0,0,0.3), radius 0.45rem
// shadow 0 3px 10px rgba(0,0,0,0.3), Lucida Grande, pinstripe texture
// traffic lights: #FF5F57 #FEBC2E #28C840, selection #3875D7

const AQUA_FONT = "'Lucida Grande', 'Geneva', sans-serif";
const PINSTRIPE = "repeating-linear-gradient(0deg, transparent 0px, transparent 1.5px, rgba(255,255,255,0.85) 1.5px, rgba(255,255,255,0.85) 4px), #ececec";
const SELECTION_BLUE = "rgba(39,101,202,0.88)";

// Shared panel style for SSOT
const PANEL_STYLE: React.CSSProperties = {
  background: PINSTRIPE,
  backdropFilter: "blur(12px)",
  border: "0.5px solid rgba(0,0,0,0.3)",
  boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
  fontFamily: AQUA_FONT,
  color: "#333",
};

// ─── MiniDesktop ────────────────────────────────────────────────────────────
// 迷你桌面容器：MenuBar + Toast 插槽 + 壁纸 + 桌面图标 + Dock + 内容浮层

function MiniDesktop({ children, icons, toast }: {
  children: React.ReactNode;
  icons: React.ReactNode;
  toast?: React.ReactNode;
}) {
  const { i18n } = useTranslation();
  const isMobile = useIsMobile();
  const mouseX = useMotionValue(Infinity);
  // 语言 → locale 映射，让日期跟随 app 语言
  const localeMap: Record<string, string> = {
    "zh-CN": "zh-CN", "zh-TW": "zh-TW", en: "en-US", ja: "ja-JP", ko: "ko-KR",
  };
  const dateLocale = localeMap[i18n.language] ?? "en-US";
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        borderRadius: "8px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        aspectRatio: "16 / 10",
        fontFamily: AQUA_FONT,
      }}
    >
      {/* ── MenuBar ── */}
      <div
        className="relative z-20 flex items-center px-2"
        style={{
          height: "18px",
          background: "rgba(248,248,248,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "0.5px solid rgba(0,0,0,0.12)",
          fontSize: "9px",
        }}
      >
        <img src="/icons/macosx/apple.png" alt="" className="w-[10px] h-[10px] mr-1.5" style={{ opacity: 0.7 }} />
        <span className="font-bold text-[9px] text-gray-700 mr-3">Kyo</span>
        <div className="flex-1" />
        <span className="text-[8px] text-gray-400">
          {new Date().toLocaleDateString(dateLocale, { month: "short", day: "numeric", weekday: "short" })}
        </span>
      </div>

      {/* ── Toast 插槽：MenuBar 下方居中 ── */}
      <div className="absolute top-[20px] md:top-[22px] left-1/2 -translate-x-1/2 z-30">
        <AnimatePresence>{toast}</AnimatePresence>
      </div>

      {/* ── Wallpaper ── */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url(/wallpapers/photos/aqua/aqua_kyo.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* ── Desktop Icons (right column) ── */}
      <div className="absolute top-[22px] md:top-[26px] right-[4px] md:right-[8px] z-10 flex flex-col items-center gap-1 md:gap-4">
        {icons}
      </div>

      {/* ── Content overlay ── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ top: "18px", bottom: "28px" }}>
        {children}
      </div>

      {/* ── Dock ── */}
      <div
        className="absolute bottom-[4px] md:bottom-[10px] left-1/2 -translate-x-1/2 z-20 flex items-end gap-[4px] md:gap-[10px] px-[6px] md:px-[12px] h-[24px] md:h-[44px]"
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        style={{
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(12px)",
          borderRadius: "8px",
          border: "0.5px solid rgba(255,255,255,0.4)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          paddingBottom: isMobile ? "4px" : "6px",
        }}
      >
        {DOCK_ICONS.map((icon, i) => (
          <DockIcon key={i} src={icon} mouseX={mouseX} isMobile={isMobile} />
        ))}
      </div>
    </div>
  );
}

// ─── Language Switcher ──────────────────────────────────────────────────────

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = i18n.language as SupportedLanguage;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="text-[13px] text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 cursor-pointer"
        style={{ fontFamily: AQUA_FONT }}
      >
        {LANGUAGE_LABELS[current] ?? LANGUAGE_LABELS["zh-CN"]}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-50 py-1.5 min-w-[120px]"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(12px)",
              border: "0.5px solid rgba(0,0,0,0.1)",
              borderRadius: "10px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              fontFamily: AQUA_FONT,
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => { changeLanguage(lang); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-[13px] transition-colors hover:bg-gray-100/80 block cursor-pointer"
                style={{ 
                  color: lang === current ? "#3875D7" : "#333", 
                  fontWeight: lang === current ? 600 : 400 
                }}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── DemoShowcase ────────────────────────────────────────────────────────────
// 单一大桌面 · 场景轮播 · 唯一时钟源
// paste(6s): idle->cmdv(0.8s)->toast(2s)->done(3.2s)->icon appears
// search(6s): type->results->highlight

type Scene = "paste" | "search";
type PastePhase = "idle" | "cmdv" | "toast" | "done";
const SCENE_DURATION = 6000;

function DemoShowcase() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { x, y, dragging, handlers } = useDraggable(!isMobile);
  const [scene, setScene] = useState<Scene>("paste");
  const [pastePhase, setPastePhase] = useState<PastePhase>("idle");
  const [pasteIdx, setPasteIdx] = useState(0);

  // ── 唯一时钟：场景轮播 + 粘贴阶段 ──
  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];

    if (scene === "paste") {
      setPastePhase("idle");
      ts.push(setTimeout(() => setPastePhase("cmdv"), 800));
      ts.push(setTimeout(() => setPastePhase("toast"), 2000));
      ts.push(setTimeout(() => setPastePhase("done"), 3200));
    }

    ts.push(setTimeout(() => {
      if (scene === "paste") setPasteIdx(i => i + 1);
      setScene(s => s === "paste" ? "search" : "paste");
    }, SCENE_DURATION));

    return () => ts.forEach(clearTimeout);
  }, [scene]);

  const currentBookmark = PASTE_BOOKMARKS[pasteIdx % PASTE_BOOKMARKS.length];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* ── 文案区：跟随场景切换 ── */}
      <div className="text-center min-h-[52px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-[20px] font-semibold text-gray-800 mb-1.5 tracking-tight">
              {scene === "paste"
                ? t("landing.demo.pasteTitle", "粘贴，就收藏了")
                : t("landing.demo.searchTitle", "想找什么，打字就好")}
            </h3>
            <p className="text-[14px] text-gray-400 leading-relaxed">
              {scene === "paste"
                ? t("landing.demo.pasteDesc", "复制一个链接，粘贴到桌面。就这样")
                : t("landing.demo.searchDesc", "你的收藏，随时能找到")}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 大桌面容器 ── */}
      <motion.div
        className="w-full"
        style={{
          x, y,
          cursor: isMobile ? undefined : dragging ? "grabbing" : "grab",
        }}
        animate={dragging ? { scale: 0.98, rotate: -1 } : { scale: 1, rotate: 0 }}
        whileHover={isMobile ? undefined : { y: -3, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        {...handlers}
      >
        <MiniDesktop
          icons={
            scene === "paste"
              ? <PasteIcons showNewIcon={pastePhase === "done"} bookmark={currentBookmark} />
              : <StaticIcons />
          }
          toast={
            scene === "paste" && (pastePhase === "toast" || pastePhase === "done")
              ? <ToastBanner phase={pastePhase as "toast" | "done"} />
              : null
          }
        >
          <AnimatePresence mode="wait">
            {scene === "paste"
              ? <PasteCenter key="paste" phase={pastePhase} />
              : <SearchOverlay key="search" />}
          </AnimatePresence>
        </MiniDesktop>
      </motion.div>
    </div>
  );
}

// ─── 桌面图标渲染器 ─────────────────────────────────────────────────────────

function StaticIcons() {
  const { t } = useTranslation();
  return (
    <>
      {DESKTOP_ICONS.map((item, i) => (
        <DesktopIcon
          key={i}
          label={item.label === "myBookmarks" ? t("landing.demo.myBookmarks", "我的收藏") : item.label}
          icon={item.icon}
          isApp={item.isApp}
        />
      ))}
    </>
  );
}

// PasteIcons: 纯展示组件，showNewIcon 由父级 DemoShowcase 控制
function PasteIcons({ showNewIcon, bookmark }: {
  showNewIcon: boolean;
  bookmark: { label: string; icon: string };
}) {
  const { t } = useTranslation();
  return (
    <>
      {DESKTOP_ICONS.map((item, i) => (
        <DesktopIcon
          key={i}
          label={item.label === "myBookmarks" ? t("landing.demo.myBookmarks", "我的收藏") : item.label}
          icon={item.icon}
          isApp={item.isApp}
        />
      ))}
      <AnimatePresence>
        {showNewIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <DesktopIcon label={bookmark.label} icon={bookmark.icon} isApp={false} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// 单个桌面图标：移动端 32px，桌面端 48px
function DesktopIcon({ label, icon, isApp }: { label: string; icon: string; isApp?: boolean }) {
  return (
    <div className="flex flex-col items-center w-[36px] md:w-[68px]">
      <div
        className="w-[32px] h-[32px] md:w-[44px] md:h-[44px] flex items-center justify-center"
        style={isApp ? {} : {
          background: "linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%)",
          borderRadius: "22%",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        <img
          src={icon} alt=""
          className={isApp ? "w-[32px] h-[32px] md:w-[44px] md:h-[44px] drop-shadow-md" : "w-[24px] h-[24px] md:w-[32px] md:h-[32px]"}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
      <span
        className="text-[7px] md:text-[11px] text-white text-center leading-tight mt-0.5 truncate w-full font-medium"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)", fontFamily: AQUA_FONT }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Toast 横幅（MenuBar 下方居中，macOS 通知风格）────────────────────────

function ToastBanner({ phase }: { phase: "toast" | "done" }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-2"
      style={{
        ...PANEL_STYLE,
        background: PINSTRIPE,
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.08)",
        whiteSpace: "nowrap",
      }}
    >
      {phase === "toast" && (
        <span className="inline-block w-[8px] h-[8px] md:w-[12px] md:h-[12px] rounded-full border-[1.5px] border-black/10 border-t-black/60 animate-spin" />
      )}
      {phase === "done" && (
        <span className="flex items-center justify-center w-[10px] h-[10px] md:w-[14px] md:h-[14px] bg-black/70 rounded-full text-white text-[7px] md:text-[9px]">
          &#10003;
        </span>
      )}
      <span className="text-[9px] md:text-[12px] font-medium tracking-tight opacity-90">
        {phase === "toast"
          ? t("landing.demo.fetchingInfo", "正在获取网页信息...")
          : t("landing.demo.bookmarkAdded", "已添加到收藏")}
      </span>
    </motion.div>
  );
}

// ─── 场景A 中心：⌘V 指示器（frosted glass 风格）─────────────────────────

function PasteCenter({ phase }: { phase: PastePhase }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center"
    >
      <AnimatePresence>
        {(phase === "cmdv" || phase === "toast") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="px-5 py-3 md:px-10 md:py-5 text-center flex flex-col items-center justify-center"
            style={{
              ...PANEL_STYLE,
              background: PINSTRIPE,
              borderRadius: "12px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.08)",
            }}
          >
            <span className="text-[18px] md:text-[32px] font-medium text-[#1d1d1f] tracking-tight" style={{ fontFamily: "-apple-system, sans-serif" }}>
              ⌘V
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 场景B 浮层：搜索 ──────────────────────────────────────────────────────

function SearchOverlay() {
  const { t } = useTranslation();
  const scenario = SEARCH_SCENARIOS[0];
  const [typed, setTyped] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);

  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    const q = scenario.query;
    for (let i = 0; i <= q.length; i++) {
      ts.push(setTimeout(() => setTyped(q.slice(0, i)), 600 + i * 200));
    }
    ts.push(setTimeout(() => setShowResults(true), 600 + q.length * 200 + 300));
    ts.push(setTimeout(() => setSelectedIdx(scenario.selectedIdx), 600 + q.length * 200 + 1200));
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="w-[55%] md:w-[60%] max-w-[280px]"
      style={{
        ...PANEL_STYLE,
        background: PINSTRIPE,
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(0,0,0,0.1)",
      }}
    >
      {/* 搜索输入框 */}
      <div className="flex items-center gap-1 md:gap-2 px-1.5 md:px-3 py-1 md:py-2.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <span className="text-[9px] md:text-[14px] text-gray-400">&#128269;</span>
        <div className="flex-1 text-[9px] md:text-[13px] text-gray-800 min-h-[14px] md:min-h-[18px] flex items-center tracking-tight" style={{ fontFamily: AQUA_FONT }}>
          {typed || <span className="text-gray-400">{t("landing.demo.searchPlaceholder", "搜索...")}</span>}
        </div>
      </div>

      {/* 结果列表 */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-1 md:px-1.5 py-0.5 md:py-1.5 max-h-[180px] overflow-hidden"
          >
            {/* 书签分组 */}
            {scenario.bookmarks.map((bm, i) => {
              const isSelected = selectedIdx === i;
              return (
                <motion.div
                  key={`bm-${i}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.2 }}
                  className="flex items-center gap-2 md:gap-2.5 px-1.5 md:px-2 py-[4px] md:py-1.5 rounded-[5px] md:rounded-[6px]"
                  style={{ background: isSelected ? SELECTION_BLUE : "transparent" }}
                >
                  <div
                    className="w-[14px] h-[14px] md:w-[16px] md:h-[16px] rounded-[3px] md:rounded-[4px] flex items-center justify-center flex-shrink-0"
                    style={{ background: isSelected ? "rgba(255,255,255,0.95)" : "#f0f0f0" }}
                  >
                    <img src={bm.favicon} alt="" className="w-[9px] h-[9px] md:w-[10px] md:h-[10px]"
                      style={isSelected ? {} : {}}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] md:text-[11px] truncate leading-none" style={{ color: isSelected ? "#fff" : "#333", fontFamily: AQUA_FONT }}>
                      {bm.title}
                    </span>
                    <span className="text-[8px] md:text-[9px] truncate leading-none" style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "#999" }}>
                      {bm.url}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── StickyCard：独立便利贴，原生 pointer 拖拽 ─────────────────────────────

function StickyCard({ feature, index, isMobile }: {
  feature: typeof FEATURES[number];
  index: number;
  isMobile: boolean;
}) {
  const { t } = useTranslation();
  const c = STICKY_COLORS[feature.color];
  const { x, y, dragging, handlers } = useDraggable(!isMobile);

  return (
    <motion.div custom={index} variants={fadeUp}
      className="z-50 relative"
      style={{
        x, y,
        cursor: isMobile ? undefined : dragging ? "grabbing" : "grab",
        rotate: STICKY_ROTATIONS[index],
      }}
      whileHover={isMobile ? undefined : { y: -4, rotate: 0, scale: 1.03 }}
      animate={dragging ? { scale: 1.05, rotate: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" } : {}}
      {...handlers}
    >
      <div
        className="flex flex-col overflow-hidden md:aspect-[5/4]"
        style={{
          backgroundColor: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: "1px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          minHeight: "110px",
        }}
      >
        <div className="flex items-center h-[14px] px-[3px]" style={{ borderBottom: `1px solid ${c.border}` }}>
          <div className="w-[9px] h-[9px]" style={{ border: `1px solid ${c.border}`, backgroundColor: c.bg }} />
        </div>
        <div className="flex-1 flex flex-col justify-center px-3 py-4">
          <h3 className="text-[13px] font-semibold text-black mb-1" style={{ fontFamily: AQUA_FONT }}>{t(`landing.features.${feature.key}.title`)}</h3>
          <p className="text-[11px] text-black/50 leading-relaxed" style={{ fontFamily: AQUA_FONT }}>{t(`landing.features.${feature.key}.desc`)}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function LandingPage({ onEnter }: LandingPageProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <div className="fixed inset-0 bg-white text-gray-900 overflow-y-auto overscroll-none landing-scrollbar select-text selection:bg-[#B3D7FF] origin-top"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(0,0,0,0.15) transparent",
        ...(isMobile ? {} : {
          transform: "scale(1.1)",
          transformOrigin: "top center",
          height: "90.9vh",
          width: "90.9vw",
          marginLeft: "4.55vw",
        }),
        backgroundImage: "linear-gradient(rgba(229,231,235,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(229,231,235,0.3) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}>

      {/* ── nav ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-100/80">
        <div className="max-w-3xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Kyo" className="w-6 h-6" />
            <span className="font-semibold text-[14px] tracking-tight text-gray-800">Kyo</span>
          </div>
          <LanguageSwitcher />
        </div>
      </nav>

      {/* ── hero ── */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center gap-5"
        >
          <KyoFace />
          <h1 className="text-[40px] md:text-[48px] font-bold tracking-tight text-gray-900 leading-none">Kyo</h1>
          <p className="text-[17px] text-gray-400 max-w-xs leading-relaxed">{t("landing.tagline")}</p>
          <motion.button onClick={onEnter} className="aqua-button primary mt-4 cursor-pointer"
            whileHover={{ y: 2 }}
            whileTap={{ y: 3 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            style={{ fontSize: isMobile ? "18px" : "16px", padding: isMobile ? "16px 64px" : "12px 48px", cursor: "pointer", borderRadius: "24px" }}>
            {t("landing.cta")} →
          </motion.button>
        </motion.div>
      </section>

      {/* ── demos ── */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <DemoShowcase />
      </section>

      {/* ── features 2×2 sticky notes ── */}
      <section className="max-w-md mx-auto px-6 pb-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
          transition={{ staggerChildren: 0.08 }} className="grid grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <StickyCard key={f.key} feature={f} index={i} isMobile={isMobile} />
          ))}
        </motion.div>
      </section>

      {/* ── footer ── */}
      <footer className="py-10">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-center gap-4 text-[11px] text-gray-300" style={{ fontFamily: AQUA_FONT }}>
          <a href="/docs/overview" className="hover:text-gray-500 transition-colors">
            About
          </a>
          <span>·</span>
          <a href="https://github.com/hiyeshu/kyo.is" target="_blank" rel="noopener noreferrer"
            className="hover:text-gray-500 transition-colors">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
