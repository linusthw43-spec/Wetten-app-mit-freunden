-- Phase 1: Profile (Anzeigename + Emoji) für anonym angemeldete Nutzer.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 24),
  avatar_emoji text not null default '😎' check (char_length(avatar_emoji) between 1 and 16),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Vorläufig: jeder sieht nur sein eigenes Profil.
-- In Phase 2 kommt eine Policy dazu, damit Gruppenmitglieder sich gegenseitig sehen.
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
