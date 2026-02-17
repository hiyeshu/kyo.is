# apps/chat/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

index.tsx: 聊天应用入口，导出 ChatApp 配置对象，被 appRegistry 加载

### components/
ChatApp.tsx: 聊天应用主组件，管理聊天状态、图片附件、语音转录，对接 Dify Chatflow API
ChatMessages.tsx: 消息列表组件，展示聊天历史（文本+图片）、自动滚动、加载状态
ChatInput.tsx: 输入框组件，图片选择/预览/粘贴、语音录制波形可视化、发送/停止按钮
ChatMenuBar.tsx: 菜单栏组件，文件菜单、帮助菜单

### utils/
chatTools.ts: 意图检测与执行，本地处理便签/书签/搜索等操作
imagePreprocessing.ts: 图片预处理工具，缩放到 1280px、JPEG 0.85 压缩、PNG 透明度保留、10MB 限制

## 依赖关系

- 依赖 /api/chat 端点（代理到 Dify Chatflow API，支持图片上传）
- 依赖 /api/audio-transcribe 端点（OpenAI Whisper 语音转录）
- 依赖 @/hooks/useAudioTranscription 语音录制+转录 hook
- 依赖 @/components/ui/audio-bars 音频波形可视化
- 依赖 @/components/layout/WindowFrame 窗口框架
- 依赖 @/components/ui/button 按钮组件
- 依赖 react-i18next 国际化
- 被 appRegistry 注册和加载

## 功能特性

1. AI 对话：通过 Dify Chatflow API 进行对话
2. 流式响应：实时显示 AI 回复（SSE）
3. 多轮对话：通过 conversation_id 维护上下文
4. 图片附件：选择/粘贴图片 → 预处理 → 预览 → 发送 → 消息中渲染
5. 语音转录：录音 → 48 频段波形可视化 → Whisper API 转文字 → 填入输入框
6. 消息历史：保存当前会话对话历史
7. 自动滚动：新消息自动滚动到底部
8. 停止生成：可中断 AI 回复（AbortController）
9. 国际化：支持多语言界面（en, zh-CN, zh-TW, ja, ko）

## 技术约束

1. API 端点 /api/chat 代理到 Dify API，支持图片上传到 Dify /v1/files/upload
2. 消息格式：{ id, role, content, images? }
3. SSE 响应格式：0:"text" 文本增量，d:{} 完成信号
4. conversation_id 由 API 返回，用于多轮对话
5. 图片限制：仅支持 image/*，10MB 上限，预处理缩放到 1280px
6. 组件必须支持移动端
7. 所有文本必须国际化

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
