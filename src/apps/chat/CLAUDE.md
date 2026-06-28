# apps/chat/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

index.tsx: 聊天应用入口，导出 ChatApp 配置对象，被 appRegistry 加载

### components/
ChatApp.tsx: 聊天应用主组件，恢复最新 channel 历史并过滤旧空 assistant 壳子，管理 channelId、图片附件，对接 /api/agent/chat 的 Mastra agent 流，登录前置门禁，解析 `0:/8:/3:/d:` 帧，工具步骤落独立气泡，clientEffects/deletedItems 触发读云刷新
ChatMessages.tsx: 消息列表组件，展示有可见 payload 的聊天历史（文本+图片）、基于 use-stick-to-bottom 的流式滚动、加载状态
ChatInput.tsx: 输入框组件，图片选择/预览/粘贴、发送/停止按钮
ChatMenuBar.tsx: 菜单栏组件，文件菜单、帮助菜单

### utils/
imagePreprocessing.ts: 图片预处理工具，缩放到 1280px、JPEG 0.85 压缩、PNG 透明度保留、10MB 限制

## 依赖关系

- 依赖 /api/agent/chat 端点（Cloudflare Worker -> Mastra -> DeepSeek/tools）
- 依赖 @/components/layout/WindowFrame 窗口框架
- 依赖 @/components/ui/button 按钮组件
- 依赖 @/lib/supabase 读取当前登录 session token
- 依赖 react-i18next 国际化
- 被 appRegistry 注册和加载

## 功能特性

1. AI 对话：通过 Mastra agent + DeepSeek 进行对话
2. 流式响应：实时显示 AI 回复（SSE），`8:` 工具步骤帧独立成 Kyo 气泡
3. 多轮对话：通过 channelId 维护上下文
4. 图片附件：选择/粘贴图片 → 预处理 → 预览 → 发送 → 消息中渲染
5. 消息历史：打开窗口时从最新 channel 恢复，服务端持久化由 channel_messages 承担
6. 自动滚动：新消息自动滚动到底部
7. 停止生成：可中断 AI 回复（AbortController）
8. 国际化：支持多语言界面（en, zh-CN, zh-TW, ja, ko）

## 技术约束

1. API 端点 /api/agent/chat 只接产品 schema，不暴露 Mastra/DeepSeek/Supabase 内部细节
2. 消息格式：{ id, role, content, images? }
3. SSE 响应格式：0:"text" 文本增量，8:{step} 工具步骤帧，3:"error" 错误帧，d:{} 完成信号与 clientEffects
4. channelId 由 API 返回，用于多轮对话
5. 图片限制：仅支持 image/*，10MB 上限，预处理缩放到 1280px
6. 组件必须支持移动端
7. 所有文本必须国际化

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
