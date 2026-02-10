# apps/chat/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

index.tsx: 聊天应用入口，导出 ChatApp 配置对象，被 appRegistry 加载

### components/
ChatApp.tsx: 聊天应用主组件，管理聊天状态、消息列表、输入框，对接 Dify Chatflow API
ChatMessages.tsx: 消息列表组件，展示聊天历史、自动滚动、加载状态
ChatInput.tsx: 输入框组件，处理用户输入、发送/停止按钮
ChatMenuBar.tsx: 菜单栏组件，文件菜单、帮助菜单

## 依赖关系

- 依赖 /api/chat 端点（代理到 Dify Chatflow API）
- 依赖 @/components/layout/WindowFrame 窗口框架
- 依赖 @/components/ui/button 按钮组件
- 依赖 react-i18next 国际化
- 被 appRegistry 注册和加载

## 功能特性

1. AI 对话：通过 Dify Chatflow API 进行对话
2. 流式响应：实时显示 AI 回复（SSE）
3. 多轮对话：通过 conversation_id 维护上下文
4. 消息历史：保存当前会话对话历史
5. 自动滚动：新消息自动滚动到底部
6. 停止生成：可中断 AI 回复（AbortController）
7. 国际化：支持多语言界面

## 技术约束

1. API 端点 /api/chat 代理到 Dify API
2. 消息格式：{ id, role, content }
3. SSE 响应格式：0:"text" 文本增量，d:{} 完成信号
4. conversation_id 由 API 返回，用于多轮对话
5. 组件必须支持移动端
6. 所有文本必须国际化

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
