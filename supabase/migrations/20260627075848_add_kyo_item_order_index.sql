alter table public.kyo_items
add column if not exists order_index integer;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, type
      order by created_at asc, id asc
    ) - 1 as next_order
  from public.kyo_items
  where order_index is null
)
update public.kyo_items as item
set order_index = ranked.next_order
from ranked
where item.id = ranked.id;

alter table public.kyo_items
alter column order_index set default 0;

alter table public.kyo_items
alter column order_index set not null;

create index if not exists kyo_items_user_type_order_idx
on public.kyo_items (user_id, type, order_index asc, created_at asc);
