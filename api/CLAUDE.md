# api/
> L2 | 父级: /CLAUDE.md

## 成员清单

_utils.ts: API 公共工具，构建 Supabase 客户端、统一 JSON 响应与错误响应
audio-transcribe.ts: 音频转录端点，处理语音输入并返回文字结果
bookmark-preview.ts: 书签预览代理端点，同源转发 PageShot 截图二进制流，规避前端跨域图片拦截
chat.ts: 聊天端点，代理 Dify 流式响应并适配前端 useChat 数据格式
items/[id].ts: 单条数据项 CRUD 端点，按 id 查询/更新/删除
save.ts: 保存端点，写入用户内容与同步数据
scrape.ts: 网页抓取端点，提取链接元数据并生成摘要/标签
search.ts: 搜索端点，查询跨模块内容并返回聚合结果
sync.ts: 同步端点，处理本地与云端数据同步

## 依赖关系
- 依赖 Vercel Edge Runtime 与标准 Fetch API
- 依赖 Supabase SDK（部分端点）
- 被前端通过 `/api/*` 路径调用

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
