-- MatPlan — migration 006
-- Kjør i Supabase SQL Editor etter de forrige migrasjonene. Trygt å køyre flere ganger.

alter table grocery_checked add column if not exists excluded boolean not null default false;
