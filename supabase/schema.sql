-- MatPlan — Supabase schema
-- Kjør denne hele fila i Supabase Dashboard → SQL Editor → Run.
-- Trygt å kjøre på nytt (bruker "if not exists" / "or replace" der det går).

create extension if not exists "pgcrypto";

-- Én husholdning, fast id — appen er bygget for ett hushold (Robin + Mina), ikke multi-tenant.
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

insert into households (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

create table if not exists people (
  id text primary key,
  household_id uuid references households(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  emoji text not null,
  gender text not null,
  age int not null,
  height_cm numeric not null,
  weight_kg numeric not null,
  activity_level text not null,
  goal text not null,
  goal_rate_kg_per_week numeric not null default 0,
  color text not null,
  weight_hidden boolean not null default false
);

create table if not exists foods (
  id text primary key,
  household_id uuid references households(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  category text not null,
  icon text not null default '🛒',
  price_per_unit numeric not null default 0,
  per100 jsonb not null,
  image_url text,
  kassal_id bigint,
  ean text,
  unit_price numeric,
  unit_price_label text,
  is_favorite boolean not null default false
);

create table if not exists recipes (
  id text primary key,
  household_id uuid references households(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  icon text not null default '🍽️',
  base_portions numeric not null default 1
);

create table if not exists recipe_ingredients (
  id bigserial primary key,
  recipe_id text references recipes(id) on delete cascade,
  food_id text references foods(id) on delete cascade,
  grams numeric not null
);

-- Ekte kalenderdatoer (ikke ukedag-mal) — slik kan du bla i historikk og fremtidige uker/måneder fritt.
create table if not exists planned_meals (
  id text primary key,
  household_id uuid references households(id) default '00000000-0000-0000-0000-000000000001',
  date date not null,
  slot text not null,
  recipe_id text references recipes(id) on delete cascade,
  person_portions jsonb not null default '{}'::jsonb,
  eaten_by jsonb not null default '{}'::jsonb
);
create index if not exists planned_meals_date_idx on planned_meals(date);

create table if not exists grocery_checked (
  household_id uuid references households(id) default '00000000-0000-0000-0000-000000000001',
  food_id text references foods(id) on delete cascade,
  iso_week text not null, -- f.eks "2026-W32"
  checked boolean not null default false,
  primary key (household_id, food_id, iso_week)
);

create table if not exists category_order (
  household_id uuid primary key references households(id) default '00000000-0000-0000-0000-000000000001',
  categories text[] not null
);

create table if not exists household_settings (
  household_id uuid primary key references households(id) default '00000000-0000-0000-0000-000000000001',
  kiwi_pluss_enabled boolean not null default true,
  trippel_trumf_today boolean not null default false
);

-- RLS: ingen ekte auth i denne appen (kun 2 husholdningsmedlemmer på egne telefoner),
-- så vi åpner opp for anon-rollen. IKKE bruk dette mønsteret for noe med flere husholdninger
-- eller sensitive data — anon-key har da full lese/skrive-tilgang til alt.
alter table people enable row level security;
alter table foods enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table planned_meals enable row level security;
alter table grocery_checked enable row level security;
alter table category_order enable row level security;
alter table household_settings enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['people','foods','recipes','recipe_ingredients','planned_meals','grocery_checked','category_order','household_settings'])
  loop
    execute format('drop policy if exists anon_all on %I', t);
    execute format('create policy anon_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;
