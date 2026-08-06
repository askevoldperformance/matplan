-- MatPlan — migration 003
-- Kjør i Supabase SQL Editor etter schema.sql og migration_002.sql. Trygt å køyre flere ganger.

alter table people add column if not exists manual_target_kcal numeric;
alter table foods add column if not exists package_weight numeric;
