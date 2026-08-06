# MatPlan – Familiens kosthold

Mobile-first PWA for meal planning, nutrition tracking, shared grocery lists and weight
projection for two (or more) household members. All UI text is Norwegian; code is English.

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (CSS-first config in `src/index.css`, tokens match the mockup palette)
- Zustand for state (`src/store/useStore.ts`) — shaped 1:1 with a future Supabase schema
  (`src/types.ts`), so swapping in real persistence later is a data-layer change only, not
  a rewrite
- `vite-plugin-pwa` for manifest + service worker (installable on iOS Home Screen)
- Recharts for the weight-projection sparkline

## Run it
```bash
npm install
npm run dev       # dev server
npm run build     # production build -> dist/
npm run preview   # serve the production build locally
```

## Where the logic lives
- `src/utils/calculations.ts` — BMR (Mifflin-St Jeor) → TDEE → calorie target given goal
  + rate (kg/week), macro split, recipe portion scaling per person, weight projection
  (7700 kcal ≈ 1 kg fat), grocery-list aggregation across the whole week (dedupes
  ingredients, sums grams, estimates price).
- `src/data/seed.ts` — default household (Marius/Sofie), ~24 foods, 8 recipes, a full
  7-day starter plan. Replace with real data or wire to Supabase later.
- `src/store/useStore.ts` — all mutations (toggle eaten, edit portion, check groceries,
  add a recipe to the week plan, edit a person's profile).

## Screens (`src/components/screens/`)
- **Min Dag** — household dashboard, both people's calorie rings, next meal, weight
  projection.
- **Ukeplan** — per-person weekly planner, day navigation, "Spist" toggle, portion editor
  (REDIGER PLAN), daily nutrition summary.
- **Oppskrifter** — recipe list → detail with per-person portion scaling and "Legg til
  ukeplan" (day/slot picker).
- **Handleliste** — auto-aggregated shared shopping list, grouped by category, checkboxes,
  total estimated price, share/copy button.

## Kassal.app (Kiwi) integration
Real product data — photos, price, nutrition — comes from Kassal.app, filtered to Kiwi
(`store=KIWI`). The API token stays server-side in a tiny Express proxy (`server/`); the
frontend never sees it.

```bash
cp server/.env.example server/.env   # paste your real KASSAL_API_TOKEN into this file
npm run dev:all                       # runs Vite + the proxy together
```
(`npm run dev` + `npm run dev:server` in two terminals works the same way.)

In the app: **Oppskrifter → 🔍 (top right)** opens "Søk i Kiwi" — search, preview photo/
price/nutrition, "Legg til" adds it to the food database (`src/services/kassal.ts` maps
Kassal's response to our `FoodItem` shape, matching nutrition rows by Norwegian label since
Kassal doesn't expose a stable code enum).

**Kiwi Pluss bonus** (Handleliste screen): 15% cashback on Frukt/Grønnsaker-category items,
1% on everything else, with a manual "Trippeltrumf i dag" switch that bumps the 1% to 3%
(Kiwi announces Trippeltrumf same-day, so it can't be automated — you flip it on the days it
applies). Logic + the assumption it's built on (Trippeltrumf doesn't touch the fixed 15% produce
rate) are documented in `calcKiwiBonus` in `src/utils/calculations.ts` — correct me if Kiwi's
actual terms differ.

Existing seed recipes still use placeholder ingredients/emoji. Swapping them for real
Kassal products (with real prices/images) is the natural next step, once you're happy with
how search & mapping behaves.

## Supabase (data persistence)
Everything now persists — profiles, foods, recipes, meal plan, favorites, category order,
Kiwi Pluss settings — to Supabase instead of resetting on reload.

1. Run `supabase/schema.sql` once in your project's **SQL Editor**.
2. `cp .env.example .env`, paste in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API).
3. First load auto-seeds the empty database from `src/data/seed.ts` (only runs once —
   checks if the `people` table is empty first).

No real auth — this is a 2-person household app, not multi-tenant, so RLS is wide open to
the anon key. Don't reuse this schema/policy pattern for anything with real users or
sensitive data.

If `.env` is missing, the app still runs fine on local-only state (same as before) — it
just won't persist across reloads.

## What's new in this pass
- **Ekte produktbilder & priser** — kun for produkter lagt til via Kassal-søket (🔍 i
  Oppskrifter eller Produkter). Gamle seed-oppskrifter (Kyllingcurry, Pasta Bolognese osv.)
  bruker fortsatt placeholder-mat med emoji — bytt dem ut via Produkter-fanen når du vil.
- **Produkter-tab** — bla i matvarebasen, søk, stjerne for favoritt, trykk for pris/næring.
- **Ekte kalenderdatoer** — `PlannedMeal.date` er nå en faktisk dato (ikke en repeterende
  ukedag-mal), så historikk og fremtidig planlegging er naturlig — bla bakover/forover i
  Ukeplan, og handlelisten kan hentes for "Denne uken" / "Neste uke" / "Denne måneden".
- **Flyttbare kategorier** i Handleliste — opp/ned-piler, rekkefølgen lagres.
- **Profil-redigering** — trykk på en persons avatar på Min Dag → alder/høyde/vekt/
  aktivitetsnivå/mål, pluss "skjul vekt for partner"-toggle.
- **Enhets-identitet** — første gang appen åpnes på en telefon spør den "Hvem er du?" og
  lagrer det lokalt (ikke i Supabase) — det er det som avgjør hvem "partner" er for
  vekt-skjuling. Ikke passordbeskyttet, bare en UI-konvensjon.

## What's new in this pass
- **Flere butikker** — Kiwi er fortsatt standard, men søkemodalen har nå en rad med
  butikklogoer (Rema 1000, Coop Extra/Mega/Prix, Meny, Spar, Joker, Bunnpris, Europris) —
  trykk for å bytte hvilken kjede du søker i. Logoene hentes live fra Kassal.app
  (`/physical-stores`) via proxyen, ikke hardkodede bilder. Valgt butikk lagres per telefon
  (ikke delt med partner — du søker kanskje i Kiwi, hun i Rema).
- **Smart produkt-logging i Ukeplan** — "REDIGER PLAN" → "+ Legg til produkt" på et måltid.
  Søk i dine egne matvarer (eller "Søk i butikk" for noe nytt), velg mengde med
  fornuftige enheter (skive, ss, ts, dl, stk, tynt/tykt lag — utledet fra kategori/produkt,
  alltid overstyrbart) — kalorier/protein/etc. beregnes automatisk fra næringsinnhold per
  100g, ingen manuell utregning. Se `src/utils/units.ts` for hvilke enheter som gjelder
  hvilke matvarer, og juster om noe bommer.
- **Auto-porsjonering fra oppskrifter** — når du legger en lagret oppskrift til ukeplanen,
  beregnes standard-porsjon nå fra hver persons kaloribehov for det måltidet (frokost 20%,
  lunsj 25%, middag 35%, kveldsmat 20% av dagsmålet — se `SLOT_KCAL_SHARE` i
  `calculations.ts`), ikke bare 1x oppskriftens grunnporsjon. Fortsatt justerbart med
  +/- i redigeringsmodus.
- **Individuelle måltider** — "Legg til ukeplan" har nå "Gjelder: Begge / Bare Robin / Bare
  Mina", og "+ Legg til produkt" i Ukeplan er alltid person-spesifikt. Samme måltidsslot
  kan altså ha et delt familiemåltid OG noe som bare gjelder én person.

## Databasemigrasjon
Kjørte du `supabase/schema.sql` fra forrige runde? Kjør nå `supabase/migration_002.sql` i
samme SQL Editor (legger til kolonner for produkt-enheter, butikk-kode, person-spesifikke
måltider og løse produkter — trygt å kjøre flere ganger, endrer ikke eksisterende data).

## Pushe til GitHub
Jeg har ikke skrivetilgang til ditt repo herfra. Fra prosjektmappa:
```bash
git init                                          # bare hvis mappa ikke allerede er et repo
git remote add origin https://github.com/askevoldperformance/matplan.git
git add .
git commit -m "Kassal-integrasjon, multi-butikk, smart produkt-logging, Supabase"
git branch -M main
git push -u origin main
```
Hvis `remote add` klager over at `origin` finnes: `git remote set-url origin https://github.com/askevoldperformance/matplan.git`.

## Deploy til Vercel (slipp localhost)
Kassal-proxyen finnes nå også som Vercel Serverless Functions (`api/kassal/*.js`), delt
logikk med den lokale dev-serveren via `lib/kassal-fetch.mjs`. Det betyr frontend + "backend"
kjører på samme Vercel-deploy — ingen egen server å holde i gang.

1. Push koden til GitHub (se forrige avsnitt).
2. **vercel.com** → New Project → importer `askevoldperformance/matplan`.
3. Under **Environment Variables**, legg til:
   - `VITE_SUPABASE_URL` — samme som i din lokale `.env`
   - `VITE_SUPABASE_ANON_KEY` — samme som i din lokale `.env`
   - `KASSAL_API_TOKEN` — samme som i din lokale `server/.env` (denne blir ALDRI bundlet inn
     i frontend siden den ikke har `VITE_`-prefiks — kun serverless-funksjonene ser den)
4. Deploy. Du får en `https://matplan-xxx.vercel.app`-URL — åpne den på telefonen og legg
   til på hjemskjermen, samme som localhost-testen fra tidligere, men nå med ekte HTTPS
   (påkrevd for at PWA-installasjon skal fungere pålitelig utenfor localhost).
5. Videre `git push` til `main` gir automatisk ny deploy — helt likt AmiHub/BusinessDays-flyten.

Lokal dev (`npm run dev:all`) fortsetter å virke som før, uendret — de to serverne (Express
lokalt, serverless i prod) deler samme Kassal-logikk så de ikke kan drifte fra hverandre.

## Not wired up yet (by design, per local-state v1 scope)
- No auth / multi-device sync — everything lives in memory (Zustand), resets on reload.
- No custom-food/recipe creation UI yet (data model + store actions already support it —
  `addFood`, `addRecipe` — just needs a form).
- Person profile editing (age/height/weight/activity/goal) has a store action
  (`updatePerson`) but no settings screen yet.

Next obvious step when you're ready: a settings/profile screen using `updatePerson`, and
swapping `src/data/seed.ts` + the Zustand store for Supabase tables (schema already
matches `src/types.ts`).
