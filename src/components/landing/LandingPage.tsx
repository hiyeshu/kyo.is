/**
 * [INPUT]: 依赖 @/lib/i18n、framer-motion、react-i18next
 * [OUTPUT]: 对外提供 LandingPage 组件
 * [POS]: components/landing 的产品开屏页，单一大桌面 DemoShowcase 场景轮播（粘贴→搜索），文案 AnimatePresence 跟随切换
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, changeLanguage } from "@/lib/i18n";
import type { SupportedLanguage } from "@/lib/i18n";

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
      <div className="absolute top-[22px] md:top-[26px] right-[4px] md:right-[8px] z-10 flex flex-col items-center gap-1 md:gap-2">
        {icons}
      </div>

      {/* ── Content overlay ── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ top: "18px", bottom: "28px" }}>
        {children}
      </div>

      {/* ── Dock ── */}
      <div
        className="absolute bottom-[4px] md:bottom-[10px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-[4px] md:gap-[10px] px-[6px] md:px-[12px] h-[24px] md:h-[44px]"
        style={{
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(12px)",
          borderRadius: "8px",
          border: "0.5px solid rgba(255,255,255,0.4)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        }}
      >
        {DOCK_ICONS.map((icon, i) => (
          <img key={i} src={icon} alt="" className="w-[16px] h-[16px] md:w-[32px] md:h-[32px] drop-shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
        className="text-[13px] text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded-md hover:bg-gray-50 cursor-default"
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
                className="w-full text-left px-3 py-1.5 text-[13px] transition-colors hover:bg-gray-100/80 block"
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
                ? t("landing.demo.pasteDesc", "复制一个链接，粘贴到桌面。就这样。")
                : t("landing.demo.searchDesc", "你的收藏，随时能找到。")}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 大桌面容器 ── */}
      <div className="w-full">
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
      </div>
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
    <div className="flex flex-col items-center w-[40px] md:w-[64px]">
      <div
        className="w-[28px] h-[28px] md:w-[48px] md:h-[48px] flex items-center justify-center"
        style={isApp ? {} : {
          background: "linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%)",
          borderRadius: "22%",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        <img
          src={icon} alt=""
          className={isApp ? "w-[28px] h-[28px] md:w-[48px] md:h-[48px] drop-shadow-md" : "w-[18px] h-[18px] md:w-[32px] md:h-[32px]"}
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
                  className="flex items-center gap-1.5 md:gap-2.5 px-1 md:px-2 py-[2px] md:py-1.5 rounded-[4px] md:rounded-[6px]"
                  style={{ background: isSelected ? SELECTION_BLUE : "transparent" }}
                >
                  <div
                    className="w-[10px] h-[10px] md:w-[16px] md:h-[16px] rounded-[3px] md:rounded-[4px] flex items-center justify-center flex-shrink-0"
                    style={{ background: isSelected ? "rgba(255,255,255,0.95)" : "#f0f0f0" }}
                  >
                    <img src={bm.favicon} alt="" className="w-[7px] h-[7px] md:w-[10px] md:h-[10px]"
                      style={isSelected ? {} : {}}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] md:text-[11px] truncate leading-none" style={{ color: isSelected ? "#fff" : "#333", fontFamily: AQUA_FONT }}>
                      {bm.title}
                    </span>
                    <span className="text-[7px] md:text-[9px] truncate leading-none" style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "#999" }}>
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

// ─── Main ───────────────────────────────────────────────────────────────────

export function LandingPage({ onEnter }: LandingPageProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-white text-gray-900 overflow-y-auto overscroll-none landing-scrollbar select-text selection:bg-[#B3D7FF] origin-top"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(0,0,0,0.15) transparent",
        transform: "scale(1.1)",
        transformOrigin: "top center",
        height: "90.9vh",
        width: "90.9vw",
        marginLeft: "4.55vw",
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
          <img src="/favicon.svg" alt="Kyo" className="w-[72px] h-[72px]"
            style={{ filter: "drop-shadow(0 2px 8px rgba(63,156,255,0.25))" }} />
          <h1 className="text-[40px] md:text-[48px] font-bold tracking-tight text-gray-900 leading-none">Kyo</h1>
          <p className="text-[17px] text-gray-400 max-w-xs leading-relaxed">{t("landing.tagline")}</p>
          <button onClick={onEnter} className="aqua-button primary mt-4 cursor-pointer"
            style={{ fontSize: "16px", padding: "12px 48px", cursor: "pointer", borderRadius: "24px" }}>
            {t("landing.cta")} →
          </button>
        </motion.div>
      </section>

      {/* ── demos ── */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <DemoShowcase />
      </section>

      {/* ── features 2×2 sticky notes ── */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
          transition={{ staggerChildren: 0.08 }} className="grid grid-cols-2 gap-4">
          {FEATURES.map((f, i) => {
            const c = STICKY_COLORS[f.color];
            return (
              <motion.div key={f.key} custom={i} variants={fadeUp}>
                <div
                  className="flex flex-col overflow-hidden"
                  style={{
                    backgroundColor: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: "1px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    minHeight: "110px",
                  }}
                >
                  {/* sticky title bar */}
                  <div className="flex items-center h-[14px] px-[3px]" style={{ borderBottom: `1px solid ${c.border}` }}>
                    <div className="w-[9px] h-[9px]" style={{ border: `1px solid ${c.border}`, backgroundColor: c.bg }} />
                  </div>
                  {/* content */}
                  <div className="flex-1 flex flex-col justify-center px-3 py-4">
                    <h3 className="text-[13px] font-semibold text-black mb-1" style={{ fontFamily: AQUA_FONT }}>{t(`landing.features.${f.key}.title`)}</h3>
                    <p className="text-[11px] text-black/50 leading-relaxed" style={{ fontFamily: AQUA_FONT }}>{t(`landing.features.${f.key}.desc`)}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── footer ── */}
      <footer className="border-t border-gray-100/80 py-6">
        <div className="max-w-3xl mx-auto px-6 text-center text-[11px] text-gray-300">
          <a
            href="https://github.com/hiyeshu/kyo.is"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-500 transition-colors"
            style={{ fontFamily: AQUA_FONT }}
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
