-- Premissas por link: override opcional do racional (haircut, tiers, COI…).
-- null = o padrão de constants.ts. O visitante NÃO escreve esta coluna —
-- só um interno autenticado, via POST /api/publico/calculadora/[token]/premissas.

alter table public.calculator_links
  add column if not exists premissas jsonb;

alter table public.calculator_links
  drop constraint if exists calculator_links_premissas_object;

alter table public.calculator_links
  add constraint calculator_links_premissas_object
    check (premissas is null or jsonb_typeof(premissas) = 'object');
