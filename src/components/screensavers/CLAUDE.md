# components/screensavers/
> L2 | 父级: /src/components/CLAUDE.md

## 成员清单

ScreenSaverOverlay.tsx: 屏保覆盖层，全屏遮罩，管理屏保激活、退出、超时检测
index.ts: 屏保导出入口，统一导出所有屏保组件
BouncingLogo.tsx: 弹跳 Logo 屏保，经典 DVD Logo 弹跳效果，碰撞检测
FlyingToasters.tsx: 飞行烤面包机屏保，致敬经典 After Dark 屏保
Matrix.tsx: 矩阵雨屏保，绿色字符雨，黑客帝国风格
Maze.tsx: 迷宫屏保，随机生成迷宫，深度优先搜索算法
Pipes.tsx: 管道屏保，3D 管道生长动画，Windows 经典屏保
Starfield.tsx: 星空屏保，星星飞行效果，太空穿梭感

## 依赖关系
- 依赖 Canvas API 绘制动画
- 依赖 requestAnimationFrame 动画循环
- 依赖 @/stores/useDisplaySettingsStore 屏保设置
- 被 ScreenSaverOverlay 加载

## 屏保约束
1. 所有屏保必须使用 Canvas 绘制，避免 DOM 操作
2. 动画必须使用 requestAnimationFrame，避免 setInterval
3. 屏保激活后禁用鼠标和键盘事件（除了退出）
4. 屏保必须支持全屏，覆盖整个视口
5. 屏保必须有退出机制（鼠标移动、键盘按键）
6. 屏保必须优化性能，避免卡顿（FPS >= 30）
7. 屏保卸载时必须清理 Canvas 和事件监听

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
