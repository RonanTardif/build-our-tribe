-- Jeu des balles : état du jeu par session (balles surprises, rush, classement) et jetons des joueurs.
-- Les joueurs ont leur propre identifiant, distinct de celui des post-its : le classement nominatif
-- ne permet pas de retrouver qui a écrit quoi.
alter table public.sessions add column if not exists game jsonb not null default '{}'::jsonb;

create table if not exists public.players (
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null,
  name text check (char_length(name) <= 40),
  tokens int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (session_id, player_id)
);

grant select, insert, update, delete on public.players to anon, authenticated;
alter table public.players enable row level security;
create policy "workshop open access" on public.players for all to anon, authenticated using (true) with check (true);
alter publication supabase_realtime add table public.players;
