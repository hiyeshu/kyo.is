# _api/chat/tools/
> L2 | 父级: /_api/CLAUDE.md

## 成员清单

index.ts: 工具注册中心，导出所有可用工具、工具配置、工具调用入口
schemas.ts: 工具参数 Schema，Zod 验证规则、参数类型定义、默认值
types.ts: 工具类型定义，Tool、ToolExecutor、ToolResult、ToolContext
executors.ts: 工具执行器，实现所有工具的执行逻辑、错误处理、超时控制

## 工具列表
- launchApp: 启动应用，打开指定应用窗口
- closeApp: 关闭应用，关闭指定应用实例
- minimizeApp: 最小化应用，隐藏窗口到 Dock
- getOpenApps: 获取打开的应用列表
- setWallpaper: 设置壁纸，更改桌面背景
- setTheme: 设置主题，切换 System 7/Aqua/XP/Win98
- playSound: 播放音效，触发系统音效
- getSystemInfo: 获取系统信息，版本、主题、应用列表

## 依赖关系
- 依赖 Zod 参数验证
- 依赖 Vercel AI SDK 工具调用
- 被 _api/chat.ts 调用
- 被前端通过 AI 对话触发

## 工具约束
1. 所有工具必须有 Zod Schema 验证参数
2. 工具执行必须有超时控制（默认 5 秒）
3. 工具执行失败必须返回友好错误信息
4. 工具必须是幂等的，重复调用不产生副作用
5. 工具必须有权限检查，防止滥用
6. 工具结果必须是 JSON 可序列化的
7. 工具必须有清晰的描述，供 AI 理解

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
