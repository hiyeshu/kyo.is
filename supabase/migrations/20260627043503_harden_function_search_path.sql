-- Harden function search paths.
-- Existing behavior stays unchanged; only name resolution becomes deterministic.

create or replace function public.search_items(q text, lim integer default 20)
returns setof public.kyo_items
language sql
stable
set search_path = public
as $function$
  select distinct ki.*
  from public.kyo_items ki
  left join public.link_meta lm on lm.url = ki.url
  where ki.user_id = auth.uid()
    and (
      ki.title ilike '%' || q || '%'
      or ki.summary ilike '%' || q || '%'
      or ki.text ilike '%' || q || '%'
      or ki.url ilike '%' || q || '%'
      or ki.tags::text ilike '%' || q || '%'
      or lm.description ilike '%' || q || '%'
    )
  order by ki.created_at desc
  limit lim;
$function$;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;
