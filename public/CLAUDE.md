# public/
> L2 | 父级: /CLAUDE.md

成员清单
assets/ - 静态媒体资产，图标、游戏封面、DOS 游戏包等由 Vite 复制到 dist。
css/ - 主题补充样式，提供 public 级别的兼容 CSS。
data/ - 静态 JSON 数据，供应用启动时读取。
docs/ - 由 scripts/generate-docs.ts 生成的静态文档 HTML。

架构决策
public/ 是 Cloudflare Worker Static Assets 的输入面。任何单文件必须小于 25 MiB；超过限制的内容应放 R2/CDN，再由 Worker 或应用配置引用。

依赖关系
vite build -> public/ -> dist/
wrangler assets -> dist/

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
