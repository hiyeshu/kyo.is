# apps/control-panels/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

### 根目录文件
index.ts: 应用入口，导出 ControlPanelsApp 和元数据
metadata.ts: 应用元数据，版本、名称、图标、帮助项

### 子目录模块
components/ - 应用组件
  ControlPanelsApp.tsx: 系统设置主界面，3 个标签页（Appearance/Sound/System），支持主题切换、壁纸选择、音量控制、备份恢复
  ControlPanelsMenuBar.tsx: 应用菜单栏，File 和 Help 菜单
  WallpaperPicker.tsx: 壁纸选择器，支持 tiles/photos/videos/custom 四种分类，自定义壁纸上传
  VolumeMixer.tsx: 简化版音量混合器，Master 和 UI 两个滑块

## 应用功能
- Appearance 标签页：主题选择、语言切换（10 种语言）、壁纸同步开关、壁纸选择器（含显示模式）
- Sound 标签页：UI 音效开关、Master/UI 音量滑块
- System 标签页：备份/恢复设置、重置所有设置、调试模式开关

## 依赖关系
- 依赖 @/stores/useThemeStore 主题状态
- 依赖 @/stores/useDisplaySettingsStore 显示设置状态
- 依赖 @/stores/useAudioSettingsStore 音频设置状态
- 依赖 @/hooks/useWallpaper 壁纸管理
- 依赖 @/hooks/useSound 音效播放
- 依赖 @/lib/i18n 语言切换（SUPPORTED_LANGUAGES, changeLanguage）
- 依赖 @/utils/wallpapers 壁纸清单加载
- 依赖 @/utils/tabStyles 主题感知的标签样式
- 依赖 @/components/ui UI 组件（Tabs、Select、Switch、Slider、Button）
- 依赖 @/components/dialogs 对话框组件（HelpDialog、AboutDialog、ConfirmDialog）
- 被 appRegistry 注册
- 被 AppleMenu 调用

## 应用约束
1. 备份包含 6 个 localStorage 键：kyo:theme, kyo:theme-sync-wallpaper, kyo:display-settings, kyo:dock, kyo:bookmarks, audio-settings
2. 重置会清除所有 localStorage 并删除 IndexedDB 数据库 "Kyo"
3. 壁纸分类动态从 /wallpapers/manifest.json 加载
4. 自定义壁纸存储在 IndexedDB，使用 indexeddb:// 前缀引用
5. 音量滑块支持静音切换（点击图标）和拖拽调节
6. 主题切换支持壁纸联动（可配置关闭）
7. 语言切换后即时生效，存储在 ryos:language 键

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
