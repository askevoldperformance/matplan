-- MatPlan — migration 002
-- Kjør denne i Supabase SQL Editor ETTER schema.sql. Trygt å kjøre flere ganger.

alter table foods add column if not exists store_code text;
alter table foods add column if not exists common_units jsonb;

alter table planned_meals alter column recipe_id drop not null;
alter table planned_meals add column if not exists person_id text;
alter table planned_meals add column if not exists items jsonb not null default '[]'::jsonb;

create index if not exists planned_meals_person_idx on planned_meals(person_id);
