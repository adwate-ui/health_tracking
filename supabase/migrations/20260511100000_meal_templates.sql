-- ─── Meal Templates ─────────────────────────────────────────────────────────
-- A template is a named collection of food items a user can log in one tap.
-- RLS follows the same auth.uid() = user_id pattern as all other tables.

create table public.meal_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (length(name) > 0 and length(name) < 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index meal_templates_user_idx on public.meal_templates (user_id);

alter table public.meal_templates enable row level security;

create policy "users manage their own templates"
  on public.meal_templates for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Template Items ──────────────────────────────────────────────────────────
-- Each item mirrors the columns of food_entries (per-100g values scaled to grams).
-- Cascade delete when the parent template is deleted.

create table public.meal_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.meal_templates(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  source      text not null check (source in ('off', 'usda', 'manual')),
  source_id   text,
  name        text not null,
  grams       numeric(7, 1) not null check (grams > 0),
  calories    numeric(8, 1),
  protein_g   numeric(7, 2),
  fibre_g     numeric(7, 2),
  fat_g       numeric(7, 2),
  carbs_g     numeric(7, 2)
);

create index meal_template_items_template_idx on public.meal_template_items (template_id);

alter table public.meal_template_items enable row level security;

create policy "users manage their own template items"
  on public.meal_template_items for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
