# lib/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

audioContext.ts: Web Audio API 上下文管理，单例模式，音频处理、合成、分析
i18n.ts: 国际化配置，i18next 初始化，语言检测、资源加载、命名空间
pusherClient.ts: Pusher 客户端单例，WebSocket 连接管理，实时通信
reactResources.ts: React 资源管理，i18next React 集成，Suspense 支持
utils.ts: 通用工具函数，字符串处理、日期格式化、URL 解析、文件大小格式化
webglFilterRunner.ts: WebGL 滤镜运行器，实时图像处理、着色器应用、性能优化

### 子目录模块
locales/ - 翻译文件，多语言 JSON 资源，支持 en/zh/ja/ko 等语言
shaders/ - GLSL 着色器，Three.js 着色器代码，用于屏保和视觉效果

## 依赖关系
- 依赖 i18next 国际化库
- 依赖 Pusher 实时通信库
- 依赖 Web Audio API
- 依赖 WebGL API
- 被所有组件和应用消费

## 库设计约束
1. 单例模式：audioContext、pusherClient 必须是单例
2. 懒加载：i18n 资源必须按需加载，避免打包体积过大
3. 错误处理：所有 API 调用必须有错误处理和降级方案
4. 性能优化：WebGL 滤镜必须使用 requestAnimationFrame
5. 类型安全：所有工具函数必须有 TypeScript 类型定义
6. 无副作用：工具函数必须是纯函数，避免全局状态
7. 文档注释：复杂函数必须有 JSDoc 注释

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
