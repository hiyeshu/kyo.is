# utils/markdown/
> L2 | 父级: /src/utils/CLAUDE.md

## 成员清单

index.ts: Markdown 工具主文件，Markdown 解析、渲染、语法高亮、链接处理
saveUtils.ts: Markdown 保存工具，导出 Markdown 文件、HTML 文件、PDF 文件

## 依赖关系
- 依赖 react-markdown 解析和渲染
- 依赖 remark-gfm GitHub 风格 Markdown
- 被 TextEdit 应用使用
- 被聊天应用使用

## Markdown 约束
1. 支持 GitHub Flavored Markdown（GFM）
2. 支持代码块语法高亮
3. 支持表格、任务列表、删除线
4. 链接必须在新标签页打开
5. 图片必须懒加载，优化性能
6. HTML 必须使用 DOMPurify 清理，防止 XSS
7. 导出文件必须保留格式和样式

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
