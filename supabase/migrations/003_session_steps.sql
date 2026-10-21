-- Déroulé propre à chaque session, modifiable en direct par l'animateur.
-- null = sessions créées avant cette migration : l'app utilise le déroulé par défaut.
alter table public.sessions add column if not exists steps jsonb;
