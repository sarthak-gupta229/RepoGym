-- Migration 0003: User repository tracking
-- Tracks which repositories each user has visited / analyzed / added

create table if not exists public.user_repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  repo_id uuid not null references public.repos(id) on delete cascade,
  last_visited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_repos_user_repo_unique unique (user_id, repo_id)
);

create index if not exists idx_user_repos_user_id on public.user_repos(user_id);
create index if not exists idx_user_repos_repo_id on public.user_repos(repo_id);
create index if not exists idx_user_repos_last_visited on public.user_repos(last_visited_at desc);

-- Enable RLS
alter table public.user_repos enable row level security;

-- Policies for user_repos
create policy "Users can view own visited repos"
  on public.user_repos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own visited repos"
  on public.user_repos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own visited repos"
  on public.user_repos for update
  to authenticated
  using (auth.uid() = user_id);
