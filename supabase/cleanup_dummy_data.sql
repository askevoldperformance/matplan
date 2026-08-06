-- MatPlan — cleanup dummy seed data
-- Kjør denne i Supabase SQL Editor for å fjerne de gamle placeholder-matvarene/oppskriftene
-- (Kyllingcurry, Pasta Bolognese, emoji-ikoner osv.) som lå i den første seedingen.
-- Beholder: people (Robin/Mina), category_order, household_settings.

delete from recipe_ingredients;
delete from planned_meals;
delete from recipes;
delete from foods;
