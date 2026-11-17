-- Makbas 0004: seller ratings.
-- A buyer may rate a completed order once, with 1 to 5 stars. There is no free text on purpose:
-- review text would be one more place where a seller's name could be written.

create table public.order_ratings (
  order_id    uuid primary key references public.orders(id) on delete cascade,
  seller_id   uuid not null references public.sellers(id) on delete cascade,
  stars       smallint not null check (stars between 1 and 5),
  created_at  timestamptz not null default now()
);

alter table public.order_ratings enable row level security;

-- Visible to whoever can see the order (buyer, seller, admin). The public only sees the seller's average.
create policy order_ratings_read on public.order_ratings for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_ratings.order_id));

grant select on public.order_ratings to authenticated;
grant select, insert, update, delete on public.order_ratings to service_role;

create function public.buyer_rate_order(p_no text, p_stars integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
begin
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  select * into o from public.orders where no = p_no and buyer_id = (select app.buyer_id());
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if o.status <> 'completed' then
    raise exception 'invalid_transition' using errcode = 'P0001', hint = 'Only a completed order can be rated.';
  end if;

  -- The seller row is locked so two ratings arriving together update the average one after the other.
  perform 1 from public.sellers s where s.id = o.seller_id for update;
  begin
    insert into public.order_ratings (order_id, seller_id, stars) values (o.id, o.seller_id, p_stars);
  exception when unique_violation then
    raise exception 'already_rated' using errcode = 'P0001';
  end;
  update public.sellers s
  set rating_count = s.rating_count + 1,
      rating_avg = round(((coalesce(s.rating_avg, 0) * s.rating_count) + p_stars) / (s.rating_count + 1), 2)
  where s.id = o.seller_id;
end
$$;

revoke execute on function public.buyer_rate_order(text, integer) from public, anon, authenticated;
grant execute on function public.buyer_rate_order(text, integer) to authenticated;
