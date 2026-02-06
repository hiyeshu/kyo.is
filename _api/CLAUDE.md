# _api/
> L2 | 父级: /CLAUDE.md

## 成员清单

### 根目录端点
admin.ts: 管理员 API，用户管理、速率限制重置、内存查看，仅 ryo 用户可访问，Node.js runtime
applet-ai.ts: Applet AI 生成器，根据用户描述生成 HTML/CSS/JS 小程序，使用 Claude Sonnet，Edge runtime
audio-transcribe.ts: 音频转文字，支持 OpenAI Whisper，处理语音消息转录，Node.js runtime
chat.ts: AI 聊天主端点，支持 OpenAI/Anthropic/Google 模型，流式响应，工具调用，内存系统，Edge runtime
ie-generate.ts: Internet Explorer 时光机，AI 生成历史/未来网站，使用 Claude Sonnet，Edge runtime
iframe-check.ts: iframe 安全检查，验证 URL 是否可嵌入，CORS 检测，X-Frame-Options 解析，Edge runtime
link-preview.ts: 链接预览生成器，抓取 Open Graph 元数据，生成卡片预览，缓存优化，Edge runtime
parse-title.ts: 网页标题解析器，提取页面标题与描述，支持多种编码，Edge runtime
share-applet.ts: Applet 分享端点，生成分享链接，存储到 Redis，支持公开/私有，Edge runtime
speech.ts: 文字转语音，支持 OpenAI TTS，多种语音选项，流式音频输出，Edge runtime
youtube-search.ts: YouTube 搜索代理，绕过 CORS 限制，返回搜索结果，Edge runtime

### 子目录模块
_utils/ - 工具函数库，AI 模型配置、提示词、内存系统、速率限制、认证、日志、CORS
ai/ - AI 相关端点，模型列表、能力查询
auth/ - 认证系统，登录、注册、令牌验证、密码哈希
chat/ - 聊天功能，工具调用、消息处理
listen/ - 音乐监听功能，歌词获取、翻译
messages/ - 消息管理，聊天室消息 CRUD
presence/ - 在线状态，Pusher 集成
pusher/ - Pusher 认证，WebSocket 授权
rooms/ - 聊天室管理，创建、加入、离开、成员列表
songs/ - 歌曲管理，YouTube 导入、元数据
users/ - 用户管理，个人资料、头像、设置

## 依赖关系
- 依赖 Vercel Edge/Node.js Runtime
- 依赖 Upstash Redis 存储用户数据、会话、速率限制
- 依赖 OpenAI/Anthropic/Google AI SDK
- 依赖 Pusher 实时通信
- 被前端 src/ 通过 fetch 调用

## 技术约束
1. Edge Runtime: 轻量端点，快速响应，无状态
2. Node.js Runtime: 重型任务，文件处理，长时间运行
3. 所有端点必须验证 CORS，使用 setCorsHeaders
4. 敏感端点必须调用 validateAuth 验证用户
5. AI 端点必须检查速率限制，防止滥用
6. 所有错误必须返回标准 JSON 格式
7. 流式响应使用 ReadableStream，支持 SSE

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
