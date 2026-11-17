-- Dasta 0005: where a listing image comes from.
--   upload   a photo uploaded by the seller (re-encoded on the server)
--   photo    a freely licensed third-party image used for illustration on a sample listing; credit required
--   drawing  an illustration made for this project
-- The credit columns are public on purpose: attribution has to be shown.

alter table public.product_images
  add column kind text not null default 'upload' check (kind in ('upload', 'photo', 'drawing')),
  add column credit_title text,
  add column credit_author text,
  add column credit_license text,
  add column credit_license_url text,
  add column credit_source_url text,
  add constraint product_images_credit_complete check (
    kind <> 'photo' or (credit_author is not null and credit_license is not null and credit_source_url is not null)
  );
