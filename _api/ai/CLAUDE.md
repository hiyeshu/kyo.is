# _api/ai/
> L2 | 父级: /_api/CLAUDE.md

## 成员清单

extract-memories.ts: 记忆提取端点，从对话中提取用户记忆、偏好、事实，存储到 Redis，Edge runtime
ryo-reply.ts: Ryo AI 回复端点，快速 AI 响应，无工具调用，轻量级对话，Edge runtime

## 依赖关系
- 依赖 _utils/_aiModels AI 模型配置
- 依赖 _utils/_memory 记忆系统
- 依赖 Vercel AI SDK 流式响应
- 被前端 AI 助手调用

## AI 端点约束
1. 记忆提取必须异步执行，不阻塞主对话
2. 提取的记忆必须去重，避免重复存储
3. 记忆必须有时间戳和来源标记
4. Ryo 回复必须快速响应，超时 10 秒
5. 所有 AI 调用必须有速率限制
6. 错误必须优雅降级，返回友好提示
7. 流式响应必须支持取消和超时

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
