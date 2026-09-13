-- 0006_merchant_geo.sql
-- Venue coordinates for the consumer "near you" experience: nullable, additive,
-- backward compatible (old code never reads them). New venues can populate the
-- values by selecting an address-autocomplete suggestion.
--
-- Review + apply manually to the shared project (see infra/supabase/README.md).

alter table public.merchants
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.merchants
  add constraint merchants_latitude_range
    check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.merchants
  add constraint merchants_longitude_range
    check (longitude is null or (longitude >= -180 and longitude <= 180));

-- Manual staging verification:
--   select slug, latitude, longitude from public.merchants;
--   (expect: columns exist; existing rows remain null until backfilled)
