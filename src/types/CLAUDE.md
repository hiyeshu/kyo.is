# types/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

aiModels.ts: AI 模型类型定义，支持的模型列表、模型配置、能力描述
appInitialData.ts: 应用初始数据类型，应用启动时的初始状态、配置、参数
chat.ts: 聊天相关类型，消息、用户、聊天室、在线状态、工具调用
js-dos.d.ts: js-dos 库类型声明，DOS 模拟器 API 类型定义
lyrics.ts: 歌词类型定义，歌词行、时间戳、翻译、同步歌词
shader.ts: 着色器类型定义，GLSL 着色器配置、uniform 参数
types.ts: 通用类型定义，窗口、文件系统、应用状态、主题、壁纸

## 依赖关系
- 被所有模块导入使用
- 依赖 TypeScript 类型系统
- 部分类型依赖第三方库类型（如 Pusher、Tone.js）

## 类型设计约束
1. 所有类型必须导出，方便其他模块使用
2. 复杂类型使用 interface，简单类型使用 type
3. 枚举使用 const enum 或 union type
4. 避免 any，使用 unknown 或泛型
5. 可选属性使用 ? 标记，避免 undefined
6. 类型必须有清晰的命名，避免缩写
7. 复杂类型必须有 JSDoc 注释说明用途

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
