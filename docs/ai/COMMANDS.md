# Kyo.is 开发命令

## 本地开发

### 启动开发服务器

```bash
# 推荐：模拟 Vercel 环境
bun run dev:vercel

# 或者：纯 Vite 开发服务器
bun dev
```

打开 `http://localhost:5173`

### 开发服务器特性

- ⚡ 热模块替换（HMR）
- 🔄 自动刷新
- 📦 按需编译
- 🎨 CSS 热更新

---

## 构建

### 生产构建

```bash
bun run build
```

生成文件：`.vercel/output/`

### 构建产物

```
.vercel/output/
├── static/          # 静态资源
│   ├── assets/      # JS/CSS
│   └── index.html
└── config.json      # Vercel 配置
```

### 本地预览构建

```bash
bun run preview
```

---

## 测试

### 运行所有测试

```bash
bun test
```

### 监听模式

```bash
bun test:watch
```

### 测试覆盖率

```bash
bun test:coverage
```

### 测试特定文件

```bash
bun test src/apps/bookmarks
```

---

## 国际化

### 提取翻译键

从代码中提取所有 `t()` 调用：

```bash
bun run i18n:extract
```

生成文件：`src/lib/locales/keys.json`

### 同步到 4 种语言

将新键同步到所有语言文件：

```bash
bun run i18n:sync
```

更新文件：
- `src/lib/locales/zh-CN/translation.json`
- `src/lib/locales/en/translation.json`
- `src/lib/locales/ja/translation.json`
- `src/lib/locales/ko/translation.json`

### AI 翻译

使用 AI 自动翻译缺失的键：

```bash
bun run i18n:translate
```

需要配置 `OPENAI_API_KEY` 环境变量。

### 完整工作流

```bash
# 1. 提取新键
bun run i18n:extract

# 2. 同步到所有语言
bun run i18n:sync

# 3. AI 翻译
bun run i18n:translate

# 4. 手动检查翻译质量
# 编辑 src/lib/locales/{lang}/translation.json
```

---

## 桌面应用（Tauri）

### 开发模式

```bash
bun run tauri:dev
```

启动 Tauri 开发窗口，支持热重载。

### 构建桌面应用

```bash
bun run tauri:build
```

生成文件：
- Windows: `src-tauri/target/release/kyo.exe`
- macOS: `src-tauri/target/release/bundle/dmg/Kyo.dmg`
- Linux: `src-tauri/target/release/bundle/appimage/kyo.AppImage`

### Tauri 命令

```bash
# 更新依赖
bun run tauri:update

# 清理构建缓存
bun run tauri:clean
```

---

## 代码质量

### Lint 检查

```bash
bun run lint
```

检查项：
- ESLint 规则
- TypeScript 类型
- React Hooks 规则

### 自动修复

```bash
bun run lint:fix
```

### 类型检查

```bash
bun run type-check
```

---

## 文档生成

### 生成项目文档

```bash
bun run generate:docs
```

生成文件：
- `docs/zh/*.md` - 中文文档
- `docs/en/*.md` - 英文文档

### 生成 API 文档

```bash
bun run generate:api-docs
```

使用 TypeDoc 生成 API 文档。

---

## 部署

### Vercel 部署

```bash
# 自动部署（推送到 main 分支）
git push origin main

# 手动部署
vercel deploy

# 生产部署
vercel deploy --prod
```

### 部署预览

每个 Pull Request 自动生成预览链接。

### 环境变量

在 Vercel Dashboard 配置：
- `OPENAI_API_KEY` - OpenAI API 密钥
- `ANTHROPIC_API_KEY` - Anthropic API 密钥
- `DIFY_API_KEY` - Dify API 密钥
- `SUPABASE_URL` - Supabase 项目 URL
- `SUPABASE_ANON_KEY` - Supabase 匿名密钥

---

## 数据库（Supabase）

### 运行迁移

```bash
bun run db:migrate
```

### 生成类型

```bash
bun run db:types
```

生成文件：`src/types/supabase.ts`

### 重置数据库

```bash
bun run db:reset
```

⚠️ 警告：会删除所有数据！

---

## 工具脚本

### 生成应用图标

```bash
bun run scripts/generate-icons.ts
```

从 SVG 生成多尺寸图标。

### 清理缓存

```bash
bun run clean
```

删除：
- `node_modules`
- `.vercel`
- `dist`
- `build`

### 更新依赖

```bash
# 检查过期依赖
bun outdated

# 更新所有依赖
bun update

# 更新特定依赖
bun update react react-dom
```

---

## 性能分析

### 构建分析

```bash
bun run build:analyze
```

生成 `stats.html`，可视化打包体积。

### 性能测试

```bash
bun run perf
```

使用 Lighthouse 测试性能。

---

## 调试

### 开发者工具

```bash
# 启动 React DevTools
bun run devtools:react

# 启动 Redux DevTools（Zustand）
bun run devtools:redux
```

### 日志级别

```bash
# 详细日志
DEBUG=* bun dev

# 特定模块日志
DEBUG=app:* bun dev
```

---

## CI/CD

### GitHub Actions

自动运行：
- Lint 检查
- 类型检查
- 单元测试
- 构建测试

### 本地运行 CI

```bash
bun run ci
```

模拟 CI 环境运行所有检查。

---

## 常用命令速查

```bash
# 开发
bun run dev:vercel          # 启动开发服务器
bun run build               # 构建生产版本
bun test                    # 运行测试

# 国际化
bun run i18n:extract        # 提取翻译键
bun run i18n:sync           # 同步到所有语言
bun run i18n:translate      # AI 翻译

# 桌面应用
bun run tauri:dev           # 开发模式
bun run tauri:build         # 构建桌面应用

# 代码质量
bun run lint                # Lint 检查
bun run type-check          # 类型检查

# 部署
git push origin main        # 自动部署到 Vercel
```

---

## 故障排查

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :5173

# 杀死进程
kill -9 <PID>
```

### 依赖问题

```bash
# 删除 node_modules 和 lockfile
rm -rf node_modules bun.lockb

# 重新安装
bun install
```

### 构建失败

```bash
# 清理缓存
bun run clean

# 重新构建
bun run build
```

### Tauri 构建失败

```bash
# 更新 Rust
rustup update

# 清理 Tauri 缓存
bun run tauri:clean

# 重新构建
bun run tauri:build
```

---

## 开发技巧

### 快速创建新应用

```bash
# 使用脚手架
bun run create:app

# 输入应用 ID 和名称
# 自动生成目录结构和模板文件
```

### 快速添加组件

```bash
# 使用 shadcn/ui
bunx shadcn-ui@latest add button

# 生成文件：src/components/ui/button.tsx
```

### 快速查看文档

```bash
# 启动文档服务器
bun run docs:serve

# 打开 http://localhost:3000
```

---

## 环境变量

### 开发环境

创建 `.env.local`：

```bash
# AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DIFY_API_KEY=app-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...

# 其他
VITE_APP_VERSION=1.0.0
```

### 生产环境

在 Vercel Dashboard 配置环境变量。

---

## 性能优化建议

### 开发环境

```bash
# 使用 SWC 代替 Babel（已配置）
# 使用 Bun 代替 npm（已配置）
# 启用 Vite 预构建缓存（已配置）
```

### 生产环境

```bash
# 启用 gzip 压缩（Vercel 自动）
# 启用 CDN 缓存（Vercel 自动）
# 代码分割（Vite 自动）
# Tree Shaking（Vite 自动）
```

---

## 更多资源

- [Vite 文档](https://vitejs.dev/)
- [React 文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [Tauri 文档](https://tauri.app/)
- [Vercel 文档](https://vercel.com/docs)
