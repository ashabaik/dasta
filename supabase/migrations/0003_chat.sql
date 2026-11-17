-- Dasta 0003: buyer-seller chat with contact-detail filtering, moderation queue, strikes,
-- and the same guard on seller-written listing text.
--
-- Rules this file sets up:
--   * Nobody can INSERT a message directly. A message enters only through chat_post_message, which only
--     the server may call after it has run the contact filter.
--   * The database has its own simpler check (private.looks_like_contact) as a second layer: even if the
--     server said "clean", a message that looks like a phone number, an e-mail or a link is held.
--   * A held or blocked message is invisible to the other party. Its text is kept in the private schema
--     for the admin's review only.
--   * Three active strikes suspend a user's chat.

-- ---------------------------------------------------------------------------------------------------
-- Second-layer check, in SQL
-- ---------------------------------------------------------------------------------------------------
create function private.looks_like_contact(p_text text) returns boolean
language sql immutable set search_path = '' as $$
  with n as (
    select lower(translate(
      regexp_replace(coalesce(p_text, ''), '[' || chr(8203) || '-' || chr(8207) || chr(8234) || '-' || chr(8238) || chr(8288) || '-' || chr(8292) || chr(65279) || chr(173) || chr(1600) || ']', '', 'g'),
      '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789')) as t
  )
  select
    -- nine or more digits with only number-style separators between them (a date or a price is shorter;
    -- the server filter handles 7 and 8 digit numbers with more context)
    t ~ '(\+?\d[\s\-.()/_,]{0,3}){9,}'
    or t ~ '@'
    or t ~ '(https?://|www\.)'
    or t ~ '[a-z0-9-]{2,}\.(com|net|org|eg|io|me|co)(\M|/)'
  from n
$$;

-- ---------------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------------
create table public.threads (
  id               uuid primary key default gen_random_uuid(),
  buyer_id         uuid not null references public.buyers(id) on delete cascade,
  seller_id        uuid not null references public.sellers(id) on delete cascade,
  product_id       uuid references public.products(id) on delete set null,
  buyer_code       text not null,
  seller_code      text not null,
  product_ref      text not null,
  title_en         text not null,
  title_ar         text not null,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  unique (buyer_id, seller_id, product_ref)
);
create index threads_buyer_idx on public.threads (buyer_id, last_message_at desc);
create index threads_seller_idx on public.threads (seller_id, last_message_at desc);

create table public.messages (
  id          bigint generated always as identity primary key,
  thread_id   uuid not null references public.threads(id) on delete cascade,
  sender      text not null check (sender in ('buyer', 'seller')),
  body        text not null default '' check (length(body) <= 1000),   -- empty unless delivered or released
  status      text not null check (status in ('delivered', 'held', 'blocked', 'released', 'removed')),
  created_at  timestamptz not null default now(),
  check (status in ('delivered', 'released') or body = '')
);
create index messages_thread_idx on public.messages (thread_id, id);

-- What was actually typed, and why it was stopped. Admin only.
create table private.message_originals (
  message_id   bigint primary key references public.messages(id) on delete cascade,
  sender_user  uuid not null references auth.users(id) on delete cascade,
  body         text not null,
  severity     text not null check (severity in ('hold', 'block')),
  reasons      text[] not null default '{}',
  reviewed_at  timestamptz,
  decision     text check (decision in ('released', 'confirmed'))
);

create table private.chat_strikes (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  message_id  bigint references public.messages(id) on delete set null,
  created_at  timestamptz not null default now(),
  cleared_at  timestamptz
);
create index chat_strikes_user_idx on private.chat_strikes (user_id) where cleared_at is null;

alter table public.threads             enable row level security;
alter table public.messages            enable row level security;
alter table private.message_originals  enable row level security;
alter table private.chat_strikes       enable row level security;

create policy threads_read on public.threads for select to authenticated
  using (buyer_id = (select app.buyer_id()) or seller_id = (select app.seller_id()) or (select app.is_admin()));

-- A party sees delivered and released messages, plus their own stopped ones (as an empty placeholder).
-- The other party never learns that a message was stopped.
create policy messages_read on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.threads t
      where t.id = messages.thread_id
        and (
          (select app.is_admin())
          or (t.buyer_id = (select app.buyer_id()) and (messages.status in ('delivered', 'released') or messages.sender = 'buyer'))
          or (t.seller_id = (select app.seller_id()) and (messages.status in ('delivered', 'released') or messages.sender = 'seller'))
        )
    )
  );

grant select on public.threads, public.messages to authenticated;
-- No INSERT, UPDATE or DELETE grant on purpose.

-- Live updates: Supabase Realtime only sends a row to a subscriber who may SELECT it.
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------------------------------
-- Buyer opens a thread about a product (one thread per buyer, seller and product).
-- ---------------------------------------------------------------------------------------------------
create function public.chat_open_thread(p_product_ref text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_buyer  uuid := (select app.buyer_id());
  v_bcode  text;
  p        public.products%rowtype;
  s        public.sellers%rowtype;
  v_id     uuid;
begin
  if v_buyer is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into p from public.products where ref = p_product_ref;
  if not found or p.status <> 'active' then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  select * into s from public.sellers where id = p.seller_id;
  if s.status <> 'active' then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  select b.code into v_bcode from public.buyers b where b.id = v_buyer;

  insert into public.threads (buyer_id, seller_id, product_id, buyer_code, seller_code, product_ref, title_en, title_ar)
  values (v_buyer, s.id, p.id, v_bcode, s.code, p.ref, p.title_en, p.title_ar)
  on conflict (buyer_id, seller_id, product_ref) do update set product_id = excluded.product_id
  returning id into v_id;
  return v_id;
end
$$;

-- ---------------------------------------------------------------------------------------------------
-- Posting a message. Server only (secret key). p_verdict is the server filter's verdict.
-- ---------------------------------------------------------------------------------------------------
create function public.chat_post_message(
  p_thread_id uuid, p_user_id uuid, p_body text, p_verdict text, p_reasons text[]
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t          public.threads%rowtype;
  v_sender   text;
  v_verdict  text := p_verdict;
  v_reasons  text[] := coalesce(p_reasons, '{}');
  v_body     text := btrim(coalesce(p_body, ''));
  v_strikes  integer;
  v_id       bigint;
  v_status   text;
begin
  if v_verdict not in ('clean', 'hold', 'block') or length(v_body) < 1 or length(v_body) > 1000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  select * into t from public.threads where id = p_thread_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- Who is this user in this thread? Anyone else is refused.
  if exists (select 1 from private.buyer_accounts a where a.user_id = p_user_id and a.buyer_id = t.buyer_id) then
    v_sender := 'buyer';
  elsif exists (select 1 from private.seller_accounts a where a.user_id = p_user_id and a.seller_id = t.seller_id) then
    v_sender := 'seller';
  else
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select count(*) into v_strikes from private.chat_strikes k where k.user_id = p_user_id and k.cleared_at is null;
  if v_strikes >= 3 then
    raise exception 'chat_suspended' using errcode = 'P0001';
  end if;

  -- At most 30 messages per user in 10 minutes.
  if (select count(*) from public.messages m join public.threads th on th.id = m.thread_id
      where m.created_at > now() - interval '10 minutes' and m.sender = v_sender
        and ((v_sender = 'buyer' and th.buyer_id = t.buyer_id) or (v_sender = 'seller' and th.seller_id = t.seller_id))) >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- Second layer: the database's own check can only make the verdict stricter.
  if v_verdict = 'clean' and private.looks_like_contact(v_body) then
    v_verdict := 'hold';
    v_reasons := array_append(v_reasons, 'database_check');
  end if;

  v_status := case v_verdict when 'clean' then 'delivered' when 'hold' then 'held' else 'blocked' end;
  insert into public.messages (thread_id, sender, body, status)
  values (t.id, v_sender, case when v_verdict = 'clean' then v_body else '' end, v_status)
  returning id into v_id;

  if v_verdict <> 'clean' then
    insert into private.message_originals (message_id, sender_user, body, severity, reasons)
    values (v_id, p_user_id, v_body, v_verdict, v_reasons);
  end if;
  if v_verdict = 'block' then
    insert into private.chat_strikes (user_id, message_id) values (p_user_id, v_id);
    v_strikes := v_strikes + 1;
  end if;

  update public.threads set last_message_at = now() where id = t.id;
  return jsonb_build_object('id', v_id, 'status', v_status, 'strikes', v_strikes);
end
$$;

-- How many strikes the signed-in user has.
create function public.chat_my_status() returns table (strikes integer, suspended boolean)
language sql stable security definer set search_path = '' as $$
  select count(*)::integer, count(*) >= 3
  from private.chat_strikes k where k.user_id = (select auth.uid()) and k.cleared_at is null
$$;

-- ---------------------------------------------------------------------------------------------------
-- Admin: moderation queue and strikes
-- ---------------------------------------------------------------------------------------------------
create function private.code_of_user(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.code from private.seller_accounts a join public.sellers s on s.id = a.seller_id where a.user_id = p_user),
    (select b.code from private.buyer_accounts a join public.buyers b on b.id = a.buyer_id where a.user_id = p_user))
$$;

create function public.admin_moderation_queue()
returns table (message_id bigint, created_at timestamptz, thread_id uuid, sender text, sender_code text,
               other_code text, product_ref text, severity text, reasons text[], body text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select m.id, m.created_at, t.id, m.sender,
           case m.sender when 'buyer' then t.buyer_code else t.seller_code end,
           case m.sender when 'buyer' then t.seller_code else t.buyer_code end,
           t.product_ref, o.severity, o.reasons, o.body
    from private.message_originals o
    join public.messages m on m.id = o.message_id
    join public.threads t on t.id = m.thread_id
    where o.reviewed_at is null
    order by m.id
    limit 100;
end
$$;

-- release: it was a false alarm. The message is delivered as written and its strike is cleared.
-- confirm: it stays hidden. A held message now costs the sender a strike.
create function public.admin_moderate(p_message_id bigint, p_decision text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o private.message_originals%rowtype;
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_decision not in ('release', 'confirm') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  select * into o from private.message_originals where message_id = p_message_id for update;
  if not found or o.reviewed_at is not null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if p_decision = 'release' then
    update public.messages set status = 'released', body = left(o.body, 1000) where id = p_message_id;
    update private.chat_strikes set cleared_at = now() where message_id = p_message_id and cleared_at is null;
    update private.message_originals set reviewed_at = now(), decision = 'released' where message_id = p_message_id;
  else
    update public.messages set status = 'removed' where id = p_message_id;
    if not exists (select 1 from private.chat_strikes k where k.message_id = p_message_id) then
      insert into private.chat_strikes (user_id, message_id) values (o.sender_user, p_message_id);
    end if;
    update private.message_originals set reviewed_at = now(), decision = 'confirmed' where message_id = p_message_id;
  end if;
end
$$;

create function public.admin_chat_strikes()
returns table (code text, strikes integer, suspended boolean, last_strike_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select private.code_of_user(k.user_id), count(*)::integer, count(*) >= 3, max(k.created_at)
    from private.chat_strikes k where k.cleared_at is null
    group by k.user_id order by 2 desc, 4 desc;
end
$$;

create function public.admin_clear_strikes(p_code text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_n    integer;
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select coalesce(
    (select a.user_id from private.seller_accounts a join public.sellers s on s.id = a.seller_id where s.code = p_code),
    (select a.user_id from private.buyer_accounts a join public.buyers b on b.id = a.buyer_id where b.code = p_code))
  into v_user;
  if v_user is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  update private.chat_strikes set cleared_at = now() where user_id = v_user and cleared_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end
$$;

-- ---------------------------------------------------------------------------------------------------
-- Listings: the same guard on seller-written text. A listing that looks like it carries contact
-- details is saved as "flagged": hidden from buyers until the admin has looked at it.
-- ---------------------------------------------------------------------------------------------------
create function private.products_contact_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Only for sellers. The admin (who approves) and the owner (seed, migrations) are not checked.
  if (select app.seller_id()) is not null and not (select app.is_admin()) then
    if private.looks_like_contact(new.title_en || ' | ' || new.title_ar || ' | ' || new.part_number || ' | '
                                  || new.description_en || ' | ' || new.description_ar || ' | ' || new.specs::text) then
      new.status := 'flagged';
    end if;
  end if;
  return new;
end
$$;

create trigger products_contact_guard
  before insert or update on public.products
  for each row execute function private.products_contact_guard();

-- The guard may set "flagged" on a seller's own row, so the policies no longer restrict the status
-- value (the column's CHECK does). A flagged row still cannot be edited by its seller.
drop policy products_insert_own on public.products;
drop policy products_update_own on public.products;
create policy products_insert_own on public.products for insert to authenticated
  with check (seller_id = (select app.seller_id()));
create policy products_update_own on public.products for update to authenticated
  using (seller_id = (select app.seller_id()) and status <> 'flagged')
  with check (seller_id = (select app.seller_id()));

-- ---------------------------------------------------------------------------------------------------
-- Function privileges: take everything away first, then grant exactly what is meant to be callable.
-- ---------------------------------------------------------------------------------------------------
revoke execute on all functions in schema public, app, private from public, anon, authenticated;

grant execute on function app.role(), app.is_admin(), app.seller_id(), app.buyer_id(), app.random_code(int)
  to anon, authenticated, service_role;
grant execute on function public.whoami() to authenticated;
grant execute on function public.seller_onboard(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.seller_my_identity() to authenticated;
grant execute on function public.admin_reveal_seller_identity(uuid, text) to authenticated;
grant execute on function public.admin_list_reveals() to authenticated;
grant execute on function public.admin_set_seller_status(uuid, text, boolean) to authenticated;
grant execute on function public.buyer_create_order(text, integer) to authenticated;
grant execute on function public.buyer_cancel_order(text) to authenticated;
grant execute on function public.buyer_confirm_delivery(text) to authenticated;
grant execute on function public.buyer_open_dispute(text, text, text) to authenticated;
grant execute on function public.seller_mark_shipped(text) to authenticated;
grant execute on function public.seller_finance() to authenticated;
grant execute on function public.admin_resolve_dispute(text, text, text) to authenticated;
grant execute on function public.admin_dispute_notes(text) to authenticated;
grant execute on function public.admin_payout_seller(uuid) to authenticated;
grant execute on function public.admin_ledger_overview() to authenticated;
grant execute on function public.admin_seller_payables() to authenticated;
grant execute on function public.admin_webhook_events() to authenticated;
grant execute on function public.admin_set_commission(integer) to authenticated;

grant execute on function public.chat_open_thread(text) to authenticated;
grant execute on function public.chat_my_status() to authenticated;
grant execute on function public.admin_moderation_queue() to authenticated;
grant execute on function public.admin_moderate(bigint, text) to authenticated;
grant execute on function public.admin_chat_strikes() to authenticated;
grant execute on function public.admin_clear_strikes(text) to authenticated;

-- Server only (secret key).
grant execute on function public.payment_apply_event(text, text, text, boolean, bigint, jsonb) to service_role;
grant execute on function public.chat_post_message(uuid, uuid, text, text, text[]) to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
