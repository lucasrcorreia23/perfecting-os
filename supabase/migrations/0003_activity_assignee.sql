-- Perfecting v1 — responsável por atividade.
-- Coluna nullable ligada a profiles (= auth.users); FK nomeada para o PostgREST
-- conseguir embutir o perfil do responsável na query do workflow.

alter table public.activities
  add column if not exists assignee_id uuid
    references public.profiles(id) on delete set null;

create index if not exists activities_assignee_id_idx
  on public.activities (assignee_id);
