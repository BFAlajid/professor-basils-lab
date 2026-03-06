-- Pokemon Team Builder - Supabase Schema
-- Run this in the Supabase SQL editor to set up the database

-- Player profile (extends auth.users)
create table public.players (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  avatar_sprite int not null default 0,
  elo_rating int not null default 1000,
  season_elo int not null default 1000,
  total_wins int not null default 0,
  total_losses int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  season_id int not null default 1,
  created_at timestamptz not null default now()
);

-- Ranked battle results
create table public.battles (
  id uuid default gen_random_uuid() primary key,
  season_id int not null,
  player1_id uuid references public.players(id) not null,
  player2_id uuid references public.players(id) not null,
  winner_id uuid references public.players(id) not null,
  player1_elo_before int not null,
  player2_elo_before int not null,
  player1_elo_after int not null,
  player2_elo_after int not null,
  format text not null default 'OU',
  created_at timestamptz not null default now()
);

-- Seasons
create table public.seasons (
  id serial primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default false
);

-- Season archives (snapshot at season end)
create table public.season_rankings (
  id uuid default gen_random_uuid() primary key,
  season_id int references public.seasons(id) not null,
  player_id uuid references public.players(id) not null,
  final_elo int not null,
  final_rank int not null,
  wins int not null,
  losses int not null,
  unique(season_id, player_id)
);

-- Pending battle reports (for dual-report verification)
create table public.pending_battle_reports (
  id uuid default gen_random_uuid() primary key,
  battle_id text not null,
  reporter_id uuid references public.players(id) not null,
  opponent_id uuid references public.players(id) not null,
  reporter_won boolean not null,
  format text not null default 'OU',
  created_at timestamptz not null default now()
);

-- Auto-expire stale pending reports (older than 2 minutes)
create index idx_pending_reports_battle on public.pending_battle_reports(battle_id);
create index idx_pending_reports_created on public.pending_battle_reports(created_at);

-- Insert default season
insert into public.seasons (name, starts_at, ends_at, is_active)
values ('Season 1', now(), now() + interval '3 months', true);

-- RLS policies
alter table public.players enable row level security;
alter table public.battles enable row level security;
alter table public.seasons enable row level security;
alter table public.season_rankings enable row level security;
alter table public.pending_battle_reports enable row level security;

-- Anyone can read players/leaderboard/seasons
create policy "public read players" on public.players for select using (true);
create policy "public read battles" on public.battles for select using (true);
create policy "public read seasons" on public.seasons for select using (true);
create policy "public read rankings" on public.season_rankings for select using (true);

-- Only the player can update their own profile (display_name, avatar)
create policy "self update" on public.players for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Players can insert their own profile row on registration
create policy "self insert" on public.players for insert
  with check (auth.uid() = id);

-- Battles inserted by service role only (server-side API route)
-- No client-side insert policy needed; service role bypasses RLS

-- Pending reports: players can insert their own reports
create policy "self insert reports" on public.pending_battle_reports for insert
  with check (auth.uid() = reporter_id);

-- Pending reports: service role handles reads/deletes (no client read needed)
