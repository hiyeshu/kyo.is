# 开发

## 本地开发

```bash
bun install
bun run dev:vercel
```

打开 `http://localhost:5173`。

## 构建

```bash
bun run build
```

## 项目结构

```
src/
  apps/          六个应用模块
  components/    共享组件
  config/        应用注册、主题、壁纸
  hooks/         自定义钩子
  lib/           工具库
  stores/        Zustand 状态
  styles/        全局样式
  types/         类型定义
```

## 规矩

- 所有文本通过 `t()` 函数，不硬编码
- 所有颜色通过 CSS 变量，不硬编码
- 全局状态用 Zustand，局部状态用 `useState`
- 文件系统通过 `useFileSystem` 钩子，不直接碰 IndexedDB
- 函数超过 20 行，反思一下
- 缩进超过 3 层，重构

## 桌面应用

```bash
bun run tauri:dev
bun run tauri:build
```

## 文档

```bash
bun run scripts/generate-docs.ts
```

编辑 `docs/zh/` 或 `docs/en/` 下的 Markdown 文件，运行上述命令，推送即部署。
