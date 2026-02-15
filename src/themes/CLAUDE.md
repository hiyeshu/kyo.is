# themes/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

index.ts: 主题导出入口，统一导出所有主题配置
types.ts: 主题类型定义，Theme、ThemeConfig、ThemeColors、ThemeStyles、OsThemeId
themeSchema.ts: 主题变量 Schema，定义 10 组 CSS 变量（Window/Titlebar/TrafficLights/Menubar/Dock/Selection/Buttons/Typography/Inputs/Scrollbar），预设皮肤（Aqua/Luna/Classic），导入导出工具函数
macosx.ts: Mac OS X 主题配置，Aqua 风格，半透明、阴影、圆角，默认壁纸指向 aqua_kyo
xp.ts: Windows XP 主题配置，Luna 风格，蓝绿色、圆角按钮、任务栏
win98.ts: Windows 98 主题配置，经典 Windows 风格，灰色、方形按钮

## 依赖关系
- 被 @/stores/useThemeStore 使用
- 被 @/stores/useCustomThemeStore 使用（themeSchema）
- 被 @/stores/useCustomThemeStore 使用（THEME_SCHEMA, PRESET_SKINS）
- 被 @/components/layout 布局组件使用
- 被 CSS 变量系统消费

## 主题约束
1. 所有主题必须实现 Theme 接口
2. 主题配置包含颜色、字体、间距、圆角、阴影
3. 主题切换必须平滑过渡，使用 CSS transition
4. 主题必须支持暗色模式（可选）
5. 主题必须适配移动端
6. 主题配置必须导出 CSS 变量
7. 新增主题必须在 useThemeStore 注册

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
