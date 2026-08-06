-- MatPlan — migration 005
-- Kjør i Supabase SQL Editor etter de forrige migrasjonene. Trygt å køyre flere ganger.

create table if not exists manual_grocery_items (
  id text primary key,
  household_id uuid references households(id) default '00000000-0000-0000-0000-000000000001',
  period_key text not null, -- samme periodenøkkel som grocery_checked (isoWeek eller yyyy-mm)
  food_id text references foods(id) on delete cascade,
  grams numeric not null
);

alter table manual_grocery_items enable row level security;
drop policy if exists anon_all on manual_grocery_items;
create policy anon_all on manual_grocery_items for all using (true) with check (true);
