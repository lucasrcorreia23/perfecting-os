-- Calculadora ROI: a proposta passa a ser montada pelo PRÓPRIO visitante
-- (plano, assentos e prazo dentro do `state`), e o link pode nascer sem
-- cliente ("Gerar calculadora" na listagem), para ser importado depois.
--
-- Espelha src/lib/database.types.ts — alterar juntos.

-- Link avulso: NULL = ainda sem cliente, importável para qualquer perfil
-- (server action linkCalculatorToClient + evento vinculado_a_cliente).
alter table public.calculator_links
  alter column client_id drop not null;

-- A proposta do interno deixou de existir: o que o visitante monta vive no
-- `state` ({ v:2, prazoMeses, times:[{ id, nome, proposta{plano,assentos},
-- entradas, cenarioSel, trajetoria? }] }).
alter table public.calculator_links
  drop constraint if exists calculator_links_config_object;
alter table public.calculator_links
  drop column if exists config;

-- Seção "Calculadoras avulsas" da listagem de clientes.
create index if not exists calculator_links_avulsas_idx
  on public.calculator_links (created_at desc) where client_id is null;
