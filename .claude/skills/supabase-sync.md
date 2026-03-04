# Skill: Supabase 同步配置

## 触发条件

- 用户说"配置 Supabase"
- 用户说"设置云同步"
- 用户说"书签/便签同步不工作"
- 用户说"如何实现多设备同步"

## 前置检查

- [ ] 确认 Supabase 项目已创建
- [ ] 确认环境变量已配置
- [ ] 确认 `@supabase/supabase-js` 已安装

## Supabase 架构

### 数据流

```
用户操作
    ↓
Zustand Store (本地)
    ↓
IndexedDB (离线缓存)
    ↓
Supabase Client
    ↓
Supabase Database (云端)
    ↓
实时同步到其他设备
```

### 核心功能

1. **用户认证** - 邮箱/OAuth 登录
2. **书签同步** - 实时同步书签数据
3. **便签同步** - 实时同步便签数据
4. **冲突解决** - 多设备编辑冲突处理
5. **离线支持** - 离线编辑，联网后同步

## 配置步骤

### 1. 创建 Supabase 项目

1. 登录 [Supabase](https://supabase.com/)
2. 创建新项目
3. 记录以下信息：
   - Project URL: `https://xxx.supabase.co`
   - Anon Key: `eyJ...`

### 2. 配置环境变量

```bash
# .env.local
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

在 Vercel Dashboard 也要配置相同的环境变量。

### 3. 创建数据库表

在 Supabase SQL Editor 执行：

```sql
-- ============================================================================
-- 用户表（Supabase Auth 自动创建）
-- ============================================================================

-- ============================================================================
-- 书签表
-- ============================================================================
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  favicon TEXT,
  icon JSONB,  -- { type: 'favicon' | 'custom' | 'emoji', value: string }
  folder_id UUID,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX bookmarks_user_id_idx ON bookmarks(user_id);
CREATE INDEX bookmarks_folder_id_idx ON bookmarks(folder_id);
CREATE INDEX bookmarks_deleted_at_idx ON bookmarks(deleted_at);

-- RLS 策略
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
  ON bookmarks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 便签表
-- ============================================================================
CREATE TABLE stickies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  color TEXT DEFAULT 'yellow',
  position JSONB,  -- { x: number, y: number }
  size JSONB,      -- { width: number, height: number }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX stickies_user_id_idx ON stickies(user_id);
CREATE INDEX stickies_deleted_at_idx ON stickies(deleted_at);

-- RLS 策略
ALTER TABLE stickies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stickies"
  ON stickies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stickies"
  ON stickies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stickies"
  ON stickies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stickies"
  ON stickies FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 触发器：自动更新 updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stickies_updated_at
  BEFORE UPDATE ON stickies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 4. 创建 Supabase Client

创建 `src/lib/supabase.ts`:

```typescript
/**
 * [INPUT]: 依赖 @supabase/supabase-js，环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY
 * [OUTPUT]: 对外提供 supabase 客户端实例
 * [POS]: lib/ 的 Supabase 客户端，被所有需要云同步的模块使用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

### 5. 创建认证 Hook

创建 `src/hooks/useSupabaseAuth.ts`:

```typescript
/**
 * [INPUT]: 依赖 @/lib/supabase，依赖 react
 * [OUTPUT]: 对外提供 useSupabaseAuth hook
 * [POS]: hooks/ 的 Supabase 认证 hook
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取当前用户
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    return { data, error };
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };
}
```

### 6. 创建书签同步 Hook

创建 `src/hooks/useBookmarkSync.ts`:

```typescript
/**
 * [INPUT]: 依赖 @/lib/supabase，依赖 @/stores/useBookmarkStore
 * [OUTPUT]: 对外提供 useBookmarkSync hook
 * [POS]: hooks/ 的书签同步 hook
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useBookmarkStore } from '@/stores/useBookmarkStore';

export function useBookmarkSync(userId: string | null) {
  const { bookmarks, setBookmarks, addBookmark, updateBookmark, deleteBookmark } = useBookmarkStore();

  // 初始加载
  useEffect(() => {
    if (!userId) return;

    const loadBookmarks = async () => {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .is('deleted_at', null)
        .order('position', { ascending: true });

      if (error) {
        console.error('Failed to load bookmarks:', error);
        return;
      }

      setBookmarks(data);
    };

    loadBookmarks();
  }, [userId]);

  // 实时同步
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('bookmarks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addBookmark(payload.new);
          } else if (payload.eventType === 'UPDATE') {
            updateBookmark(payload.new.id, payload.new);
          } else if (payload.eventType === 'DELETE') {
            deleteBookmark(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 同步本地变更到云端
  const syncToCloud = async (bookmark: any, action: 'create' | 'update' | 'delete') => {
    if (!userId) return;

    if (action === 'create') {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ ...bookmark, user_id: userId });
      
      if (error) console.error('Failed to create bookmark:', error);
    } else if (action === 'update') {
      const { error } = await supabase
        .from('bookmarks')
        .update(bookmark)
        .eq('id', bookmark.id);
      
      if (error) console.error('Failed to update bookmark:', error);
    } else if (action === 'delete') {
      const { error } = await supabase
        .from('bookmarks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', bookmark.id);
      
      if (error) console.error('Failed to delete bookmark:', error);
    }
  };

  return { syncToCloud };
}
```

## 冲突解决策略

### Last-Write-Wins (LWW)

使用 `updated_at` 时间戳决定哪个版本是最新的：

```typescript
function resolveConflict(local: Bookmark, remote: Bookmark): Bookmark {
  const localTime = new Date(local.updated_at).getTime();
  const remoteTime = new Date(remote.updated_at).getTime();
  
  return remoteTime > localTime ? remote : local;
}
```

### 字段级合并

对于复杂对象，可以字段级合并：

```typescript
function mergeBookmarks(local: Bookmark, remote: Bookmark): Bookmark {
  return {
    ...local,
    title: remote.updated_at > local.updated_at ? remote.title : local.title,
    url: remote.updated_at > local.updated_at ? remote.url : local.url,
    // ... 其他字段
  };
}
```

## 离线支持

### 1. 检测网络状态

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### 2. 离线队列

```typescript
const offlineQueue: Array<{ action: string; data: any }> = [];

function queueOfflineAction(action: string, data: any) {
  offlineQueue.push({ action, data });
  localStorage.setItem('offline-queue', JSON.stringify(offlineQueue));
}

async function syncOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
  
  for (const item of queue) {
    await syncToCloud(item.data, item.action);
  }
  
  localStorage.removeItem('offline-queue');
}
```

## 常见问题

### 1. RLS 策略不生效

**原因**: 未启用 RLS 或策略配置错误

**解决**:
```sql
-- 检查 RLS 是否启用
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'bookmarks';

-- 启用 RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
```

### 2. 实时同步不工作

**原因**: Realtime 未启用或订阅失败

**解决**:
1. 在 Supabase Dashboard 启用 Realtime
2. 检查订阅状态：
```typescript
channel.on('system', {}, (payload) => {
  console.log('Channel status:', payload);
});
```

### 3. 数据冲突

**原因**: 多设备同时编辑

**解决**: 使用冲突解决策略（见上文）

## 性能优化

### 1. 批量同步

```typescript
async function batchSync(bookmarks: Bookmark[]) {
  const { error } = await supabase
    .from('bookmarks')
    .upsert(bookmarks);
  
  if (error) console.error('Batch sync failed:', error);
}
```

### 2. 增量同步

```typescript
async function incrementalSync(lastSyncTime: string) {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .gt('updated_at', lastSyncTime);
  
  if (error) {
    console.error('Incremental sync failed:', error);
    return;
  }
  
  // 合并到本地
  mergeBookmarks(data);
}
```

## 相关文件

- `src/lib/supabase.ts` - Supabase 客户端
- `src/hooks/useSupabaseAuth.ts` - 认证 Hook
- `src/hooks/useBookmarkSync.ts` - 书签同步 Hook
- `src/hooks/useStickySync.ts` - 便签同步 Hook

## 相关技能

- [auth-setup.md](./auth-setup.md) - 用户认证配置
- [offline-support.md](./offline-support.md) - 离线支持

## 参考资源

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
