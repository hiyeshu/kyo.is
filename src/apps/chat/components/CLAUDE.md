# components/
> L2 | 父级: /src/apps/chat/CLAUDE.md

成员清单
ChatApp.tsx: 聊天主组件，读取最新 channel 历史，发送消息到 /api/agent/chat，维护图片附件、流式响应与鉴权/流错误文案。
ChatMessages.tsx: 消息列表组件，渲染用户/助手文本、图片预览、复制按钮与滚动到底部。
ChatInput.tsx: 输入组件，处理文本、图片选择、粘贴、发送与停止生成。
ChatMenuBar.tsx: 菜单栏组件，提供聊天窗口菜单入口。
MarkdownRenderer.tsx: Markdown 渲染组件，承接助手富文本输出。

架构决策
components/ 只处理聊天 UI 与交互。长期记忆属于 Supabase channel_messages，ChatApp 只在打开窗口时恢复最近 channel，不把本地状态当真相源。

依赖关系
ChatApp.tsx -> /api/channels
ChatApp.tsx -> /api/channels/:id/messages
ChatApp.tsx -> /api/agent/chat
ChatMessages.tsx -> MarkdownRenderer.tsx
ChatInput.tsx -> imagePreprocessing.ts

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
