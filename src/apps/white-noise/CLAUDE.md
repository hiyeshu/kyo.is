# apps/white-noise/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

### 根目录文件
index.ts: 应用入口，导出 WhiteNoiseApp 主组件
metadata.ts: 应用元数据，版本、名称、图标、帮助项

### 子目录模块
components/ - 应用组件
  WhiteNoiseApp.tsx: Braun 风格白噪音收音机，频道按钮、旋钮音量控制、实时音频频谱可视化

## 应用功能
- 5 种环境音：雨声、海浪、森林、篝火、风声
- 循环播放，旋钮拖拽控制音量
- 频道按钮切换声音
- 窗口关闭自动停止播放
- 实时音频频谱可视化（格栅区域显示 8 段波形，使用主题色）

## 依赖关系
- 依赖 @/components/layout/WindowFrame 窗口框架
- 依赖 Web Audio API (AudioContext + AnalyserNode + MediaElementSource)
- 被 appRegistry 注册

## 音频资源
音频文件位于 public/sounds/ambient/：
- rain.mp3 - 雨声
- ocean.mp3 - 海浪
- forest.mp3 - 森林
- fire.mp3 - 篝火
- wind.mp3 - 风声

## 设计语言 - 三套收音机皮肤

### macOS Aqua: Braun SK4 风格
- 色彩：米白 #F5F5F0，橙色指示 #E85D04
- 格栅：水平条纹，深灰色调
- 按钮：简洁数字，按下态反色
- 旋钮：金属质感，橙色指示线
- 字体：Helvetica Neue，300 字重

### Windows XP: Media Player 风格
- 色彩：Luna 蓝渐变，金属面板
- 格栅：深蓝色调，FM 频率刻度装饰
- 按钮：3D 渐变，蓝色激活态
- 旋钮：金属质感，蓝色指示线
- 指示灯：绿色 LED 方块

### Windows 98: 经典 3D 凸起
- 色彩：#C0C0C0 灰色
- 格栅：黑色像素条纹
- 按钮：经典 3D 凸起/凹陷
- 旋钮：灰色金属，蓝色指示
- 指示灯：绿色 LED 方块

设计原则：
1. 形式追随功能 - 每个元素都有明确用途
2. 主题一致性 - 与操作系统视觉语言融合
3. 拟物美学 - 致敬实体收音机的交互方式

## 应用约束
1. 音频循环播放 (loop=true)
2. 窗口关闭时必须停止播放并释放资源
3. 同一时间只能播放一种声音
4. 所有文本必须国际化

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
