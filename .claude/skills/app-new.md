# Skill: 创建新应用

## 触发条件

- 用户说"添加新应用"
- 用户说"创建一个 XXX 应用"
- 用户说"我想做一个新功能"

## 前置检查

- [ ] 确认 `src/apps/` 目录存在
- [ ] 确认 `src/config/appRegistry.tsx` 可访问
- [ ] 确认应用 ID 未被占用

## 执行步骤

### 1. 创建应用目录结构

```bash
src/apps/{app-id}/
├── index.ts              # 应用入口
├── metadata.ts           # 应用元数据
├── CLAUDE.md             # L2 文档
├── components/
│   └── {AppName}App.tsx  # 主组件
└── hooks/
    └── use{AppName}.ts   # 业务逻辑（可选）
```

### 2. 编写应用入口 (`index.ts`)

```typescript
/**
 * [INPUT]: 依赖 ./components/{AppName}App
 * [OUTPUT]: 对外提供 {AppName}App 主组件
 * [POS]: apps/{app-id} 的入口文件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export { {AppName}App } from './components/{AppName}App';
```

### 3. 编写应用元数据 (`metadata.ts`)

```typescript
/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 {appName}Metadata
 * [POS]: apps/{app-id} 的元数据配置
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const {appName}Metadata = {
  version: '1.0.0',
  name: '{App Name}',
  icon: '/icons/{app-id}.svg',
  helpItems: []
};
```

### 4. 编写主组件 (`components/{AppName}App.tsx`)

```typescript
/**
 * [INPUT]: 依赖 @/apps/base/types 的 AppProps，依赖 react
 * [OUTPUT]: 对外提供 {AppName}App 组件
 * [POS]: apps/{app-id}/components 的主界面组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { AppProps } from '@/apps/base/types';
import { useTranslation } from 'react-i18next';

export function {AppName}App({ instanceId, appId }: AppProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex h-full flex-col bg-background p-4">
      <h1 className="text-xl font-bold">
        {t('apps.{app-id}.title', '{默认标题}')}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t('apps.{app-id}.description', '{默认描述}')}
      </p>
    </div>
  );
}
```

### 5. 注册到 appRegistry

在 `src/config/appRegistry.tsx` 中添加：

```typescript
// 1. 导入应用
const {AppName}App = lazy(() => 
  import('@/apps/{app-id}').then(m => ({ default: m.{AppName}App }))
);

// 2. 导入元数据
import { {appName}Metadata } from '@/apps/{app-id}/metadata';

// 3. 在 appRegistry 对象中添加
export const appRegistry: Record<AppId, AppRegistryEntry> = {
  // ... 其他应用
  '{app-id}': {
    component: {AppName}App,
    metadata: {appName}Metadata,
    windowConfig: {
      defaultSize: { width: 730, height: 475 },
      minSize: { width: 300, height: 200 }
    }
  }
};
```

### 6. 添加应用 ID 到 appIds.ts

在 `src/config/appIds.ts` 中添加：

```typescript
export const APP_IDS = {
  // ... 其他应用
  {APP_ID}: '{app-id}',
} as const;

export type AppId = typeof APP_IDS[keyof typeof APP_IDS];
```

### 7. 添加国际化

在 4 个语言文件中添加翻译：

**`src/lib/locales/zh-CN/translation.json`**:
```json
{
  "apps": {
    "{app-id}": {
      "title": "应用标题",
      "description": "应用描述"
    }
  }
}
```

**`src/lib/locales/en/translation.json`**:
```json
{
  "apps": {
    "{app-id}": {
      "title": "App Title",
      "description": "App Description"
    }
  }
}
```

**`src/lib/locales/ja/translation.json`**:
```json
{
  "apps": {
    "{app-id}": {
      "title": "アプリタイトル",
      "description": "アプリの説明"
    }
  }
}
```

**`src/lib/locales/ko/translation.json`**:
```json
{
  "apps": {
    "{app-id}": {
      "title": "앱 제목",
      "description": "앱 설명"
    }
  }
}
```

### 8. 创建应用图标

在 `public/icons/` 目录下添加 `{app-id}.svg`。

推荐尺寸：64x64px

### 9. 创建 L2 文档

在 `src/apps/{app-id}/CLAUDE.md` 中：

```markdown
# apps/{app-id}/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

### 根目录文件
index.ts: 应用入口，导出 {AppName}App 主组件
metadata.ts: 应用元数据，版本、名称、图标

### 子目录模块
components/ - 应用组件
  {AppName}App.tsx: 应用主界面，{功能描述}
hooks/ - 应用 hooks（可选）
  use{AppName}.ts: 业务逻辑，{功能描述}

## 应用功能
- {功能 1}
- {功能 2}
- {功能 3}

## 依赖关系
- 依赖 @/apps/base/types 的 AppProps
- 依赖 @/components/ui UI 组件
- 被 appRegistry 注册
- 被 AppManager 加载

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
```

### 10. 更新父级 L2 文档

在 `src/apps/CLAUDE.md` 中添加：

```markdown
{app-id}/ - {应用描述}
```

## 验证清单

- [ ] 应用目录结构完整
- [ ] 所有文件都有 L3 头部注释
- [ ] appRegistry 注册成功
- [ ] appIds.ts 已更新
- [ ] 4 种语言的 i18n 都已添加
- [ ] 应用图标已创建
- [ ] L2 文档已创建并更新父级
- [ ] 运行 `bun run dev:vercel` 无报错
- [ ] 应用图标显示在 Dock
- [ ] 窗口可以正常打开和关闭
- [ ] 多实例支持正常

## 常见坑

1. **忘记添加 L3 头部注释** → 违反 GEB 协议，立即补充
2. **appId 与文件夹名不一致** → 导致路由错误
3. **忘记更新 4 种语言** → 违反 i18n 铁律，界面显示 key
4. **组件未接收 AppProps** → 窗口管理失效
5. **忘记更新 L2 文档** → 违反 GEB 协议
6. **图标路径错误** → Dock 显示空白
7. **懒加载路径错误** → 应用无法加载
8. **忘记在 appIds.ts 添加 ID** → TypeScript 类型错误

## 相关技能

- [app-register.md](./app-register.md) - 应用注册详解
- [app-i18n.md](./app-i18n.md) - 国际化详解
- [window-manager.md](./window-manager.md) - 窗口管理器使用

## 示例

参考现有应用：
- `src/apps/bookmarks/` - 书签应用（复杂）
- `src/apps/stickies/` - 便签应用（中等）
- `src/apps/white-noise/` - 白噪音应用（简单）
