/**
 * [INPUT]: 依赖 @/components/ui/card、@/lib/i18n、framer-motion、react-i18next
 * [OUTPUT]: 对外提供 LandingPage 组件
 * [POS]: components/landing 的产品开屏页，首次访问展示，点击 CTA 进入桌面
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, changeLanguage } from "@/lib/i18n";
import type { SupportedLanguage } from "@/lib/i18n";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onEnter: () => void;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_BOOKMARKS = [
  { title: "Notion", favicon: "https://www.notion.so/images/favicon.ico" },
  { title: "X", favicon: "https://abs.twimg.com/favicons/twitter.3.ico" },
  { title: "YouMind", favicon: "https://youmind.com/favicon.ico" },
  { title: "Cursor", favicon: "https://cursor.com/favicon.ico" },
  { title: "GitHub", favicon: "https://github.com/favicon.ico" },
  { title: "Flomo", favicon: "https://flomoapp.com/favicon.ico" },
];

const MOCK_PASTE_URLS = [
  { title: "Linear - Plan and build products", domain: "linear.app", favicon: "https://linear.app/favicon.ico" },
  { title: "Figma - Design tool for teams", domain: "figma.com", favicon: "https://static.figma.com/app/icon/1/favicon.ico" },
  { title: "Vercel - Build the best web", domain: "vercel.com", favicon: "https://vercel.com/favicon.ico" },
];

const MOCK_SEARCH_SCENARIOS = [
  {
    query: "design",
    results: [
      { title: "Designing with Clarity", domain: "youtube.com", favicon: "https://youtube.com/favicon.ico" },
      { title: "Design Systems Handbook", domain: "designbetter.co", favicon: "https://designbetter.co/favicon.ico" },
      { title: "Design Patterns", domain: "patterns.dev", favicon: "https://patterns.dev/favicon.ico" },
    ],
  },
  {
    query: "Notion",
    results: [
      { title: "Notion - Your connected workspace", domain: "notion.so", favicon: "https://www.notion.so/images/favicon.ico" },
      { title: "Notion API Reference", domain: "developers.notion.com", favicon: "https://www.notion.so/images/favicon.ico" },
      { title: "Notion Templates Gallery", domain: "notion.so/templates", favicon: "https://www.notion.so/images/favicon.ico" },
    ],
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

function AquaWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-[#E8E8E8]"
      style={{
        border: "0.5px solid rgba(0,0,0,0.3)",
        borderRadius: "0.45rem",
        boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
        overflow: "hidden",
        fontFamily: AQUA_FONT,
      }}
    >
      {/* ── Aqua title bar ── */}
      <div
        className="flex items-center px-[10px]"
        style={{
          height: "22px",
          background: "linear-gradient(to bottom, #efefef 0%, #d8d8d8 50%, #cfcfcf 100%)",
          borderBottom: "0.5px solid rgba(0,0,0,0.15)",
        }}
      >
        {/* traffic lights */}
        <div className="flex items-center gap-[5px]">
          {(["#FF5F57", "#FEBC2E", "#28C840"] as const).map((c, i) => (
            <div key={i} className="w-[10px] h-[10px] rounded-full" style={{
              background: c,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 0.5px 1px rgba(0,0,0,0.12)",
            }} />
          ))}
        </div>
        {/* centered title */}
        <span className="flex-1 text-center text-[11px] text-gray-500 select-none" style={{ fontFamily: AQUA_FONT }}>
          {title}
        </span>
        <div className="w-[36px]" /> {/* balance traffic lights width */}
      </div>

      {/* ── pinstripe body ── */}
      <div style={{
        background: `repeating-linear-gradient(0deg, transparent 0px, transparent 1.5px, rgba(255,255,255,0.85) 1.5px, rgba(255,255,255,0.85) 4px), #ececec`,
      }}>
        {children}
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
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[13px] text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded-md hover:bg-gray-50 cursor-pointer"
        style={{ fontFamily: AQUA_FONT }}
      >
        {LANGUAGE_LABELS[current] ?? LANGUAGE_LABELS["zh-CN"]}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-50 py-1 min-w-[120px]"
            style={{
              background: "#fff",
              border: "0.5px solid rgba(0,0,0,0.2)",
              borderRadius: "0.45rem",
              boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
              fontFamily: AQUA_FONT,
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => { changeLanguage(lang); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors hover:bg-[#3875D7] hover:text-white cursor-pointer`}
                style={{ color: lang === current ? "#3875D7" : "#333", fontWeight: lang === current ? 600 : 400 }}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Demo: Paste ────────────────────────────────────────────────────────────

function PasteDemo() {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "url" | "card" | "hold">("idle");
  const [bookmarks, setBookmarks] = useState(MOCK_BOOKMARKS.slice(0, 4));
  const bm = MOCK_PASTE_URLS[idx];

  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setPhase("idle");
      ts.push(setTimeout(() => setPhase("url"), 600));
      ts.push(setTimeout(() => setPhase("card"), 1400));
      ts.push(setTimeout(() => {
        setPhase("hold");
        setBookmarks(prev => {
          const next = [...prev, { title: bm.domain.split(".")[0], favicon: bm.favicon }];
          return next.slice(-6);
        });
      }, 2000));
      ts.push(setTimeout(() => {
        setIdx((i) => (i + 1) % MOCK_PASTE_URLS.length);
        run();
      }, 4000));
    };
    run();
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <AquaWindow title={t("landing.demo.desktop")}>
      {/* toolbar */}
      <div className="flex items-center gap-2 px-3 py-[6px] border-b" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <div className="flex-1 flex items-center bg-white rounded h-[22px] px-2" style={{ border: "0.5px solid rgba(0,0,0,0.15)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)" }}>
          <span className="text-[10px] text-gray-400" style={{ fontFamily: AQUA_FONT }}>{t("landing.demo.searchPlaceholder")}</span>
        </div>
        <div className="w-[20px] h-[20px] rounded flex items-center justify-center text-[13px] text-gray-400" style={{ border: "0.5px solid rgba(0,0,0,0.15)", background: "linear-gradient(to bottom, #fafafa, #e8e8e8)" }}>+</div>
      </div>

      {/* bookmark grid */}
      <div className="relative px-4 py-4 min-h-[140px]">
        <div className="grid grid-cols-6 gap-3">
          {bookmarks.map((b, i) => (
            <motion.div
              key={`${b.title}-${i}`}
              initial={i >= 4 ? { opacity: 0, scale: 0.5 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-[36px] h-[36px] rounded-lg flex items-center justify-center" style={{
                background: "linear-gradient(to bottom, #fafafa, #eee)",
                border: "0.5px solid rgba(0,0,0,0.12)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}>
                <img src={b.favicon} alt="" className="w-4 h-4" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <span className="text-[8px] text-gray-500 text-center leading-tight truncate w-full" style={{ fontFamily: AQUA_FONT }}>{b.title}</span>
            </motion.div>
          ))}
        </div>

        {/* floating paste indicator */}
        <AnimatePresence>
          {(phase === "url" || phase === "card") && (
            <motion.div
              key={`url-${idx}`}
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-[10px] font-medium z-10"
              style={{
                background: "rgba(56,117,215,0.15)",
                color: "#3875D7",
                border: "1px solid rgba(56,117,215,0.3)",
                backdropFilter: "blur(4px)",
                fontFamily: AQUA_FONT,
              }}
            >
              ⌘V&nbsp;&nbsp;{bm.title}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AquaWindow>
  );
}

// ─── Demo: Search ───────────────────────────────────────────────────────────

function SearchDemo() {
  const { t } = useTranslation();
  const [si, setSi] = useState(0);
  const [typed, setTyped] = useState("");
  const [show, setShow] = useState(false);
  const scenario = MOCK_SEARCH_SCENARIOS[si];

  const run = useCallback(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    const q = MOCK_SEARCH_SCENARIOS[si].query;
    for (let i = 0; i <= q.length; i++) ts.push(setTimeout(() => setTyped(q.slice(0, i)), i * 150));
    ts.push(setTimeout(() => setShow(true), q.length * 150 + 200));
    ts.push(setTimeout(() => { setShow(false); setTyped(""); }, q.length * 150 + 3000));
    ts.push(setTimeout(() => setSi((i) => (i + 1) % MOCK_SEARCH_SCENARIOS.length), q.length * 150 + 3500));
    return ts;
  }, [si]);

  useEffect(() => { const ts = run(); return () => ts.forEach(clearTimeout); }, [run]);

  return (
    <AquaWindow title={t("landing.demo.search")}>
      {/* search input */}
      <div className="px-3 pt-3">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">🔍</span>
          <input
            readOnly value={typed}
            placeholder={t("landing.demo.searchPlaceholder")}
            className="w-full pl-6 pr-3 h-[26px] text-[11px] bg-white rounded cursor-default outline-none"
            style={{
              border: "0.5px solid rgba(0,0,0,0.15)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
              fontFamily: AQUA_FONT,
            }}
          />
        </div>
      </div>

      {/* results */}
      <div className="px-2 pb-3 pt-1.5 min-h-[128px]">
        <AnimatePresence>
          {show && scenario.results.map((item, i) => {
            // highlight matching text
            const q = MOCK_SEARCH_SCENARIOS[si].query.toLowerCase();
            const titleLower = item.title.toLowerCase();
            const matchIdx = titleLower.indexOf(q);
            let titleEl: React.ReactNode = item.title;
            if (matchIdx >= 0) {
              const before = item.title.slice(0, matchIdx);
              const match = item.title.slice(matchIdx, matchIdx + q.length);
              const after = item.title.slice(matchIdx + q.length);
              titleEl = <>{before}<span style={{ fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "2px" }}>{match}</span>{after}</>;
            }
            return (
              <motion.div
                key={`${si}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ delay: i * 0.08, duration: 0.25 }}
                className="flex items-center gap-2 py-[5px] px-2 rounded"
                style={{ background: i === 0 ? "#3875D7" : "transparent" }}
              >
                <div className="w-[18px] h-[18px] rounded-sm flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: i === 0 ? "rgba(255,255,255,0.2)" : "#f3f3f3" }}>
                  <img src={item.favicon} alt="" className="w-3 h-3" style={i === 0 ? { filter: "brightness(10)" } : {}}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-medium truncate" style={{
                    color: i === 0 ? "#fff" : "#333",
                    fontFamily: AQUA_FONT,
                  }}>{titleEl}</span>
                  <span className="text-[8px]" style={{ color: i === 0 ? "rgba(255,255,255,0.7)" : "#999" }}>{item.domain}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </AquaWindow>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function LandingPage({ onEnter }: LandingPageProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-white text-gray-900 overflow-y-auto overscroll-none landing-scrollbar select-text"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(0,0,0,0.15) transparent",
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
          <button onClick={onEnter} className="aqua-button primary mt-3 cursor-pointer"
            style={{ fontSize: "14px", padding: "6px 32px", cursor: "pointer" }}>
            {t("landing.cta")} →
          </button>
        </motion.div>
      </section>

      {/* ── demos ── */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5 }}
            className="flex flex-col">
            <div className="mb-4 min-h-[52px]">
              <h3 className="text-[15px] font-semibold text-gray-800 mb-1">{t("landing.demo.pasteTitle")}</h3>
              <p className="text-[12px] text-gray-400 leading-relaxed">{t("landing.demo.pasteDesc")}</p>
            </div>
            <PasteDemo />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, delay: 0.08 }}
            className="flex flex-col">
            <div className="mb-4 min-h-[52px]">
              <h3 className="text-[15px] font-semibold text-gray-800 mb-1">{t("landing.demo.searchTitle")}</h3>
              <p className="text-[12px] text-gray-400 leading-relaxed">{t("landing.demo.searchDesc")}</p>
            </div>
            <SearchDemo />
          </motion.div>
        </div>
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
