-- Kyo product truth tables.
-- Supabase owns durable user state; Mastra and DeepSeek only execute through typed server boundaries.

create table if not exists public.kyo_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bookmark', 'note')),
  url text,
  title text,
  summary text,
  favicon text,
  text text,
  color text,
  tags text[] not null default '{}'::text[],
  on_desktop boolean not null default false,
  in_dock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.link_meta (
  url text primary key,
  title text,
  description text,
  og_image text,
  favicon_url text,
  site_name text,
  theme_color text,
  summary text,
  tags text[] not null default '{}'::text[],
  fetched_at timestamptz not null default now()
);

create table if not exists public.agent_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Kyo',
  kind text not null default 'chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.agent_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  tool_trace jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.agent_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('running', 'success', 'error')),
  tool_trace jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, path),
  check (path like '/%' and path not like '%..%' and path not like '%//%')
);

alter table public.kyo_items enable row level security;
alter table public.link_meta enable row level security;
alter table public.agent_channels enable row level security;
alter table public.channel_messages enable row level security;
alter table public.agent_runs enable row level security;
alter table public.workspace_files enable row level security;

create policy "kyo_items_owner_all"
on public.kyo_items
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "link_meta_public_read"
on public.link_meta
for select
to anon, authenticated
using (true);

create policy "agent_channels_owner_all"
on public.agent_channels
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "channel_messages_owner_all"
on public.channel_messages
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "agent_runs_owner_all"
on public.agent_runs
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "workspace_files_owner_all"
on public.workspace_files
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

grant select, insert, update, delete on public.kyo_items to authenticated;
grant select on public.link_meta to anon, authenticated;
grant select, insert, update, delete on public.agent_channels to authenticated;
grant select, insert, update, delete on public.channel_messages to authenticated;
grant select, insert, update, delete on public.agent_runs to authenticated;
grant select, insert, update, delete on public.workspace_files to authenticated;

grant select, insert, update, delete on public.kyo_items to service_role;
grant select, insert, update, delete on public.link_meta to service_role;
grant select, insert, update, delete on public.agent_channels to service_role;
grant select, insert, update, delete on public.channel_messages to service_role;
grant select, insert, update, delete on public.agent_runs to service_role;
grant select, insert, update, delete on public.workspace_files to service_role;

create index if not exists kyo_items_user_created_idx
on public.kyo_items (user_id, created_at desc);

create index if not exists kyo_items_user_url_idx
on public.kyo_items (user_id, url);

create index if not exists agent_channels_user_updated_idx
on public.agent_channels (user_id, updated_at desc);

create index if not exists channel_messages_channel_created_idx
on public.channel_messages (channel_id, created_at asc);

create index if not exists agent_runs_channel_created_idx
on public.agent_runs (channel_id, created_at desc);

create index if not exists workspace_files_user_path_idx
on public.workspace_files (user_id, path);
