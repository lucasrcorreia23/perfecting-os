-- Perfecting v1 — cronograma da POC nas atividades.
-- Incorpora as colunas da planilha "Atividades da POC - V1" ao workflow:
-- Semana, Prazo (dias), Dias totais, Responsável (categoria) e Tipo
-- (síncrono/assíncrono), além do slot de Subatividades (ainda sem conteúdo
-- na planilha — lista vazia por padrão). Colunas nullable: atividades criadas
-- à mão continuam válidas sem cronograma.

create type public.responsavel_categoria as enum ('cliente','perfecting','ambos');
create type public.atividade_tipo        as enum ('sincrono','assincrono');

alter table public.activities
  add column if not exists responsavel     public.responsavel_categoria,
  add column if not exists tipo            public.atividade_tipo,
  add column if not exists week            int,   -- Semana do programa (1..8)
  add column if not exists duration_days   int,   -- Prazo, em dias
  add column if not exists cumulative_days int,   -- Dias totais (acumulado no programa)
  add column if not exists subatividades   jsonb not null default '[]';
