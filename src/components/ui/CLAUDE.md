# components/ui/
> L2 | 父级: /src/components/CLAUDE.md

## 成员清单

activity-indicator-with-label.tsx: 带标签的活动指示器，显示加载状态和文本
activity-indicator.tsx: 活动指示器，旋转加载动画，支持不同尺寸
alert.tsx: 警告框组件，显示提示、警告、错误信息
audio-bars.tsx: 音频条形图，实时音频可视化，音量指示
audio-input-button.tsx: 音频输入按钮，录音控制，波形显示
badge.tsx: 徽章组件，显示标签、状态、数字
button.tsx: 按钮组件，基于 Radix UI，支持多种变体、尺寸、加载状态
card.tsx: 卡片组件，内容容器，支持标题、描述、操作区
checkbox.tsx: 复选框组件，基于 Radix UI，支持无障碍
dial.tsx: 旋钮组件，旋转控制，用于音量、参数调节
dialog.tsx: 对话框组件，基于 Radix UI，模态弹窗
dropdown-menu.tsx: 下拉菜单组件，基于 Radix UI，支持子菜单、分隔符
input.tsx: 输入框组件，文本输入，支持前缀、后缀、错误状态
label.tsx: 标签组件，表单标签，关联输入框
menubar.tsx: 菜单栏组件，基于 Radix UI，顶部菜单
playback-bars.tsx: 播放条形图，音频播放可视化
right-click-menu.tsx: 右键菜单组件，上下文菜单，支持自定义项
scroll-area.tsx: 滚动区域组件，基于 Radix UI，自定义滚动条
select.tsx: 选择器组件，基于 Radix UI，下拉选择
slider.tsx: 滑块组件，基于 Radix UI，范围选择
sonner.tsx: Toast 通知组件，基于 sonner 库，消息提示
SwipeInstructions.tsx: 滑动指示组件，移动端手势提示
switch.tsx: 开关组件，基于 Radix UI，切换状态
table.tsx: 表格组件，数据展示，支持排序、分页
tabs.tsx: 标签页组件，基于 Radix UI，内容切换
textarea.tsx: 文本域组件，多行文本输入
tooltip.tsx: 提示框组件，基于 Radix UI，悬停提示
volume-bar.tsx: 音量条组件，音量控制，静音切换

## 依赖关系
- 依赖 Radix UI 无障碍组件库
- 依赖 Tailwind CSS 样式
- 依赖 class-variance-authority 变体管理
- 依赖 @/lib/utils 工具函数
- 被所有应用和组件消费

## UI 组件约束
1. 所有组件基于 Radix UI，保证无障碍
2. 样式使用 Tailwind CSS + CVA 变体
3. 组件必须支持 forwardRef，暴露 DOM 引用
4. Props 必须有 TypeScript 类型定义
5. 组件必须支持主题切换，使用 CSS 变量
6. 交互组件必须支持键盘导航
7. 组件必须有清晰的 API，避免过度配置

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
