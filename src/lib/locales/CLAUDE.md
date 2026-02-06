# lib/locales/
> L2 | 父级: /src/lib/CLAUDE.md

## 成员清单

### 语言目录
de/ - 德语翻译文件（Deutsch）
en/ - 英语翻译文件（English）
es/ - 西班牙语翻译文件（Español）
fr/ - 法语翻译文件（Français）
it/ - 意大利语翻译文件（Italiano）
ja/ - 日语翻译文件（日本語）
ko/ - 韩语翻译文件（한국어）
pt/ - 葡萄牙语翻译文件（Português）
ru/ - 俄语翻译文件（Русский）
zh-TW/ - 繁体中文翻译文件（繁體中文）

## 文件结构
每个语言目录包含：
- common.json: 通用翻译（按钮、标签、提示）
- apps.json: 应用名称和描述
- menus.json: 菜单项翻译
- dialogs.json: 对话框文本
- errors.json: 错误消息

## 依赖关系
- 被 lib/i18n.ts 加载
- 被 i18next 库消费
- 被所有组件通过 useTranslation 使用

## 翻译约束
1. 所有翻译文件必须是有效的 JSON
2. 翻译键必须与 en/ 保持一致
3. 缺失的翻译会回退到英语
4. 翻译必须保留占位符（如 {{name}}）
5. 翻译必须考虑文化差异和语境
6. 新增翻译键必须同步到所有语言
7. 使用 scripts/i18n:sync 同步翻译

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
