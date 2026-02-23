# 架构

Kyo 没有路由。没有页面跳转。整个应用就是一个桌面。

"导航"的方式是打开窗口和关闭窗口——和你操作电脑的方式一样。

## 技术栈

| 层 | 选择 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite + Bun |
| 样式 | Tailwind CSS v4 + Framer Motion |
| 状态 | Zustand |
| 存储 | IndexedDB + LocalStorage |
| AI | Vercel AI SDK + Dify |
| 音频 | Tone.js + Web Audio API |
| 部署 | Vercel |
| 桌面 | Tauri 2.0 |

## 数据流

```
用户操作 → Zustand Store → React 重渲染
                ↓
           IndexedDB 持久化
```

没有 Redux，没有 Context 嵌套地狱，没有 Provider 套娃。Zustand 是单一真相源。组件订阅它需要的切片，仅此而已。

## 窗口系统

每个应用是一个窗口实例。窗口管理器负责：拖拽、缩放、最小化、层级管理、多实例。

窗口不是路由。它是界面状态。地址栏不变，浏览器后退键不会关闭窗口。这是刻意的。

## 虚拟文件系统

IndexedDB 后端。通过 `useFileSystem` 钩子访问。

不直接操作 IndexedDB。这是规矩。
