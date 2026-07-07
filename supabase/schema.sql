-- WheelDesk — Supabase schema + RLS.
-- Users are managed by Clerk; we store clerk_user_id as the text key and, when
-- using Clerk's Supabase JWT template, RLS matches auth.jwt()->>'sub'.
-- The service role (server routes, cron, seed) bypasses RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text,
  plan text not null default 'free', -- 'free' | 'pro'
  stripe_customer_id text,
  stripe_subscription_id text,
  settings jsonb not null default '{}',
  created_at timestamptz default now()
);

create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  kind text not null,                -- 'csp' | 'cc' | 'stock'
  status text not null default 'open', -- open|closed|assigned|called_away|expired
  symbol text not null,
  strike numeric,
  expiration date,
  contracts int,
  premium_open numeric,
  premium_close numeric,
  delta_at_open numeric,
  shares int,
  cost_basis numeric,
  parent_position_id uuid references positions(id),
  opened_at date not null,
  closed_at date,
  notes text,
  created_at timestamptz default now()
);
create index if not exists positions_user_idx on positions(user_id);
create index if not exists positions_parent_idx on positions(parent_position_id);

create table if not exists alerts (
  id text primary key,               -- deterministic: "<positionId>:<type>"
  user_id uuid references profiles(id) not null,
  position_id uuid references positions(id),
  type text not null,                -- trap_50|earnings_collision|delta_drift|expiry_7d
  message text not null,
  triggered_at timestamptz default now(),
  dismissed boolean default false
);
create index if not exists alerts_user_idx on alerts(user_id);

create table if not exists quality_list (
  symbol text primary key,
  name text,
  passes_quality boolean not null,
  next_earnings date,
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table positions enable row level security;
alter table alerts enable row level security;
alter table quality_list enable row level security;

-- Helper: the profile id that belongs to the current Clerk user.
create or replace function current_profile_id() returns uuid
language sql stable as $$
  select id from profiles where clerk_user_id = auth.jwt()->>'sub'
$$;

-- profiles: a user sees/edits only their own row.
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles
  using (clerk_user_id = auth.jwt()->>'sub')
  with check (clerk_user_id = auth.jwt()->>'sub');

-- positions: scoped to the owning profile.
drop policy if exists positions_owner on positions;
create policy positions_owner on positions
  using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

-- alerts: scoped to the owning profile.
drop policy if exists alerts_owner on alerts;
create policy alerts_owner on alerts
  using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

-- quality_list: public read, service-role write only.
drop policy if exists quality_read on quality_list;
create policy quality_read on quality_list for select using (true);
-- (no insert/update/delete policy => only the service role can write)
