# Skill: Dify Chatflow 配置与使用

## 触发条件

- 用户说"配置 Dify"
- 用户说"聊天功能不工作"
- 用户说"如何使用 AI 聊天"
- 用户说"修改对话流程"

## 前置检查

- [ ] 确认 `DIFY_API_KEY` 环境变量已配置
- [ ] 确认 `api/chat.ts` 文件存在
- [ ] 确认 Dify 账号已创建

## Dify 架构

### 数据流

```
前端 useChat Hook
    ↓
POST /api/chat
    ↓
api/chat.ts (Edge Function)
    ↓
Dify Chatflow API
    ↓
SSE 流式响应
    ↓
前端渲染
```

### 核心文件

- `api/chat.ts` - Dify API 代理端点
- `src/apps/chat/` - 聊天应用
- `src/hooks/useChat.ts` - 聊天 Hook（如果有）

## Dify 配置步骤

### 1. 创建 Dify 应用

1. 登录 [Dify](https://dify.ai/)
2. 创建新应用 → 选择"Chatflow"
3. 配置对话流程：
   - 添加 LLM 节点（OpenAI/Anthropic/Google）
   - 配置系统提示词
   - 添加工具节点（可选）
   - 添加知识库节点（可选）

### 2. 获取 API Key

1. 进入应用设置
2. 复制 API Key
3. 添加到环境变量：

```bash
# .env.local
DIFY_API_KEY=app-xxxxxxxxxxxxx
```

### 3. 配置 Vercel 环境变量

在 Vercel Dashboard：
1. 进入项目设置
2. Environment Variables
3. 添加 `DIFY_API_KEY`

## API 端点详解

### `/api/chat` 端点

**位置**: `api/chat.ts`

**功能**:
- 代理请求到 Dify API
- 转换 SSE 格式兼容 AI SDK
- 支持图片上传
- 支持上下文记忆

**请求格式**:

```typescript
POST /api/chat

{
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "conversationId": "optional-conversation-id",
  "images": [
    {
      "dataUrl": "data:image/png;base64,...",
      "name": "image.png",
      "type": "image/png"
    }
  ]
}
```

**响应格式** (SSE):

```
data: {"type":"text","content":"你"}
data: {"type":"text","content":"好"}
data: {"type":"done"}
```

### 图片上传流程

```typescript
// 1. 前端发送 base64 图片
const images = [{ dataUrl, name, type }];

// 2. api/chat.ts 上传到 Dify
const uploadedFile = await uploadImageToDify(dataUrl, name, type);

// 3. 将文件 ID 传递给 Dify Chatflow
const response = await fetch(`${DIFY_API_BASE}/chat-messages`, {
  body: JSON.stringify({
    files: [{ type: 'image', transfer_method: 'local_file', upload_file_id: uploadedFile.id }]
  })
});
```

## 前端集成

### 使用 Vercel AI SDK

```typescript
import { useChat } from 'ai/react';

export function ChatApp() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>
          发送
        </button>
      </form>
    </div>
  );
}
```

### 发送图片

```typescript
const { append } = useChat({ api: '/api/chat' });

// 发送带图片的消息
await append({
  role: 'user',
  content: '这是什么？',
  experimental_attachments: [
    {
      name: 'image.png',
      contentType: 'image/png',
      url: dataUrl
    }
  ]
});
```

## Dify Chatflow 配置最佳实践

### 1. 系统提示词

```
你是 KYO 的 AI 助手，一个 Web-Based Agentic AI OS。

你的职责：
- 帮助用户管理书签和便签
- 回答关于 KYO 的问题
- 提供技术支持

你的风格：
- 简洁直白
- 友好专业
- 中文优先
```

### 2. 上下文记忆

在 Dify 中启用"对话历史"功能：
- 保留最近 10 轮对话
- 自动总结长对话
- 支持多轮对话

### 3. 工具调用（Function Calling）

配置工具节点：

**工具 1: 搜索书签**
```json
{
  "name": "search_bookmarks",
  "description": "搜索用户的书签",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "搜索关键词"
      }
    },
    "required": ["query"]
  }
}
```

**工具 2: 创建便签**
```json
{
  "name": "create_sticky",
  "description": "创建新便签",
  "parameters": {
    "type": "object",
    "properties": {
      "content": {
        "type": "string",
        "description": "便签内容"
      },
      "color": {
        "type": "string",
        "enum": ["yellow", "blue", "green", "pink"],
        "description": "便签颜色"
      }
    },
    "required": ["content"]
  }
}
```

### 4. 知识库集成

上传文档到 Dify 知识库：
- KYO 用户手册
- 常见问题 FAQ
- 技术文档

## 调试技巧

### 1. 查看 Dify 日志

在 Dify Dashboard：
1. 进入应用
2. 查看"日志"标签
3. 检查请求/响应

### 2. 本地调试

```typescript
// api/chat.ts 中添加日志
console.log('[Dify Request]', {
  messages,
  conversationId,
  images: images?.length
});

console.log('[Dify Response]', {
  status: response.status,
  headers: response.headers
});
```

### 3. 测试 API 端点

```bash
curl -X POST http://localhost:5173/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }'
```

## 常见问题

### 1. 401 Unauthorized

**原因**: API Key 错误或未配置

**解决**:
```bash
# 检查环境变量
echo $DIFY_API_KEY

# 重新配置
export DIFY_API_KEY=app-xxxxxxxxxxxxx
```

### 2. 图片上传失败

**原因**: 图片格式不支持或太大

**解决**:
- 支持格式：PNG, JPG, WEBP
- 最大尺寸：10MB
- 压缩图片后重试

### 3. 流式响应中断

**原因**: 网络超时或 Dify 服务问题

**解决**:
- 检查网络连接
- 增加超时时间
- 重试请求

### 4. 上下文丢失

**原因**: conversationId 未传递

**解决**:
```typescript
const { messages, append } = useChat({
  api: '/api/chat',
  body: {
    conversationId: currentConversationId
  }
});
```

## 性能优化

### 1. 缓存对话历史

```typescript
// 使用 localStorage 缓存
localStorage.setItem('chat-history', JSON.stringify(messages));
```

### 2. 限流

```typescript
// 防止频繁请求
const [isThrottled, setIsThrottled] = useState(false);

const handleSubmit = async (e) => {
  if (isThrottled) return;
  
  setIsThrottled(true);
  await append({ role: 'user', content: input });
  
  setTimeout(() => setIsThrottled(false), 1000);
};
```

### 3. 压缩图片

```typescript
async function compressImage(dataUrl: string): Promise<string> {
  // 使用 canvas 压缩
  const img = new Image();
  img.src = dataUrl;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const maxWidth = 1024;
  const scale = maxWidth / img.width;
  
  canvas.width = maxWidth;
  canvas.height = img.height * scale;
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvas.toDataURL('image/jpeg', 0.8);
}
```

## 相关文件

- `api/chat.ts` - Dify API 代理
- `src/apps/chat/` - 聊天应用
- `docs/ai/ARCHITECTURE.md` - AI 集成架构

## 相关技能

- [api-endpoint.md](./api-endpoint.md) - API 端点开发
- [debug-common.md](./debug-common.md) - 常见问题调试

## 参考资源

- [Dify 官方文档](https://docs.dify.ai/)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/docs)
- [KYO AI 架构文档](../docs/ai/ARCHITECTURE.md#ai-集成)
