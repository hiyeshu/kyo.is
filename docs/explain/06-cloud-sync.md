# 云端同步：数据如何跨设备保持一致

> 写给不懂技术的你：你的书签和便签是怎么在手机、电脑、平板之间同步的？

---

## 一句话理解

Kyo.is 采用「离线优先」策略——没有网络也能正常使用，联网后自动同步到云端，确保所有设备数据一致。

---

## 同步系统全景图

```mermaid
graph TB
    subgraph 设备A["🖥️ 设备 A（你的电脑）"]
        LocalA["本地数据<br/>localStorage"]
    end

    subgraph 设备B["📱 设备 B（你的手机）"]
        LocalB["本地数据<br/>localStorage"]
    end

    subgraph 设备C["🧩 设备 C（Chrome 扩展）"]
        LocalC["扩展数据"]
    end

    subgraph 云端["☁️ 云端（Supabase）"]
        DB["数据库<br/>kyo_items 表"]
        Auth["认证服务<br/>Google OAuth"]
        Realtime["实时推送<br/>WebSocket"]
    end

    LocalA <-->|自动同步| DB
    LocalB <-->|自动同步| DB
    LocalC <-->|自动同步| DB

    DB --> Realtime
    Realtime -->|实时通知| LocalA & LocalB & LocalC

    Auth -->|身份验证| LocalA & LocalB & LocalC

    style 云端 fill:#BBDEFB,stroke:#1976D2
```

---

## 登录认证流程

### 为什么需要登录？

```mermaid
graph TB
    subgraph 未登录["🔓 未登录状态"]
        NoLogin1["数据只存在浏览器本地"]
        NoLogin2["换设备数据就没了"]
        NoLogin3["清除浏览器数据就丢了"]
    end

    subgraph 已登录["🔐 已登录状态"]
        Login1["数据自动同步到云端"]
        Login2["任何设备都能访问"]
        Login3["数据永远不会丢失"]
    end

    未登录 -->|Google 登录| 已登录

    style 未登录 fill:#FFEBEE,stroke:#F44336
    style 已登录 fill:#E8F5E9,stroke:#4CAF50
```

### Google 登录的详细流程

```mermaid
sequenceDiagram
    actor 用户
    participant KyoIs as Kyo.is
    participant Auth as 认证系统
    participant Google as Google
    participant DB as Supabase 数据库

    用户->>KyoIs: 点击「Sign in with Google」

    KyoIs->>Auth: 发起 OAuth 请求
    Auth->>Google: 跳转到 Google 登录页

    用户->>Google: 输入 Google 账号密码
    用户->>Google: 点击「允许」授权

    Google-->>Auth: 返回认证令牌
    Auth->>Auth: 验证令牌有效性
    Auth->>DB: 创建/查找用户记录

    Auth-->>KyoIs: 登录成功！返回用户信息

    KyoIs-->>用户: 显示已登录状态 ✅
    KyoIs->>KyoIs: 触发首次数据同步

    Note over 用户, DB: 之后每次打开 Kyo.is<br/>会自动恢复登录状态（无需重新登录）
```

---

## 首次同步：本地数据和云端数据的合并

首次登录时，系统需要处理一个关键问题：用户可能在登录前已经创建了一些书签和便签。

```mermaid
flowchart TB
    Login["用户首次登录成功"]

    Login --> CheckLocal{"本地有数据吗？"}

    CheckLocal -->|有本地数据| PushFirst["第1步：先把本地数据推到云端<br/>（保护用户已有的收藏）"]
    CheckLocal -->|没有本地数据| PullOnly["直接从云端拉取"]

    PushFirst --> Pull["第2步：从云端拉取所有数据"]
    PullOnly --> Pull

    Pull --> Merge["第3步：合并数据"]

    Merge --> Dedup["去重处理<br/>同一个 URL 不会出现两次"]

    Dedup --> Subscribe["第4步：开启实时同步"]

    Subscribe --> Done["同步完成 ✅<br/>后续所有操作自动同步"]

    style Login fill:#E8EAF6,stroke:#3F51B5
    style Done fill:#C8E6C9,stroke:#4CAF50
```

### 首次同步的时序图

```mermaid
sequenceDiagram
    participant 认证 as useAuthStore
    participant 同步 as useSyncStore
    participant 书签 as useBookmarkStore
    participant 便签 as useStickiesStore
    participant API as /api/sync
    participant 云端 as Supabase

    认证->>同步: 用户已登录，开始同步！

    Note over 同步, 云端: 阶段一：推送本地数据

    同步->>书签: 获取本地所有书签
    书签-->>同步: 返回 15 条书签

    同步->>便签: 获取本地所有便签
    便签-->>同步: 返回 3 条便签

    同步->>API: POST /api/sync<br/>上传 15 条书签 + 3 条便签
    API->>云端: 批量写入（按 URL 去重）
    云端-->>API: 写入成功
    API-->>同步: 上传完成 ✅

    Note over 同步, 云端: 阶段二：拉取云端数据

    同步->>API: GET /api/sync
    API->>云端: 查询该用户的所有数据
    云端-->>API: 返回 20 条书签 + 5 条便签
    API-->>同步: 返回云端数据

    同步->>书签: 合并云端书签到本地
    同步->>便签: 合并云端便签到本地

    Note over 同步, 云端: 阶段三：开启实时监听

    同步->>云端: 订阅数据变更（WebSocket）
    云端-->>同步: 实时连接建立 ✅

    同步-->>认证: 同步完成！
```

---

## 日常同步：实时双向同步

登录后，每次操作都会自动同步：

### 本地操作 → 云端

```mermaid
sequenceDiagram
    actor 用户
    participant 本地 as 本地 Store
    participant 界面 as 界面更新
    participant 云端 as Supabase

    用户->>本地: 添加一条新书签

    par 同时进行
        本地->>界面: 立即更新界面 ⚡
    and
        本地->>云端: 异步推送到云端
    end

    Note over 本地, 界面: 用户立即看到变化<br/>不需要等云端响应

    云端-->>本地: 确认保存成功

    Note over 云端: 如果推送失败（比如断网）<br/>数据仍然安全保存在本地<br/>下次联网时会自动重试
```

### 云端变更 → 本地

```mermaid
sequenceDiagram
    participant 其他设备 as 📱 其他设备
    participant 云端 as Supabase
    participant 实时推送 as Realtime
    participant 同步管理 as useSyncStore
    participant 本地 as 本地 Store
    participant 界面 as 界面

    其他设备->>云端: 在手机上添加了一条书签

    云端->>实时推送: 数据变更事件

    实时推送->>同步管理: 推送通知：有新数据！

    同步管理->>同步管理: 安全检查：这是我自己刚改的吗？

    alt 是自己刚改的（3秒内）
        同步管理->>同步管理: 忽略，避免重复处理 ⏭️
    else 是其他设备改的
        同步管理->>本地: 更新本地数据
        本地->>界面: 界面自动刷新
        界面-->>界面: 新书签出现 ✨
    end
```

---

## 冲突处理：当两台设备同时修改

```mermaid
flowchart TB
    subgraph 场景["⚠️ 冲突场景"]
        DevA["🖥️ 设备 A<br/>修改了书签标题"]
        DevB["📱 设备 B<br/>也修改了同一个书签标题"]
    end

    DevA --> CloudA["推送到云端"]
    DevB --> CloudB["推送到云端"]

    CloudA --> Conflict{"谁先到？"}
    CloudB --> Conflict

    Conflict -->|设备 A 先到| AFirst["设备 A 的修改先保存"]
    AFirst --> BOverwrite["设备 B 的修改覆盖设备 A"]

    Conflict -->|设备 B 先到| BFirst["设备 B 的修改先保存"]
    BFirst --> AOverwrite["设备 A 的修改覆盖设备 B"]

    BOverwrite & AOverwrite --> Result["最终结果：最后修改的版本赢"]

    style 场景 fill:#FFF3E0,stroke:#FF9800
    style Result fill:#E8F5E9,stroke:#4CAF50
```

### 防回写机制

为了避免「自己的修改被自己的推送覆盖」这种尴尬情况：

```mermaid
sequenceDiagram
    participant 用户操作
    participant 本地Store as 本地 Store
    participant 防回写 as 防回写标记
    participant 云端 as Supabase
    participant 实时推送 as Realtime

    用户操作->>本地Store: 修改书签标题
    本地Store->>防回写: 标记：这条数据 3 秒内不接受云端推送
    本地Store->>云端: 推送修改到云端

    Note over 防回写: 3 秒倒计时开始 ⏱️

    云端->>实时推送: 数据变更通知
    实时推送->>防回写: 收到推送，检查标记

    alt 在 3 秒内
        防回写->>防回写: 这是我自己刚改的，忽略 ⏭️
    else 超过 3 秒
        防回写->>本地Store: 接受云端数据
    end

    Note over 防回写: 3 秒后标记自动清除
```

---

## 离线模式：没有网络怎么办？

```mermaid
flowchart TB
    subgraph 在线模式["🌐 在线模式"]
        Online1["正常操作"]
        Online2["实时同步到云端"]
        Online3["实时接收其他设备的变更"]
    end

    subgraph 离线模式["📴 离线模式"]
        Offline1["正常操作（完全不受影响）"]
        Offline2["数据保存在本地"]
        Offline3["无法接收其他设备的变更"]
    end

    subgraph 恢复连接["🔄 恢复网络连接"]
        Reconnect1["自动检测到网络恢复"]
        Reconnect2["推送离线期间的所有修改"]
        Reconnect3["拉取其他设备的最新数据"]
        Reconnect4["数据重新同步完成"]
    end

    在线模式 -->|断网| 离线模式
    离线模式 -->|联网| 恢复连接
    恢复连接 --> 在线模式

    style 在线模式 fill:#E8F5E9,stroke:#4CAF50
    style 离线模式 fill:#FFF9C4,stroke:#FBC02D
    style 恢复连接 fill:#E3F2FD,stroke:#1976D2
```

---

## 数据安全：你的数据有多安全？

```mermaid
graph TB
    subgraph 安全措施["🛡️ 数据安全保障"]
        Auth["🔐 认证隔离<br/>每个用户只能看到自己的数据<br/>Google OAuth 验证身份"]
        Encrypt["🔒 传输加密<br/>所有数据通过 HTTPS 传输<br/>防止中间人窃听"]
        Backup["💾 多重备份<br/>本地 localStorage 一份<br/>云端 Supabase 一份<br/>可手动导出 JSON 一份"]
        Isolate["👤 用户隔离<br/>API 每次请求都验证用户身份<br/>无法访问其他用户的数据"]
    end

    style 安全措施 fill:#E8F5E9,stroke:#4CAF50
```

---

## 同步的数据范围

不是所有数据都会同步到云端：

```mermaid
graph TB
    subgraph 会同步["☁️ 会同步到云端的数据"]
        Sync1["📚 书签列表<br/>URL、标题、摘要、标签、图标"]
        Sync2["📝 便签列表<br/>内容、颜色"]
        Sync3["🔗 链接元数据缓存<br/>网站预览信息"]
    end

    subgraph 不会同步["💾 只保存在本地的数据"]
        NoSync1["🎨 主题设置<br/>每台设备可以不同"]
        NoSync2["🖼️ 壁纸选择<br/>每台设备可以不同"]
        NoSync3["🔊 音量设置<br/>每台设备可以不同"]
        NoSync4["📱 窗口位置和大小<br/>每台设备屏幕不同"]
        NoSync5["🌐 语言设置<br/>每台设备可以不同"]
        NoSync6["📜 历史记录<br/>只记录本地操作"]
    end

    style 会同步 fill:#BBDEFB,stroke:#1976D2
    style 不会同步 fill:#FFF9C4,stroke:#FBC02D
```

---

## Chrome 扩展的同步

Chrome 扩展和主站之间也有同步机制：

```mermaid
sequenceDiagram
    participant 扩展 as Chrome 扩展
    participant 主站 as Kyo.is 主站
    participant 云端 as Supabase

    Note over 扩展, 云端: 场景：用户在扩展中收藏网页

    扩展->>云端: 直接保存书签到云端
    云端->>主站: 实时推送新书签
    主站->>主站: 本地列表自动更新

    Note over 扩展, 云端: 场景：用户在主站中删除书签

    主站->>云端: 删除书签
    云端->>扩展: 实时推送删除通知
    扩展->>扩展: 更新扩展中的书签列表

    Note over 扩展, 主站: 扩展和主站通过 iframe 握手<br/>共享登录状态
```

### 扩展登录状态同步

```mermaid
flowchart TB
    OpenExt["用户打开新标签页<br/>（Chrome 扩展）"]

    OpenExt --> CheckAuth{"已登录？"}

    CheckAuth -->|已登录| LoadData["加载云端数据<br/>显示完整桌面"]

    CheckAuth -->|未登录| Iframe["嵌入 Kyo.is iframe"]
    Iframe --> Handshake["iframe 握手<br/>传递登录状态"]

    Handshake --> HasSession{"主站有登录？"}
    HasSession -->|有| ShareSession["共享登录令牌给扩展"]
    ShareSession --> LoadData

    HasSession -->|没有| ShowLogin["显示登录按钮"]
    ShowLogin --> Login["用户点击登录"]
    Login --> LoadData

    style LoadData fill:#C8E6C9,stroke:#4CAF50
```

---

## 同步状态指示

用户如何知道数据是否已同步？

```mermaid
stateDiagram-v2
    [*] --> 已同步: 所有数据已推送到云端

    已同步 --> 同步中: 用户做了修改
    同步中 --> 已同步: 推送成功
    同步中 --> 同步失败: 网络错误

    同步失败 --> 同步中: 自动重试
    同步失败 --> 离线: 持续无网络

    离线 --> 同步中: 网络恢复
```

---

## 数据生命周期总览

```mermaid
graph TB
    subgraph 创建["📝 数据创建"]
        Create1["用户添加书签"]
        Create2["用户创建便签"]
        Create3["Chrome 扩展收藏"]
    end

    subgraph 本地存储["💾 本地存储"]
        LS["localStorage<br/>立即保存，离线可用"]
    end

    subgraph 云端存储["☁️ 云端存储"]
        DB["Supabase 数据库<br/>异步同步，跨设备可用"]
    end

    subgraph 实时分发["📡 实时分发"]
        RT["Supabase Realtime<br/>WebSocket 推送"]
    end

    subgraph 其他设备["📱 其他设备"]
        Other["自动接收更新<br/>界面实时刷新"]
    end

    Create1 & Create2 & Create3 --> LS
    LS --> DB
    DB --> RT
    RT --> Other
    Other --> LS

    style 创建 fill:#E8F5E9,stroke:#4CAF50
    style 本地存储 fill:#FFF9C4,stroke:#FBC02D
    style 云端存储 fill:#BBDEFB,stroke:#1976D2
    style 实时分发 fill:#F3E5F5,stroke:#9C27B0
    style 其他设备 fill:#FFE0B2,stroke:#FF9800
```

---

## 常见问题

```mermaid
graph TB
    Q1["❓ 不登录能用吗？"]
    A1["✅ 完全可以！<br/>所有功能正常使用<br/>数据保存在浏览器本地<br/>只是不能跨设备同步"]

    Q2["❓ 清除浏览器数据会丢失吗？"]
    A2["如果已登录：不会丢失 ✅<br/>云端有完整备份<br/>重新登录即可恢复<br/><br/>如果未登录：会丢失 ⚠️<br/>建议先导出备份"]

    Q3["❓ 同步有延迟吗？"]
    A3["几乎没有 ⚡<br/>本地操作立即生效<br/>云端同步通常 < 1 秒<br/>实时推送延迟 < 500ms"]

    Q4["❓ 支持多少设备？"]
    A4["无限制 ✅<br/>只要登录同一个 Google 账号<br/>所有设备自动同步"]

    Q1 --- A1
    Q2 --- A2
    Q3 --- A3
    Q4 --- A4

    style Q1 fill:#E3F2FD,stroke:#1976D2
    style Q2 fill:#E3F2FD,stroke:#1976D2
    style Q3 fill:#E3F2FD,stroke:#1976D2
    style Q4 fill:#E3F2FD,stroke:#1976D2
    style A1 fill:#E8F5E9,stroke:#4CAF50
    style A2 fill:#FFF9C4,stroke:#FBC02D
    style A3 fill:#E8F5E9,stroke:#4CAF50
    style A4 fill:#E8F5E9,stroke:#4CAF50
```

---

> **上一篇**: [05-user-journey.md](./05-user-journey.md) — 用户旅程地图
> **系列完结** — 感谢阅读！如有疑问，欢迎随时提问。
