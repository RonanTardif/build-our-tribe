-- « J'ai fini » : l'étape que chaque participant a déclarée terminée.
alter table public.participants add column if not exists ready_step text;
