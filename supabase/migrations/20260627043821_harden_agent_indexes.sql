-- Harden agent indexes.
-- Keep one canonical index per access pattern; remove legacy duplicates.

create index if not exists channel_messages_user_idx
on public.channel_messages (user_id);

create index if not exists agent_runs_user_idx
on public.agent_runs (user_id);

create unique index if not exists kyo_items_user_url_unique
on public.kyo_items (user_id, url)
where url is not null;

drop index if exists public.idx_kyo_items_user;
drop index if exists public.idx_kyo_items_dedup;
drop index if exists public.kyo_items_user_url_idx;
