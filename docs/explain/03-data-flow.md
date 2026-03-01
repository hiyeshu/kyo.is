# 数据流转：书签、便签、链接的一生

> 写给不懂技术的你：数据是怎么被创建、保存、同步到云端的？

---

## 数据的三大主角

```mermaid
graph LR
    subgraph 三种核心数据["📦 系统中的三种核心数据"]
        Bookmark["📚 书签<br/>收藏的网站链接<br/>有标题、图标、摘要、标签"]
        StickyNote["📝 便签<br/>用户写的笔记<br/>有内容、颜色、位置"]
        LinkMeta["🔗 链接元数据<br/>网站的预览信息<br/>标题、描述、缩略图"]
    end

    style Bookmark fill:#E3F2FD,stroke:#1976D2
    style StickyNote fill:#FFF9C4,stroke:#FBC02D
    style LinkMeta fill:#E8F5E9,stroke:#4CAF50
```

---

## 一、书签的完整生命周期

### 1.1 创建书签的三种方式

```mermaid
graph TB
    subgraph 创建方式["📚 创建书签的三种方式"]
        Way1["方式一：手动添加<br/>点击 + 按钮，输入网址"]
        Way2["方式二：粘贴链接<br/>在桌面上按 Cmd+V"]
        Way3["方式三：Chrome 扩展<br/>在任意网页点击收藏按钮"]
    end

    Way1 --> Dialog["弹出「添加网站」对话框"]
    Way2 --> Dialog
    Way3 --> Dialog

    Dialog --> Scrape["自动抓取网站信息"]
    Scrape --> Preview["显示预览<br/>标题 + 图标 + 描述"]
    Preview --> Save["用户点击保存"]
    Save --> Store["写入书签数据库"]
    Store --> Sync["同步到云端"]
    Store --> Desktop["显示在桌面/Dock"]

    style Dialog fill:#E8EAF6,stroke:#3F51B5
```

### 1.2 粘贴链接的详细流程

这是最有趣的流程——用户只需要粘贴一个网址，系统就会自动完成所有事情：

```mermaid
sequenceDiagram
    actor 用户
    participant 粘贴监听 as usePasteHandler
    participant 书签数据库 as useBookmarkStore
    participant 缓存 as useLinkMetaStore
    participant 后端 as /api/scrape
    participant AI as Dify AI
    participant 外部 as LinkMeta API
    participant 云端 as Supabase

    用户->>粘贴监听: 按 Cmd+V 粘贴网址
    粘贴监听->>粘贴监听: 检测到是 URL 格式 ✓

    粘贴监听->>书签数据库: 这个网址已经收藏过了吗？
    书签数据库-->>粘贴监听: 没有，是新的

    粘贴监听->>书签数据库: 先创建一个基础书签（只有 URL）
    书签数据库->>云端: 同步到云端

    Note over 粘贴监听, 外部: 开始抓取网站信息（三层缓存策略）

    粘贴监听->>缓存: 第1层：本地缓存有这个网址的信息吗？
    缓存-->>粘贴监听: 没有 ❌

    粘贴监听->>后端: 第2层：请求后端抓取
    后端->>云端: 云端数据库有缓存吗？
    云端-->>后端: 没有 ❌

    后端->>外部: 第3层：调用外部 API 抓取网页
    外部-->>后端: 返回：标题、描述、图标、缩略图

    后端->>AI: 请 AI 生成摘要和标签
    AI-->>后端: 返回：一句话摘要 + 3-5 个标签

    后端->>云端: 缓存到云端数据库（下次不用再抓）
    后端-->>粘贴监听: 返回完整的网站信息

    粘贴监听->>缓存: 写入本地缓存
    粘贴监听->>书签数据库: 更新书签（补充标题、图标、摘要、标签）
    书签数据库->>云端: 同步更新到云端

    书签数据库-->>用户: 桌面上出现完整的书签卡片 ✨
```

### 1.3 三层缓存策略

为什么要三层缓存？因为抓取网站信息很慢（需要访问外部网站 + AI 生成摘要），缓存可以让重复访问瞬间完成：

```mermaid
graph TB
    Request["请求网站信息<br/>fetchLinkMeta(url)"]

    Request --> L1{"第1层<br/>本地缓存<br/>（浏览器内存）"}
    L1 -->|命中 ✅| Return1["立即返回<br/>⚡ 0ms"]
    L1 -->|未命中 ❌| L2{"第2层<br/>云端缓存<br/>（Supabase 数据库）"}

    L2 -->|命中 ✅| Return2["从云端读取<br/>⏱️ ~200ms"]
    L2 -->|未命中 ❌| L3{"第3层<br/>外部 API<br/>（实时抓取网页）"}

    L3 --> Fetch["抓取网页内容"]
    Fetch --> AI["AI 生成摘要"]
    AI --> Return3["返回结果<br/>⏱️ ~2-5秒"]

    Return2 --> WriteL1["写入本地缓存"]
    Return3 --> WriteL2["写入云端缓存"]
    WriteL2 --> WriteL1

    style L1 fill:#E8F5E9,stroke:#4CAF50
    style L2 fill:#E3F2FD,stroke:#1976D2
    style L3 fill:#FFF3E0,stroke:#FF9800
    style Return1 fill:#C8E6C9
    style Return2 fill:#BBDEFB
    style Return3 fill:#FFE0B2
```

### 1.4 书签数据的存储位置

```mermaid
graph TB
    Bookmark["📚 一条书签数据"]

    Bookmark --> Local["💾 浏览器本地<br/>localStorage<br/>键名: kyo:bookmarks"]
    Bookmark --> Cloud["☁️ 云端数据库<br/>Supabase kyo_items 表"]

    Local --> Desktop["🖥️ 桌面图标<br/>如果 onDesktop = true"]
    Local --> Dock["⬇️ Dock 栏<br/>如果 inDock = true"]
    Local --> BookmarkApp["📚 书签应用<br/>卡片列表"]
    Local --> History["📜 历史记录<br/>创建时间线"]

    Cloud --> OtherDevice["📱 其他设备<br/>登录后自动同步"]

    style Local fill:#FFF9C4,stroke:#FBC02D
    style Cloud fill:#BBDEFB,stroke:#1976D2
```

### 1.5 书签的数据结构（简化版）

```mermaid
classDiagram
    class 书签 {
        id: 唯一标识
        url: 网站地址
        title: 网站标题
        summary: AI 生成的摘要
        favicon: 网站图标地址
        tags: 标签列表
        onDesktop: 是否显示在桌面
        inDock: 是否固定在 Dock
        createdAt: 创建时间
        updatedAt: 更新时间
    }
```

---

## 二、便签的完整生命周期

### 2.1 创建便签

```mermaid
sequenceDiagram
    actor 用户
    participant 便签管理器 as StickiesApp
    participant 便签数据库 as useStickiesStore
    participant 便签层 as StickyNotesLayer
    participant 云端 as Supabase

    用户->>便签管理器: 点击菜单「新建便签」
    便签管理器->>便签数据库: addNote()

    便签数据库->>便签数据库: 生成唯一 ID
    便签数据库->>便签数据库: 设置默认颜色（黄色）
    便签数据库->>便签数据库: 计算初始位置（避免重叠）

    便签数据库->>便签层: 数据变化通知
    便签层-->>用户: 新便签出现在桌面上 ✨

    便签数据库->>云端: 同步到云端（延迟 500ms）

    用户->>便签层: 在便签上输入文字
    便签层->>便签数据库: updateNote(id, content)
    便签数据库->>云端: 同步更新（延迟 500ms）
```

### 2.2 便签的交互操作

```mermaid
graph TB
    subgraph 便签操作["📝 便签可以做什么"]
        Edit["✏️ 编辑内容<br/>直接在便签上打字"]
        Move["🔄 拖拽移动<br/>按住便签顶部拖动"]
        Resize["↔️ 调整大小<br/>拖动便签右下角"]
        Color["🎨 更换颜色<br/>从菜单选择颜色"]
        Delete["🗑️ 删除便签<br/>点击关闭按钮"]
    end

    subgraph 颜色选择["🎨 可选颜色"]
        Yellow["🟡 黄色（默认）"]
        Blue["🔵 蓝色"]
        Green["🟢 绿色"]
        Pink["🩷 粉色"]
        Purple["🟣 紫色"]
        Gray["⚪ 灰色"]
    end

    Color --> 颜色选择
```

### 2.3 便签 vs 普通应用的数据流差异

```mermaid
graph TB
    subgraph 普通应用数据流["普通应用（如书签）"]
        direction LR
        A1["用户操作"] --> A2["应用组件处理"] --> A3["写入 Store"] --> A4["显示更新"]
    end

    subgraph 便签数据流["便签（特殊双通道）"]
        direction LR
        B1["用户操作"]
        B1 --> B2a["便签管理器<br/>（菜单操作）"]
        B1 --> B2b["便签层<br/>（直接交互）"]
        B2a --> B3["写入 Store"]
        B2b --> B3
        B3 --> B4a["便签层更新<br/>（始终可见）"]
        B3 --> B4b["管理器更新<br/>（如果打开的话）"]
    end

    style 便签数据流 fill:#FFF9C4,stroke:#FBC02D
```

---

## 三、链接元数据的流转

### 3.1 什么是链接元数据？

当你收藏一个网站时，系统需要知道这个网站的「名片」信息：

```mermaid
graph LR
    URL["https://github.com"] --> Meta["链接元数据"]

    Meta --> Title["标题: GitHub"]
    Meta --> Desc["描述: Where the world builds software"]
    Meta --> Icon["图标: GitHub 的 favicon"]
    Meta --> Image["缩略图: Open Graph 图片"]
    Meta --> Summary["AI 摘要: 全球最大的代码托管平台..."]
    Meta --> Tags["标签: #开发 #开源 #代码"]
```

### 3.2 元数据获取的完整流程

```mermaid
flowchart TB
    Start["用户输入/粘贴一个 URL"]

    Start --> CheckLocal{"本地缓存<br/>有这个 URL 的信息？"}

    CheckLocal -->|有 ✅| UseLocal["直接使用本地缓存<br/>⚡ 瞬间完成"]

    CheckLocal -->|没有 ❌| CallAPI["调用后端 /api/scrape"]

    CallAPI --> CheckDB{"云端数据库<br/>有缓存？"}

    CheckDB -->|有 ✅| UseDB["使用云端缓存<br/>⏱️ ~200ms"]

    CheckDB -->|没有 ❌| FetchExternal["调用 LinkMeta API<br/>实时抓取网页"]

    FetchExternal --> ParseHTML["解析网页 HTML<br/>提取 title / description / og:image"]

    ParseHTML --> CallAI["调用 AI 生成摘要和标签"]

    CallAI --> SaveDB["保存到云端数据库<br/>（下次直接用缓存）"]

    SaveDB --> ReturnResult["返回完整元数据"]

    UseLocal --> Display["显示在界面上"]
    UseDB --> SaveLocal["写入本地缓存"]
    ReturnResult --> SaveLocal
    SaveLocal --> Display

    Display --> ShowCard["书签卡片显示：<br/>标题 + 图标 + 摘要 + 标签"]

    style UseLocal fill:#C8E6C9
    style UseDB fill:#BBDEFB
    style FetchExternal fill:#FFE0B2
    style CallAI fill:#F3E5F5
```

---

## 四、数据同步全景图

### 4.1 本地 → 云端的同步

```mermaid
sequenceDiagram
    participant 本地 as 浏览器本地
    participant Store as Zustand Store
    participant API as 后端 API
    participant 云端 as Supabase 数据库

    Note over 本地, 云端: 用户添加一条书签

    本地->>Store: addBookmark(data)
    Store->>本地: 立即保存到 localStorage ⚡
    Store-->>本地: 界面立即更新 ✅

    Store->>API: POST /api/save
    API->>云端: 检查是否已存在（按 URL 去重）

    alt URL 不存在
        云端->>云端: INSERT 新记录
    else URL 已存在
        云端->>云端: UPDATE 现有记录
    end

    云端-->>API: 保存成功
    API-->>Store: 确认同步完成
```

### 4.2 云端 → 本地的同步

```mermaid
sequenceDiagram
    participant 云端 as Supabase 数据库
    participant 实时推送 as Supabase Realtime
    participant 同步管理 as useSyncStore
    participant 书签Store as useBookmarkStore
    participant 便签Store as useStickiesStore

    Note over 云端, 便签Store: 用户在另一台设备上修改了数据

    云端->>实时推送: 数据变更事件
    实时推送->>同步管理: 推送变更通知

    同步管理->>同步管理: 检查：这是本地刚改的吗？

    alt 是本地刚改的（3秒内）
        同步管理->>同步管理: 忽略，避免重复 ⏭️
    else 是其他设备改的
        同步管理->>书签Store: 更新本地书签数据
        同步管理->>便签Store: 更新本地便签数据
        书签Store-->>同步管理: 界面自动更新 ✅
    end
```

### 4.3 首次登录的数据合并

```mermaid
flowchart TB
    Login["用户首次登录"]

    Login --> Check{"本地已有数据？"}

    Check -->|有本地数据| Push["先把本地数据推到云端<br/>（保护用户已有的收藏）"]
    Push --> Pull["再从云端拉取所有数据"]

    Check -->|没有本地数据| Pull

    Pull --> Merge["合并数据<br/>本地 + 云端 = 完整列表"]

    Merge --> Subscribe["开启实时订阅<br/>后续变更自动同步"]

    Subscribe --> Ready["同步完成 ✅<br/>所有设备数据一致"]

    style Login fill:#E8EAF6,stroke:#3F51B5
    style Ready fill:#C8E6C9,stroke:#4CAF50
```

---

## 五、数据的删除流程

### 5.1 删除书签

```mermaid
sequenceDiagram
    actor 用户
    participant 书签应用 as BookmarkBoard
    participant 书签Store as useBookmarkStore
    participant 历史Store as useHistoryStore
    participant 云端 as Supabase

    用户->>书签应用: 右键 → 删除书签
    书签应用->>书签Store: deleteBookmark(id)

    书签Store->>书签Store: 从列表中移除
    书签Store->>历史Store: 记录删除操作（保留痕迹）
    书签Store->>云端: DELETE /api/items/{id}

    云端-->>书签Store: 删除成功

    Note over 历史Store: 历史记录中仍然可以看到<br/>这条书签曾经存在过（半透明显示）
```

### 5.2 批量删除（桌面框选）

```mermaid
sequenceDiagram
    actor 用户
    participant 桌面 as Desktop
    participant 框选 as useMarqueeSelection
    participant 书签Store as useBookmarkStore

    用户->>桌面: 在桌面空白处按住鼠标拖动
    桌面->>框选: 开始框选

    loop 鼠标移动中
        框选->>框选: 计算框选范围
        框选->>框选: 检测哪些图标在范围内
        框选-->>桌面: 高亮被选中的图标
    end

    用户->>桌面: 松开鼠标
    框选-->>桌面: 返回选中的书签 ID 列表

    用户->>桌面: 按 Delete 键
    桌面->>书签Store: 批量删除选中的书签

    书签Store-->>用户: 桌面图标消失 ✨
```

---

## 六、数据流转总览图

```mermaid
graph TB
    subgraph 用户操作["👤 用户操作"]
        Paste["粘贴链接"]
        Click["点击添加"]
        Edit["编辑内容"]
        Delete["删除"]
        DragDrop["拖拽排序"]
    end

    subgraph 前端处理["🖥️ 前端处理层"]
        PasteHandler["粘贴处理器"]
        Dialog["添加对话框"]
        BookmarkStore["书签数据库"]
        StickiesStore["便签数据库"]
        HistoryStore["历史记录"]
        LinkMetaStore["链接缓存"]
    end

    subgraph 后端API["🔌 后端 API"]
        ScrapeAPI["/api/scrape<br/>抓取网站信息"]
        SaveAPI["/api/save<br/>保存数据"]
        SyncAPI["/api/sync<br/>同步数据"]
        SearchAPI["/api/search<br/>搜索"]
    end

    subgraph 外部服务["🌍 外部服务"]
        DifyAI["Dify AI<br/>生成摘要和标签"]
        LinkMetaAPI["LinkMeta API<br/>抓取网页元数据"]
        SupabaseDB["Supabase<br/>云端数据库"]
        SupabaseRT["Supabase Realtime<br/>实时推送"]
    end

    subgraph 展示层["📺 展示层"]
        DesktopIcons["桌面图标"]
        DockIcons["Dock 栏图标"]
        BookmarkCards["书签卡片列表"]
        StickyNotes["桌面便签"]
        Timeline["历史时间线"]
    end

    Paste --> PasteHandler
    Click --> Dialog
    PasteHandler --> BookmarkStore
    Dialog --> BookmarkStore
    Edit --> BookmarkStore & StickiesStore
    Delete --> BookmarkStore & StickiesStore

    BookmarkStore --> HistoryStore
    StickiesStore --> HistoryStore
    PasteHandler --> LinkMetaStore

    BookmarkStore --> SaveAPI --> SupabaseDB
    StickiesStore --> SaveAPI
    LinkMetaStore --> ScrapeAPI --> DifyAI & LinkMetaAPI

    SupabaseRT --> BookmarkStore & StickiesStore

    BookmarkStore --> DesktopIcons & DockIcons & BookmarkCards
    StickiesStore --> StickyNotes
    HistoryStore --> Timeline

    style 用户操作 fill:#E8F5E9,stroke:#4CAF50
    style 前端处理 fill:#E3F2FD,stroke:#1976D2
    style 后端API fill:#FFF3E0,stroke:#FF9800
    style 外部服务 fill:#F3E5F5,stroke:#9C27B0
    style 展示层 fill:#FFEBEE,stroke:#F44336
```

---

## 七、数据一致性保障

系统如何确保数据不会丢失或冲突？

```mermaid
graph TB
    subgraph 保障机制["🛡️ 数据安全保障"]
        M1["离线优先<br/>没网也能正常使用<br/>数据先存本地"]
        M2["自动同步<br/>联网后自动推送到云端<br/>无需手动操作"]
        M3["冲突防护<br/>本地修改 3 秒内<br/>忽略云端推送"]
        M4["去重机制<br/>同一个 URL 不会重复保存"]
        M5["历史追踪<br/>删除的数据在历史中<br/>仍然可见"]
        M6["备份恢复<br/>设置中可以导出/导入<br/>所有数据"]
    end

    style 保障机制 fill:#E8F5E9,stroke:#4CAF50
```

---

> **上一篇**: [02-app-lifecycle.md](./02-app-lifecycle.md) — 应用生命周期
> **下一篇**: [04-theme-system.md](./04-theme-system.md) — 主题系统如何运作
