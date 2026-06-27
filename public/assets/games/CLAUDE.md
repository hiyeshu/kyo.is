# public/assets/games/
> L2 | 父级: /public/assets/CLAUDE.md

成员清单
images/ - 游戏封面 webp，用于卡片、平均色生成和视觉预览。
jsdos/ - js-dos 游戏包，小体积包随静态资产部署。

架构决策
游戏包属于可选体验，不是核心应用启动依赖。超过 Cloudflare 25 MiB 单文件上限的包不得放在 jsdos/ 中，应迁到 R2/CDN。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
