-- Harden agent workspace exposure.
-- Table grants and RLS policies must point in the same direction.

drop policy if exists "Users can manage their own items" on public.kyo_items;
drop policy if exists "users_select_own" on public.kyo_items;
drop policy if exists "users_insert_own" on public.kyo_items;
drop policy if exists "users_update_own" on public.kyo_items;
drop policy if exists "users_delete_own" on public.kyo_items;
drop policy if exists "Public read/write" on public.link_meta;

revoke all on table public.kyo_items from public, anon, authenticated, service_role;
revoke all on table public.link_meta from public, anon, authenticated, service_role;
revoke all on table public.agent_channels from public, anon, authenticated, service_role;
revoke all on table public.channel_messages from public, anon, authenticated, service_role;
revoke all on table public.agent_runs from public, anon, authenticated, service_role;
revoke all on table public.workspace_files from public, anon, authenticated, service_role;

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
