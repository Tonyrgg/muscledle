create extension if not exists pgcrypto;

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid null references auth.users(id) on delete set null,
  visitor_id text not null,
  status text not null default 'new' check (status in ('new', 'triaged', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  category text not null check (category in ('bug', 'ux', 'feature', 'data')),
  module text null check (module in ('daily', 'marathon', 'archive', 'auth', 'privacy', 'general')),
  severity text null check (severity in ('blocker', 'high', 'medium', 'low')),
  impact text null check (impact in ('low', 'medium', 'high', 'critical')),
  title text not null,
  description text not null,
  repro_steps text null,
  current_behavior text null,
  suggestion text null,
  use_case text null,
  benefit text null,
  data_type text null check (data_type in ('exercise_text', 'exercise_media', 'attributes', 'translation', 'other')),
  content_reference text null,
  contact_email text null,
  page_path text null,
  game_mode text null check (game_mode in ('daily', 'infinite')),
  diagnostics jsonb not null default '{}'::jsonb,
  triage_score integer not null default 0,
  duplicate_of uuid null references public.feedback_reports(id) on delete set null,
  assigned_to text null,
  resolution_notes text null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.feedback_reports(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  actor_role text not null check (actor_role in ('user', 'system', 'admin')),
  event_type text not null check (event_type in ('created', 'status_changed', 'comment', 'attachment_added', 'deduplicated', 'priority_changed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.feedback_reports(id) on delete cascade,
  uploaded_by_user_id uuid null references auth.users(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text null,
  size_bytes bigint null,
  created_at timestamptz not null default now()
);

create index if not exists ix_feedback_reports_reporter_user_id on public.feedback_reports(reporter_user_id);
create index if not exists ix_feedback_reports_visitor_id on public.feedback_reports(visitor_id);
create index if not exists ix_feedback_reports_status on public.feedback_reports(status);
create index if not exists ix_feedback_reports_category on public.feedback_reports(category);
create index if not exists ix_feedback_reports_created_at on public.feedback_reports(created_at desc);
create index if not exists ix_feedback_report_events_report_id on public.feedback_report_events(report_id);
create index if not exists ix_feedback_report_attachments_report_id on public.feedback_report_attachments(report_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('feedback-attachments', 'feedback-attachments', false, 10485760)
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_feedback_reports_updated_at on public.feedback_reports;
create trigger trg_feedback_reports_updated_at
before update on public.feedback_reports
for each row execute function public.set_updated_at();
