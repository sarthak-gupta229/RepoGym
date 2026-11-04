-- Migration 0001: Schema for RepoGym

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. users
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  github_username text,
  created_at timestamptz not null default now()
);

-- 2. repos
create table if not exists public.repos (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  name text not null,
  default_branch text not null default 'main',
  created_at timestamptz not null default now(),
  constraint repos_owner_name_unique unique (owner, name)
);

-- 3. analyses (shared across users, keyed by repo and commit)
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.repos(id) on delete cascade,
  commit_sha text not null,
  file_map jsonb not null,
  graph jsonb not null,
  flows jsonb not null,
  truncated boolean not null default false,
  created_at timestamptz not null default now(),
  constraint analyses_repo_commit_unique unique (repo_id, commit_sha)
);

-- 4. sessions (private to user)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  flow_tag text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'paused')),
  total_questions integer not null default 3,
  current_index integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. questions (attached to a session)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  flow_tag text not null,
  position integer not null,
  question text not null,
  expected_facts jsonb not null,
  created_at timestamptz not null default now()
);

-- 6. attempts (student answers and evaluations)
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  answer text not null,
  score numeric not null,
  max_score numeric not null,
  verdict text not null check (verdict in ('correct', 'partial', 'incorrect')),
  covered jsonb not null default '[]'::jsonb,
  missed jsonb not null default '[]'::jsonb,
  feedback text not null,
  citations jsonb not null default '[]'::jsonb,
  follow_up_question text,
  created_at timestamptz not null default now()
);

-- 7. feedback_flags (helpful thumbs up/down)
create table if not exists public.feedback_flags (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  helpful boolean not null,
  note text,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_analyses_repo_commit on public.analyses(repo_id, commit_sha);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_questions_session_id on public.questions(session_id);
create index if not exists idx_attempts_question_id on public.attempts(question_id);
create index if not exists idx_attempts_user_id on public.attempts(user_id);
create index if not exists idx_feedback_attempt_id on public.feedback_flags(attempt_id);

