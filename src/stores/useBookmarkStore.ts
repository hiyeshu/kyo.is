/**
 * [INPUT]: zustand + zustand/middleware(persist)，依赖 @/lib/cloudSync 云端写入
 * [OUTPUT]: useBookmarkStore, Bookmark, isBookmark, openBookmarkUrl, getBookmarkIconInfo, getBookmarkShortName, getFaviconUrl, SortMode, clearAll
 * [POS]: 书签数据的单一真相源，管理 onDesktop/inDock/orderIndex 展示位置、排序偏好，被 bookmark-board、Dock、Desktop 消费，每次变更同步写云端，clearAll 用于退出登录时清空本地
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cloudUpsertItem, cloudDeleteItem } from "@/lib/cloudSync";
import { markLocalChange, trackDeletion } from "./useSyncStore";
import { useHistoryStore } from "./useHistoryStore";

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

const generateId = () => crypto.randomUUID();

// ─── Favicon URL 生成 ─────────────────────────────────────────────────────────
// 永远只生成 URL，永不存 base64 —— 让浏览器 HTTP 缓存干脏活

// 热门网站的高清图标映射（这些网站的 favicon 服务通常抓不到或质量差）
// 使用各网站官方提供的高清 logo 或 CDN 地址
const FAVICON_OVERRIDES: Record<string, string> = {
  // 中国热门网站
  "xiaohongshu.com": "/icons/favicons/xiaohongshu.svg",
  "www.xiaohongshu.com": "/icons/favicons/xiaohongshu.svg",
  "bilibili.com": "/icons/favicons/bilibili.svg",
  "www.bilibili.com": "/icons/favicons/bilibili.svg",
  "douban.com": "/icons/favicons/douban.svg",
  "www.douban.com": "/icons/favicons/douban.svg",
  "zhihu.com": "https://static.zhihu.com/heifetz/favicon.ico",
  "www.zhihu.com": "https://static.zhihu.com/heifetz/favicon.ico",
  "weibo.com": "https://weibo.com/favicon.ico",
  "www.weibo.com": "https://weibo.com/favicon.ico",
  "taobao.com": "https://www.taobao.com/favicon.ico",
  "www.taobao.com": "https://www.taobao.com/favicon.ico",
  "jd.com": "https://www.jd.com/favicon.ico",
  "www.jd.com": "https://www.jd.com/favicon.ico",
  "163.com": "https://www.163.com/favicon.ico",
  "music.163.com": "/icons/favicons/music163.svg",
  "baidu.com": "https://www.baidu.com/favicon.ico",
  "www.baidu.com": "https://www.baidu.com/favicon.ico",
  "qq.com": "https://www.qq.com/favicon.ico",
  "weixin.qq.com": "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico",
  "okjike.com": "/icons/favicons/okjike.svg",
  "web.okjike.com": "/icons/favicons/okjike.svg",
  "flomoapp.com": "/icons/favicons/flomo.svg",
  "v.flomoapp.com": "/icons/favicons/flomo.svg",
  // 国际热门网站
  "twitter.com": "https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png",
  "x.com": "https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png",
  "notion.so": "/icons/favicons/notion.svg",
  "www.notion.so": "/icons/favicons/notion.svg",
  "spotify.com": "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png",
  "open.spotify.com": "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png",
  "youtube.com": "https://www.youtube.com/s/desktop/12d6b690/img/favicon_144x144.png",
  "www.youtube.com": "https://www.youtube.com/s/desktop/12d6b690/img/favicon_144x144.png",
  "cursor.com": "https://cursor.com/marketing-static/icon-512x512.png",
  "www.cursor.com": "https://cursor.com/marketing-static/icon-512x512.png",
  "github.com": "https://github.githubassets.com/favicons/favicon.svg",
  "discord.com": "https://discord.com/assets/847541504914fd33810e70a0ea73177e.ico",
  "reddit.com": "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
  "www.reddit.com": "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
  "instagram.com": "https://static.cdninstagram.com/rsrc.php/v3/yG/r/De-Dwpd5CHc.png",
  "www.instagram.com": "https://static.cdninstagram.com/rsrc.php/v3/yG/r/De-Dwpd5CHc.png",
  "tiktok.com": "https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/tiktok/webapp/main/webapp-desktop/8152caf0c8e8bc67ae0d.png",
  "www.tiktok.com": "https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/tiktok/webapp/main/webapp-desktop/8152caf0c8e8bc67ae0d.png",
};

function getFaviconUrl(domain: string): string {
  const override = FAVICON_OVERRIDES[domain];
  if (override) return override;
  
  const mainDomain = domain.replace(/^www\./, "");
  const mainOverride = FAVICON_OVERRIDES[mainDomain];
  if (mainOverride) return mainOverride;
  
  return `https://icon.horse/icon/${domain}`;
}

export { getFaviconUrl };

// ─── 云端字段映射 ─────────────────────────────────────────────────────────────

function bookmarkToCloud(b: Bookmark) {
  return {
    id: b.id,
    type: "bookmark" as const,
    title: b.title,
    url: b.url,
    summary: b.summary || null,
    favicon: b.favicon || null,
    tags: b.tags || [],
    on_desktop: b.onDesktop || false,
    in_dock: b.inDock || false,
    order_index: b.orderIndex ?? 0,
    created_at: b.createdAt || new Date().toISOString(),
    updated_at: b.updatedAt || b.createdAt || new Date().toISOString(),
  };
}

// ─── iOS PWA Deep Link ──────────────────────────────────────────────────────
// 热门 App 的 URL scheme 映射，用于 iOS PWA 下直接唤起原生 App

const APP_URL_SCHEMES: Record<string, string> = {
  // ─── 国内热门 ─────────────────────────────────────────────────────────────────
  // 哔哩哔哩
  "bilibili.com": "bilibili://",
  "www.bilibili.com": "bilibili://",
  "m.bilibili.com": "bilibili://",
  // 小红书
  "xiaohongshu.com": "xhsdiscover://",
  "www.xiaohongshu.com": "xhsdiscover://",
  // 网易云音乐
  "music.163.com": "orpheus://",
  // 豆瓣
  "douban.com": "douban://",
  "www.douban.com": "douban://",
  // 微博
  "weibo.com": "sinaweibo://",
  "www.weibo.com": "sinaweibo://",
  // 知乎
  "zhihu.com": "zhihu://",
  "www.zhihu.com": "zhihu://",
  // 淘宝
  "taobao.com": "taobao://",
  "www.taobao.com": "taobao://",
  // 天猫
  "tmall.com": "tmall://",
  "www.tmall.com": "tmall://",
  // 京东
  "jd.com": "openapp.jdmoble://",
  "www.jd.com": "openapp.jdmoble://",
  // 拼多多
  "pinduoduo.com": "pinduoduo://",
  "www.pinduoduo.com": "pinduoduo://",
  // 支付宝
  "alipay.com": "alipay://",
  // 微信
  "weixin.qq.com": "weixin://",
  "wx.qq.com": "weixin://",
  // QQ
  "qq.com": "mqq://",
  // 即刻
  "web.okjike.com": "jike://",
  "okjike.com": "jike://",
  "m.okjike.com": "jike://",
  // 优酷
  "youku.com": "youku://",
  "www.youku.com": "youku://",
  // 爱奇艺
  "iqiyi.com": "qiyi-iphone://",
  "www.iqiyi.com": "qiyi-iphone://",
  // 腾讯视频
  "v.qq.com": "tenvideo://",
  // 美团
  "meituan.com": "imeituan://",
  "www.meituan.com": "imeituan://",
  // 美团外卖
  "waimai.meituan.com": "meituanwaimai://",
  // 大众点评
  "dianping.com": "dianping://",
  "www.dianping.com": "dianping://",
  // 携程
  "ctrip.com": "CtripWireless://",
  "www.ctrip.com": "CtripWireless://",
  // 今日头条
  "toutiao.com": "snssdk141://",
  "www.toutiao.com": "snssdk141://",
  // 抖音
  "douyin.com": "snssdk1128://",
  "www.douyin.com": "snssdk1128://",
  // 快手
  "kuaishou.com": "gifshow://",
  "www.kuaishou.com": "gifshow://",
  // 酷安
  "coolapk.com": "tencent100336226://",
  "www.coolapk.com": "tencent100336226://",
  // 微信读书
  "weread.qq.com": "weread://",
  // QQ音乐
  "y.qq.com": "qqmusic://",
  // 酷狗音乐
  "kugou.com": "kugouURL://",
  "www.kugou.com": "kugouURL://",
  // 酷我音乐
  "kuwo.cn": "com.kuwo.kwmusic.kwmusicForKwsing://",
  "www.kuwo.cn": "com.kuwo.kwmusic.kwmusicForKwsing://",
  // 唯品会
  "vip.com": "vipshop://",
  "www.vip.com": "vipshop://",
  // 滴滴
  "didi.cn": "diditaxi://",
  "www.didi.cn": "diditaxi://",
  // Keep
  "keep.com": "keep://",
  "www.keep.com": "keep://",
  // 高德地图
  "amap.com": "iosamap://",
  "www.amap.com": "iosamap://",
  // 百度地图
  "map.baidu.com": "baidumap://",
  // 腾讯会议
  "meeting.tencent.com": "wemeet://",
  // 钉钉
  "dingtalk.com": "dingtalk://",
  "www.dingtalk.com": "dingtalk://",
  
  // ─── 国际热门 ─────────────────────────────────────────────────────────────────
  // GitHub
  "github.com": "github://",
  // YouTube
  "youtube.com": "youtube://",
  "www.youtube.com": "youtube://",
  "music.youtube.com": "youtubemusic://",
  // Twitter/X
  "twitter.com": "twitter://",
  "x.com": "twitter://",
  // Instagram
  "instagram.com": "instagram://",
  "www.instagram.com": "instagram://",
  // Reddit
  "reddit.com": "reddit://",
  "www.reddit.com": "reddit://",
  // Spotify
  "spotify.com": "spotify://",
  "open.spotify.com": "spotify://",
  // Discord
  "discord.com": "discord://",
  // TikTok
  "tiktok.com": "snssdk1233://",
  "www.tiktok.com": "snssdk1233://",
  // Notion
  "notion.so": "notion://",
  "www.notion.so": "notion://",
  // Telegram
  "telegram.org": "tg://",
  "t.me": "tg://",
  // WhatsApp
  "whatsapp.com": "whatsapp://",
  "www.whatsapp.com": "whatsapp://",
  // Line
  "line.me": "line://",
};

function getAppScheme(domain: string): string | null {
  const scheme = APP_URL_SCHEMES[domain];
  if (scheme) return scheme;
  const main = domain.replace(/^www\./, "");
  return APP_URL_SCHEMES[main] || null;
}

/**
 * 将完整 URL 转换为 App 深度链接
 * 部分 app 支持带路径的深度链接，可以直接打开特定页面
 */
function getDeepLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    const { hostname, pathname } = parsed;
    const domain = hostname.replace(/^(www\.|m\.)/, "");
    
    // ─── 即刻：话题/动态/用户页 ─────────────────────────────────────────────────
    // web.okjike.com 用 /topic/，m.okjike.com 用 /topics/
    if (domain === "okjike.com" || hostname === "web.okjike.com") {
      // 话题页: /topic/{id} 或 /topics/{id} → jike://page.jk/topic/{id}
      // 支持 /topic/{id}/square 等子路径
      const topicMatch = pathname.match(/^\/topics?\/([a-f0-9]+)/i);
      if (topicMatch) return `jike://page.jk/topic/${topicMatch[1]}`;
      
      // 动态页: /originalPosts/{id} 或 /originalPost/{id}
      const postMatch = pathname.match(/^\/originalPosts?\/([a-f0-9]+)/i);
      if (postMatch) return `jike://page.jk/originalPost/${postMatch[1]}`;
      
      // 用户页: /users/{id} 或 /user/{id}
      const userMatch = pathname.match(/^\/users?\/([a-f0-9-]+)/i);
      if (userMatch) return `jike://page.jk/user/${userMatch[1]}`;
      
      // 其他页面用通用 scheme
      return "jike://";
    }
    
    // ─── 哔哩哔哩：视频/用户/番剧 ────────────────────────────────────────────────
    if (domain === "bilibili.com") {
      // 视频页: /video/BVxxx → bilibili://video/BVxxx
      const videoMatch = pathname.match(/^\/video\/(BV[a-zA-Z0-9]+|av\d+)/i);
      if (videoMatch) return `bilibili://video/${videoMatch[1]}`;
      
      // 用户空间: /space/{uid} → bilibili://space/{uid}
      const spaceMatch = pathname.match(/^\/space\/(\d+)/);
      if (spaceMatch) return `bilibili://space/${spaceMatch[1]}`;
      
      return "bilibili://";
    }
    
    // ─── 小红书：笔记/用户 ───────────────────────────────────────────────────────
    if (domain === "xiaohongshu.com") {
      // 笔记页: /explore/{id} 或 /discovery/item/{id}
      const noteMatch = pathname.match(/^\/(?:explore|discovery\/item)\/([a-f0-9]+)/i);
      if (noteMatch) return `xhsdiscover://item/${noteMatch[1]}`;
      
      // 用户页: /user/profile/{id}
      const userMatch = pathname.match(/^\/user\/profile\/([a-f0-9]+)/i);
      if (userMatch) return `xhsdiscover://user/${userMatch[1]}`;
      
      return "xhsdiscover://";
    }
    
    // 其他 app 暂时用基础 scheme
    return getAppScheme(hostname);
  } catch {
    return null;
  }
}

/** iOS PWA 检测 */
function isIOSPWA(): boolean {
  if (typeof window === "undefined") return false;
  const isStandalone = ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
    || window.matchMedia("(display-mode: standalone)").matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return isStandalone && isIOS;
}

/**
 * 统一的书签 URL 打开函数
 * - iOS PWA + 有 URL scheme → 尝试唤起原生 App
 * - iOS PWA + 无 scheme → window.open 跳 Safari
 * - 浏览器 → 新标签页
 * 
 * iOS PWA 跳转策略：
 * 使用临时 <a> 标签模拟点击，不改变当前页面 location，避免返回时重复跳转
 */
export async function openBookmarkUrl(url: string): Promise<void> {
  // Tauri 环境：使用 shell API 打开外部链接
  if (typeof window !== "undefined" && "__TAURI__" in window) {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
      return;
    } catch (err) {
      console.error("Failed to open bookmark in Tauri:", err);
      // 失败则继续走下面的逻辑
    }
  }

  if (isIOSPWA()) {
    try {
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      // 优先使用深度链接（带路径），否则用基础 scheme
      const deepLink = getDeepLink(fullUrl);
      
      if (deepLink) {
        // 追踪是否曾经离开页面（跳转到 app 成功）
        let didLeave = false;
        const onVisibilityChange = () => {
          if (document.hidden) didLeave = true;
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        
        // 用临时 <a> 标签触发 URL scheme，不影响当前页面状态
        const link = document.createElement("a");
        link.href = deepLink;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 1.5秒后检查：如果从未离开过页面，说明跳转失败，回退浏览器打开
        setTimeout(() => {
          document.removeEventListener("visibilitychange", onVisibilityChange);
          // 只有从未离开过（app 没打开）才回退到浏览器
          if (!didLeave) {
            window.open(url, "_blank");
          }
        }, 1500);
        return;
      }
    } catch {
      // URL 解析失败，走默认逻辑
    }
    // 无 scheme 映射，直接在 Safari 打开
    window.open(url, "_blank");
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// ─── 数据模型 ───────────────────────────────────────────────────────────────

// 图标类型：自动获取网站图标 | 自定义上传 | Emoji
export type IconType = "favicon" | "custom" | "emoji";

export interface BookmarkIcon {
  type: IconType;
  value: string; // favicon: URL | custom: base64 data URL | emoji: emoji字符
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  lastUsed?: string;
  onDesktop?: boolean;
  inDock?: boolean;
  orderIndex?: number;
  favicon?: string;
  icon?: BookmarkIcon;
}

export type SortMode = "manual" | "recent" | "name";


// 向后兼容：旧数据可能包含文件夹对象
interface LegacyFolder { id: string; title: string; bookmarks: Bookmark[] }
const isLegacyFolder = (item: unknown): item is LegacyFolder =>
  typeof item === "object" && item !== null && "bookmarks" in item;

// ─── 图标信息（单一真相源） ─────────────────────────────────────────────────────

export interface BookmarkIconInfo {
  type: "favicon" | "emoji" | "custom";
  value: string; // URL | emoji字符 | indexeddb://id
  isEmoji: boolean;
  isCustom: boolean;
  isFavicon: boolean;
}

/**
 * 获取书签图标信息（单一真相源）
 * 所有需要渲染书签图标的地方都应该调用这个函数
 */
export function getBookmarkIconInfo(bookmark: Bookmark): BookmarkIconInfo {
  const icon = bookmark.icon;
  
  if (icon) {
    return {
      type: icon.type,
      value: icon.value,
      isEmoji: icon.type === "emoji",
      isCustom: icon.type === "custom",
      isFavicon: icon.type === "favicon",
    };
  }
  
  // 兼容旧数据：使用 favicon 字段
  if (bookmark.favicon) {
    return {
      type: "favicon",
      value: bookmark.favicon,
      isEmoji: false,
      isCustom: false,
      isFavicon: true,
    };
  }
  
  // 默认：emoji 地球
  return {
    type: "emoji",
    value: "🌐",
    isEmoji: true,
    isCustom: false,
    isFavicon: false,
  };
}

// ─── 品牌短名提取 ─────────────────────────────────────────────────────────────
// "YouTube - Broadcast Yourself" → "YouTube"
// "GitHub: Let's build from here" → "GitHub"
// "" → domain fallback "youtube.com"

// 提取主域名：去掉 www/m/app/web/v 等常见子域名前缀
function getMainDomain(hostname: string): string {
  return hostname.replace(/^(www|m|app|web|v|mobile|wap)\./i, "");
}

export function getBookmarkShortName(title: string, url: string): string {
  if (!title.trim()) {
    try { return getMainDomain(new URL(url).hostname); } catch { return url; }
  }
  const brand = title.split(/\s[-|—:·]\s/)[0].trim();
  return brand.length > 15 ? brand.slice(0, 15) : brand;
}

// ─── 创建带 ID 的书签 ─────────────────────────────────────────────────────────

const createBookmark = (
  title: string,
  url: string,
  favicon?: string,
  meta?: { summary?: string; tags?: string[]; createdAt?: string; onDesktop?: boolean; inDock?: boolean; orderIndex?: number }
): Bookmark => ({
  id: generateId(),
  title,
  url,
  summary: meta?.summary ?? "",
  tags: meta?.tags ?? [],
  createdAt: meta?.createdAt ?? new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  onDesktop: meta?.onDesktop ?? false,
  inDock: meta?.inDock ?? false,
  orderIndex: meta?.orderIndex,
  favicon: favicon || getFaviconUrl(new URL(url).hostname),
});

// ─── 默认数据 ───────────────────────────────────────────────────────────────

const createDefaultItems = (): Bookmark[] => [
  createBookmark("Notion", "https://notion.so"),
  createBookmark("X", "https://x.com"),
  createBookmark("YouMind", "https://youmind.com", "/icons/favicons/youmind.png"),
  createBookmark("Cursor", "https://cursor.com"),
  createBookmark("GitHub", "https://github.com"),
  createBookmark("Flomo", "https://flomoapp.com"),
].map((item, orderIndex) => ({ ...item, orderIndex }));

const byManualOrder = (a: Bookmark, b: Bookmark) =>
  (a.orderIndex ?? 0) - (b.orderIndex ?? 0) ||
  a.createdAt.localeCompare(b.createdAt) ||
  a.id.localeCompare(b.id);

// ─── Store ───────────────────────────────────────────────────────────────────

interface BookmarkStore {
  items: Bookmark[];
  sortMode: SortMode;
  groupByDomain: boolean;

  // CRUD
  addBookmark: (title: string, url: string, favicon?: string, options?: { onDesktop?: boolean; inDock?: boolean }) => string;
  addAiBookmark: (title: string, url: string, summary: string, tags: string[], options?: { onDesktop?: boolean; inDock?: boolean }) => string;
  getBookmarkByUrl: (url: string) => Bookmark | undefined;
  updateBookmark: (id: string, updates: Partial<Pick<Bookmark, "title" | "url" | "favicon" | "icon" | "summary" | "tags" | "onDesktop" | "inDock" | "lastUsed" | "orderIndex">>) => void;
  removeBookmark: (id: string) => void;
  touchBookmark: (id: string) => void; // 更新 lastUsed

  // 排序
  reorderItems: (fromIndex: number, toIndex: number) => void;
  reorderItemsByIds: (orderedIds: string[]) => void;
  setSortMode: (mode: SortMode) => void;
  setGroupByDomain: (enabled: boolean) => void;

  // 查询
  getBookmarkById: (id: string) => Bookmark | undefined;

  // 重置
  resetToDefaults: () => void;
  clearAll: () => void; // 清空所有书签（退出登录时使用）
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      items: createDefaultItems(),
      sortMode: "manual" as SortMode,
      groupByDomain: false,

      addBookmark: (title, url, favicon, options) => {
        const newBookmark = createBookmark(title, url, favicon, {
          onDesktop: options?.onDesktop,
          inDock: options?.inDock,
          orderIndex: get().items.length,
        });
        set((s) => ({ items: [...s.items, newBookmark] }));
        markLocalChange(newBookmark.id);
        cloudUpsertItem(bookmarkToCloud(newBookmark));
        useHistoryStore.getState().addEntry({
          id: newBookmark.id, type: "bookmark", title, url,
          favicon: newBookmark.favicon,
          tags: newBookmark.tags, createdAt: new Date(newBookmark.createdAt).getTime(),
        });
        return newBookmark.id;
      },

      addAiBookmark: (title, url, summary, tags, options) => {
        let hostname = "example.com";
        try { hostname = new URL(url).hostname; } catch { /* noop */ }
        const favicon = getFaviconUrl(hostname);
        const newBookmark = createBookmark(title, url, favicon, {
          summary, tags,
          createdAt: new Date().toISOString(),
          onDesktop: options?.onDesktop,
          inDock: options?.inDock,
          orderIndex: get().items.length,
        });
        set((s) => ({ items: [...s.items, newBookmark] }));
        markLocalChange(newBookmark.id);
        cloudUpsertItem(bookmarkToCloud(newBookmark));
        useHistoryStore.getState().addEntry({
          id: newBookmark.id, type: "bookmark", title, url,
          favicon: newBookmark.favicon,
          tags, createdAt: new Date(newBookmark.createdAt).getTime(),
        });
        return newBookmark.id;
      },

      getBookmarkByUrl: (url) => get().items.find((b) => b.url === url),

      updateBookmark: (id, updates) => {
        set((s) => ({
          items: s.items.map((b) => b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b),
        }));
        const updated = get().items.find((b) => b.id === id);
        if (updated) {
          markLocalChange(id);
          cloudUpsertItem(bookmarkToCloud(updated));
        }
      },

      removeBookmark: (id) => {
        set((s) => ({ items: s.items.filter((b) => b.id !== id) }));
        markLocalChange(id);
        trackDeletion(id);
        cloudDeleteItem(id);
        useHistoryStore.getState().markDeleted(id);
      },

      touchBookmark: (id) => {
        const now = new Date().toISOString();
        set((s) => ({
          items: s.items.map((b) => b.id === id ? { ...b, lastUsed: now, updatedAt: now } : b),
        }));
        const touched = get().items.find((b) => b.id === id);
        if (touched) {
          markLocalChange(id);
          cloudUpsertItem(bookmarkToCloud(touched));
        }
      },

      reorderItems: (fromIndex, toIndex) => {
        const nextIds = [...get().items.map((item) => item.id)];
        const [moved] = nextIds.splice(fromIndex, 1);
        nextIds.splice(toIndex, 0, moved);
        get().reorderItemsByIds(nextIds);
      },

      reorderItemsByIds: (orderedIds) => {
        let reordered: Bookmark[] = [];
        const now = new Date().toISOString();
        set((s) => {
          const byId = new Map(s.items.map((item) => [item.id, item]));
          const ordered = Array.from(new Set(orderedIds))
            .map((id) => byId.get(id))
            .filter((item): item is Bookmark => Boolean(item));
          if (ordered.length === 0) return s;

          const orderedSet = new Set(ordered.map((item) => item.id));
          let nextSlot = 0;
          reordered = [...s.items]
            .sort(byManualOrder)
            .map((item) => (orderedSet.has(item.id) ? ordered[nextSlot++] : item))
            .map((item, orderIndex) => ({
              ...item,
              orderIndex,
              updatedAt: now,
            }));
          return { items: reordered, sortMode: "manual" };
        });
        reordered.forEach((bookmark) => {
          markLocalChange(bookmark.id);
          cloudUpsertItem(bookmarkToCloud(bookmark));
        });
      },

      setSortMode: (mode) => set({ sortMode: mode }),
      setGroupByDomain: (enabled) => set({ groupByDomain: enabled }),

      getBookmarkById: (id) => get().items.find((b) => b.id === id),

      resetToDefaults: () => set({ items: createDefaultItems(), sortMode: "manual" }),

      clearAll: () => set({ items: [] }), // 清空所有书签，不恢复默认项
    }),
    {
      name: "kyo:bookmark-store",
      version: 11, // v11: add orderIndex for persistent manual ordering
      migrate: (persisted, version) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const old = persisted as any;

        // v4 以下：数据结构差异太大，直接重置
        if (version < 4) {
          return { items: createDefaultItems(), sortMode: "manual", groupByDomain: false };
        }

        // v5: add metadata fields
        if (version < 5 && old.items) {
          old.items = old.items.map((item: Bookmark) => ({
            ...item,
            summary: item.summary ?? "",
            tags: item.tags ?? [],
            createdAt: item.createdAt ?? new Date().toISOString(),
          }));
        }

        // v6: add onDesktop
        if (version < 6 && old.items) {
          old.items = old.items.map((item: Bookmark) => ({
            ...item,
            onDesktop: item.onDesktop ?? false,
          }));
        }

        // v7: add inDock
        if (version < 7 && old.items) {
          const dockBookmarkIds = new Set<string>();
          try {
            const raw = localStorage.getItem("kyo:dock-storage");
            if (raw) {
              const parsed = JSON.parse(raw);
              for (const item of parsed?.state?.pinnedItems ?? []) {
                if (item.type === "bookmark" && item.id) dockBookmarkIds.add(item.id);
              }
            }
          } catch { /* noop */ }
          old.items = old.items.map((item: Bookmark) => ({
            ...item,
            inDock: dockBookmarkIds.has(item.id),
          }));
        }

        // v8: 展平文件夹 + 添加 lastUsed
        if (version < 8 && old.items) {
          const flat: Bookmark[] = [];
          for (const item of old.items) {
            if (isLegacyFolder(item)) {
              flat.push(...item.bookmarks.map((b: Bookmark) => ({ ...b, lastUsed: b.lastUsed })));
            } else {
              flat.push({ ...(item as Bookmark), lastUsed: (item as Bookmark).lastUsed });
            }
          }
          old.items = flat;
          old.sortMode = old.sortMode ?? "recent";
          old.groupByDomain = old.groupByDomain ?? false;
        }

        // v9: add updatedAt
        if (version < 9 && old.items) {
          old.items = old.items.map((item: Bookmark) => ({
            ...item,
            updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
          }));
        }

        // v10: base64 favicon → URL，删除 faviconResolved
        if (version < 10 && old.items) {
          old.items = old.items.map((item: Bookmark & { faviconResolved?: boolean }) => {
            const { faviconResolved: _, ...rest } = item;
            // base64 data URI → 从 URL 重新生成 Icon Horse URL
            if (rest.favicon?.startsWith("data:")) {
              try {
                const hostname = new URL(rest.url).hostname;
                rest.favicon = getFaviconUrl(hostname);
              } catch {
                delete rest.favicon;
              }
            }
            return rest;
          });
        }

        if (version < 11 && old.items) {
          old.items = old.items.map((item: Bookmark, orderIndex: number) => ({
            ...item,
            orderIndex: item.orderIndex ?? orderIndex,
          }));
          old.sortMode = old.sortMode ?? "manual";
        }

        return persisted as BookmarkStore;
      },
    }
  )
);
