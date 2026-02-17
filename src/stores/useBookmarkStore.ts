/**
 * [INPUT]: zustand + zustand/middleware(persist)
 * [OUTPUT]: useBookmarkStore, Bookmark, BookmarkFolder, BoardItem, isFolder, isBookmark, openBookmarkUrl
 * [POS]: 书签数据的单一真相源，被 bookmark-board 和 Dock 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

const generateId = () => crypto.randomUUID();

// ─── Favicon 服务选择 ─────────────────────────────────────────────────────────
// 根据用户地理位置选择最快的 favicon 服务
// 国内: cccyun (快) | 国外: Google (快)

const FAVICON_REGION_KEY = "kyo:favicon-region";

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
  "github.com": "https://github.githubassets.com/favicons/favicon.svg",
  "discord.com": "https://discord.com/assets/847541504914fd33810e70a0ea73177e.ico",
  "reddit.com": "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
  "www.reddit.com": "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
  "instagram.com": "https://static.cdninstagram.com/rsrc.php/v3/yG/r/De-Dwpd5CHc.png",
  "www.instagram.com": "https://static.cdninstagram.com/rsrc.php/v3/yG/r/De-Dwpd5CHc.png",
  "tiktok.com": "https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/tiktok/webapp/main/webapp-desktop/8152caf0c8e8bc67ae0d.png",
  "www.tiktok.com": "https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/tiktok/webapp/main/webapp-desktop/8152caf0c8e8bc67ae0d.png",
};

// 检测用户是否在中国（通过 IP 检测 API）
async function detectRegion(): Promise<"cn" | "global"> {
  try {
    // 先检查缓存
    const cached = localStorage.getItem(FAVICON_REGION_KEY);
    if (cached === "cn" || cached === "global") return cached;
    
    // 用 Cloudflare 的 /cdn-cgi/trace 检测，免费且快
    const res = await fetch("https://cloudflare.com/cdn-cgi/trace", { 
      signal: AbortSignal.timeout(3000) 
    });
    const text = await res.text();
    const locMatch = text.match(/loc=(\w+)/);
    const region = locMatch?.[1] === "CN" ? "cn" : "global";
    
    // 缓存结果
    localStorage.setItem(FAVICON_REGION_KEY, region);
    return region;
  } catch {
    // 检测失败默认用国际线路
    return "global";
  }
}

// 同步获取 favicon URL（使用缓存的地区设置）
function getFaviconUrl(domain: string): string {
  // 1. 先检查硬编码映射（高清图标优先）
  const override = FAVICON_OVERRIDES[domain];
  if (override) return override;
  
  // 2. 尝试提取主域名再查一次（处理 www.xxx.com 情况）
  const mainDomain = domain.replace(/^www\./, "");
  const mainOverride = FAVICON_OVERRIDES[mainDomain];
  if (mainOverride) return mainOverride;
  
  // 3. fallback 到 favicon 服务
  const cached = localStorage.getItem(FAVICON_REGION_KEY);
  if (cached === "cn") {
    return `https://favicon.cccyun.cc/${domain}`;
  }
  // 国际线路用 Google
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

// 初始化地区检测（在模块加载时执行一次）
if (typeof window !== "undefined") {
  detectRegion();
}

// 导出给其他模块使用
export { getFaviconUrl };

const fav = (domain: string) => getFaviconUrl(domain);

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
export function openBookmarkUrl(url: string): void {
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
  onDesktop?: boolean; // 是否显示在桌面
  favicon?: string; // 保留兼容性
  icon?: BookmarkIcon; // 新的图标配置
}

export interface BookmarkFolder {
  id: string;
  title: string;
  bookmarks: Bookmark[];
}

export type BoardItem = Bookmark | BookmarkFolder;

export const isFolder = (item: BoardItem): item is BookmarkFolder =>
  "bookmarks" in item;

export const isBookmark = (item: BoardItem): item is Bookmark =>
  !("bookmarks" in item);

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

// ─── 创建带 ID 的书签 ─────────────────────────────────────────────────────────

const createBookmark = (
  title: string,
  url: string,
  favicon?: string,
  meta?: { summary?: string; tags?: string[]; createdAt?: string; onDesktop?: boolean }
): Bookmark => ({
  id: generateId(),
  title,
  url,
  summary: meta?.summary ?? "",
  tags: meta?.tags ?? [],
  createdAt: meta?.createdAt ?? new Date().toISOString(),
  onDesktop: meta?.onDesktop ?? false,
  favicon: favicon || fav(new URL(url).hostname),
});

const createFolder = (title: string, bookmarks: Bookmark[] = []): BookmarkFolder => ({
  id: generateId(),
  title,
  bookmarks,
});

// ─── 默认数据 ───────────────────────────────────────────────────────────────

const createDefaultItems = (): BoardItem[] => [
  createBookmark("AI探索站", "https://web.okjike.com/topic/63579abb6724cc583b9bba9a/square"),
  createBookmark("小红书", "https://xiaohongshu.com"),
  createBookmark("Notion", "https://notion.so"),
  createBookmark("X", "https://x.com"),
  createBookmark("网易云音乐", "https://music.163.com"),
  createBookmark("哔哩哔哩", "https://bilibili.com"),
  createBookmark("Flomo", "https://flomoapp.com"),
  createBookmark("YouMind", "https://youmind.com", "/icons/favicons/youmind.png"),
  createBookmark("豆瓣", "https://douban.com"),
  createBookmark("GitHub", "https://github.com"),
];

// ─── Store ───────────────────────────────────────────────────────────────────

interface BookmarkStore {
  items: BoardItem[];

  // 基础 CRUD
  addBookmark: (title: string, url: string, favicon?: string, folderId?: string, options?: { onDesktop?: boolean }) => string; // 返回新书签 ID
  addAiBookmark: (title: string, url: string, summary: string, tags: string[], options?: { onDesktop?: boolean }) => string; // AI 写入
  getBookmarkByUrl: (url: string) => Bookmark | undefined;
  updateBookmark: (id: string, updates: Partial<Pick<Bookmark, "title" | "url" | "favicon" | "icon" | "summary" | "tags" | "onDesktop">>) => void;
  removeBookmark: (id: string) => void;
  
  // 文件夹
  addFolder: (title: string) => string; // 返回新文件夹 ID
  renameFolder: (id: string, newTitle: string) => void;
  removeFolder: (id: string) => void;
  
  // 排序
  reorderItems: (fromIndex: number, toIndex: number) => void;
  reorderInFolder: (folderId: string, fromIndex: number, toIndex: number) => void;
  moveBookmarkToFolder: (bookmarkId: string, targetFolderId: string | null) => void;
  
  // 查询
  getBookmarkById: (id: string) => Bookmark | undefined;
  
  // 重置
  resetToDefaults: () => void;
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      items: createDefaultItems(),

      addBookmark: (title, url, favicon, folderId, options) => {
        const newBookmark = createBookmark(title, url, favicon, {
          onDesktop: options?.onDesktop,
        });
        set((s) => {
          if (!folderId) {
            return { items: [...s.items, newBookmark] };
          }
          return {
            items: s.items.map((item) =>
              isFolder(item) && item.id === folderId
                ? { ...item, bookmarks: [...item.bookmarks, newBookmark] }
                : item
            ),
          };
        });
        return newBookmark.id;
      },

      addAiBookmark: (title, url, summary, tags, options) => {
        let hostname = "example.com";
        try {
          hostname = new URL(url).hostname;
        } catch { /* noop */ }
        const favicon = getFaviconUrl(hostname);
        const newBookmark = createBookmark(title, url, favicon, {
          summary,
          tags,
          createdAt: new Date().toISOString(),
          onDesktop: options?.onDesktop,
        });
        set((s) => ({ items: [...s.items, newBookmark] }));
        return newBookmark.id;
      },

      getBookmarkByUrl: (url) => {
        for (const item of get().items) {
          if (isBookmark(item) && item.url === url) return item;
          if (isFolder(item)) {
            const found = item.bookmarks.find((b) => b.url === url);
            if (found) return found;
          }
        }
        return undefined;
      },

      updateBookmark: (id, updates) =>
        set((s) => ({
          items: s.items.map((item) => {
            if (isBookmark(item) && item.id === id) {
              return { ...item, ...updates };
            }
            if (isFolder(item)) {
              return {
                ...item,
                bookmarks: item.bookmarks.map((b) =>
                  b.id === id ? { ...b, ...updates } : b
                ),
              };
            }
            return item;
          }),
        })),

      removeBookmark: (id) =>
        set((s) => ({
          items: s.items
            .filter((item) => !(isBookmark(item) && item.id === id))
            .map((item) =>
              isFolder(item)
                ? { ...item, bookmarks: item.bookmarks.filter((b) => b.id !== id) }
                : item
            ),
        })),

      addFolder: (title) => {
        const newFolder = createFolder(title);
        set((s) => ({ items: [...s.items, newFolder] }));
        return newFolder.id;
      },

      renameFolder: (id, newTitle) =>
        set((s) => ({
          items: s.items.map((item) =>
            isFolder(item) && item.id === id ? { ...item, title: newTitle } : item
          ),
        })),

      removeFolder: (id) =>
        set((s) => ({ items: s.items.filter((i) => !(isFolder(i) && i.id === id)) })),

      reorderItems: (fromIndex, toIndex) =>
        set((s) => {
          const newItems = [...s.items];
          const [moved] = newItems.splice(fromIndex, 1);
          newItems.splice(toIndex, 0, moved);
          return { items: newItems };
        }),

      reorderInFolder: (folderId, fromIndex, toIndex) =>
        set((s) => ({
          items: s.items.map((item) => {
            if (isFolder(item) && item.id === folderId) {
              const newBookmarks = [...item.bookmarks];
              const [moved] = newBookmarks.splice(fromIndex, 1);
              newBookmarks.splice(toIndex, 0, moved);
              return { ...item, bookmarks: newBookmarks };
            }
            return item;
          }),
        })),

      moveBookmarkToFolder: (bookmarkId, targetFolderId) =>
        set((s) => {
          // 先找到书签
          let bookmarkToMove: Bookmark | undefined;
          
          // 在顶层找
          const topLevelBookmark = s.items.find(
            (i) => isBookmark(i) && i.id === bookmarkId
          ) as Bookmark | undefined;
          
          if (topLevelBookmark) {
            bookmarkToMove = topLevelBookmark;
          } else {
            // 在文件夹中找
            for (const item of s.items) {
              if (isFolder(item)) {
                const found = item.bookmarks.find((b) => b.id === bookmarkId);
                if (found) {
                  bookmarkToMove = found;
                  break;
                }
              }
            }
          }
          
          if (!bookmarkToMove) return s;
          
          // 从原位置移除
          let newItems = s.items
            .filter((i) => !(isBookmark(i) && i.id === bookmarkId))
            .map((item) =>
              isFolder(item)
                ? { ...item, bookmarks: item.bookmarks.filter((b) => b.id !== bookmarkId) }
                : item
            );
          
          // 添加到目标位置
          if (targetFolderId) {
            newItems = newItems.map((item) =>
              isFolder(item) && item.id === targetFolderId
                ? { ...item, bookmarks: [...item.bookmarks, bookmarkToMove!] }
                : item
            );
          } else {
            newItems = [...newItems, bookmarkToMove];
          }
          
          return { items: newItems };
        }),

      getBookmarkById: (id) => {
        const state = get();
        // 在顶层找
        const topLevel = state.items.find(
          (i) => isBookmark(i) && i.id === id
        ) as Bookmark | undefined;
        if (topLevel) return topLevel;
        
        // 在文件夹中找
        for (const item of state.items) {
          if (isFolder(item)) {
            const found = item.bookmarks.find((b) => b.id === id);
            if (found) return found;
          }
        }
        return undefined;
      },

      resetToDefaults: () => set({ items: createDefaultItems() }),
    }),
    {
      name: "kyo:bookmark-store",
      version: 6, // v6: add onDesktop flag
      migrate: (persisted, version) => {
        const old = persisted as { items?: BoardItem[] };
        
        // 从 v1 迁移：给旧数据加 id
        if (version < 2) {
          if (old.items) {
            old.items = old.items.map((item) => {
              if (isFolder(item)) {
                return {
                  ...item,
                  id: (item as BookmarkFolder).id || generateId(),
                  bookmarks: item.bookmarks.map((b) => ({
                    ...b,
                    id: (b as Bookmark).id || generateId(),
                  })),
                };
              }
              return {
                ...item,
                id: (item as Bookmark).id || generateId(),
              };
            });
          }
        }
        
        // 从 v2 迁移：把旧 favicon URL 换成根据地区选择的服务
        if (version < 3) {
          const migrateFavicon = (favicon?: string): string | undefined => {
            if (!favicon) return favicon;
            // 匹配 Google favicon API URL
            const googleMatch = favicon.match(/google\.com\/s2\/favicons\?domain=([^&]+)/);
            if (googleMatch) {
              const domain = googleMatch[1];
              return getFaviconUrl(domain);
            }
            // 匹配 DuckDuckGo favicon API URL (以防中间版本用过)
            const ddgMatch = favicon.match(/icons\.duckduckgo\.com\/ip3\/([^.]+\.?[^/]*?)\.ico/);
            if (ddgMatch) {
              const domain = ddgMatch[1];
              return getFaviconUrl(domain);
            }
            // 匹配 cccyun favicon URL (国外用户需要换成 Google)
            const cccyunMatch = favicon.match(/favicon\.cccyun\.cc\/(.+)/);
            if (cccyunMatch) {
              const domain = cccyunMatch[1];
              return getFaviconUrl(domain);
            }
            return favicon;
          };
          
          if (old.items) {
            old.items = old.items.map((item) => {
              if (isFolder(item)) {
                return {
                  ...item,
                  bookmarks: item.bookmarks.map((b) => ({
                    ...b,
                    favicon: migrateFavicon(b.favicon),
                  })),
                };
              }
              return {
                ...item,
                favicon: migrateFavicon((item as Bookmark).favicon),
              } as Bookmark;
            });
          }
        }
        
        // v4: 重置为新默认书签
        if (version < 4) {
          return { items: createDefaultItems() };
        }

        // v5: add ai metadata fields
        if (version < 5) {
          if (old.items) {
            old.items = old.items.map((item) => {
              if (isFolder(item)) {
                return {
                  ...item,
                  bookmarks: item.bookmarks.map((b) => ({
                    ...b,
                    summary: (b as Bookmark).summary ?? "",
                    tags: (b as Bookmark).tags ?? [],
                    createdAt: (b as Bookmark).createdAt ?? new Date().toISOString(),
                  })),
                };
              }
              return {
                ...item,
                summary: (item as Bookmark).summary ?? "",
                tags: (item as Bookmark).tags ?? [],
                createdAt: (item as Bookmark).createdAt ?? new Date().toISOString(),
              } as Bookmark;
            });
          }
        }

        // v6: add onDesktop flag (default false for existing data)
        if (version < 6) {
          if (old.items) {
            old.items = old.items.map((item) => {
              if (isFolder(item)) {
                return {
                  ...item,
                  bookmarks: item.bookmarks.map((b) => ({
                    ...b,
                    onDesktop: (b as Bookmark).onDesktop ?? false,
                  })),
                };
              }
              return {
                ...item,
                onDesktop: (item as Bookmark).onDesktop ?? false,
              } as Bookmark;
            });
          }
        }
        
        return persisted as BookmarkStore;
      },
    }
  )
);
