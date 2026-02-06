# lib/shaders/
> L2 | 父级: /src/lib/CLAUDE.md

## 成员清单

basicFilter.frag: 基础滤镜片段着色器，GLSL 代码，实现图像滤镜效果（灰度、反色、模糊等）

## 依赖关系
- 被 lib/webglFilterRunner.ts 加载
- 被 Photo Booth 应用使用
- 被屏保使用（可选）

## 着色器约束
1. 所有着色器必须是 GLSL ES 2.0 语法
2. 着色器必须有清晰的 uniform 参数注释
3. 着色器必须优化性能，避免复杂计算
4. 着色器必须支持多种分辨率
5. 着色器必须有错误处理，编译失败时降级
6. 着色器文件命名规范：功能名.frag 或 .vert
7. 着色器必须在 WebGL 上下文中测试

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
