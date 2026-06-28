-- Assistant messages are renderable product state, not audit placeholders.
-- Empty assistant rows created blank "Kyo + date" shells in the chat UI.

delete from public.channel_messages
where role = 'assistant'
  and btrim(content) = '';

alter table public.channel_messages
drop constraint if exists channel_messages_assistant_content_not_blank;

alter table public.channel_messages
add constraint channel_messages_assistant_content_not_blank
check (role <> 'assistant' or btrim(content) <> '');
