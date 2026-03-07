# apps/terminal/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

### 根目录文件
index.ts: 应用入口,导出 TerminalApp 主组件
metadata.ts: 应用元数据,版本、名称、图标、帮助项

### 子目录模块
components/ - 应用组件
  TerminalApp.tsx: 终端应用主界面,模拟命令行环境

## 应用功能
- 模拟终端环境,纯前端实现
- 支持基本命令: help, clear, echo, date, whoami, version, theme
- 支持 Kyo 特殊命令: bookmarks, stickies
- 命令历史记录 (↑/↓ 导航)
- Tab 自动补全
- 主题适配 (macOS/XP/Win98 风格)

## 依赖关系
- 依赖 @/stores/useBookmarkStore 书签状态
- 依赖 @/stores/useStickiesStore 便签状态
- 依赖 @/stores/useThemeStore 主题状态
- 被 appRegistry 注册
- 被 AppManager 加载

## 命令列表
```
help           - 显示帮助信息
clear          - 清空终端
echo <text>    - 输出文本
date           - 显示当前日期时间
whoami         - 显示当前用户
bookmarks      - 列出所有书签
stickies       - 列出所有便签
theme          - 显示当前主题
version        - 显示 Kyo 版本
```

## 应用约束
1. 纯前端实现,不连接真实 shell
2. 命令在沙盒环境中执行,安全可控
3. 支持命令历史和自动补全
4. 主题样式适配三种系统风格
5. 所有命令同步执行,无异步操作

[PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
