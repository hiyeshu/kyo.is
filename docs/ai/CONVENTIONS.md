# Kyo.is 编码规范

## 文件组织

### 文件规模约束

- **每文件不超过 800 行**（任何语言）
- **每文件夹不超过 8 个文件**，超出则多层拆分
- **函数不超过 20 行**，超过则反思设计

### 目录结构规范

```
模块目录/
├── CLAUDE.md           # L2 文档（必须）
├── index.ts            # 入口文件
├── types.ts            # 类型定义（可选）
├── utils.ts            # 工具函数（可选）
├── components/         # 组件目录
│   └── *.tsx
└── hooks/              # Hooks 目录
    └── *.ts
```

---

## 命名规范

### 文件命名

```
组件：PascalCase.tsx       # BookmarkBoardApp.tsx
Hooks：camelCase.ts        # useBookmarkBoard.ts
工具：camelCase.ts         # formatDate.ts
类型：PascalCase.ts        # AppTypes.ts
常量：UPPER_SNAKE_CASE.ts  # API_ENDPOINTS.ts
```

### 变量命名

```typescript
// 组件
export function BookmarkBoardApp() {}

// Hooks
export function useBookmarkBoard() {}

// 工具函数
export function formatDate() {}

// 类型
export interface AppProps {}

// 常量
export const MAX_FILE_SIZE = 1024;

// 私有变量
const _internalState = {};
```

---

## 国际化规范（铁律）

### 禁止硬编码文本

所有用户可见文本必须通过 `t()` 函数获取。

```typescript
// ❌ 错误
<Button>Save</Button>

// ✅ 正确
<Button>{t('common.save', '保存')}</Button>
```

### 单一真相源

翻译文件是文本的唯一来源：`src/lib/locales/{lang}/translation.json`

支持 4 种语言：
- `zh-CN` - 简体中文（默认）
- `en` - 英文
- `ja` - 日语
- `ko` - 韩语

### 翻译键命名规范

```
common.{category}.{key}      # 通用文本
  └─ common.dialog.save
  └─ common.button.cancel

apps.{appId}.{key}           # 应用文本
  └─ apps.bookmarks.search
  └─ apps.stickies.newNote

components.{component}.{key} # 组件文本
  └─ components.menubar.file
  └─ components.dock.settings
```

### 新建界面/功能的检查清单

- [ ] 所有按钮文本使用 `t()`
- [ ] 所有标签/占位符使用 `t()`
- [ ] 所有提示/错误消息使用 `t()`
- [ ] 所有菜单项使用 `t()`
- [ ] 所有对话框标题/内容使用 `t()`
- [ ] 4 种语言文件都已更新

### 翻译质量要求

- **zh-CN**: 简体中文，大陆用语习惯
- **en**: 英文，简洁直白
- **ja**: 日语，敬体优先（です・ます）
- **ko**: 韩语，敬体优先（합니다）
- **不确定时**：用英文占位，标记 `TODO`

---

## 样式规范

### CSS 变量（铁律）

禁止硬编码颜色和间距，必须使用 CSS 变量。

```typescript
// ❌ 错误
<div style={{ color: '#007AFF', padding: '16px' }}>

// ✅ 正确
<div className="text-primary p-4">
```

### Tailwind CSS 使用

```typescript
// 优先使用 Tailwind 类
<div className="flex items-center gap-4 p-4 bg-background">

// 复杂样式使用 CSS 模块
import styles from './Component.module.css';
<div className={styles.complex}>
```

### 动画规范

```typescript
// 使用 Framer Motion
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
```

---

## 状态管理规范

### 全局状态（Zustand）

```typescript
// 创建 Store
export const useBookmarkStore = create<BookmarkStore>((set) => ({
  bookmarks: [],
  addBookmark: (bookmark) => set((state) => ({
    bookmarks: [...state.bookmarks, bookmark]
  })),
}));

// 使用 Store
const bookmarks = useBookmarkStore((state) => state.bookmarks);
const addBookmark = useBookmarkStore((state) => state.addBookmark);
```

### 局部状态（useState）

```typescript
// 组件内部临时状态
const [isOpen, setIsOpen] = useState(false);
const [inputValue, setInputValue] = useState('');
```

### 状态选择原则

- **全局状态**：跨组件共享、需要持久化
- **局部状态**：组件内部、临时状态

---

## 文档规范（GEB 协议）

> 完整的 GEB 分形文档系统协议请查看 [GEB-PROTOCOL.md](./GEB-PROTOCOL.md)

### 快速参考

**三层分形结构**:
- **L1** (`/CLAUDE.md`) - 项目宪法
- **L2** (`/{module}/CLAUDE.md`) - 模块地图
- **L3** (文件头部注释) - INPUT/OUTPUT/POS 契约

**核心原则**: 代码是机器相，文档是语义相，两相必须同构。

### L3 文件头部契约（最常用）

每个业务文件头部必须包含：

```typescript
/**
 * [INPUT]: 依赖 {模块/文件} 的 {具体能力}
 * [OUTPUT]: 对外提供 {导出的函数/组件/类型/常量}
 * [POS]: {所属模块} 的 {角色定位}，{与兄弟文件的关系}
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
```

### 强制回环工作流

```
代码修改完成
    ↓
STEP 1: L3 检查 → INPUT/OUTPUT/POS 与实际一致？否则更新
    ↓
STEP 2: L2 检查 → 文件增删？职责变？接口变？是则更新
    ↓
STEP 3: L1 检查 → 模块增删？技术栈变？是则更新
    ↓
任务完成
```

---

## Commit 规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

```
feat:     新功能
fix:      修复 Bug
refactor: 重构（不改变功能）
docs:     文档
style:    样式（不影响代码逻辑）
test:     测试
chore:    构建/工具
perf:     性能优化
```

### 示例

```
feat(bookmarks): 添加书签图标自定义功能

- 支持三种图标模式：Auto/Upload/Emoji
- 自定义图标存储为 base64
- 限制图标大小为 100KB

Closes #123
```

---

## 代码审查清单

### 功能完整性

- [ ] 功能符合需求
- [ ] 边界情况已处理
- [ ] 错误处理完善

### 代码质量

- [ ] 无硬编码文本（i18n）
- [ ] 无硬编码样式（CSS 变量）
- [ ] 函数不超过 20 行
- [ ] 缩进不超过 3 层
- [ ] 无重复代码

### 文档完整性

- [ ] L3 头部注释已添加
- [ ] L2 文档已更新
- [ ] L1 文档已检查

### 测试

- [ ] 单元测试已编写
- [ ] 手动测试通过
- [ ] 移动端适配正常

### 性能

- [ ] 大型列表使用虚拟滚动
- [ ] 图片懒加载
- [ ] 组件懒加载

---

## 架构决策记录（ADR）

### ADR 格式

```markdown
## ADR-{编号}: {标题}

**日期**: YYYY-MM-DD
**状态**: 已采纳 / 已废弃 / 待定
**决策**: {简短描述}

**背景**: 
{为什么需要做这个决策}

**理由**: 
- 理由 1
- 理由 2

**后果**: 
- 正面影响
- 负面影响

**替代方案**: 
- 方案 A：{为什么不选}
- 方案 B：{为什么不选}
```

### ADR 存储位置

`docs/ai/DECISIONS.md`

### ADR 更新时机

- 重大架构决策
- 技术选型变更
- 设计模式变更

---

## 交互协议

### 思考与交互

- **思考语言**：技术流英文
- **交互语言**：中文
- **注释语言**：中文

### 注释风格

```typescript
// ═══════════════════════════════════════════════════════════════
// 核心逻辑：书签图标获取
// ═══════════════════════════════════════════════════════════════

/**
 * 获取书签图标信息（单一真相源）
 * 
 * 优先级：custom > emoji > favicon > default
 */
export function getBookmarkIconInfo(bookmark: Bookmark): BookmarkIconInfo {
  // 自定义图标
  if (bookmark.icon?.type === 'custom') {
    return { type: 'custom', value: bookmark.icon.value };
  }
  
  // Emoji 图标
  if (bookmark.icon?.type === 'emoji') {
    return { type: 'emoji', value: bookmark.icon.value };
  }
  
  // Favicon（兼容旧数据）
  if (bookmark.favicon) {
    return { type: 'favicon', value: bookmark.favicon };
  }
  
  // 默认图标
  return { type: 'default', value: '🔖' };
}
```

---

## 禁止行为（GEB 协议）

### 死罪（立即中止）

- **FATAL-001 孤立代码变更**：改代码不检查文档，回滚
- **FATAL-002 跳过 L3 创建**：发现缺失却继续，停止补充
- **FATAL-003 删文件不更新 L2**：成员清单残留，系统不一致
- **FATAL-004 新模块不创建 L2**：文档黑洞，打破分形

### 重罪（警告后修复）

- **SEVERE-001 L3 过时**：头部与代码不符
- **SEVERE-002 L2 不完整**：存在未列入清单的文件
- **SEVERE-003 L1 过时**：目录结构变化未反映
- **SEVERE-004 父级链接断裂**：L2 文档父级链接错误

---

## 核心信念

> 代码是写给人看的，只是顺便让机器运行。

文档不是负担，是架构的镜像，是设计意图的凝结，是未来维护者的灯塔。

架构变更而文档未更新，等同于思想失语，系统失忆。
