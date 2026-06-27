# public/assets/
> L2 | 父级: /public/CLAUDE.md

成员清单
games/ - 游戏封面与 DOS 游戏包，供 Virtual PC/展示资产使用。
icons/ - 系统与应用图标，多主题桌面外观的视觉资产。
wallpapers/ - 壁纸图片与视频资产。
sounds/ - 系统音效与应用音频资产。

架构决策
assets/ 只放可直接静态分发的文件。Cloudflare Static Assets 单文件上限是 25 MiB，超限资产必须外置到 R2/CDN。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
