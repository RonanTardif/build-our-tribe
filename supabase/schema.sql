-- Build Our Tribe : schéma Supabase.
-- À exécuter une fois dans le SQL Editor du projet (ou via l'API de management).

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null default 'Build Our Tribe',
  facilitator_key text not null,
  step_index int not null default -1,
  phase text not null default 'open' check (phase in ('open', 'revealed')),
  timer_end timestamptz,
  manifesto text,
  steps jsonb,
  game jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.participants (
  session_id uuid not null references public.sessions (id) on delete cascade,
  participant_id uuid not null,
  ready_step text,
  created_at timestamptz not null default now(),
  primary key (session_id, participant_id)
);

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  step_id text not null,
  label text not null check (char_length(label) between 1 and 200),
  created_at timestamptz not null default now()
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  step_id text not null,
  participant_id uuid not null,
  text text not null check (char_length(text) between 1 and 500),
  theme_id uuid references public.themes (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.choices (
  session_id uuid not null references public.sessions (id) on delete cascade,
  step_id text not null,
  participant_id uuid not null,
  option_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (session_id, step_id, participant_id)
);

create table public.votes (
  session_id uuid not null references public.sessions (id) on delete cascade,
  step_id text not null,
  participant_id uuid not null,
  allocation jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (session_id, step_id, participant_id)
);

-- Jeu des balles : identifiant de joueur distinct de celui des post-its (anonymat préservé).
create table public.players (
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null,
  name text check (char_length(name) <= 40),
  tokens int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (session_id, player_id)
);

create index on public.contributions (session_id);
create index on public.themes (session_id);
create index on public.choices (session_id);
create index on public.votes (session_id);

-- Accès : atelier interne sans compte, tout passe par la clé publique.
-- Les sessions sont « protégées » par leur code, pas par de l'authentification :
-- n'y mets rien de confidentiel.
grant select, insert, update, delete on
  public.sessions, public.participants, public.themes,
  public.contributions, public.choices, public.votes, public.players
to anon, authenticated;

alter table public.sessions enable row level security;
alter table public.participants enable row level security;
alter table public.themes enable row level security;
alter table public.contributions enable row level security;
alter table public.choices enable row level security;
alter table public.votes enable row level security;
alter table public.players enable row level security;

create policy "workshop open access" on public.sessions for all to anon, authenticated using (true) with check (true);
create policy "workshop open access" on public.participants for all to anon, authenticated using (true) with check (true);
create policy "workshop open access" on public.themes for all to anon, authenticated using (true) with check (true);
create policy "workshop open access" on public.contributions for all to anon, authenticated using (true) with check (true);
create policy "workshop open access" on public.choices for all to anon, authenticated using (true) with check (true);
create policy "workshop open access" on public.votes for all to anon, authenticated using (true) with check (true);
create policy "workshop open access" on public.players for all to anon, authenticated using (true) with check (true);

-- Temps réel
alter publication supabase_realtime add table
  public.sessions, public.participants, public.themes,
  public.contributions, public.choices, public.votes, public.players;
