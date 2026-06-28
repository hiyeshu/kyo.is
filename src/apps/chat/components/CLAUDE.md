# components/
> L2 | 父级: /src/apps/chat/CLAUDE.md

成员清单
ChatApp.tsx: 聊天主组件，读取最新 channel 历史并过滤空 assistant 壳子，发送消息到 /api/agent/chat，未登录时打开 LoginDialog，维护图片附件，解析 `0:/8:/3:/d:` 流帧，降噪错误，工具步骤落独立气泡，并消费 clientEffects/deletedItems 触发 refreshCloudItems 读云刷新。
ChatMessages.tsx: 消息列表组件，渲染有可见 payload 的用户/助手文本、图片预览、复制按钮，并用 use-stick-to-bottom 接管流式滚动到底部。
ChatInput.tsx: 输入组件，处理文本、图片选择、粘贴、发送与停止生成。
ChatMenuBar.tsx: 菜单栏组件，提供聊天窗口菜单入口。
MarkdownRenderer.tsx: Markdown 渲染组件，承接助手富文本输出。

架构决策
components/ 只处理聊天 UI 与交互。长期记忆属于 Supabase channel_messages，ChatApp 只在打开窗口时恢复最近 channel，不把本地状态当真相源；agent 工具步骤来自 Worker `8:` 帧，不从模型文本里切分。

依赖关系
ChatApp.tsx -> /api/channels
ChatApp.tsx -> /api/channels/:id/messages
ChatApp.tsx -> /api/agent/chat
ChatApp.tsx -> LoginDialog
ChatApp.tsx -> useSyncStore
ChatMessages.tsx -> MarkdownRenderer.tsx
ChatInput.tsx -> imagePreprocessing.ts

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
