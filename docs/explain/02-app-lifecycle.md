# 应用生命周期：从点击到关闭

> 写给不懂技术的你：一个应用窗口是怎么「出生」、「活着」、「死亡」的？

---

## 总览：应用的一生

```mermaid
stateDiagram-v2
    [*] --> 未启动: 应用还没打开
    未启动 --> 加载中: 用户点击图标
    加载中 --> 运行中: 加载完成，窗口出现
    运行中 --> 最小化: 用户点最小化按钮
    最小化 --> 运行中: 用户点 Dock 恢复
    运行中 --> 后台: 用户点击了其他窗口
    后台 --> 运行中: 用户再次点击该窗口
    运行中 --> [*]: 用户关闭窗口
    最小化 --> [*]: 用户关闭窗口
    后台 --> [*]: 用户关闭窗口
```

---

## 第一阶段：启动（用户点击图标）

当用户点击某个应用图标时，系统会经历以下步骤：

```mermaid
sequenceDiagram
    actor 用户
    participant 桌面/Dock as 桌面 或 Dock
    participant 应用管理器 as AppManager
    participant 应用商店 as useAppStore
    participant 应用组件 as React 组件

    用户->>桌面/Dock: 双击图标 / 点击 Dock
    桌面/Dock->>应用管理器: 发送「启动应用」事件

    应用管理器->>应用商店: 检查：这个应用已经打开了吗？

    alt 应用还没打开
        应用商店->>应用商店: 创建新的应用实例
        应用商店->>应用商店: 分配唯一 ID
        应用商店->>应用商店: 设置默认位置和大小
        应用商店-->>应用管理器: 返回新实例信息
        应用管理器->>应用组件: 开始加载应用代码（懒加载）
        应用组件-->>应用管理器: 加载完成！
        应用管理器->>用户: 窗口出现在桌面上 ✨
    else 应用已经打开了
        应用商店->>应用商店: 把已有窗口移到最前面
        应用商店-->>应用管理器: 返回已有实例
        应用管理器->>用户: 窗口跳到最前面 ✨
    end
```

---

## 启动方式大全

用户可以从 **6 个不同入口** 启动应用：

```mermaid
graph TB
    subgraph 启动入口["🚀 用户可以从这些地方启动应用"]
        Entry1["🖱️ 双击桌面图标"]
        Entry2["⬇️ 点击 Dock 栏图标"]
        Entry3["⌨️ 按 Cmd+K 搜索并选择"]
        Entry4["🔗 URL 路由<br/>如 kyo.is/bookmarks"]
        Entry5["📋 粘贴链接<br/>自动打开添加书签弹窗"]
        Entry6["🍎 Apple 菜单<br/>选择应用名称"]
    end

    Entry1 & Entry2 & Entry3 & Entry4 & Entry5 & Entry6 --> LaunchApp["统一启动入口<br/>launchApp(应用ID)"]

    LaunchApp --> Check{"该应用<br/>已经打开了？"}
    Check -->|没有| Create["创建新窗口实例"]
    Check -->|打开了但最小化| Restore["恢复最小化的窗口"]
    Check -->|打开了在后台| BringFront["把窗口拉到最前面"]

    Create --> Show["显示窗口"]
    Restore --> Show
    BringFront --> Show

    style LaunchApp fill:#E8EAF6,stroke:#3F51B5,stroke-width:3px
```

---

## 第二阶段：运行中（窗口的日常）

窗口出现后，用户可以做很多事情：

```mermaid
graph TB
    subgraph 窗口操作["🖼️ 运行中的窗口可以做什么"]
        Drag["🔄 拖拽移动<br/>按住标题栏拖动"]
        Resize["↔️ 缩放大小<br/>拖动窗口边缘"]
        Minimize["➖ 最小化<br/>点击黄色按钮"]
        Maximize["🔲 最大化<br/>点击绿色按钮"]
        Close["❌ 关闭<br/>点击红色按钮"]
        Focus["🔝 切换焦点<br/>点击窗口任意位置"]
        Snap["📐 吸附屏幕边缘<br/>拖到屏幕左/右半边"]
    end

    subgraph 快捷键["⌨️ 键盘快捷操作"]
        CmdK["Cmd+K<br/>打开命令面板"]
        CmdTick["Cmd+`<br/>切换到下一个窗口"]
        F3["F3<br/>鸟瞰所有窗口"]
    end
```

---

## 窗口拖拽的详细流程

```mermaid
sequenceDiagram
    actor 用户
    participant 标题栏
    participant 窗口管理器 as useWindowManager
    participant 音效系统 as useSound
    participant 状态存储 as useAppStore

    用户->>标题栏: 按下鼠标（mousedown）
    标题栏->>窗口管理器: 记录起始位置
    窗口管理器->>窗口管理器: 进入「拖拽模式」

    loop 鼠标移动中
        用户->>窗口管理器: 移动鼠标（mousemove）
        窗口管理器->>窗口管理器: 计算新位置
        窗口管理器->>标题栏: 实时更新窗口位置

        alt 接近屏幕边缘（20px 内）
            窗口管理器->>窗口管理器: 显示「吸附预览」
        end
    end

    用户->>窗口管理器: 松开鼠标（mouseup）
    窗口管理器->>音效系统: 播放「放下」音效 🔊

    alt 在吸附区域
        窗口管理器->>窗口管理器: 自动占满屏幕左半边/右半边
    end

    窗口管理器->>状态存储: 保存最终位置到本地
    窗口管理器->>窗口管理器: 退出「拖拽模式」
```

---

## 窗口层级（谁在前面谁在后面）

每个窗口都有一个「层级」，就像叠在一起的纸牌——最上面的窗口是当前焦点窗口。

```mermaid
graph TB
    subgraph 窗口栈["窗口层级栈（从上到下）"]
        direction TB
        Top["🔝 最上层：聊天窗口（正在使用）"]
        Mid["📚 中间层：书签窗口（在后面）"]
        Bottom["⚙️ 底层：设置窗口（最后面）"]
    end

    Click["用户点击书签窗口"] --> Reorder["书签窗口跳到最上层"]

    subgraph 点击后的新顺序["点击后的新层级"]
        direction TB
        NewTop["🔝 最上层：书签窗口（变成焦点）"]
        NewMid["💬 中间层：聊天窗口（退到后面）"]
        NewBottom["⚙️ 底层：设置窗口（没变）"]
    end

    窗口栈 --> Click --> 点击后的新顺序
```

---

## 多实例：同一个应用可以打开多个窗口

```mermaid
graph LR
    subgraph 书签应用["📚 书签应用"]
        Instance1["窗口 1<br/>浏览所有书签"]
        Instance2["窗口 2<br/>搜索特定标签"]
    end

    subgraph 便签应用["📝 便签应用"]
        Instance3["窗口 1<br/>管理便签列表"]
    end

    Note["每个窗口都是独立的「实例」<br/>有自己的位置、大小、数据"]

    style Note fill:#FFF9C4,stroke:#FBC02D
```

---

## 第三阶段：最小化

```mermaid
sequenceDiagram
    actor 用户
    participant 窗口 as 窗口框架
    participant 应用商店 as useAppStore
    participant Dock as Dock 栏

    用户->>窗口: 点击最小化按钮（黄色）
    窗口->>应用商店: minimizeInstance(窗口ID)
    应用商店->>应用商店: 标记 isMinimized = true
    应用商店->>应用商店: 自动把焦点给其他窗口
    窗口-->>用户: 窗口消失 💨
    应用商店->>Dock: Dock 栏显示最小化的窗口缩略图

    Note over 用户, Dock: 窗口并没有关闭，只是隐藏了

    用户->>Dock: 点击最小化的窗口图标
    Dock->>应用商店: restoreInstance(窗口ID)
    应用商店->>应用商店: 标记 isMinimized = false
    应用商店->>窗口: 窗口重新出现 ✨
```

---

## 第四阶段：关闭

```mermaid
sequenceDiagram
    actor 用户
    participant 窗口 as 窗口框架
    participant 应用商店 as useAppStore
    participant 音效系统 as useSound

    用户->>窗口: 点击关闭按钮（红色）
    窗口->>应用商店: closeAppInstance(窗口ID)
    应用商店->>应用商店: 从实例列表中删除该窗口
    应用商店->>应用商店: 从层级顺序中移除
    应用商店->>应用商店: 如果有其他窗口，自动切换焦点
    音效系统->>用户: 播放关闭音效 🔊
    窗口-->>用户: 窗口消失 💨

    Note over 用户, 音效系统: 窗口彻底销毁，下次需要重新打开
```

---

## Exposé 鸟瞰模式（F3）

按 F3 键可以一览所有打开的窗口：

```mermaid
sequenceDiagram
    actor 用户
    participant 键盘
    participant 应用管理器 as AppManager
    participant Exposé as ExposeView

    用户->>键盘: 按 F3
    键盘->>应用管理器: 触发「鸟瞰模式」
    应用管理器->>Exposé: 显示所有窗口的缩略图

    Note over Exposé: 所有窗口缩小并平铺展示<br/>用户可以点击任意窗口切换

    用户->>Exposé: 点击某个窗口
    Exposé->>应用管理器: bringToForeground(窗口ID)
    应用管理器-->>用户: 选中的窗口放大到前台 ✨
    Exposé-->>用户: 鸟瞰模式关闭
```

---

## 应用启动时间线

```mermaid
gantt
    title 应用启动完整时间线
    dateFormat X
    axisFormat %L ms

    section 用户操作
    点击图标           :milestone, m1, 0, 0

    section 系统处理
    检查是否已打开      :a1, 0, 10
    创建应用实例        :a2, after a1, 15
    分配窗口位置        :a3, after a2, 5

    section 代码加载
    懒加载应用代码      :b1, after a3, 80
    解析并编译         :b2, after b1, 20

    section 渲染
    首次渲染组件       :c1, after b2, 30
    标记加载完成       :c2, after c1, 5

    section 呈现
    窗口出现动画       :d1, after c2, 200
    用户可交互         :milestone, m2, after d1, 0
```

---

## 便签的特殊生命周期

便签和其他应用不一样——它是桌面的「一等公民」，关闭管理窗口不会让便签消失：

```mermaid
graph TB
    subgraph 普通应用["普通应用（如书签、聊天）"]
        direction TB
        Open1["打开应用 → 窗口出现"]
        Close1["关闭应用 → 窗口消失 → 内容不可见"]
    end

    subgraph 便签应用["📝 便签（特殊！）"]
        direction TB
        Open2["便签管理器可以打开/关闭"]
        Notes["但便签本身永远浮在桌面上！<br/>不受管理器窗口的影响"]
        Close2["关闭管理器 → 便签依然可见"]
    end

    Open1 --> Close1
    Open2 --> Notes
    Notes --> Close2

    style 便签应用 fill:#FFF9C4,stroke:#FBC02D
```

```mermaid
sequenceDiagram
    participant 桌面 as 桌面层
    participant 便签层 as StickyNotesLayer
    participant 便签管理器 as StickiesApp
    participant 便签数据 as useStickiesStore

    Note over 桌面, 便签数据: 系统启动时

    桌面->>便签层: 始终渲染便签层
    便签层->>便签数据: 读取所有便签
    便签数据-->>便签层: 返回便签列表
    便签层-->>桌面: 在桌面上显示所有便签

    Note over 桌面, 便签数据: 用户打开便签管理器

    桌面->>便签管理器: 打开管理器窗口
    便签管理器->>便签数据: 创建新便签
    便签数据-->>便签层: 数据变化，自动更新
    便签层-->>桌面: 新便签立即出现

    Note over 桌面, 便签数据: 用户关闭便签管理器

    桌面->>便签管理器: 关闭管理器窗口
    Note over 便签层: 便签层不受影响！<br/>便签继续显示在桌面上 ✅
```

---

## 移动端 vs 桌面端的差异

```mermaid
graph TB
    subgraph 桌面端["🖥️ 桌面端体验"]
        direction TB
        D1["窗口可以自由拖拽到任意位置"]
        D2["可以同时显示多个窗口"]
        D3["支持窗口缩放"]
        D4["支持 Exposé 鸟瞰"]
        D5["支持框选多个桌面图标"]
        D6["右键菜单"]
    end

    subgraph 移动端["📱 移动端体验"]
        direction TB
        M1["窗口自动占满全屏宽度"]
        M2["同一时间只能看一个窗口"]
        M3["不支持缩放"]
        M4["不支持 Exposé"]
        M5["桌面图标分页滑动"]
        M6["长按替代右键"]
    end

    style 桌面端 fill:#E3F2FD,stroke:#1976D2
    style 移动端 fill:#FFF3E0,stroke:#F57C00
```

---

## 完整生命周期状态机

把上面所有阶段综合起来：

```mermaid
stateDiagram-v2
    [*] --> 空闲: 应用尚未启动

    空闲 --> 检查: 用户触发启动

    state 检查 <<choice>>
    检查 --> 创建实例: 应用未打开
    检查 --> 恢复窗口: 应用已最小化
    检查 --> 聚焦窗口: 应用在后台运行

    创建实例 --> 懒加载: 开始加载代码
    懒加载 --> 首次渲染: 代码加载完成
    首次渲染 --> 前台运行: 窗口出现

    恢复窗口 --> 前台运行: 窗口恢复显示
    聚焦窗口 --> 前台运行: 窗口移到最前

    前台运行 --> 后台运行: 用户点击其他窗口
    后台运行 --> 前台运行: 用户点击回来

    前台运行 --> 已最小化: 点击最小化按钮
    后台运行 --> 已最小化: 点击最小化按钮
    已最小化 --> 前台运行: 从 Dock 恢复

    前台运行 --> 销毁: 点击关闭按钮
    后台运行 --> 销毁: 点击关闭按钮
    已最小化 --> 销毁: 点击关闭按钮

    销毁 --> [*]: 窗口彻底消失
```

---

> **上一篇**: [01-system-overview.md](./01-system-overview.md) — 系统全局概览
> **下一篇**: [03-data-flow.md](./03-data-flow.md) — 数据如何在系统中流转
