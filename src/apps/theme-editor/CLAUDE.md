# apps/theme-editor/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

### 根目录文件
index.ts: 应用入口，导出 ThemeEditorApp 主组件
metadata.ts: 应用元数据，版本、名称、图标、帮助项

### 子目录模块
components/ - 应用组件
  ThemeEditorApp.tsx: 主题编辑器主界面，Expert Mode 可视化编辑所有 CSS 变量，支持 10 组变量分类、6 种控件类型

## 应用功能
- Expert Mode 主题编辑器，基于 THEME_SCHEMA 分组显示所有 CSS 变量
- 预设皮肤选择（Aqua/System7/Luna/Classic）一键切换
- 变量分组折叠面板：Window、Titlebar、Traffic Lights、Menubar、Dock、Selection、Buttons、Typography、Inputs、Scrollbar
- 6 种控件类型：ColorControl（颜色）、PatternControl（渐变/纹理）、NumberControl（数值滑块）、FontControl（字体）、ShadowControl（阴影）
- 实时预览：修改即生效，无需保存
- 主题导入/导出：JSON 格式，支持文件选择或粘贴
- 多主题管理：保存、更新、删除、加载
- 变量自定义标记：显示哪些变量被修改，支持单个重置

## 依赖关系
- 依赖 @/stores/useCustomThemeStore 自定义主题状态
- 依赖 @/themes/themeSchema 获取 THEME_SCHEMA 和 PRESET_SKINS
- 依赖 @/components/ui UI 组件（Button、Input、Slider、Dialog、Label、Textarea）
- 被 appRegistry 注册
- 被 AppleMenu 调用

## 应用约束
1. 自定义主题持久化到 localStorage（通过 store persist）
2. 编辑时实时预览，通过 applyThemeValues 直接修改 DOM CSS 变量
3. 保存后可随时切换回系统默认主题（activateTheme(null)）
4. 颜色支持 hex 和 rgba 格式，渐变支持完整 CSS 语法
5. 滑块控件支持实时反馈，数值带单位显示
6. 导入的 JSON 格式：{ name: string, version: number, values: Record<string, string | number> }

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
