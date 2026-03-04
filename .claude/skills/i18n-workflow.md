# Skill: 国际化工作流

## 触发条件

- 用户说"添加翻译"
- 用户说"国际化"
- 用户说"多语言支持"
- 用户说"翻译键不显示"

## 前置检查

- [ ] 确认 `i18next` 已安装
- [ ] 确认 4 种语言文件存在
- [ ] 确认 `useTranslation` hook 可用

## 国际化架构

### 支持的语言

- `zh-CN` - 简体中文（默认）
- `en` - 英文
- `ja` - 日语
- `ko` - 韩语

### 翻译文件位置

```
src/lib/locales/
├── zh-CN/
│   └── translation.json
├── en/
│   └── translation.json
├── ja/
│   └── translation.json
└── ko/
    └── translation.json
```

### 翻译键命名规范

```
common.{category}.{key}      # 通用文本
  └─ common.dialog.save
  └─ common.button.cancel

apps.{appId}.{key}           # 应用文本
  └─ apps.bookmarks.search
  └─ apps.stickies.newNote

components.{component}.{key} # 组件文本
  └─ components.menubar.file
  └─ components.dock.settings
```

## 完整工作流

### 1. 在代码中使用翻译

```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('apps.myapp.title', '默认标题')}</h1>
      <p>{t('apps.myapp.description', '默认描述')}</p>
      <button>{t('common.button.save', '保存')}</button>
    </div>
  );
}
```

**注意**:
- 第一个参数是翻译键
- 第二个参数是默认值（fallback）
- 默认值用中文

### 2. 提取翻译键

运行命令：

```bash
bun run i18n:extract
```

这会扫描所有 `.tsx` 和 `.ts` 文件，提取所有 `t()` 调用，生成 `src/lib/locales/keys.json`。

### 3. 同步到所有语言

运行命令：

```bash
bun run i18n:sync
```

这会将新键同步到所有 4 种语言文件，使用默认值作为占位符。

### 4. AI 翻译

运行命令：

```bash
bun run i18n:translate
```

这会使用 OpenAI API 自动翻译所有缺失的键。

**前置条件**:
- 配置 `OPENAI_API_KEY` 环境变量

### 5. 手动检查翻译质量

打开语言文件，检查翻译是否准确：

```json
{
  "apps": {
    "bookmarks": {
      "title": "书签",
      "search": "搜索书签",
      "addFolder": "添加文件夹"
    }
  }
}
```

### 6. 测试

在浏览器中切换语言，检查所有文本是否正确显示。

## 翻译脚本详解

### i18n:extract

**位置**: `scripts/i18n-extract.ts`

**功能**:
- 扫描所有 `.tsx` 和 `.ts` 文件
- 提取 `t('key', 'default')` 调用
- 生成 `keys.json`

**示例输出**:

```json
{
  "apps.bookmarks.title": "书签",
  "apps.bookmarks.search": "搜索书签",
  "common.button.save": "保存"
}
```

### i18n:sync

**位置**: `scripts/i18n-sync.ts`

**功能**:
- 读取 `keys.json`
- 对比现有语言文件
- 添加缺失的键
- 保留现有翻译

**示例**:

```typescript
// 读取 keys.json
const keys = JSON.parse(fs.readFileSync('keys.json', 'utf-8'));

// 对比 zh-CN/translation.json
const zhCN = JSON.parse(fs.readFileSync('zh-CN/translation.json', 'utf-8'));

// 添加缺失的键
for (const [key, value] of Object.entries(keys)) {
  if (!get(zhCN, key)) {
    set(zhCN, key, value);
  }
}

// 写回文件
fs.writeFileSync('zh-CN/translation.json', JSON.stringify(zhCN, null, 2));
```

### i18n:translate

**位置**: `scripts/i18n-translate.ts`

**功能**:
- 读取所有语言文件
- 找出缺失的翻译
- 调用 OpenAI API 翻译
- 写回文件

**示例**:

```typescript
async function translateKey(key: string, value: string, targetLang: string) {
  const prompt = `Translate the following text to ${targetLang}:\n\n${value}`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });
  
  return response.choices[0].message.content;
}
```

## 翻译质量要求

### 中文（zh-CN）

- 使用简体中文
- 大陆用语习惯
- 简洁直白

**示例**:
```json
{
  "common.button.save": "保存",
  "common.button.cancel": "取消",
  "common.dialog.confirm": "确认"
}
```

### 英文（en）

- 简洁直白
- 避免俚语
- 首字母大写

**示例**:
```json
{
  "common.button.save": "Save",
  "common.button.cancel": "Cancel",
  "common.dialog.confirm": "Confirm"
}
```

### 日语（ja）

- 使用敬体（です・ます）
- 避免过于正式
- 适当使用汉字

**示例**:
```json
{
  "common.button.save": "保存",
  "common.button.cancel": "キャンセル",
  "common.dialog.confirm": "確認"
}
```

### 韩语（ko）

- 使用敬体（합니다）
- 避免过于正式
- 适当使用汉字词

**示例**:
```json
{
  "common.button.save": "저장",
  "common.button.cancel": "취소",
  "common.dialog.confirm": "확인"
}
```

## 常见问题

### 1. 翻译键不显示

**原因**: 翻译键不存在或格式错误

**解决**:
```typescript
// ❌ 错误：硬编码
<Button>Save</Button>

// ❌ 错误：键不存在
<Button>{t('common.save')}</Button>

// ✅ 正确：键存在且有默认值
<Button>{t('common.button.save', '保存')}</Button>
```

### 2. 翻译不更新

**原因**: 浏览器缓存

**解决**:
```bash
# 清除缓存
localStorage.clear();

# 或者硬刷新
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### 3. 语言切换不生效

**原因**: i18next 未正确初始化

**解决**:
```typescript
// 检查 i18next 配置
import i18n from '@/lib/i18n';

console.log('Current language:', i18n.language);
console.log('Available languages:', i18n.languages);

// 手动切换语言
i18n.changeLanguage('en');
```

### 4. 翻译文件格式错误

**原因**: JSON 格式错误

**解决**:
```bash
# 使用 JSON 验证工具
bun run validate:json

# 或者手动检查
cat src/lib/locales/zh-CN/translation.json | jq .
```

## 高级用法

### 1. 插值

```typescript
// 翻译文件
{
  "welcome": "欢迎，{{name}}！"
}

// 使用
<p>{t('welcome', { name: '张三' })}</p>
// 输出：欢迎，张三！
```

### 2. 复数

```typescript
// 翻译文件
{
  "items": "{{count}} 个项目",
  "items_plural": "{{count}} 个项目"
}

// 使用
<p>{t('items', { count: 1 })}</p>  // 1 个项目
<p>{t('items', { count: 5 })}</p>  // 5 个项目
```

### 3. 嵌套键

```typescript
// 翻译文件
{
  "apps": {
    "bookmarks": {
      "title": "书签",
      "actions": {
        "add": "添加",
        "delete": "删除"
      }
    }
  }
}

// 使用
<p>{t('apps.bookmarks.title')}</p>
<button>{t('apps.bookmarks.actions.add')}</button>
```

### 4. 命名空间

```typescript
// 使用特定命名空间
const { t } = useTranslation('bookmarks');

<p>{t('title')}</p>  // 等同于 t('bookmarks:title')
```

## 检查清单

新建功能时，确保：

- [ ] 所有按钮文本使用 `t()`
- [ ] 所有标签/占位符使用 `t()`
- [ ] 所有提示/错误消息使用 `t()`
- [ ] 所有菜单项使用 `t()`
- [ ] 所有对话框标题/内容使用 `t()`
- [ ] 运行 `bun run i18n:extract`
- [ ] 运行 `bun run i18n:sync`
- [ ] 运行 `bun run i18n:translate`
- [ ] 手动检查翻译质量
- [ ] 测试所有 4 种语言

## 相关文件

- `src/lib/i18n.ts` - i18next 配置
- `src/lib/locales/` - 翻译文件
- `scripts/i18n-extract.ts` - 提取脚本
- `scripts/i18n-sync.ts` - 同步脚本
- `scripts/i18n-translate.ts` - 翻译脚本

## 相关技能

- [app-new.md](./app-new.md) - 创建新应用（包含 i18n）
- [component-new.md](./component-new.md) - 创建新组件（包含 i18n）

## 参考资源

- [i18next 官方文档](https://www.i18next.com/)
- [React i18next](https://react.i18next.com/)
- [KYO 编码规范](../docs/ai/CONVENTIONS.md#国际化规范)
