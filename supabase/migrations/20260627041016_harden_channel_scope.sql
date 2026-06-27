-- Harden channel-scoped records.
-- Message and run rows must point at a channel owned by the same user.

alter policy "channel_messages_owner_all"
on public.channel_messages
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.agent_channels
    where agent_channels.id = channel_messages.channel_id
      and agent_channels.user_id = channel_messages.user_id
  )
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.agent_channels
    where agent_channels.id = channel_messages.channel_id
      and agent_channels.user_id = channel_messages.user_id
  )
);

alter policy "agent_runs_owner_all"
on public.agent_runs
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.agent_channels
    where agent_channels.id = agent_runs.channel_id
      and agent_channels.user_id = agent_runs.user_id
  )
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.agent_channels
    where agent_channels.id = agent_runs.channel_id
      and agent_channels.user_id = agent_runs.user_id
  )
);
