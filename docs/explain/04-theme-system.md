# 主题系统：三套操作系统外观的切换魔法

> 写给不懂技术的你：Kyo.is 如何做到一键变身 macOS / Windows XP / Windows 98？

---

## 一句话理解

Kyo.is 可以在三种完全不同的「操作系统外观」之间一键切换，就像给房间换了一整套家具和装修风格。

---

## 三套主题长什么样？

```mermaid
graph TB
    subgraph macOS["🍎 macOS Aqua"]
        direction TB
        Mac1["半透明菜单栏"]
        Mac2["红黄绿交通灯按钮（左上角）"]
        Mac3["底部 Dock 带磁性放大效果"]
        Mac4["圆角窗口 + 柔和阴影"]
        Mac5["Aqua 水滴质感"]
    end

    subgraph WinXP["🪟 Windows XP"]
        direction TB
        XP1["底部任务栏 + 开始按钮"]
        XP2["最小化/最大化/关闭（右上角）"]
        XP3["Luna 蓝色渐变标题栏"]
        XP4["方角窗口 + 蓝色边框"]
        XP5["经典 XP 按钮样式"]
    end

    subgraph Win98["💾 Windows 98"]
        direction TB
        W1["底部任务栏 + 开始按钮"]
        W2["3D 凸起/凹陷按钮"]
        W3["灰色经典配色"]
        W4["像素风格边框"]
        W5["复古系统字体"]
    end

    style macOS fill:#E8F5E9,stroke:#4CAF50
    style WinXP fill:#E3F2FD,stroke:#2196F3
    style Win98 fill:#ECEFF1,stroke:#607D8B
```

---

## 主题切换的完整流程

```mermaid
sequenceDiagram
    actor 用户
    participant 设置 as 系统设置
    participant 主题Store as useThemeStore
    participant CSS引擎 as CSS 引擎
    participant 壁纸 as 壁纸系统
    participant 所有组件 as 所有界面组件

    用户->>设置: 在 Appearance 标签页选择「Windows XP」

    设置->>主题Store: setTheme("xp")

    主题Store->>主题Store: 保存到本地存储

    主题Store->>CSS引擎: 设置 HTML 标签属性<br/>data-os-theme = "xp"

    CSS引擎->>CSS引擎: 加载 XP 专用样式表<br/>/css/xp-custom.css

    主题Store->>壁纸: 壁纸联动开启？

    alt 壁纸联动开启
        壁纸->>壁纸: 自动切换到 XP 默认壁纸<br/>（经典蓝天白云）
    else 壁纸联动关闭
        壁纸->>壁纸: 保持当前壁纸不变
    end

    CSS引擎-->>所有组件: 所有组件自动重新渲染
    所有组件-->>用户: 整个界面变成 XP 风格 ✨
```

---

## 主题影响了什么？

一次主题切换，会改变界面上的所有这些元素：

```mermaid
graph TB
    ThemeSwitch["🎨 切换主题"]

    ThemeSwitch --> MenuBar["菜单栏<br/>macOS: 顶部半透明<br/>XP/98: 底部任务栏"]
    ThemeSwitch --> WindowFrame["窗口框架<br/>macOS: 圆角 + 左侧按钮<br/>XP/98: 方角 + 右侧按钮"]
    ThemeSwitch --> Dock["应用栏<br/>macOS: 底部 Dock<br/>XP/98: 任务栏按钮"]
    ThemeSwitch --> Buttons["按钮样式<br/>macOS: 扁平圆角<br/>XP: Luna 蓝<br/>98: 3D 凸起"]
    ThemeSwitch --> Icons["应用图标<br/>每套主题有专属图标"]
    ThemeSwitch --> Wallpaper["壁纸<br/>可选联动切换"]
    ThemeSwitch --> Scrollbar["滚动条<br/>macOS: 细窄<br/>XP/98: 经典宽滚动条"]
    ThemeSwitch --> Fonts["字体<br/>macOS: SF Pro<br/>XP: Tahoma<br/>98: MS Sans Serif"]
    ThemeSwitch --> Sounds["音效<br/>不同主题不同音效风格"]

    style ThemeSwitch fill:#E8EAF6,stroke:#3F51B5,stroke-width:3px
```

---

## 窗口控制按钮的差异

这是最直观的差异——窗口的「关闭/最小化/最大化」按钮：

```mermaid
graph LR
    subgraph macOS按钮["🍎 macOS 风格"]
        direction LR
        MacClose["🔴 关闭"]
        MacMin["🟡 最小化"]
        MacMax["🟢 最大化"]
        MacNote["位置：窗口左上角"]
    end

    subgraph XP按钮["🪟 Windows XP 风格"]
        direction LR
        XPMin["➖ 最小化"]
        XPMax["🔲 最大化"]
        XPClose["❌ 关闭"]
        XPNote["位置：窗口右上角"]
    end

    subgraph W98按钮["💾 Windows 98 风格"]
        direction LR
        W98Min["_ 最小化"]
        W98Max["□ 最大化"]
        W98Close["✕ 关闭"]
        W98Note["位置：窗口右上角<br/>3D 凸起效果"]
    end
```

---

## 菜单栏 vs 任务栏

```mermaid
graph TB
    subgraph macOS导航["🍎 macOS 导航方式"]
        direction TB
        TopBar["顶部菜单栏<br/>🍎 Kyo │ File │ Edit │ View │ Help │ ⏰ 14:30"]
        BottomDock["底部 Dock<br/>📚 💬 ⚙️ 📝 📜 🎵"]
        MacDesc["菜单在上面，应用栏在下面"]
    end

    subgraph XP导航["🪟 Windows XP/98 导航方式"]
        direction TB
        BottomTaskbar["底部任务栏<br/>🪟 开始 │ 📚 书签 │ 💬 聊天 │ ⏰ 14:30"]
        StartMenu["开始菜单<br/>弹出应用列表"]
        XPDesc["所有导航都在底部任务栏"]
    end

    style macOS导航 fill:#E8F5E9,stroke:#4CAF50
    style XP导航 fill:#E3F2FD,stroke:#2196F3
```

---

## 主题配置的数据结构

每套主题都有一组「配置参数」，决定了界面的每个细节：

```mermaid
classDiagram
    class 主题配置 {
        id: "macosx" | "xp" | "win98"
        ---
        是否有 Dock: boolean
        是否有任务栏: boolean
        是否有菜单栏: boolean
        关闭按钮位置: "左" | "右"
        菜单栏高度: 数字
        任务栏高度: 数字
        窗口圆角: 数字
        窗口阴影: 样式
        标题栏高度: 数字
    }

    class macOS {
        id = "macosx"
        有 Dock = true
        有任务栏 = false
        有菜单栏 = true
        关闭按钮位置 = "左"
        菜单栏高度 = 25px
        窗口圆角 = 8px
    }

    class WindowsXP {
        id = "xp"
        有 Dock = false
        有任务栏 = true
        有菜单栏 = false
        关闭按钮位置 = "右"
        任务栏高度 = 30px
        窗口圆角 = 0px
    }

    class Windows98 {
        id = "win98"
        有 Dock = false
        有任务栏 = true
        有菜单栏 = false
        关闭按钮位置 = "右"
        任务栏高度 = 28px
        窗口圆角 = 0px
    }

    主题配置 <|-- macOS
    主题配置 <|-- WindowsXP
    主题配置 <|-- Windows98
```

---

## 壁纸联动机制

切换主题时，壁纸可以自动跟着变：

```mermaid
flowchart TB
    Switch["用户切换主题"]

    Switch --> CheckSync{"壁纸联动<br/>开关打开了吗？"}

    CheckSync -->|开启 ✅| AutoWallpaper["自动切换到该主题的默认壁纸"]
    CheckSync -->|关闭 ❌| KeepWallpaper["保持当前壁纸不变"]

    AutoWallpaper --> MacWP["macOS → Aqua 蓝色渐变"]
    AutoWallpaper --> XPWP["XP → 蓝天白云草地"]
    AutoWallpaper --> W98WP["98 → 青绿色纯色"]

    style AutoWallpaper fill:#E3F2FD,stroke:#1976D2
    style KeepWallpaper fill:#FFF9C4,stroke:#FBC02D
```

---

## 壁纸系统详解

壁纸不只是一张图片，它有多种类型：

```mermaid
graph TB
    subgraph 壁纸类型["🖼️ 壁纸类型"]
        Tiles["🔲 平铺图案<br/>小图案重复铺满"]
        Photos["📷 照片<br/>全屏展示一张图片"]
        Videos["🎬 视频<br/>循环播放的动态壁纸"]
        Custom["🎨 自定义<br/>用户上传自己的图片"]
    end

    subgraph 存储位置["💾 壁纸存储"]
        Preset["预设壁纸<br/>存在服务器上<br/>/wallpapers/ 目录"]
        UserUpload["用户上传<br/>存在 IndexedDB<br/>（浏览器大容量存储）"]
    end

    Tiles & Photos & Videos --> Preset
    Custom --> UserUpload
```

---

## 自定义主题编辑器

除了三套预设主题，用户还可以自定义主题的每个细节：

```mermaid
flowchart TB
    Start["打开主题编辑器"]

    Start --> SelectBase["选择基础主题<br/>macOS / XP / 98"]

    SelectBase --> Customize["自定义覆盖"]

    Customize --> Colors["🎨 修改颜色<br/>窗口背景、标题栏、按钮..."]
    Customize --> Metrics["📐 修改尺寸<br/>圆角、边框宽度、阴影..."]
    Customize --> Fonts["🔤 修改字体<br/>系统字体、大小..."]

    Colors & Metrics & Fonts --> Preview["实时预览效果"]

    Preview --> Save{"满意吗？"}
    Save -->|满意| SaveTheme["保存为自定义主题"]
    Save -->|不满意| Customize

    SaveTheme --> Apply["应用自定义主题"]
    SaveTheme --> Export["导出为 JSON<br/>可以分享给别人"]

    style Start fill:#E8EAF6,stroke:#3F51B5
    style SaveTheme fill:#C8E6C9,stroke:#4CAF50
```

---

## 主题对应用的影响

每个应用都会根据当前主题自动调整外观：

```mermaid
graph TB
    subgraph 白噪音应用["🎵 白噪音应用的三种外观"]
        direction TB
        MacNoise["macOS 风格<br/>Braun SK4 收音机<br/>米白色 + 橙色指示灯"]
        XPNoise["XP 风格<br/>Media Player 风格<br/>Luna 蓝 + FM 频率刻度"]
        W98Noise["98 风格<br/>经典 3D 凸起<br/>灰色 + 像素条纹"]
    end

    subgraph 书签应用["📚 书签应用的三种外观"]
        direction TB
        MacBM["macOS 风格<br/>圆角卡片 + 柔和阴影"]
        XPBM["XP 风格<br/>方角卡片 + 蓝色边框"]
        W98BM["98 风格<br/>3D 凸起卡片 + 灰色"]
    end
```

---

## 图标主题系统

每套主题都有自己的图标风格：

```mermaid
graph LR
    subgraph 图标路径["📁 图标文件组织"]
        MacIcons["/icons/macosx/<br/>macOS 风格图标<br/>圆角 + 高光"]
        XPIcons["/icons/xp/<br/>XP 风格图标<br/>方角 + 鲜艳色彩"]
        W98Icons["/icons/win98/<br/>98 风格图标<br/>16色像素风"]
    end

    AppIcon["应用请求图标"] --> ThemeCheck{"当前主题？"}
    ThemeCheck -->|macOS| MacIcons
    ThemeCheck -->|XP| XPIcons
    ThemeCheck -->|98| W98Icons
```

---

## 主题切换的技术原理（简化版）

```mermaid
graph TB
    subgraph 原理["🔧 主题切换的三步走"]
        Step1["第1步：设置标记<br/>在网页根元素上标记当前主题<br/>data-os-theme = 'xp'"]
        Step2["第2步：CSS 自动匹配<br/>所有样式规则根据标记自动切换<br/>[data-os-theme='xp'] .button { ... }"]
        Step3["第3步：动态加载<br/>XP 和 98 需要额外加载专用样式表<br/>macOS 是默认样式，不需要额外加载"]
    end

    Step1 --> Step2 --> Step3

    Step3 --> Result["所有界面元素<br/>自动变成新主题的样子 ✨"]

    style Result fill:#C8E6C9,stroke:#4CAF50
```

---

## 主题数据的保存和恢复

```mermaid
graph TB
    subgraph 保存["💾 主题设置保存在哪里"]
        LS1["当前主题选择<br/>localStorage: kyo:theme"]
        LS2["壁纸联动开关<br/>localStorage: kyo:theme-sync-wallpaper"]
        LS3["自定义主题列表<br/>localStorage: custom-theme-store"]
        LS4["当前壁纸<br/>localStorage: kyo:display-settings"]
    end

    subgraph 恢复["🔄 恢复流程"]
        R1["打开网页"]
        R2["读取 localStorage"]
        R3["应用保存的主题"]
        R4["加载对应壁纸"]
        R5["界面恢复到上次的样子"]
    end

    R1 --> R2 --> R3 --> R4 --> R5

    保存 -.->|数据来源| R2
```

---

## 主题系统总结

```mermaid
mindmap
  root((主题系统))
    三套预设主题
      🍎 macOS Aqua
        顶部菜单栏
        底部 Dock
        圆角窗口
      🪟 Windows XP
        底部任务栏
        开始菜单
        Luna 蓝色
      💾 Windows 98
        底部任务栏
        3D 凸起效果
        像素风格
    影响范围
      窗口框架
      菜单栏/任务栏
      按钮样式
      图标风格
      壁纸
      音效
    自定义能力
      基于预设修改
      颜色自定义
      尺寸自定义
      导出/导入 JSON
    壁纸系统
      平铺图案
      全屏照片
      动态视频
      用户上传
```

---

> **上一篇**: [03-data-flow.md](./03-data-flow.md) — 数据流转
> **下一篇**: [05-user-journey.md](./05-user-journey.md) — 用户旅程地图
