-- Perfecting v1 — vínculo opcional arquivo → atividade.
-- O clipe por tarefa no drawer do workflow passa a registrar a qual atividade
-- o anexo pertence (nullable: uploads da aba Arquivos seguem soltos no
-- cliente; excluir a atividade solta o arquivo em vez de apagá-lo).

alter table public.client_files
  add column if not exists activity_id uuid
    references public.activities(id) on delete set null;

create index if not exists client_files_activity_id_idx
  on public.client_files (activity_id);
