# Kyo.is 技术架构

## 核心理念

Kyo 没有路由。没有页面跳转。整个应用就是一个桌面。

"导航"的方式是打开窗口和关闭窗口——和你操作电脑的方式一样。

---

## 技术栈详解

### 前端核心

| 层级 | 技术选型 | 选择理由 |
|------|---------|---------|
| 框架 | React 19 + TypeScript | 最新特性，类型安全 |
| 构建 | Vite + Bun | 极速构建，现代工具链 |
| 样式 | Tailwind CSS v4 + Framer Motion | 原子化 CSS + 流畅动画 |
| 状态 | Zustand | 简洁 API，无 Provider 嵌套 |
| 存储 | IndexedDB + LocalStorage | 浏览器原生，数据主权 |
| 国际化 | i18next | 成熟方案，4 种语言支持 |

### AI 集成

| 组件 | 技术 | 用途 |
|------|------|------|
| AI SDK | Vercel AI SDK | 统一接口，流式响应 |
| 聊天流 | Dify Chatflow | 对话管理，上下文记忆 |
| 模型 | OpenAI + Anthropic + Google | 多模型支持 |

### 音频处理

| 组件 | 技术 | 用途 |
|------|------|------|
| 合成器 | Tone.js | 音频合成，白噪音生成 |
| 波形 | WaveSurfer.js | 音频可视化 |
| 底层 | Web Audio API | 原生音频处理 |

### 编辑器

| 组件 | 技术 | 用途 |
|------|------|------|
| 富文本 | TipTap | 便签、文档编辑 |
| 代码 | Monaco | 代码编辑器 |

### 3D 渲染

| 组件 | 技术 | 用途 |
|------|------|------|
| 3D 引擎 | Three.js | 着色器、屏保 |

### 部署

| 层级 | 技术 | 说明 |
|------|------|------|
| Web | Vercel | Edge Functions + Serverless |
| 桌面 | Tauri 2.0 | 可选，原生应用 |

---

## 数据流

### 单向数据流

```
用户操作 → Zustand Store → React 重渲染
                ↓
           IndexedDB 持久化
```

**设计原则**：
- 没有 Redux，没有 Context 嵌套地狱，没有 Provider 套娃
- Zustand 是单一真相源
- 组件订阅它需要的切片，仅此而已

### 状态分层

```
全局状态（Zustand）
├── useAppStore        - 应用实例管理
├── useWindowStore     - 窗口状态（位置、尺寸、层级）
├── useBookmarkStore   - 书签数据
├── useStickyStore     - 便签数据
├── useThemeStore      - 主题配置
└── useUserStore       - 用户设置

局部状态（useState/useReducer）
└── 组件内部临时状态
```

---

## 窗口系统

### 核心概念

每个应用是一个窗口实例。窗口管理器负责：
- 拖拽
- 缩放
- 最小化
- 层级管理（z-index）
- 多实例支持

**关键设计**：
- 窗口不是路由，它是界面状态
- 地址栏不变，浏览器后退键不会关闭窗口
- 这是刻意的设计，模拟真实桌面 OS

### 窗口生命周期

```
创建 → 打开 → 激活 → 最小化 → 恢复 → 关闭 → 销毁
  ↓      ↓      ↓       ↓        ↓      ↓      ↓
Store  Mount  Focus  Minimize  Focus  Unmount Remove
```

### 多实例管理

```typescript
interface WindowInstance {
  id: string;           // 实例唯一 ID
  appId: AppId;         // 应用类型
  position: { x, y };   // 窗口位置
  size: { w, h };       // 窗口尺寸
  zIndex: number;       // 层级
  minimized: boolean;   // 最小化状态
}
```

---

## 虚拟文件系统

### 架构设计

```
useFileSystem Hook
       ↓
  File Manager
       ↓
   IndexedDB
```

**铁律**：不直接操作 IndexedDB，必须通过 `useFileSystem` hook。

### 文件系统 API

```typescript
interface FileSystem {
  // 文件操作
  readFile(path: string): Promise<File>;
  writeFile(path: string, content: Blob): Promise<void>;
  deleteFile(path: string): Promise<void>;
  
  // 目录操作
  readDir(path: string): Promise<FileEntry[]>;
  createDir(path: string): Promise<void>;
  
  // 备份恢复
  backup(): Promise<Blob>;
  restore(backup: Blob): Promise<void>;
}
```

---

## AI 集成

### Vercel AI SDK 架构

```
前端组件
    ↓
useChat Hook
    ↓
/api/chat 端点
    ↓
Vercel AI SDK
    ↓
OpenAI / Anthropic / Google
```

### Dify Chatflow 集成

```
用户输入
    ↓
Dify API
    ↓
Workflow 执行
    ↓
流式响应
    ↓
前端渲染
```

**关键特性**：
- 流式响应（SSE）
- 上下文记忆
- 多轮对话
- 工具调用（Function Calling）

---

## 主题系统

### CSS 变量架构

```css
:root {
  /* 颜色系统 */
  --color-primary: ...;
  --color-background: ...;
  
  /* 间距系统 */
  --spacing-unit: 8px;
  
  /* 动画系统 */
  --transition-fast: 150ms;
}

[data-theme="aqua"] {
  --color-primary: #007AFF;
}

[data-theme="xp"] {
  --color-primary: #0078D7;
}
```

**铁律**：禁止硬编码颜色和间距，必须使用 CSS 变量。

### 主题切换流程

```
用户选择主题
    ↓
useThemeStore.setTheme()
    ↓
document.documentElement.dataset.theme = theme
    ↓
CSS 变量自动切换
    ↓
React 重渲染（如需）
```

---

## 国际化系统

### i18next 架构

```
src/lib/locales/
├── zh-CN/
│   └── translation.json
├── en/
│   └── translation.json
├── ja/
│   └── translation.json
└── ko/
    └── translation.json
```

### 翻译键命名规范

```
common.{category}.{key}      # 通用文本
apps.{appId}.{key}           # 应用文本
components.{component}.{key} # 组件文本
```

### 使用示例

```typescript
const { t } = useTranslation();

// ✅ 正确
<Button>{t('common.save', '保存')}</Button>

// ❌ 错误
<Button>Save</Button>
```

---

## 性能优化

### 懒加载

```typescript
// 应用懒加载
const BookmarkApp = lazy(() => 
  import('@/apps/bookmarks').then(m => ({ default: m.BookmarkBoardApp }))
);

// 路由级代码分割
const appRegistry = {
  'bookmarks': BookmarkApp,
  'stickies': StickyApp,
  // ...
};
```

### 虚拟滚动

大型列表（书签、便签）使用虚拟滚动，只渲染可见区域。

### 图片懒加载

```typescript
<img loading="lazy" src={url} />
```

### 代码分割

```typescript
// 按需加载
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

---

## 安全策略

### API 端点验证

```typescript
// 输入验证
const schema = z.object({
  message: z.string().max(1000),
});

const validated = schema.parse(req.body);
```

### HTML 清理

```typescript
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(userInput);
```

### CSP 头部

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
```

---

## 移动端适配

### 响应式设计

```typescript
const isMobile = useIsMobile();

return isMobile ? <MobileView /> : <DesktopView />;
```

### 触摸手势

```typescript
const longPress = useLongPress(() => {
  // 长按菜单
});
```

### 视口适配

```typescript
const insets = useWindowInsets();

<div style={{ paddingTop: insets.top }}>
  {/* 内容 */}
</div>
```

---

## 架构约束（铁律）

1. **窗口系统**：所有应用必须通过 `useWindowManager` 注册，支持多实例
2. **文件系统**：使用 `useFileSystem` hook，禁止直接操作 IndexedDB
3. **主题**：只使用 CSS 变量，禁止硬编码颜色/间距
4. **状态管理**：全局状态用 Zustand，局部状态用 useState/useReducer
5. **AI 调用**：统一通过 `/api/chat` 端点，使用 Vercel AI SDK
6. **国际化**：所有文本必须通过 i18next，禁止硬编码字符串
7. **性能**：大型列表使用虚拟滚动，图片懒加载，代码分割
8. **安全**：API 端点验证输入，DOMPurify 清理 HTML，CSP 头部
