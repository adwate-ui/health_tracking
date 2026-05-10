-- ────────────────────────────────────────────────────────────────────────────
-- Initial schema for TotalMacro
-- ────────────────────────────────────────────────────────────────────────────
--
-- Multi-tenancy model: row-level security on every table. Every row carries a
-- user_id column that references auth.users. Every policy enforces
--     auth.uid() = user_id
-- on both read and write. There is no application-layer authorisation; the
-- database refuses to return cross-user data even if the application code
-- forgets to filter.
--
-- The RLS test suite (supabase/tests/rls.test.mjs) runs in CI and includes
-- a deliberately malicious-user simulation that must fail at the database.
-- ────────────────────────────────────────────────────────────────────────────

-- ─── 1. profiles ────────────────────────────────────────────────────────────
-- One row per user. id matches auth.users(id).
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  sex          text check (sex in ('male', 'female', 'other', 'prefer_not_to_say')),
  height_cm    numeric(5, 1) check (height_cm > 0 and height_cm < 300),
  dob          date check (dob > '1900-01-01' and dob <= current_date),
  timezone     text not null default 'UTC',
  units_metric boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users see their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- ─── 2. targets ─────────────────────────────────────────────────────────────
create table public.targets (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  daily_calories        integer check (daily_calories > 0 and daily_calories < 10000),
  daily_protein_g       integer check (daily_protein_g >= 0 and daily_protein_g < 1000),
  daily_fibre_g         integer check (daily_fibre_g >= 0 and daily_fibre_g < 200),
  daily_water_ml        integer check (daily_water_ml >= 0 and daily_water_ml < 20000),
  daily_steps           integer check (daily_steps >= 0 and daily_steps < 100000),
  weekly_gym_sessions   integer check (weekly_gym_sessions >= 0 and weekly_gym_sessions <= 14),
  goal_weight_kg        numeric(5, 2) check (goal_weight_kg > 0 and goal_weight_kg < 500),
  goal_date             date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id) -- one active target row per user
);

alter table public.targets enable row level security;

create policy "users see their own targets"
  on public.targets for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 3. daily_logs ──────────────────────────────────────────────────────────
create table public.daily_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  log_date     date not null,
  calories     integer check (calories >= 0 and calories < 20000),
  protein_g    numeric(6, 1) check (protein_g >= 0 and protein_g < 2000),
  fibre_g      numeric(6, 1) check (fibre_g >= 0 and fibre_g < 500),
  water_ml     integer check (water_ml >= 0 and water_ml < 30000),
  steps        integer check (steps >= 0 and steps < 200000),
  gym_session  boolean not null default false,
  notes        text check (length(notes) < 5000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, log_date) -- one log per user per day
);

create index daily_logs_user_date_idx on public.daily_logs (user_id, log_date desc);

alter table public.daily_logs enable row level security;

create policy "users see their own daily logs"
  on public.daily_logs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 4. food_entries ────────────────────────────────────────────────────────
create table public.food_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  log_id          uuid not null references public.daily_logs(id) on delete cascade,
  source          text not null check (source in ('off', 'usda', 'manual')),
  source_id       text, -- OFF barcode or USDA fdc_id; null for manual
  name            text not null check (length(name) > 0 and length(name) < 500),
  grams           numeric(7, 1) not null check (grams > 0 and grams < 10000),
  calories        numeric(7, 1),
  protein_g       numeric(6, 1),
  fibre_g         numeric(6, 1),
  fat_g           numeric(6, 1),
  carbs_g         numeric(6, 1),
  consumed_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index food_entries_log_idx on public.food_entries (log_id);

alter table public.food_entries enable row level security;

create policy "users see their own food entries"
  on public.food_entries for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 5. weekly_checkins ─────────────────────────────────────────────────────
create table public.weekly_checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  week_start    date not null, -- always a Monday
  weight_kg     numeric(5, 2) check (weight_kg > 0 and weight_kg < 500),
  neck_cm       numeric(4, 1) check (neck_cm > 0 and neck_cm < 100),
  chest_cm      numeric(4, 1) check (chest_cm > 0 and chest_cm < 200),
  waist_cm      numeric(4, 1) check (waist_cm > 0 and waist_cm < 200),
  hips_cm       numeric(4, 1) check (hips_cm > 0 and hips_cm < 200),
  body_fat_pct  numeric(4, 1) check (body_fat_pct >= 0 and body_fat_pct <= 80),
  notes         text check (length(notes) < 5000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, week_start)
);

create index weekly_checkins_user_week_idx on public.weekly_checkins (user_id, week_start desc);

alter table public.weekly_checkins enable row level security;

create policy "users see their own weekly checkins"
  on public.weekly_checkins for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 6. lab_results ─────────────────────────────────────────────────────────
create table public.lab_results (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  taken_at     date not null,
  marker_code  text not null check (length(marker_code) > 0 and length(marker_code) < 50),
  value        numeric(10, 3) not null,
  unit         text not null check (length(unit) < 20),
  source       text check (length(source) < 100),
  notes        text check (length(notes) < 5000),
  created_at   timestamptz not null default now()
);

create index lab_results_user_taken_idx on public.lab_results (user_id, taken_at desc);

alter table public.lab_results enable row level security;

create policy "users see their own lab results"
  on public.lab_results for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 7. integrations ────────────────────────────────────────────────────────
-- One row per (user, provider) connection. Credentials encrypted at rest by
-- Supabase + additionally encrypted at the application layer for sensitive
-- values like Hevy API keys.
create table public.integrations (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  provider               text not null check (provider in ('hevy', 'healthkit', 'health_connect')),
  encrypted_credentials  text, -- bytea-as-base64; app-layer encryption
  last_sync_at           timestamptz,
  status                 text not null default 'pending' check (status in ('pending', 'connected', 'error', 'disabled')),
  error_message          text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.integrations enable row level security;

create policy "users see their own integrations"
  on public.integrations for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 8. workout_imports ─────────────────────────────────────────────────────
create table public.workout_imports (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  source_provider   text not null check (source_provider in ('hevy', 'healthkit', 'health_connect')),
  source_id         text not null,
  started_at        timestamptz not null,
  raw_payload       jsonb not null,
  dedupe_key        text not null,
  imported_at       timestamptz not null default now(),
  unique (user_id, source_provider, dedupe_key)
);

create index workout_imports_user_started_idx on public.workout_imports (user_id, started_at desc);

alter table public.workout_imports enable row level security;

create policy "users see their own workout imports"
  on public.workout_imports for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 9. push_subscriptions ──────────────────────────────────────────────────
create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "users see their own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Triggers for updated_at columns
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at_targets
  before update on public.targets
  for each row execute function public.set_updated_at();

create trigger set_updated_at_daily_logs
  before update on public.daily_logs
  for each row execute function public.set_updated_at();

create trigger set_updated_at_weekly_checkins
  before update on public.weekly_checkins
  for each row execute function public.set_updated_at();

create trigger set_updated_at_integrations
  before update on public.integrations
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Auto-create a profile row on user sign-up
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, timezone)
  values (new.id, coalesce(new.raw_user_meta_data->>'timezone', 'UTC'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
