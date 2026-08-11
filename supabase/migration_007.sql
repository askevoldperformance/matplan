-- MatPlan — migration 007
-- Kjør i Supabase SQL Editor etter de forrige migrasjonene. Trygt å køyre flere ganger.

alter table foods add column if not exists package_size_unknown boolean not null default false;
alter table foods add column if not exists pant numeric;
