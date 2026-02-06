# components/dialogs/
> L2 | 父级: /src/components/CLAUDE.md

## 成员清单

AboutDialog.tsx: 关于对话框，显示应用版本、作者、GitHub 链接、许可证
AboutFinderDialog.tsx: 关于 Finder 对话框，显示 Finder 版本、系统信息
BootScreen.tsx: 启动屏幕，首次启动欢迎界面、加载动画、启动消息
ConfirmDialog.tsx: 确认对话框，通用确认弹窗，支持自定义标题、内容、按钮
HelpDialog.tsx: 帮助对话框，显示应用帮助文档、快捷键、使用指南
InputDialog.tsx: 输入对话框，通用输入弹窗，支持文本输入、验证
LoginDialog.tsx: 登录对话框，用户登录界面，用户名密码输入、注册链接
LogoutDialog.tsx: 登出对话框，确认登出、清除会话
ShareItemDialog.tsx: 分享对话框，生成分享链接、二维码、社交分享

## 依赖关系
- 依赖 @/components/ui/dialog Dialog 组件
- 依赖 @/hooks 自定义 hooks
- 依赖 @/stores 全局状态
- 被应用和布局组件调用

## 对话框约束
1. 所有对话框基于 ui/dialog 组件
2. 对话框必须支持键盘操作（ESC 关闭、Enter 确认）
3. 对话框必须支持无障碍（ARIA 属性）
4. 对话框必须支持移动端适配
5. 对话框必须有清晰的关闭机制
6. 对话框内容必须支持国际化
7. 对话框必须有加载状态和错误处理

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
