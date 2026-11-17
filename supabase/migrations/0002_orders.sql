-- Makbas 0002: orders, escrow state machine, double-entry ledger, payments, disputes, payouts.
--
-- Rules this file sets up:
--   * An order changes state only inside the functions below. Users have SELECT on orders, nothing else.
--   * Every money movement is one ledger transaction whose entries sum to zero, written in the same
--     database transaction as the state change it belongs to.
--   * The ledger is append-only: UPDATE and DELETE are refused for every role, including the owner.
--   * Payment webhooks are idempotent: one row per provider event id, enforced by a unique index.

-- ---------------------------------------------------------------------------------------------------
-- Settings (commission). Illustrative default: 8 %.
-- ---------------------------------------------------------------------------------------------------
create table private.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table private.settings enable row level security;
insert into private.settings (key, value) values ('commission_bps', '800'::jsonb);

-- ---------------------------------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------------------------------
create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  no                   text not null unique,                  -- MK-XXXXXX, random
  buyer_id             uuid not null references public.buyers(id),
  seller_id            uuid not null references public.sellers(id),
  buyer_code           text not null,                         -- what the seller sees
  seller_code          text not null,                         -- what the buyer sees
  product_id           uuid references public.products(id) on delete set null,
  product_ref          text not null,
  title_en             text not null,
  title_ar             text not null,
  part_number          text not null,
  unit_price_piastres  bigint not null check (unit_price_piastres > 0),
  quantity             integer not null check (quantity between 1 and 1000),
  total_piastres       bigint not null check (total_piastres > 0),
  commission_bps       integer not null check (commission_bps between 0 and 3000),
  commission_piastres  bigint not null check (commission_piastres >= 0),
  seller_net_piastres  bigint not null check (seller_net_piastres >= 0),
  status               text not null default 'pending_payment'
                       check (status in ('pending_payment', 'paid_held', 'shipped', 'completed', 'disputed', 'refunded', 'cancelled')),
  waybill_no           text,
  created_at           timestamptz not null default now(),
  paid_at              timestamptz,
  shipped_at           timestamptz,
  closed_at            timestamptz,
  check (total_piastres = unit_price_piastres * quantity),
  check (seller_net_piastres + commission_piastres = total_piastres)
);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);

create table public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  type        text not null,
  actor       text not null check (actor in ('buyer', 'seller', 'admin', 'provider', 'system')),
  created_at  timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, id);

-- The reason is a fixed code on purpose: free text from the buyer would be a way to pass contact details.
create table public.disputes (
  order_id     uuid primary key references public.orders(id) on delete cascade,
  reason_code  text not null check (reason_code in ('not_received', 'not_as_described', 'damaged', 'wrong_part')),
  status       text not null default 'open' check (status in ('open', 'resolved_release', 'resolved_refund')),
  opened_at    timestamptz not null default now(),
  resolved_at  timestamptz
);

-- Free-text notes on a dispute are for the admin only.
create table private.dispute_notes (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  author      text not null check (author in ('buyer', 'admin')),
  note        text not null check (length(note) <= 1000),
  created_at  timestamptz not null default now()
);

alter table public.orders        enable row level security;
alter table public.order_events  enable row level security;
alter table public.disputes      enable row level security;
alter table private.dispute_notes enable row level security;

-- The buyer sees their orders. The seller sees an order once it is paid. The admin sees all.
create policy orders_read on public.orders for select to authenticated
  using (
    buyer_id = (select app.buyer_id())
    or (seller_id = (select app.seller_id()) and status not in ('pending_payment', 'cancelled'))
    or (select app.is_admin())
  );
create policy order_events_read on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_events.order_id));
create policy disputes_read on public.disputes for select to authenticated
  using (exists (select 1 from public.orders o where o.id = disputes.order_id));

grant select on public.orders, public.order_events, public.disputes to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Ledger (double entry, append-only)
--   debit  = positive amount, credit = negative amount; every transaction sums to zero.
--   provider        money at the payment provider / bank            (asset)
--   escrow          money held for orders that are not finished      (liability)
--   seller_payable  money owed to one seller, not paid out yet       (liability, per seller)
--   commission      the platform's earned commission                 (income)
-- ---------------------------------------------------------------------------------------------------
create table private.ledger_txns (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('capture', 'release', 'refund', 'payout')),
  order_id         uuid references public.orders(id),
  idempotency_key  text not null unique,
  created_at       timestamptz not null default now()
);

create table private.ledger_entries (
  id               bigint generated always as identity primary key,
  txn_id           uuid not null references private.ledger_txns(id),
  account          text not null check (account in ('provider', 'escrow', 'seller_payable', 'commission')),
  seller_id        uuid references public.sellers(id),
  amount_piastres  bigint not null check (amount_piastres <> 0),
  check ((account = 'seller_payable') = (seller_id is not null))
);
create index ledger_entries_txn_idx on private.ledger_entries (txn_id);
create index ledger_entries_seller_idx on private.ledger_entries (seller_id) where seller_id is not null;

alter table private.ledger_txns    enable row level security;
alter table private.ledger_entries enable row level security;

-- SECURITY DEFINER: the check runs at commit, as whoever started the request, and that role has no
-- access to the private schema.
create function private.ledger_check_balanced() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_sum bigint;
begin
  select coalesce(sum(e.amount_piastres), 0) into v_sum from private.ledger_entries e where e.txn_id = new.txn_id;
  if v_sum <> 0 then
    raise exception 'ledger_unbalanced' using errcode = 'P0001', hint = 'Entries of a ledger transaction must sum to zero.';
  end if;
  return null;
end
$$;

-- Checked at commit, when all entries of the transaction are in.
create constraint trigger ledger_entries_balanced
  after insert on private.ledger_entries
  deferrable initially deferred
  for each row execute function private.ledger_check_balanced();

create function private.ledger_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'ledger_is_append_only' using errcode = 'P0001';
end
$$;

create trigger ledger_entries_no_change before update or delete on private.ledger_entries
  for each row execute function private.ledger_append_only();
create trigger ledger_txns_no_change before update or delete on private.ledger_txns
  for each row execute function private.ledger_append_only();

-- Posts one balanced transaction. Returns false when the idempotency key was already used.
create function private.ledger_post(
  p_kind text, p_order_id uuid, p_key text, p_accounts text[], p_sellers uuid[], p_amounts bigint[]
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_txn uuid;
begin
  insert into private.ledger_txns (kind, order_id, idempotency_key)
  values (p_kind, p_order_id, p_key)
  on conflict (idempotency_key) do nothing
  returning id into v_txn;
  if v_txn is null then
    return false;
  end if;
  insert into private.ledger_entries (txn_id, account, seller_id, amount_piastres)
  select v_txn, a, s, m from unnest(p_accounts, p_sellers, p_amounts) as t(a, s, m) where m <> 0;
  return true;
end
$$;

-- ---------------------------------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------------------------------
create table private.payment_intents (
  order_id           uuid primary key references public.orders(id) on delete cascade,
  provider           text not null default 'mock',
  merchant_order_id  text not null unique,           -- our order number, echoed back by the provider
  amount_piastres    bigint not null check (amount_piastres > 0),
  status             text not null default 'created' check (status in ('created', 'succeeded', 'failed', 'refunded')),
  provider_txn_id    text,
  updated_at         timestamptz not null default now()
);

create table private.webhook_events (
  id           bigint generated always as identity primary key,
  provider     text not null,
  event_id     text not null,
  outcome      text not null,
  payload      jsonb not null,
  received_at  timestamptz not null default now(),
  unique (provider, event_id)
);

create table private.payouts (
  id               bigint generated always as identity primary key,
  seller_id        uuid not null references public.sellers(id),
  amount_piastres  bigint not null check (amount_piastres > 0),
  reference        text not null unique,
  created_at       timestamptz not null default now()
);

alter table private.payment_intents enable row level security;
alter table private.webhook_events  enable row level security;
alter table private.payouts         enable row level security;

-- ---------------------------------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------------------------------
create function private.order_event(p_order_id uuid, p_type text, p_actor text) returns void
language sql security definer set search_path = '' as $$
  insert into public.order_events (order_id, type, actor) values (p_order_id, p_type, p_actor)
$$;

-- Delivery confirmed: escrow -> seller payable (net) + commission. One ledger transaction.
create function private.order_release(p_order_id uuid, p_actor text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  perform private.ledger_post(
    'release', o.id, 'release:' || o.id,
    array['escrow', 'seller_payable', 'commission'],
    array[null, o.seller_id, null]::uuid[],
    array[o.total_piastres, -o.seller_net_piastres, -o.commission_piastres]
  );
  update public.orders set status = 'completed', closed_at = now() where id = o.id;
  perform private.order_event(o.id, 'delivery_confirmed', p_actor);
  perform private.order_event(o.id, 'released_to_seller', 'system');
end
$$;

-- Refund: escrow -> provider (back to the buyer). One ledger transaction.
create function private.order_refund(p_order_id uuid, p_actor text, p_restore_stock boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  perform private.ledger_post(
    'refund', o.id, 'refund:' || o.id,
    array['escrow', 'provider'], array[null, null]::uuid[], array[o.total_piastres, -o.total_piastres]
  );
  update public.orders set status = 'refunded', closed_at = now() where id = o.id;
  update private.payment_intents set status = 'refunded', updated_at = now() where order_id = o.id;
  if p_restore_stock and o.product_id is not null then
    update public.products set stock = stock + o.quantity where id = o.product_id;
  end if;
  perform private.order_event(o.id, 'refunded', p_actor);
end
$$;

-- ---------------------------------------------------------------------------------------------------
-- Buyer
-- ---------------------------------------------------------------------------------------------------
create function public.buyer_create_order(p_product_ref text, p_quantity integer) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_buyer   uuid := (select app.buyer_id());
  v_bcode   text;
  p         public.products%rowtype;
  s         public.sellers%rowtype;
  v_bps     integer;
  v_total   bigint;
  v_comm    bigint;
  v_no      text;
  v_order   uuid;
begin
  if v_buyer is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 1000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if (select count(*) from public.orders o where o.buyer_id = v_buyer and o.status = 'pending_payment') >= 5 then
    raise exception 'too_many_pending' using errcode = 'P0001', hint = 'Pay or cancel an open order first.';
  end if;

  -- Lock the product row: two buyers cannot both take the last unit.
  select * into p from public.products where ref = p_product_ref for update;
  if not found or p.status <> 'active' then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  select * into s from public.sellers where id = p.seller_id;
  if s.status <> 'active' then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  if p.stock < p_quantity then
    raise exception 'insufficient_stock' using errcode = 'P0001';
  end if;

  update public.products set stock = stock - p_quantity where id = p.id;

  select (value #>> '{}')::integer into v_bps from private.settings where key = 'commission_bps';
  v_total := p.price_piastres * p_quantity;
  v_comm  := round(v_total * v_bps / 10000.0);
  select b.code into v_bcode from public.buyers b where b.id = v_buyer;

  loop
    v_no := 'MK-' || app.random_code(6);
    exit when not exists (select 1 from public.orders o where o.no = v_no);
  end loop;

  insert into public.orders (no, buyer_id, seller_id, buyer_code, seller_code, product_id, product_ref, title_en, title_ar,
                             part_number, unit_price_piastres, quantity, total_piastres, commission_bps,
                             commission_piastres, seller_net_piastres)
  values (v_no, v_buyer, s.id, v_bcode, s.code, p.id, p.ref, p.title_en, p.title_ar,
          p.part_number, p.price_piastres, p_quantity, v_total, v_bps, v_comm, v_total - v_comm)
  returning id into v_order;

  insert into private.payment_intents (order_id, merchant_order_id, amount_piastres) values (v_order, v_no, v_total);
  perform private.order_event(v_order, 'created', 'buyer');
  return v_no;
end
$$;

create function public.buyer_cancel_order(p_no text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where no = p_no and buyer_id = (select app.buyer_id()) for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if o.status = 'pending_payment' then
    update public.orders set status = 'cancelled', closed_at = now() where id = o.id;
    if o.product_id is not null then
      update public.products set stock = stock + o.quantity where id = o.product_id;
    end if;
    perform private.order_event(o.id, 'cancelled', 'buyer');
    return 'cancelled';
  elsif o.status = 'paid_held' then
    perform private.order_refund(o.id, 'buyer', true);
    return 'refunded';
  end if;
  raise exception 'invalid_transition' using errcode = 'P0001', hint = 'This order can no longer be cancelled.';
end
$$;

create function public.buyer_confirm_delivery(p_no text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where no = p_no and buyer_id = (select app.buyer_id()) for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if o.status <> 'shipped' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  perform private.order_release(o.id, 'buyer');
end
$$;

create function public.buyer_open_dispute(p_no text, p_reason_code text, p_note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where no = p_no and buyer_id = (select app.buyer_id()) for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if o.status <> 'shipped' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if p_reason_code not in ('not_received', 'not_as_described', 'damaged', 'wrong_part') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  insert into public.disputes (order_id, reason_code) values (o.id, p_reason_code);
  if length(btrim(coalesce(p_note, ''))) > 0 then
    insert into private.dispute_notes (order_id, author, note) values (o.id, 'buyer', left(btrim(p_note), 1000));
  end if;
  update public.orders set status = 'disputed' where id = o.id;
  perform private.order_event(o.id, 'dispute_opened', 'buyer');
end
$$;

-- ---------------------------------------------------------------------------------------------------
-- Seller
-- ---------------------------------------------------------------------------------------------------
create function public.seller_mark_shipped(p_no text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o         public.orders%rowtype;
  v_waybill text;
begin
  select * into o from public.orders where no = p_no and seller_id = (select app.seller_id()) for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if o.status <> 'paid_held' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  v_waybill := 'MKW-' || app.random_code(8);
  update public.orders set status = 'shipped', shipped_at = now(), waybill_no = v_waybill where id = o.id;
  perform private.order_event(o.id, 'shipped', 'seller');
  return v_waybill;
end
$$;

create function public.seller_finance()
returns table (held_piastres bigint, payable_piastres bigint, paid_out_piastres bigint, commission_bps integer)
language sql stable security definer set search_path = '' as $$
  select
    coalesce((select sum(o.seller_net_piastres) from public.orders o
              where o.seller_id = (select app.seller_id()) and o.status in ('paid_held', 'shipped', 'disputed')), 0)::bigint,
    coalesce((select -sum(e.amount_piastres) from private.ledger_entries e
              where e.account = 'seller_payable' and e.seller_id = (select app.seller_id())), 0)::bigint,
    coalesce((select sum(p.amount_piastres) from private.payouts p where p.seller_id = (select app.seller_id())), 0)::bigint,
    (select (value #>> '{}')::integer from private.settings where key = 'commission_bps')
  where (select app.seller_id()) is not null
$$;

-- ---------------------------------------------------------------------------------------------------
-- Payment provider -> platform (called by the webhook route with the secret key, after the signature
-- has been checked). Idempotent on (provider, event id).
-- ---------------------------------------------------------------------------------------------------
create function public.payment_apply_event(
  p_provider text, p_event_id text, p_merchant_order_id text, p_success boolean, p_amount_piastres bigint, p_payload jsonb
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_event  bigint;
  i        private.payment_intents%rowtype;
  o        public.orders%rowtype;
  v_out    text;
begin
  insert into private.webhook_events (provider, event_id, outcome, payload)
  values (p_provider, p_event_id, 'received', coalesce(p_payload, '{}'::jsonb))
  on conflict (provider, event_id) do nothing
  returning id into v_event;
  if v_event is null then
    return 'duplicate';
  end if;

  select * into i from private.payment_intents where merchant_order_id = p_merchant_order_id and provider = p_provider;
  if not found then
    v_out := 'unknown_order';
  else
    select * into o from public.orders where id = i.order_id for update;
    if p_amount_piastres is distinct from i.amount_piastres then
      v_out := 'amount_mismatch';
    elsif o.status <> 'pending_payment' then
      v_out := 'ignored_state';
    elsif not coalesce(p_success, false) then
      update private.payment_intents set status = 'failed', updated_at = now() where order_id = o.id;
      perform private.order_event(o.id, 'payment_failed', 'provider');
      v_out := 'failed';
    else
      perform private.ledger_post(
        'capture', o.id, 'capture:' || o.id,
        array['provider', 'escrow'], array[null, null]::uuid[], array[o.total_piastres, -o.total_piastres]
      );
      update public.orders set status = 'paid_held', paid_at = now() where id = o.id;
      update private.payment_intents set status = 'succeeded', provider_txn_id = p_event_id, updated_at = now() where order_id = o.id;
      perform private.order_event(o.id, 'paid_held', 'provider');
      v_out := 'captured';
    end if;
  end if;

  update private.webhook_events set outcome = v_out where id = v_event;
  return v_out;
end
$$;

-- ---------------------------------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------------------------------
create function public.admin_resolve_dispute(p_no text, p_outcome text, p_note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_outcome not in ('release', 'refund') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  select * into o from public.orders where no = p_no for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if o.status <> 'disputed' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if length(btrim(coalesce(p_note, ''))) > 0 then
    insert into private.dispute_notes (order_id, author, note) values (o.id, 'admin', left(btrim(p_note), 1000));
  end if;
  if p_outcome = 'release' then
    update public.disputes set status = 'resolved_release', resolved_at = now() where order_id = o.id;
    perform private.order_event(o.id, 'dispute_resolved_release', 'admin');
    perform private.order_release(o.id, 'admin');
  else
    update public.disputes set status = 'resolved_refund', resolved_at = now() where order_id = o.id;
    perform private.order_event(o.id, 'dispute_resolved_refund', 'admin');
    perform private.order_refund(o.id, 'admin', false);
  end if;
end
$$;

create function public.admin_dispute_notes(p_no text)
returns table (author text, note text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select n.author, n.note, n.created_at
    from private.dispute_notes n join public.orders o on o.id = n.order_id
    where o.no = p_no order by n.id;
end
$$;

-- Pays a seller everything that is owed and not paid out yet. In the demo no bank is called.
create function public.admin_payout_seller(p_seller_id uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_amount bigint;
  v_ref    text;
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform 1 from public.sellers s where s.id = p_seller_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select coalesce(-sum(e.amount_piastres), 0) into v_amount
  from private.ledger_entries e where e.account = 'seller_payable' and e.seller_id = p_seller_id;
  if v_amount <= 0 then
    raise exception 'nothing_to_pay' using errcode = 'P0001';
  end if;
  v_ref := 'PO-' || app.random_code(8);
  insert into private.payouts (seller_id, amount_piastres, reference) values (p_seller_id, v_amount, v_ref);
  perform private.ledger_post(
    'payout', null, 'payout:' || v_ref,
    array['seller_payable', 'provider'], array[p_seller_id, null]::uuid[], array[v_amount, -v_amount]
  );
  return v_amount;
end
$$;

-- One row of totals plus the invariant: money in = refunds + payouts + commission + still held + still owed.
create function public.admin_ledger_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  with e as (
    select t.kind, x.account, x.amount_piastres
    from private.ledger_entries x join private.ledger_txns t on t.id = x.txn_id
  ), totals as (
    select
      coalesce(sum(amount_piastres) filter (where kind = 'capture' and account = 'provider'), 0) as captured,
      coalesce(-sum(amount_piastres) filter (where kind = 'refund' and account = 'provider'), 0) as refunded,
      coalesce(-sum(amount_piastres) filter (where kind = 'payout' and account = 'provider'), 0) as paid_out,
      coalesce(-sum(amount_piastres) filter (where account = 'commission'), 0) as commission,
      coalesce(-sum(amount_piastres) filter (where account = 'escrow'), 0) as escrow_held,
      coalesce(-sum(amount_piastres) filter (where account = 'seller_payable'), 0) as seller_payable,
      coalesce(sum(amount_piastres) filter (where account = 'provider'), 0) as provider_balance,
      coalesce(sum(amount_piastres), 0) as entries_sum,
      count(*) as entries
    from e
  )
  select jsonb_build_object(
    'captured', captured, 'refunded', refunded, 'paid_out', paid_out, 'commission', commission,
    'escrow_held', escrow_held, 'seller_payable', seller_payable, 'provider_balance', provider_balance,
    'entries', entries, 'entries_sum', entries_sum,
    'balanced', entries_sum = 0 and captured = refunded + paid_out + commission + escrow_held + seller_payable,
    'commission_bps', (select (value #>> '{}')::integer from private.settings where key = 'commission_bps')
  ) into v from totals;
  return v;
end
$$;

create function public.admin_seller_payables()
returns table (seller_id uuid, seller_code text, payable_piastres bigint, paid_out_piastres bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select s.id, s.code,
      coalesce((select -sum(e.amount_piastres) from private.ledger_entries e where e.account = 'seller_payable' and e.seller_id = s.id), 0)::bigint,
      coalesce((select sum(p.amount_piastres) from private.payouts p where p.seller_id = s.id), 0)::bigint
    from public.sellers s
    order by 3 desc, s.code;
end
$$;

create function public.admin_webhook_events()
returns table (id bigint, provider text, event_id text, outcome text, merchant_order_id text, received_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select w.id, w.provider, w.event_id, w.outcome, w.payload #>> '{obj,order,merchant_order_id}', w.received_at
    from private.webhook_events w order by w.id desc limit 50;
end
$$;

create function public.admin_set_commission(p_bps integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_bps is null or p_bps < 0 or p_bps > 3000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  update private.settings set value = to_jsonb(p_bps), updated_at = now() where key = 'commission_bps';
end
$$;

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

-- Only the server (secret key) may report a payment event.
revoke execute on function public.payment_apply_event(text, text, text, boolean, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.payment_apply_event(text, text, text, boolean, bigint, jsonb) to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
