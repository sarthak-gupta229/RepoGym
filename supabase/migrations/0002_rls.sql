-- Migration 0002: Row Level Security (RLS) Policies

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.repos enable row level security;
alter table public.analyses enable row level security;
alter table public.sessions enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.feedback_flags enable row level security;

-- 1. users policies
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- 2. repos policies (shared catalog)
create policy "Repos are readable by authenticated users"
  on public.repos for select
  to authenticated
  using (true);

create policy "Authenticated users can create repos"
  on public.repos for insert
  to authenticated
  with check (true);

-- 3. analyses policies (shared across users)
create policy "Analyses are readable by authenticated users"
  on public.analyses for select
  to authenticated
  using (true);

create policy "Authenticated users and service role can create analyses"
  on public.analyses for insert
  to authenticated
  with check (true);

-- 4. sessions policies (strictly private to user)
create policy "Users can view own sessions"
  on public.sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own sessions"
  on public.sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  to authenticated
  using (auth.uid() = user_id);

-- 5. questions policies (accessible if user owns the session)
create policy "Users can view questions in own sessions"
  on public.questions for select
  to authenticated
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = questions.session_id
      and sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert questions into own sessions"
  on public.questions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sessions
      where sessions.id = questions.session_id
      and sessions.user_id = auth.uid()
    )
  );

-- 6. attempts policies (strictly private to user)
create policy "Users can view own attempts"
  on public.attempts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own attempts"
  on public.attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 7. feedback_flags policies (strictly private to user)
create policy "Users can view own feedback"
  on public.feedback_flags for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own feedback"
  on public.feedback_flags for insert
  to authenticated
  with check (auth.uid() = user_id);

