-- Dasta 0006: from one trade's parts to a general wholesale catalogue.
--   1. categories renamed in place (rows and product links stay)
--   2. wholesale terms on a listing: unit, minimum order quantity, lead time, price breaks
--   3. the order function enforces the minimum and applies the price break of the ordered quantity
--   4. order numbers start with DS-
--   5. a third-party photo needs its licence and source page; the author is optional

-- ---------------------------------------------------------------------------------------------------
-- 1. Categories
-- ---------------------------------------------------------------------------------------------------
update public.products set category_id = (select id from public.categories where slug = 'hydraulic-pumps')
 where category_id = (select id from public.categories where slug = 'filters');
delete from public.categories where slug = 'filters';

update public.categories set slug = 'home-kitchen',            name_en = 'Home and kitchen',        name_ar = 'المنزل والمطبخ',        sort = 10 where slug = 'hydraulic-pumps';
update public.categories set slug = 'office-supplies',         name_en = 'Office supplies',         name_ar = 'مستلزمات مكتبية',       sort = 20 where slug = 'hydraulic-cylinders';
update public.categories set slug = 'packaging',               name_en = 'Packaging',               name_ar = 'التعبئة والتغليف',      sort = 30 where slug = 'valves';
update public.categories set slug = 'textiles',                name_en = 'Textiles',                name_ar = 'المنسوجات',             sort = 40 where slug = 'hoses-fittings';
update public.categories set slug = 'personal-care',           name_en = 'Personal care',           name_ar = 'العناية الشخصية',       sort = 50 where slug = 'seals';
update public.categories set slug = 'tools-hardware',          name_en = 'Tools and hardware',      name_ar = 'العدد والأدوات',        sort = 60 where slug = 'bearings';
update public.categories set slug = 'electronics-accessories', name_en = 'Electronics accessories', name_ar = 'إكسسوارات إلكترونية',   sort = 70 where slug = 'power-transmission';

-- ---------------------------------------------------------------------------------------------------
-- 2. Wholesale terms
-- ---------------------------------------------------------------------------------------------------
-- Price breaks: at most four steps, each {"qty": n, "price_piastres": n}. Quantities rise above the
-- minimum order, prices fall below the base price. Anything else is refused by the table itself.
create function app.valid_price_breaks(p_breaks jsonb, p_min_qty integer, p_base bigint) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  e          jsonb;
  v_qty      integer;
  v_price    bigint;
  last_qty   integer := p_min_qty;
  last_price bigint  := p_base;
begin
  if jsonb_typeof(p_breaks) <> 'array' or jsonb_array_length(p_breaks) > 4 then
    return false;
  end if;
  for e in select value from jsonb_array_elements(p_breaks) loop
    if jsonb_typeof(e) <> 'object' or jsonb_typeof(e -> 'qty') <> 'number' or jsonb_typeof(e -> 'price_piastres') <> 'number' then
      return false;
    end if;
    v_qty   := (e ->> 'qty')::integer;
    v_price := (e ->> 'price_piastres')::bigint;
    if v_qty <= last_qty or v_qty > 100000 or v_price >= last_price or v_price <= 0 then
      return false;
    end if;
    last_qty   := v_qty;
    last_price := v_price;
  end loop;
  return true;
exception when others then
  return false;   -- not whole numbers
end
$$;

/** Price of one unit when p_qty units are ordered: the deepest break that the quantity reaches. */
create function app.unit_price(p_base bigint, p_breaks jsonb, p_qty integer) returns bigint
language sql immutable set search_path = '' as $$
  select coalesce(
    (select (e ->> 'price_piastres')::bigint
       from jsonb_array_elements(p_breaks) e
      where (e ->> 'qty')::integer <= p_qty
      order by (e ->> 'qty')::integer desc
      limit 1),
    p_base)
$$;

grant execute on function app.valid_price_breaks(jsonb, integer, bigint), app.unit_price(bigint, jsonb, integer)
  to anon, authenticated, service_role;

alter table public.products
  add column unit_en       text     not null default 'piece' check (length(btrim(unit_en)) between 1 and 20),
  add column unit_ar       text     not null default 'قطعة'  check (length(btrim(unit_ar)) between 1 and 20),
  add column min_order_qty integer  not null default 1       check (min_order_qty between 1 and 100000),
  add column lead_days     smallint not null default 3       check (lead_days between 1 and 90),
  add column price_breaks  jsonb    not null default '[]'::jsonb,
  add constraint products_price_breaks_valid check (app.valid_price_breaks(price_breaks, min_order_qty, price_piastres));

grant insert (unit_en, unit_ar, min_order_qty, lead_days, price_breaks) on public.products to authenticated;
grant update (unit_en, unit_ar, min_order_qty, lead_days, price_breaks) on public.products to authenticated;

-- The unit is supplier-written text too, so it passes the same contact guard as the rest of a listing.
create or replace function private.products_contact_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Only for suppliers. The admin (who approves) and the owner (seed, migrations) are not checked.
  if (select app.seller_id()) is not null and not (select app.is_admin()) then
    if private.looks_like_contact(new.title_en || ' | ' || new.title_ar || ' | ' || new.part_number || ' | '
                                  || new.description_en || ' | ' || new.description_ar || ' | ' || new.specs::text
                                  || ' | ' || new.unit_en || ' | ' || new.unit_ar) then
      new.status := 'flagged';
    end if;
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------------------------------
-- 3 and 4. Orders
-- ---------------------------------------------------------------------------------------------------
alter table public.orders drop constraint orders_quantity_check;
alter table public.orders add constraint orders_quantity_check check (quantity between 1 and 100000);

create or replace function public.buyer_create_order(p_product_ref text, p_quantity integer) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_buyer   uuid := (select app.buyer_id());
  v_bcode   text;
  p         public.products%rowtype;
  s         public.sellers%rowtype;
  v_bps     integer;
  v_unit    bigint;
  v_total   bigint;
  v_comm    bigint;
  v_no      text;
  v_order   uuid;
begin
  if v_buyer is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100000 then
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
  if p_quantity < p.min_order_qty then
    raise exception 'below_minimum' using errcode = 'P0001';
  end if;
  if p.stock < p_quantity then
    raise exception 'insufficient_stock' using errcode = 'P0001';
  end if;

  update public.products set stock = stock - p_quantity where id = p.id;

  select (value #>> '{}')::integer into v_bps from private.settings where key = 'commission_bps';
  -- The price is decided here, from the listing, never from what the browser sent.
  v_unit  := app.unit_price(p.price_piastres, p.price_breaks, p_quantity);
  v_total := v_unit * p_quantity;
  v_comm  := round(v_total * v_bps / 10000.0);
  select b.code into v_bcode from public.buyers b where b.id = v_buyer;

  loop
    v_no := 'DS-' || app.random_code(6);
    exit when not exists (select 1 from public.orders o where o.no = v_no);
  end loop;

  insert into public.orders (no, buyer_id, seller_id, buyer_code, seller_code, product_id, product_ref, title_en, title_ar,
                             part_number, unit_price_piastres, quantity, total_piastres, commission_bps,
                             commission_piastres, seller_net_piastres)
  values (v_no, v_buyer, s.id, v_bcode, s.code, p.id, p.ref, p.title_en, p.title_ar,
          p.part_number, v_unit, p_quantity, v_total, v_bps, v_comm, v_total - v_comm)
  returning id into v_order;

  insert into private.payment_intents (order_id, merchant_order_id, amount_piastres) values (v_order, v_no, v_total);
  perform private.order_event(v_order, 'created', 'buyer');
  return v_no;
end
$$;

-- ---------------------------------------------------------------------------------------------------
-- 5. Image credits
-- ---------------------------------------------------------------------------------------------------
alter table public.product_images drop constraint product_images_credit_complete;
alter table public.product_images add constraint product_images_credit_complete check (
  kind <> 'photo' or (credit_license is not null and credit_source_url is not null)
);

-- Waybill numbers start with DSW-.
create or replace function public.seller_mark_shipped(p_no text) returns text
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
  v_waybill := 'DSW-' || app.random_code(8);
  update public.orders set status = 'shipped', shipped_at = now(), waybill_no = v_waybill where id = o.id;
  perform private.order_event(o.id, 'shipped', 'seller');
  return v_waybill;
end
$$;
