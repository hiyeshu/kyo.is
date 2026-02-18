# api/
> L2 | 父级: /CLAUDE.md

## 成员清单

_utils.ts: Supabase 客户端工具，从请求 Authorization header 创建认证客户端，json/error 响应辅助函数
chat.ts: AI 聊天端点，Vercel AI SDK 流式响应，支持 OpenAI/Anthropic/Google 模型
save.ts: 数据保存端点，POST 创建 kyo_items 记录（书签或便签）
search.ts: 数据搜索端点，GET 全文搜索 kyo_items，支持分页
sync.ts: 数据同步端点，GET 获取云端全量数据，POST 批量上传本地数据，DELETE 清空云端数据
audio-transcribe.ts: 音频转录端点，Whisper API 语音转文字
scrape.ts: 网页抓取端点，获取 URL 元数据（标题、描述、favicon）

### 子目录
items/[id].ts: 单条数据 CRUD，PATCH 更新、DELETE 删除 kyo_items 记录

## 依赖关系
- 依赖 @supabase/supabase-js 数据库客户端
- 依赖 Vercel AI SDK (@ai-sdk/*)
- 依赖环境变量 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
- 被前端 fetch/useSWR 调用

## API 设计约束
1. 所有端点使用 Edge Runtime (`export const config = { runtime: "edge" }`)
2. 需要认证的端点必须验证 Authorization header
3. 响应使用 _utils 的 json/error 辅助函数
4. 错误返回统一格式 `{ error: string }`
5. 数据库操作使用 Supabase RLS（行级安全）
6. POST/PATCH 请求必须验证输入

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
