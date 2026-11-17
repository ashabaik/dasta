-- Makbas 0001: schemas, roles, sellers (public / private split), catalogue, 10-product limit.
--
-- Rules this file sets up:
--   public   the only schema the Data API exposes. RLS on every table. Every grant is written here by hand.
--   private  identities, account links, roles, audit log. anon / authenticated have NO privilege on it.
--   app      helper functions used by policies. No tables.
--   Anything a user may do with private data goes through a SECURITY DEFINER function in public.

create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
create schema if not exists app;

revoke all on schema private from public, anon, authenticated;
revoke all on schema app from public;
grant usage on schema app to anon, authenticated, service_role;

-- New functions are executable by PUBLIC unless told otherwise. Turn that off for everything created
-- by this role from now on; each function below gets its own explicit grant.
alter default privileges revoke execute on functions from public;

-- ---------------------------------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------------------------------
create table public.regions (
  key      text primary key,
  name_en  text not null,
  name_ar  text not null
);

create table public.categories (
  id       smallint generated always as identity primary key,
  slug     text not null unique,
  name_en  text not null,
  name_ar  text not null,
  sort     smallint not null default 0
);

-- ---------------------------------------------------------------------------------------------------
-- Random public identifiers (no sequences a visitor could count or walk)
-- ---------------------------------------------------------------------------------------------------
create function app.random_code(p_len int) returns text
language sql volatile set search_path = '' as $$
  -- 31 unambiguous characters: no 0/O, 1/I/L
  select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, p_len)
$$;

-- ---------------------------------------------------------------------------------------------------
-- Sellers and buyers: public rows
-- ---------------------------------------------------------------------------------------------------
create table public.sellers (
  id            uuid primary key default gen_random_uuid(),   -- NOT the auth user id
  code          text not null unique,                          -- e.g. S-7Q4X, the only "name" a buyer sees
  region        text not null references public.regions(key),  -- governorate only
  status        text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  verified      boolean not null default false,
  joined_month  date not null default date_trunc('month', now())::date,  -- month, never the exact day
  rating_avg    numeric(3, 2),
  rating_count  integer not null default 0
);

create table public.buyers (
  id      uuid primary key default gen_random_uuid(),          -- NOT the auth user id
  code    text not null unique,                                 -- e.g. B-4K7PD
  region  text references public.regions(key)
);

-- ---------------------------------------------------------------------------------------------------
-- Private schema: who is who
-- ---------------------------------------------------------------------------------------------------
create table private.schema_migrations (
  name        text primary key,
  applied_at  timestamptz not null default now()
);

create table private.user_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('buyer', 'seller', 'admin')),
  created_at  timestamptz not null default now()
);

create table private.seller_accounts (
  seller_id  uuid primary key references public.sellers(id) on delete cascade,
  user_id    uuid not null unique references auth.users(id) on delete cascade
);

create table private.buyer_accounts (
  buyer_id  uuid primary key references public.buyers(id) on delete cascade,
  user_id   uuid not null unique references auth.users(id) on delete cascade
);

create table private.seller_identities (
  seller_id     uuid primary key references public.sellers(id) on delete cascade,
  legal_name    text not null,
  contact_name  text not null,
  phone         text not null,
  email         text not null,
  address       text not null,
  tax_id        text not null default '',
  bank_name     text not null default '',
  iban          text not null default '',
  updated_at    timestamptz not null default now()
);

create table private.buyer_identities (
  buyer_id      uuid primary key references public.buyers(id) on delete cascade,
  company_name  text not null default '',
  contact_name  text not null default '',
  phone         text not null default '',
  address       text not null default '',
  updated_at    timestamptz not null default now()
);

-- Every look at a seller's identity leaves a row here, written by the same function that returns the data.
create table private.identity_reveals (
  id             bigint generated always as identity primary key,
  admin_user_id  uuid not null references auth.users(id),
  seller_id      uuid not null references public.sellers(id) on delete cascade,
  reason         text not null check (length(btrim(reason)) >= 10),
  created_at     timestamptz not null default now()
);

alter table private.schema_migrations  enable row level security;
alter table private.user_roles         enable row level security;
alter table private.seller_accounts    enable row level security;
alter table private.buyer_accounts     enable row level security;
alter table private.seller_identities  enable row level security;
alter table private.buyer_identities   enable row level security;
alter table private.identity_reveals   enable row level security;
-- No policies and no grants on purpose: only SECURITY DEFINER functions owned by the migration role get in.

-- ---------------------------------------------------------------------------------------------------
-- Helper functions for policies
-- ---------------------------------------------------------------------------------------------------
create function app.role() returns text
language sql stable security definer set search_path = '' as $$
  select r.role from private.user_roles r where r.user_id = (select auth.uid())
$$;

create function app.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin')
$$;

create function app.seller_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select a.seller_id from private.seller_accounts a where a.user_id = (select auth.uid())
$$;

create function app.buyer_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select a.buyer_id from private.buyer_accounts a where a.user_id = (select auth.uid())
$$;

-- (execute grants for all functions are at the end of this file)

-- ---------------------------------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------------------------------
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique default ('P-' || app.random_code(6)),  -- used in URLs, never the title
  seller_id       uuid not null references public.sellers(id) on delete cascade,
  category_id     smallint not null references public.categories(id),
  title_en        text not null check (length(btrim(title_en)) between 3 and 120),
  title_ar        text not null check (length(btrim(title_ar)) between 3 and 120),
  part_number     text not null check (length(btrim(part_number)) between 2 and 40),
  condition       text not null check (condition in ('new', 'used', 'refurbished')),
  specs           jsonb not null default '[]'::jsonb check (jsonb_typeof(specs) = 'array'),
  description_en  text not null default '' check (length(description_en) <= 2000),
  description_ar  text not null default '' check (length(description_ar) <= 2000),
  price_piastres  bigint not null check (price_piastres > 0 and price_piastres <= 100000000000),
  stock           integer not null default 0 check (stock between 0 and 100000),
  status          text not null default 'active' check (status in ('active', 'paused', 'flagged')),
  listed_on       date not null default current_date,
  search_text     text generated always as (lower(title_en || ' ' || title_ar || ' ' || part_number)) stored
);

create index products_seller_idx   on public.products (seller_id);
create index products_category_idx on public.products (category_id) where status = 'active';
create index products_search_idx   on public.products using gin (search_text extensions.gin_trgm_ops);

create table public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  path        text not null unique,          -- random name inside the bucket, set by the server
  width       integer not null,
  height      integer not null,
  sort        smallint not null default 0
);
create index product_images_product_idx on public.product_images (product_id);

-- At most 10 products per seller. The row lock on the seller makes parallel inserts wait for each other,
-- so two requests arriving together cannot both see "9".
create function private.enforce_product_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  perform 1 from public.sellers s where s.id = new.seller_id for update;
  select count(*) into n from public.products p where p.seller_id = new.seller_id;
  if n >= 10 then
    raise exception 'product_limit_reached'
      using errcode = 'P0001', hint = 'A seller can list at most 10 products.';
  end if;
  return new;
end
$$;

create trigger products_enforce_limit
  before insert on public.products
  for each row execute function private.enforce_product_limit();

-- A product never moves to another seller, and its public ref never changes.
create function private.products_freeze_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.seller_id is distinct from old.seller_id or new.ref is distinct from old.ref
     or new.id is distinct from old.id then
    raise exception 'immutable_column' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger products_freeze_identity
  before update on public.products
  for each row execute function private.products_freeze_identity();

-- ---------------------------------------------------------------------------------------------------
-- Row level security: public schema
-- ---------------------------------------------------------------------------------------------------
alter table public.regions         enable row level security;
alter table public.categories      enable row level security;
alter table public.sellers         enable row level security;
alter table public.buyers          enable row level security;
alter table public.products        enable row level security;
alter table public.product_images  enable row level security;

create policy regions_read on public.regions for select to anon, authenticated using (true);
create policy categories_read on public.categories for select to anon, authenticated using (true);

-- Visitors see active sellers; a seller also sees their own row; the admin sees all.
create policy sellers_read on public.sellers for select to anon, authenticated
  using (status = 'active' or id = (select app.seller_id()) or (select app.is_admin()));

-- A buyer row is visible to its owner and the admin only (sellers get buyer codes through orders later).
create policy buyers_read on public.buyers for select to authenticated
  using (id = (select app.buyer_id()) or (select app.is_admin()));

create policy products_read on public.products for select to anon, authenticated
  using (
    (status = 'active'
      and exists (select 1 from public.sellers s where s.id = products.seller_id and s.status = 'active'))
    or seller_id = (select app.seller_id())
    or (select app.is_admin())
  );

create policy products_insert_own on public.products for insert to authenticated
  with check (seller_id = (select app.seller_id()) and status in ('active', 'paused'));

create policy products_update_own on public.products for update to authenticated
  using (seller_id = (select app.seller_id()) and status <> 'flagged')
  with check (seller_id = (select app.seller_id()) and status in ('active', 'paused'));

create policy products_delete_own on public.products for delete to authenticated
  using (seller_id = (select app.seller_id()));

create policy products_admin_update on public.products for update to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

-- Images follow their product: the sub-select runs under the caller's own product policy.
create policy product_images_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_images.product_id));

-- Grants. Nothing is granted unless it is listed here.
grant select on public.regions, public.categories, public.sellers, public.products, public.product_images
  to anon, authenticated;
grant select on public.buyers to authenticated;
grant insert (seller_id, category_id, title_en, title_ar, part_number, condition, specs,
              description_en, description_ar, price_piastres, stock, status)
  on public.products to authenticated;
grant update (category_id, title_en, title_ar, part_number, condition, specs,
              description_en, description_ar, price_piastres, stock, status)
  on public.products to authenticated;
grant delete on public.products to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- New auth user -> role (+ buyer row). Admin can only come from app_metadata, which users cannot set.
-- ---------------------------------------------------------------------------------------------------
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role   text;
  v_buyer  uuid;
  v_code   text;
begin
  v_role := new.raw_app_meta_data ->> 'role';
  if v_role is null or v_role not in ('buyer', 'seller', 'admin') then
    v_role := new.raw_user_meta_data ->> 'role';
    if v_role is null or v_role not in ('buyer', 'seller') then
      v_role := 'buyer';
    end if;
  end if;

  insert into private.user_roles (user_id, role) values (new.id, v_role);

  if v_role = 'buyer' then
    loop
      v_code := 'B-' || app.random_code(5);
      exit when not exists (select 1 from public.buyers b where b.code = v_code);
    end loop;
    insert into public.buyers (code) values (v_code) returning id into v_buyer;
    insert into private.buyer_accounts (buyer_id, user_id) values (v_buyer, new.id);
    insert into private.buyer_identities (buyer_id) values (v_buyer);
  end if;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------------------------------
-- Functions users may call (the only doors into the private schema)
-- ---------------------------------------------------------------------------------------------------

-- Who am I? One round trip for the app shell.
create function public.whoami()
returns table (role text, seller_id uuid, seller_code text, seller_status text, buyer_id uuid, buyer_code text)
language sql stable security definer set search_path = '' as $$
  select r.role, s.id, s.code, s.status, b.id, b.code
  from private.user_roles r
  left join private.seller_accounts sa on sa.user_id = r.user_id
  left join public.sellers s on s.id = sa.seller_id
  left join private.buyer_accounts ba on ba.user_id = r.user_id
  left join public.buyers b on b.id = ba.buyer_id
  where r.user_id = (select auth.uid())
$$;

-- Seller onboarding: creates the public row and the private identity in one transaction.
create function public.seller_onboard(
  p_region text, p_legal_name text, p_contact_name text, p_phone text, p_email text,
  p_address text, p_tax_id text default '', p_bank_name text default '', p_iban text default ''
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := (select auth.uid());
  v_seller  uuid;
  v_code    text;
begin
  if v_uid is null or (select app.role()) is distinct from 'seller' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if exists (select 1 from private.seller_accounts a where a.user_id = v_uid) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;
  if length(btrim(coalesce(p_legal_name, ''))) < 2 or length(btrim(coalesce(p_contact_name, ''))) < 2
     or length(btrim(coalesce(p_phone, ''))) < 6 or length(btrim(coalesce(p_address, ''))) < 5
     or position('@' in coalesce(p_email, '')) < 2 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.regions g where g.key = p_region) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  loop
    v_code := 'S-' || app.random_code(4);
    exit when not exists (select 1 from public.sellers s where s.code = v_code);
  end loop;

  insert into public.sellers (code, region) values (v_code, p_region) returning id into v_seller;
  insert into private.seller_accounts (seller_id, user_id) values (v_seller, v_uid);
  insert into private.seller_identities
    (seller_id, legal_name, contact_name, phone, email, address, tax_id, bank_name, iban)
  values
    (v_seller, btrim(p_legal_name), btrim(p_contact_name), btrim(p_phone), btrim(p_email), btrim(p_address),
     btrim(coalesce(p_tax_id, '')), btrim(coalesce(p_bank_name, '')), btrim(coalesce(p_iban, '')));
  return v_code;
end
$$;

-- A seller reads their own identity. Nobody else's: the id comes from the session, not from an argument.
create function public.seller_my_identity()
returns table (legal_name text, contact_name text, phone text, email text, address text,
               tax_id text, bank_name text, iban text)
language sql stable security definer set search_path = '' as $$
  select i.legal_name, i.contact_name, i.phone, i.email, i.address, i.tax_id, i.bank_name, i.iban
  from private.seller_identities i
  where i.seller_id = (select app.seller_id())
$$;

-- The admin's only way to see a seller's identity. The audit row is written first, in the same
-- transaction, so there is no read without a record.
create function public.admin_reveal_seller_identity(p_seller_id uuid, p_reason text)
returns table (seller_code text, legal_name text, contact_name text, phone text, email text, address text,
               tax_id text, bank_name text, iban text)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception 'reason_required' using errcode = 'P0001', hint = 'Give a reason of at least 10 characters.';
  end if;
  if not exists (select 1 from public.sellers s where s.id = p_seller_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  insert into private.identity_reveals (admin_user_id, seller_id, reason)
  values ((select auth.uid()), p_seller_id, btrim(p_reason));

  return query
    select s.code, i.legal_name, i.contact_name, i.phone, i.email, i.address, i.tax_id, i.bank_name, i.iban
    from public.sellers s
    join private.seller_identities i on i.seller_id = s.id
    where s.id = p_seller_id;
end
$$;

create function public.admin_list_reveals()
returns table (id bigint, created_at timestamptz, seller_id uuid, seller_code text, reason text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select v.id, v.created_at, v.seller_id, s.code, v.reason
    from private.identity_reveals v
    join public.sellers s on s.id = v.seller_id
    order by v.id desc
    limit 200;
end
$$;

create function public.admin_set_seller_status(p_seller_id uuid, p_status text, p_verified boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select app.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'active', 'suspended') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  -- The marketplace is sized for 1000 sellers.
  if p_status = 'active'
     and (select count(*) from public.sellers s where s.status = 'active' and s.id <> p_seller_id) >= 1000 then
    raise exception 'seller_limit_reached' using errcode = 'P0001';
  end if;
  update public.sellers set status = p_status, verified = coalesce(p_verified, verified) where id = p_seller_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end
$$;

-- Function privileges: take everything away first, then grant exactly what is meant to be callable.
revoke execute on all functions in schema public, app, private from public, anon, authenticated;

grant execute on function app.role(), app.is_admin(), app.seller_id(), app.buyer_id(), app.random_code(int)
  to anon, authenticated, service_role;
grant execute on function public.whoami() to authenticated;
grant execute on function public.seller_onboard(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.seller_my_identity() to authenticated;
grant execute on function public.admin_reveal_seller_identity(uuid, text) to authenticated;
grant execute on function public.admin_list_reveals() to authenticated;
grant execute on function public.admin_set_seller_status(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Storage: product photos. Public read, no write policy for users: only the server (after re-encoding)
-- writes here with the secret key.
-- ---------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 1048576, array['image/webp'])
on conflict (id) do nothing;

-- The server role (secret key) works on public tables for seeding, image rows and, later, webhooks.
grant select, insert, update, delete on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------------------------------
-- Reference rows
-- ---------------------------------------------------------------------------------------------------
insert into public.regions (key, name_en, name_ar) values
  ('cairo', 'Cairo', 'القاهرة'),
  ('giza', 'Giza', 'الجيزة'),
  ('alexandria', 'Alexandria', 'الإسكندرية'),
  ('qalyubia', 'Qalyubia', 'القليوبية'),
  ('sharqia', 'Sharqia', 'الشرقية'),
  ('dakahlia', 'Dakahlia', 'الدقهلية'),
  ('gharbia', 'Gharbia', 'الغربية'),
  ('monufia', 'Monufia', 'المنوفية'),
  ('beheira', 'Beheira', 'البحيرة'),
  ('kafr-el-sheikh', 'Kafr El Sheikh', 'كفر الشيخ'),
  ('damietta', 'Damietta', 'دمياط'),
  ('port-said', 'Port Said', 'بورسعيد'),
  ('ismailia', 'Ismailia', 'الإسماعيلية'),
  ('suez', 'Suez', 'السويس'),
  ('north-sinai', 'North Sinai', 'شمال سيناء'),
  ('south-sinai', 'South Sinai', 'جنوب سيناء'),
  ('faiyum', 'Faiyum', 'الفيوم'),
  ('beni-suef', 'Beni Suef', 'بني سويف'),
  ('minya', 'Minya', 'المنيا'),
  ('asyut', 'Asyut', 'أسيوط'),
  ('sohag', 'Sohag', 'سوهاج'),
  ('qena', 'Qena', 'قنا'),
  ('luxor', 'Luxor', 'الأقصر'),
  ('aswan', 'Aswan', 'أسوان'),
  ('red-sea', 'Red Sea', 'البحر الأحمر'),
  ('new-valley', 'New Valley', 'الوادي الجديد'),
  ('matrouh', 'Matrouh', 'مطروح');

insert into public.categories (slug, name_en, name_ar, sort) values
  ('hydraulic-pumps', 'Hydraulic pumps', 'مضخات هيدروليكية', 10),
  ('hydraulic-cylinders', 'Hydraulic cylinders', 'أسطوانات هيدروليكية', 20),
  ('valves', 'Valves', 'صمامات', 30),
  ('hoses-fittings', 'Hoses and fittings', 'خراطيم ووصلات', 40),
  ('seals', 'Seals and O-rings', 'موانع تسرب وحلقات', 50),
  ('bearings', 'Bearings', 'رولمان بلي', 60),
  ('power-transmission', 'Gearboxes and couplings', 'صناديق تروس ووصلات', 70),
  ('filters', 'Filters', 'فلاتر', 80);
