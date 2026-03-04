# AGENTS.md

> 本文件兼容其他 AI 编码工具（Cursor、Windsurf、Cline、Aider 等）

---

## 快速导航

### 核心文档

- **[CLAUDE.md](./CLAUDE.md)** - AI Agent 启动 ROM（身份+协议+导航）
- **[docs/ai/](./docs/ai/)** - AI 专用知识库

### 用户文档

- **[docs/zh/](./docs/zh/)** - 中文用户文档
- **[docs/en/](./docs/en/)** - 英文用户文档

### 技能库

- **[.claude/skills/](./.claude/skills/)** - 可执行技能模块

### 记忆系统

- **[.claude/memory/](./.claude/memory/)** - 长期记忆
- **[memory/](./memory/)** - 开发日志

---

## 项目概览

Kyo.is 是一个 **Web-Based Agentic AI OS**，使用 React 19 + TypeScript + Vite + Tailwind CSS + Zustand。

### 核心特性

- **无路由设计** - 窗口即应用实例，模拟真实桌面 OS
- **虚拟文件系统** - IndexedDB 后端，数据主权
- **多主题支持** - Aqua / Windows XP / Windows 98
- **AI 集成** - Vercel AI SDK + Dify Chatflow
- **国际化** - 支持 4 种语言（zh-CN, en, ja, ko）
- **云同步** - Supabase 实时同步（进行中）

### 技术栈

```
前端: React 19 + TypeScript + Tailwind CSS + Framer Motion
状态: Zustand
存储: IndexedDB + LocalStorage
AI: Vercel AI SDK + Dify
实时: Supabase Realtime
构建: Vite + Bun
部署: Vercel (Edge Functions + Serverless)
桌面: Tauri 2.0 (可选)
```

---

## 技术约束（铁律）

### 1. 窗口系统

所有应用必须通过 `useWindowManager` 注册，支持多实例。

```typescript
// ✅ 正确
export function MyApp({ instanceId, appId }: AppProps) {
  // ...
}

// ❌ 错误：未接收 AppProps
export function MyApp() {
  // ...
}
```

### 2. 文件系统

使用 `useFileSystem` hook，禁止直接操作 IndexedDB。

```typescript
// ✅ 正确
const { readFile, writeFile } = useFileSystem();

// ❌ 错误：直接操作 IndexedDB
const db = await indexedDB.open('kyo-fs');
```

### 3. 主题

只使用 CSS 变量，禁止硬编码颜色/间距。

```typescript
// ✅ 正确
<div className="bg-background text-foreground">

// ❌ 错误：硬编码颜色
<div style={{ backgroundColor: '#fff', color: '#000' }}>
```

### 4. 国际化

所有文本必须通过 i18next，禁止硬编码字符串。

```typescript
// ✅ 正确
<Button>{t('common.save', '保存')}</Button>

// ❌ 错误：硬编码文本
<Button>Save</Button>
```

### 5. 状态管理

全局状态用 Zustand，局部状态用 useState/useReducer。

```typescript
// ✅ 正确：全局状态
const bookmarks = useBookmarkStore((state) => state.bookmarks);

// ✅ 正确：局部状态
const [isOpen, setIsOpen] = useState(false);

// ❌ 错误：滥用全局状态
const [tempValue, setTempValue] = useGlobalStore(...);
```

---

## 开发命令

### 本地开发

```bash
bun run dev:vercel  # 推荐：模拟 Vercel 环境
bun dev             # 纯 Vite
```

### 构建与测试

```bash
bun run build       # 构建生产版本
bun test            # 运行测试
bun run lint        # Lint 检查
```

### 国际化

```bash
bun run i18n:extract    # 提取翻译键
bun run i18n:sync       # 同步到 4 种语言
bun run i18n:translate  # AI 翻译
```

### 桌面应用

```bash
bun run tauri:dev       # 开发模式
bun run tauri:build     # 构建桌面应用
```

详见 [docs/ai/COMMANDS.md](./docs/ai/COMMANDS.md)

---

## 常见任务

### 创建新应用

参考 [.claude/skills/app-new.md](./.claude/skills/app-new.md)

**步骤**:
1. 创建应用目录 `src/apps/{app-id}/`
2. 编写主组件和元数据
3. 注册到 `appRegistry.tsx`
4. 添加 4 种语言的翻译
5. 创建 L2 文档

### 配置 Supabase 同步

参考 [.claude/skills/supabase-sync.md](./.claude/skills/supabase-sync.md)

**步骤**:
1. 创建 Supabase 项目
2. 配置环境变量
3. 创建数据库表和 RLS 策略
4. 创建同步 Hook
5. 实现冲突解决

### 配置 Dify Chatflow

参考 [.claude/skills/dify-chatflow.md](./.claude/skills/dify-chatflow.md)

**步骤**:
1. 创建 Dify 应用
2. 获取 API Key
3. 配置环境变量
4. 测试 API 端点
5. 集成到前端

### 国际化工作流

参考 [.claude/skills/i18n-workflow.md](./.claude/skills/i18n-workflow.md)

**步骤**:
1. 在代码中使用 `t()`
2. 运行 `bun run i18n:extract`
3. 运行 `bun run i18n:sync`
4. 运行 `bun run i18n:translate`
5. 手动检查翻译质量

---

## 架构决策

详见 [docs/ai/DECISIONS.md](./docs/ai/DECISIONS.md)

### 关键决策

- **ADR-001**: 为什么选择 Zustand 而不是 Redux
- **ADR-002**: 为什么不使用路由
- **ADR-003**: 为什么使用 IndexedDB 而不是 LocalStorage
- **ADR-004**: 为什么使用 Vercel AI SDK
- **ADR-005**: 为什么使用 Dify 而不是自建 Chatflow
- **ADR-006**: 为什么使用 Bun 而不是 npm/pnpm
- **ADR-007**: 为什么使用 Tauri 而不是 Electron

---

## GEB 分形文档系统协议

> The map IS the terrain. The terrain IS the map.

### 核心教义

代码是机器相，文档是语义相，两相必须同构。

### 三层分形结构

```
L1: /CLAUDE.md              - 项目宪法
L2: /{module}/CLAUDE.md     - 模块地图
L3: 文件头部注释            - INPUT/OUTPUT/POS 契约
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

### 禁止行为

- **FATAL-001**: 孤立代码变更（改代码不检查文档）
- **FATAL-002**: 跳过 L3 创建（发现缺失却继续）
- **FATAL-003**: 删文件不更新 L2（成员清单残留）
- **FATAL-004**: 新模块不创建 L2（文档黑洞）

---

## 目录结构

```
kyo.is/
├── CLAUDE.md              # AI Agent 启动 ROM
├── AGENTS.md              # 本文件（兼容层）
├── docs/
│   ├── ai/                # AI 专用知识库
│   │   ├── SOUL.md        # 身份、哲学
│   │   ├── ARCHITECTURE.md # 技术架构
│   │   ├── CONVENTIONS.md  # 编码规范
│   │   ├── COMMANDS.md     # 开发命令
│   │   ├── ROADMAP.md      # 开发路线
│   │   └── DECISIONS.md    # 架构决策
│   ├── zh/                # 中文用户文档
│   └── en/                # 英文用户文档
├── .claude/
│   ├── skills/            # 可执行技能模块
│   │   ├── app-new.md
│   │   ├── supabase-sync.md
│   │   ├── dify-chatflow.md
│   │   └── i18n-workflow.md
│   └── memory/            # 长期记忆
│       ├── MEMORY.md      # 记忆索引
│       └── dify.md        # Dify 集成经验
├── memory/                # 开发日志
│   ├── README.md
│   └── 2026-03/
│       └── 2026-03-04.md
├── src/                   # 前端源码
├── api/                   # Vercel API 端点
├── public/                # 静态资源
└── src-tauri/             # Tauri 桌面应用
```

---

## 环境变量

### 开发环境

创建 `.env.local`:

```bash
# AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DIFY_API_KEY=app-...

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# 其他
VITE_APP_VERSION=1.0.0
```

### 生产环境

在 Vercel Dashboard 配置相同的环境变量。

---

## 故障排查

### 应用无法打开

1. 检查 `appRegistry.tsx` 是否注册
2. 检查 `appIds.ts` 是否添加 ID
3. 检查控制台错误

### 翻译键不显示

1. 检查翻译键是否存在
2. 运行 `bun run i18n:sync`
3. 清除浏览器缓存

### Supabase 同步失败

1. 检查环境变量
2. 检查 RLS 策略
3. 查看 Supabase Dashboard 日志

### Dify 聊天不工作

1. 检查 `DIFY_API_KEY`
2. 测试 API 端点
3. 查看浏览器 Network 面板

---

## 贡献指南

### 提交代码前

- [ ] 运行 `bun run lint` 无错误
- [ ] 运行 `bun test` 全部通过
- [ ] 所有文本使用 `t()` 国际化
- [ ] 所有样式使用 CSS 变量
- [ ] 所有文件有 L3 头部注释
- [ ] L2 文档已更新
- [ ] Commit 消息符合规范

### Commit 规范

```
<type>(<scope>): <subject>

feat: 新功能
fix: 修复 Bug
refactor: 重构
docs: 文档
style: 样式
test: 测试
chore: 构建/工具
```

---

## 更多资源

- [Vite 文档](https://vitejs.dev/)
- [React 文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [Tauri 文档](https://tauri.app/)
- [Vercel 文档](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Dify 文档](https://docs.dify.ai/)

---

## 联系方式

- **GitHub**: [kyo.is](https://github.com/yourusername/kyo.is)
- **Issues**: [GitHub Issues](https://github.com/yourusername/kyo.is/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/kyo.is/discussions)

---

**注意**: 本项目遵循 GEB 分形文档系统协议，任何代码变更必须同步更新文档。

**法则**: 极简·稳定·导航·版本精确
