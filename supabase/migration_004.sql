-- MatPlan — migration 004
-- Kjør i Supabase SQL Editor etter de forrige migrasjonene. Trygt å køyre flere ganger.

alter table foods add column if not exists description text;
alter table foods add column if not exists ingredients_text text;
alter table foods add column if not exists labels jsonb;
