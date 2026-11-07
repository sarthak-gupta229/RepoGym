-- Migration 0004: Hackathon Evaluations Table
-- Stores completed and in-progress hackathon defenses, scores, marks, and corrections

create table if not exists public.hackathon_evaluations (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  repo_id text not null,
  analysis_id text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  current_criterion_index integer not null default 0,
  total_criteria integer not null default 6,
  total_score numeric not null default 0,
  criterion_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hackathon_evaluations_user on public.hackathon_evaluations(user_id);
create index if not exists idx_hackathon_evaluations_repo on public.hackathon_evaluations(repo_id);
create index if not exists idx_hackathon_evaluations_status on public.hackathon_evaluations(status);

-- Enable RLS
alter table public.hackathon_evaluations enable row level security;

-- Policies for hackathon_evaluations
create policy "Users can view own hackathon evaluations"
  on public.hackathon_evaluations for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own hackathon evaluations"
  on public.hackathon_evaluations for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own hackathon evaluations"
  on public.hackathon_evaluations for update
  to authenticated
  using (auth.uid() = user_id);
