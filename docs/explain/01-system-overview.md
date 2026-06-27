# Kyo.is 系统全局概览

> 写给不懂技术的你：这份文档用图表带你看清整个系统的「骨架」。

---

## 一句话理解 Kyo.is

**Kyo.is 是一个运行在浏览器里的「迷你操作系统」**——它模拟了 macOS / Windows XP / Windows 98 的桌面体验，让用户可以在网页上管理书签、写便签、和 AI 聊天、听白噪音。

---

## 系统全景图

```mermaid
graph TB
    subgraph 用户看到的界面["🖥️ 用户看到的界面"]
        Desktop["桌面<br/>壁纸 + 应用图标 + 书签"]
        MenuBar["顶部菜单栏<br/>苹果菜单 + 应用菜单 + 时钟"]
        Dock["底部应用栏<br/>应用图标 + 书签快捷方式"]
        Windows["应用窗口<br/>可拖拽、缩放、最小化"]
        Stickies["便签<br/>浮在桌面上的笔记"]
    end

    subgraph 六大应用["📱 六大应用"]
        Bookmarks["📚 书签管理<br/>收藏网站、分类整理"]
        Chat["💬 AI 聊天<br/>和 AI 对话、图片识别"]
        ControlPanels["⚙️ 系统设置<br/>主题、壁纸、音量"]
        StickiesApp["📝 便签管理<br/>创建、编辑、删除便签"]
        History["📜 历史记录<br/>时间线查看所有操作"]
        WhiteNoise["🎵 白噪音<br/>雨声、海浪、森林"]
    end

    subgraph 幕后系统["🔧 幕后系统"]
        AppManager["应用管理器<br/>控制所有窗口的生死"]
        StateManager["状态管理<br/>记住你的所有操作"]
        CloudSync["云端同步<br/>数据跨设备保存"]
        ThemeEngine["主题引擎<br/>切换 macOS / XP / 98 外观"]
        AudioEngine["音频引擎<br/>系统音效 + 白噪音"]
    end

    Desktop --> Windows
    MenuBar --> Windows
    Dock --> Windows
    Windows --> Bookmarks & Chat & ControlPanels & StickiesApp & History & WhiteNoise
    Bookmarks & Chat & ControlPanels & StickiesApp & History & WhiteNoise --> AppManager
    AppManager --> StateManager
    StateManager --> CloudSync
    ControlPanels --> ThemeEngine
    WhiteNoise --> AudioEngine
```

---

## 系统分层架构

把 Kyo.is 想象成一栋五层楼的建筑，每层都有明确的职责：

```mermaid
graph TB
    subgraph L5["第5层 — 用户界面（你看到的一切）"]
        direction LR
        UI1["桌面 Desktop"]
        UI2["菜单栏 MenuBar"]
        UI3["应用栏 Dock"]
        UI4["窗口框架 WindowFrame"]
        UI5["各种弹窗 Dialogs"]
    end

    subgraph L4["第4层 — 六大应用（功能模块）"]
        direction LR
        A1["📚 书签"]
        A2["💬 聊天"]
        A3["⚙️ 设置"]
        A4["📝 便签"]
        A5["📜 历史"]
        A6["🎵 白噪音"]
    end

    subgraph L3["第3层 — 交互逻辑（Hooks 层）"]
        direction LR
        H1["窗口拖拽<br/>useWindowManager"]
        H2["应用启动<br/>useLaunchApp"]
        H3["粘贴处理<br/>usePasteHandler"]
        H4["音效播放<br/>useSound"]
        H5["手势识别<br/>useSwipeNavigation"]
    end

    subgraph L2["第2层 — 状态管理（数据中心）"]
        direction LR
        S1["应用状态<br/>useAppStore"]
        S2["书签数据<br/>useBookmarkStore"]
        S3["便签数据<br/>useStickiesStore"]
        S4["主题设置<br/>useThemeStore"]
        S5["认证信息<br/>useAuthStore"]
    end

    subgraph L1["第1层 — 数据存储（持久化层）"]
        direction LR
        D1["浏览器本地<br/>localStorage"]
        D2["大文件存储<br/>IndexedDB"]
        D3["云端数据库<br/>Supabase"]
        D4["后端 API<br/>Cloudflare Worker"]
    end

    L5 --> L4
    L4 --> L3
    L3 --> L2
    L2 --> L1

    style L5 fill:#E8F5E9,stroke:#4CAF50
    style L4 fill:#E3F2FD,stroke:#2196F3
    style L3 fill:#FFF3E0,stroke:#FF9800
    style L2 fill:#F3E5F5,stroke:#9C27B0
    style L1 fill:#FFEBEE,stroke:#F44336
```

---

## 六大应用功能速览

```mermaid
graph LR
    subgraph 书签管理["📚 书签管理"]
        B1["收藏网站链接"]
        B2["自动抓取网站标题和图标"]
        B3["AI 生成摘要和标签"]
        B4["拖拽排序"]
        B5["放到桌面当快捷方式"]
        B6["固定到 Dock 栏"]
    end

    subgraph AI聊天["💬 AI 聊天"]
        C1["和 AI 自由对话"]
        C2["发送图片让 AI 识别"]
        C3["流式实时回复"]
        C4["多轮对话记忆"]
        C5["从搜索栏快速提问"]
    end

    subgraph 系统设置["⚙️ 系统设置"]
        P1["切换主题外观"]
        P2["更换桌面壁纸"]
        P3["调节系统音量"]
        P4["切换界面语言"]
        P5["备份和恢复设置"]
    end

    subgraph 便签["📝 便签"]
        N1["创建多张便签"]
        N2["选择便签颜色"]
        N3["随意拖动位置"]
        N4["调整便签大小"]
        N5["便签始终浮在桌面"]
    end

    subgraph 历史记录["📜 历史记录"]
        H1["按时间线展示所有操作"]
        H2["今天 / 昨天 / 本周分组"]
        H3["全文搜索"]
        H4["已删除项目也能看到"]
    end

    subgraph 白噪音["🎵 白噪音"]
        W1["🌧️ 雨声"]
        W2["🌊 海浪"]
        W3["🌲 森林"]
        W4["🔥 篝火"]
        W5["💨 风声"]
        W6["实时音频频谱动画"]
    end
```

---

## 三套主题对比

Kyo.is 支持三种完全不同的「操作系统外观」：

```mermaid
graph TB
    subgraph macOS["🍎 macOS Aqua 风格"]
        direction TB
        M1["顶部菜单栏（半透明）"]
        M2["窗口左上角红黄绿按钮"]
        M3["底部 Dock 带磁性放大"]
        M4["圆角窗口 + 阴影"]
    end

    subgraph WinXP["🪟 Windows XP 风格"]
        direction TB
        X1["底部任务栏 + 开始按钮"]
        X2["窗口右上角最小化/最大化/关闭"]
        X3["Luna 蓝色主题"]
        X4["经典 XP 窗口边框"]
    end

    subgraph Win98["💾 Windows 98 风格"]
        direction TB
        W1["底部任务栏 + 开始按钮"]
        W2["3D 凸起按钮效果"]
        W3["灰色经典配色"]
        W4["像素风格界面"]
    end

    ThemeSwitch["用户在设置中<br/>一键切换主题"] --> macOS & WinXP & Win98

    style macOS fill:#E8F5E9,stroke:#4CAF50
    style WinXP fill:#E3F2FD,stroke:#2196F3
    style Win98 fill:#ECEFF1,stroke:#607D8B
```

---

## 数据在哪里保存？

```mermaid
graph TB
    subgraph 本地存储["💾 浏览器本地（关浏览器不丢）"]
        LS1["应用窗口位置和大小"]
        LS2["主题选择"]
        LS3["音量设置"]
        LS4["Dock 栏配置"]
        LS5["书签列表（离线备份）"]
        LS6["便签列表（离线备份）"]
        LS7["语言偏好"]
    end

    subgraph IndexedDB["📦 大容量存储"]
        IDB1["自定义壁纸图片"]
    end

    subgraph 云端["☁️ 云端数据库（跨设备同步）"]
        Cloud1["书签数据"]
        Cloud2["便签数据"]
        Cloud3["链接元数据缓存"]
        Cloud4["用户认证信息"]
    end

    User["👤 用户"] -->|登录前| 本地存储
    User -->|登录前| IndexedDB
    User -->|登录后| 云端
    云端 <-->|自动同步| 本地存储

    style 本地存储 fill:#FFF9C4,stroke:#FBC02D
    style IndexedDB fill:#FFE0B2,stroke:#FF9800
    style 云端 fill:#BBDEFB,stroke:#1976D2
```

---

## 核心模块依赖关系

谁依赖谁？一张图看清楚：

```mermaid
graph TD
    AppManager["🎯 应用管理器<br/>AppManager<br/>掌控所有窗口"]

    AppManager --> Bookmarks["📚 书签"]
    AppManager --> Chat["💬 聊天"]
    AppManager --> ControlPanels["⚙️ 设置"]
    AppManager --> StickiesApp["📝 便签管理"]
    AppManager --> History["📜 历史"]
    AppManager --> WhiteNoise["🎵 白噪音"]

    Bookmarks --> BookmarkStore["书签数据库"]
    StickiesApp --> StickiesStore["便签数据库"]
    ControlPanels --> ThemeStore["主题设置"]
    ControlPanels --> DisplayStore["显示设置"]
    Chat --> ChatAPI["AI 聊天接口"]

    History --> BookmarkStore
    History --> StickiesStore

    BookmarkStore --> CloudSync["☁️ 云端同步"]
    StickiesStore --> CloudSync

    CloudSync --> AuthStore["🔐 用户认证"]

    Desktop["🖥️ 桌面"] --> BookmarkStore
    Dock["⬇️ 应用栏"] --> BookmarkStore

    ThemeStore -->|影响外观| Desktop & Dock & AppManager

    style AppManager fill:#E8EAF6,stroke:#3F51B5,stroke-width:3px
    style CloudSync fill:#BBDEFB,stroke:#1976D2
    style AuthStore fill:#C8E6C9,stroke:#388E3C
```

---

## 支持的平台和入口

```mermaid
graph LR
    subgraph 访问方式["用户如何使用 Kyo.is"]
        Web["🌐 网页版<br/>kyo.is 直接访问"]
        PWA["📱 PWA<br/>添加到手机主屏幕"]
        Extension["🧩 Chrome 扩展<br/>新标签页 + 一键收藏"]
        Tauri["🖥️ 桌面应用<br/>Tauri 独立客户端"]
    end

    subgraph 适配["自动适配"]
        DesktopMode["桌面模式<br/>完整窗口系统"]
        MobileMode["移动模式<br/>全屏应用 + 分页滑动"]
    end

    Web --> DesktopMode
    Web --> MobileMode
    PWA --> MobileMode
    Extension --> DesktopMode
    Tauri --> DesktopMode

    style Web fill:#E8F5E9
    style PWA fill:#FFF3E0
    style Extension fill:#E3F2FD
    style Tauri fill:#F3E5F5
```

---

## 国际化语言支持

```mermaid
pie title 支持的语言
    "🇨🇳 简体中文（默认）" : 30
    "🇺🇸 English" : 25
    "🇹🇼 繁體中文" : 15
    "🇯🇵 日本語" : 15
    "🇰🇷 한국어" : 15
```

---

## 后端服务一览

```mermaid
graph TB
    subgraph API端点["🔌 后端 API 端点"]
        ChatAPI["/api/agent/chat<br/>Agent 聊天"]
        ScrapeAPI["/api/scrape<br/>网页信息抓取"]
        SaveAPI["/api/save<br/>保存书签/便签"]
        SearchAPI["/api/search<br/>全文搜索"]
        SyncAPI["/api/sync<br/>数据同步"]
        ItemsAPI["/api/items<br/>单条编辑/删除"]
        AudioAPI["/api/audio-transcribe<br/>语音转文字"]
    end

    subgraph 外部服务["🌍 外部服务"]
        Mastra["Mastra Agent<br/>工具编排"]
        DeepSeek["DeepSeek<br/>聊天 + 摘要生成"]
        Supabase["Supabase<br/>数据库 + 认证 + 实时推送"]
        Google["Google OAuth<br/>用户登录"]
        LinkMeta["LinkMeta API<br/>网页元数据"]
        STT["STT Provider<br/>待配置"]
    end

    ChatAPI --> Mastra --> DeepSeek
    ScrapeAPI --> DeepSeek & LinkMeta
    SaveAPI --> Supabase
    SearchAPI --> Supabase
    SyncAPI --> Supabase
    ItemsAPI --> Supabase
    AudioAPI -.-> STT

    style API端点 fill:#E8EAF6,stroke:#3F51B5
    style 外部服务 fill:#FFF3E0,stroke:#FF9800
```

---

## 总结：Kyo.is 的产品定位

```mermaid
mindmap
  root((Kyo.is))
    🎯 核心价值
      在浏览器里重现桌面操作系统体验
      让网页书签管理变得有趣
      AI 驱动的智能助手
    👤 目标用户
      喜欢怀旧操作系统的人
      需要管理大量书签的人
      想要个性化新标签页的人
    🏗️ 技术亮点
      三套主题一键切换
      离线优先 + 云端同步
      多窗口多实例系统
      响应式移动端适配
    📱 使用场景
      浏览器新标签页
      书签收藏整理
      AI 快速提问
      白噪音专注
```

---

> **下一篇**: [02-app-lifecycle.md](./02-app-lifecycle.md) — 深入了解一个应用从「点击图标」到「关闭窗口」的完整生命周期
