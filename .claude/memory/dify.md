# Dify 集成记忆

## 配置要点

### API 端点

- **Base URL**: `https://api.dify.ai/v1`
- **端点**: `/chat-messages` (流式) 或 `/chat-messages` (非流式)
- **认证**: Bearer Token (`DIFY_API_KEY`)

### 关键配置

```typescript
// api/chat.ts
const DIFY_API_BASE = "https://api.dify.ai/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// 请求配置
{
  method: "POST",
  headers: {
    "Authorization": `Bearer ${DIFY_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    inputs: {},
    query: userMessage,
    response_mode: "streaming",  // 或 "blocking"
    conversation_id: conversationId,
    user: "kyo-user",
    files: uploadedFiles  // 图片上传
  })
}
```

---

## 已知问题

### 问题 1: 图片上传失败 - 文件名丢失

**现象**: 
- 图片上传到 Dify 后，文件名变成 "blob"
- Dify 返回错误：`file extension not allowed`

**原因**: 
- 使用 `Blob` 对象时，FormData 不会自动设置文件名
- Dify 需要正确的文件名和 MIME 类型

**解决**: 
```typescript
// ❌ 错误：使用 Blob
const blob = dataUrlToBlob(dataUrl, type);
formData.append("file", blob);

// ✅ 正确：使用 File 对象
const file = new File([blob], name, { type: blob.type });
formData.append("file", file);
```

**日期**: 2026-03-04

---

### 问题 2: SSE 流式响应解析错误

**现象**: 
- 流式响应中断
- 前端收到不完整的消息

**原因**: 
- Dify 的 SSE 格式与标准格式略有不同
- 需要手动解析 `data:` 前缀

**解决**: 
```typescript
// 解析 Dify SSE 格式
const lines = chunk.split('\n');
for (const line of lines) {
  if (line.startsWith('data:')) {
    const data = line.slice(5).trim();
    if (data === '[DONE]') break;
    
    const event = JSON.parse(data);
    // 处理事件
  }
}
```

**日期**: 2026-02-28

---

### 问题 3: 对话上下文丢失

**现象**: 
- 多轮对话时，AI 忘记之前的内容
- conversationId 未正确传递

**原因**: 
- 前端未保存 conversationId
- 每次请求都创建新对话

**解决**: 
```typescript
// 保存 conversationId
const [conversationId, setConversationId] = useState<string | null>(null);

// 从响应中提取 conversationId
if (event.conversation_id) {
  setConversationId(event.conversation_id);
}

// 下次请求时传递
await fetch('/api/chat', {
  body: JSON.stringify({
    messages,
    conversationId  // 传递保存的 ID
  })
});
```

**日期**: 2026-02-25

---

## 最佳实践

### 1. 图片上传

```typescript
// 完整的图片上传流程
async function uploadImageToDify(dataUrl: string, name: string, type: string) {
  // 1. 转换为 Blob
  const blob = dataUrlToBlob(dataUrl, type);
  
  // 2. 创建 File 对象（关键！）
  const file = new File([blob], name, { type: blob.type });
  
  // 3. 构建 FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user", "kyo-user");
  
  // 4. 上传
  const response = await fetch(`${DIFY_API_BASE}/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DIFY_API_KEY}` },
    body: formData,
  });
  
  // 5. 返回文件 ID
  const result = await response.json();
  return result.id;
}
```

### 2. 错误处理

```typescript
// 统一错误处理
try {
  const response = await fetch(DIFY_API_BASE, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Dify Error]', response.status, errorText);
    throw new Error(`Dify API failed: ${response.status}`);
  }
  
  return response;
} catch (error) {
  console.error('[Dify Exception]', error);
  throw error;
}
```

### 3. 流式响应处理

```typescript
// 正确处理 SSE 流
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (!line.startsWith('data:')) continue;
    
    const data = line.slice(5).trim();
    if (data === '[DONE]') break;
    
    try {
      const event = JSON.parse(data);
      handleDifyEvent(event);
    } catch (e) {
      console.error('Failed to parse SSE:', e);
    }
  }
}
```

---

## 避免的坑

### 1. 不要直接使用 Blob 上传文件

❌ **错误**:
```typescript
const blob = new Blob([data], { type: 'image/png' });
formData.append('file', blob);
```

✅ **正确**:
```typescript
const file = new File([blob], 'image.png', { type: 'image/png' });
formData.append('file', file);
```

### 2. 不要忘记传递 conversationId

❌ **错误**:
```typescript
// 每次都创建新对话
await fetch('/api/chat', {
  body: JSON.stringify({ messages })
});
```

✅ **正确**:
```typescript
// 保持对话上下文
await fetch('/api/chat', {
  body: JSON.stringify({ 
    messages,
    conversationId: savedConversationId
  })
});
```

### 3. 不要阻塞主线程处理 SSE

❌ **错误**:
```typescript
// 同步处理，阻塞 UI
const text = await response.text();
const lines = text.split('\n');
// 处理...
```

✅ **正确**:
```typescript
// 流式处理，不阻塞 UI
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // 逐块处理
}
```

---

## 性能优化

### 1. 图片压缩

上传前压缩图片，减少传输时间：

```typescript
async function compressImage(dataUrl: string, maxWidth = 1024): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const scale = Math.min(1, maxWidth / img.width);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvas.toDataURL('image/jpeg', 0.8);
}
```

### 2. 请求限流

防止频繁请求：

```typescript
let lastRequestTime = 0;
const MIN_INTERVAL = 1000;  // 1 秒

async function sendMessage(message: string) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  
  if (elapsed < MIN_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL - elapsed));
  }
  
  lastRequestTime = Date.now();
  return await fetch('/api/chat', { ... });
}
```

---

## 调试技巧

### 1. 查看完整请求/响应

```typescript
console.log('[Dify Request]', {
  url: DIFY_API_BASE,
  method: 'POST',
  headers: { Authorization: `Bearer ${DIFY_API_KEY.slice(0, 10)}...` },
  body: JSON.stringify(requestBody, null, 2)
});

console.log('[Dify Response]', {
  status: response.status,
  headers: Object.fromEntries(response.headers.entries()),
  body: await response.clone().text()
});
```

### 2. 测试 API 端点

```bash
# 测试聊天
curl -X POST https://api.dify.ai/v1/chat-messages \
  -H "Authorization: Bearer $DIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {},
    "query": "你好",
    "response_mode": "blocking",
    "user": "test-user"
  }'

# 测试文件上传
curl -X POST https://api.dify.ai/v1/files/upload \
  -H "Authorization: Bearer $DIFY_API_KEY" \
  -F "file=@image.png" \
  -F "user=test-user"
```

---

## 相关文件

- `api/chat.ts` - Dify API 代理端点
- `src/apps/chat/` - 聊天应用
- `.claude/skills/dify-chatflow.md` - Dify 技能文档

---

## 更新日志

### 2026-03-04

- 添加图片上传问题和解决方案
- 添加最佳实践和避免的坑
- 添加性能优化建议

### 2026-02-28

- 添加 SSE 流式响应解析问题

### 2026-02-25

- 添加对话上下文丢失问题
