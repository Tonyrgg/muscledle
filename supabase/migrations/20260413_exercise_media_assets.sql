create extension if not exists pgcrypto;

create table if not exists public.exercise_media_assets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  media_kind text not null check (media_kind in ('video', 'image', 'icon')),
  source text not null check (source in ('wger', 'youtube', 'local', 'custom')),
  source_id text null,
  url text not null,
  thumbnail_url text null,
  poster_url text null,
  mime_type text null,
  width integer null,
  height integer null,
  duration_seconds numeric null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  attribution_text text null,
  attribution_url text null,
  license text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_exercise_media_assets_single_primary_per_kind
  on public.exercise_media_assets (exercise_id, media_kind)
  where is_primary = true and is_active = true;

create unique index if not exists ux_exercise_media_assets_source_identity
  on public.exercise_media_assets (exercise_id, media_kind, source, source_id);

create index if not exists ix_exercise_media_assets_exercise_id on public.exercise_media_assets (exercise_id);
create index if not exists ix_exercise_media_assets_kind on public.exercise_media_assets (media_kind);
create index if not exists ix_exercise_media_assets_active on public.exercise_media_assets (is_active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_exercise_media_assets_updated_at on public.exercise_media_assets;
create trigger trg_exercise_media_assets_updated_at
before update on public.exercise_media_assets
for each row execute function public.set_updated_at();
