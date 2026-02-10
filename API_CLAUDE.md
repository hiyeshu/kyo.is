# api/
> L2 | 父级: /CLAUDE.md

## 成员清单

chat.ts: AI 聊天 API 端点，处理 POST /api/chat 请求，代理请求到 Dify Chatflow API，SSE 流式响应

## 依赖关系

- 依赖 Dify Chatflow API (https://api.dify.ai/v1)
- 依赖环境变量 DIFY_API_KEY
- 被前端 ChatApp 组件调用
- 运行在 Vercel Edge Runtime

## API 约束

1. 只接受 POST 请求
2. 请求体包含 messages 数组和可选的 conversationId
3. 返回流式响应（SSE → AI SDK 格式转换）
4. 支持多轮对话（通过 conversation_id 维护上下文）
5. 错误处理：API Key 缺失、Dify API 错误、解析错误

## Dify 集成细节

请求转换：
- messages[last].content → query
- conversationId → conversation_id
- response_mode: "streaming"

响应转换（Dify SSE → AI SDK 格式）：
- event:message + answer → 0:"text"（文本增量）
- event:message_end → d:{conversationId, finishReason}（完成信号）
- event:error → 3:"error message"（错误）

## 环境变量

- DIFY_API_KEY: Dify 应用 API Key（格式：app-xxxx）
- 配置位置：Vercel Dashboard → Settings → Environment Variables

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
