-- Campos da planilha "Atividades da POC" nas atividades: cat (código
-- hierárquico "1.1"), canal de comunicação, criticidade, dependências
-- (depende de / paralela com), modelo de mensagem, setor responsável,
-- status 'bloqueada' e subatividades ricas (objetos, não mais string[]).
-- Espelha src/lib/methodology.ts e supabase/seed.sql — alterar juntos.

create type public.canal_comunicacao as enum
  ('email', 'whatsapp', 'os', 'meet', 'presencial');

create type public.criticidade as enum ('baixa', 'media', 'alta');

-- PG >= 12 permite ADD VALUE em transação desde que o novo valor não seja
-- usado nesta mesma transação (o backfill abaixo não usa 'bloqueada').
alter type public.activity_status add value if not exists 'bloqueada'
  before 'concluida';

alter table public.activities
  add column if not exists cat               text,
  add column if not exists canal             public.canal_comunicacao,
  add column if not exists criticidade       public.criticidade,
  add column if not exists depends_on_cat    text,
  add column if not exists parallel_with_cat text,
  add column if not exists modelo_mensagem   text,
  add column if not exists setor_responsavel text;

-- Backfill dos clientes existentes: casa stage+title com o cronograma
-- canônico e preenche cat/canal/subatividades. Idempotente (`cat is null`).
-- Subatividades: {code, title, responsavel, tipo, canal, done}; atividades
-- já concluídas recebem as subs com done=true.
with tpl(cat, stage, title, canal, subatividades) as (
  values
    ('1.1', 'diagnosticar'::public.workflow_stage, 'Aceite Formal', 'email'::public.canal_comunicacao,
     '[{"code":"1.1.1","title":"Envio do e-mail de aceite","responsavel":"perfecting","tipo":"assincrono","canal":"email","done":false},
       {"code":"1.1.2","title":"Conferência do aceite","responsavel":"ambos","tipo":"assincrono","canal":"email","done":false}]'::jsonb),
    ('1.2', 'diagnosticar', 'Canal de comunicação (WPP) aberto', 'whatsapp',
     '[{"code":"1.2.1","title":"Criar canal de wpp e adicionar todos os gestores da operação","responsavel":"perfecting","tipo":"assincrono","canal":"whatsapp","done":false}]'),
    ('1.3', 'diagnosticar', 'Diagnóstico de dores e anamnese realizadas', 'os',
     '[{"code":"1.3.1","title":"Envio dos formulários de configuração de roleplay e anamnese","responsavel":"perfecting","tipo":"assincrono","canal":"whatsapp","done":false},
       {"code":"1.3.2","title":"Conferência do preenchimento satisfatório das informações necessárias","responsavel":"ambos","tipo":"assincrono","canal":"os","done":false}]'),
    ('1.4', 'diagnosticar', 'Criação das trilhas e apresentação', 'os',
     '[{"code":"1.4.1","title":"Definir a(s) trilha(s) necessárias com base nas informações levantadas","responsavel":"perfecting","tipo":"assincrono","canal":"os","done":false},
       {"code":"1.4.2","title":"Criar a apresentação das trilhas sugeridas","responsavel":"perfecting","tipo":"assincrono","canal":"os","done":false}]'),
    ('1.5', 'diagnosticar', 'Reunião de apresentação das trilhas e validação', 'meet',
     '[{"code":"1.5.1","title":"Apresentar a trilha e pegar validação ou sugestão de ajustes com o cliente","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false}]'),
    ('2.1', 'priorizar', 'Criação da conta e liberação dos acessos', 'os',
     '[{"code":"2.1.1","title":"Criar a conta dentro da plataforma","responsavel":"cliente","tipo":"assincrono","canal":"os","done":false},
       {"code":"2.1.2","title":"Incluir time dentro da plataforma","responsavel":"perfecting","tipo":"assincrono","canal":"os","done":false},
       {"code":"2.1.3","title":"Criação das trilhas e seus respectivos roleplays dentro da plataforma","responsavel":"perfecting","tipo":"assincrono","canal":"presencial","done":false},
       {"code":"2.1.4","title":"Conferência da ativação de todos os acessos","responsavel":"ambos","tipo":"assincrono","canal":"whatsapp","done":false}]'),
    ('2.2', 'priorizar', 'Testes de roleplay e feedbacks', 'os',
     '[{"code":"2.2.1","title":"Avisar sobre a liberação dos roleplays para testes","responsavel":"perfecting","tipo":"assincrono","canal":"whatsapp","done":false},
       {"code":"2.2.2","title":"Conferência da validação dos roleplays","responsavel":"ambos","tipo":"assincrono","canal":"whatsapp","done":false}]'),
    ('3.1', 'construir', 'Reunião de alinhamentos, definição de cadência de treinamentos e foco do piloto', 'meet',
     '[{"code":"3.1.1","title":"Coletar feedbacks e sugestão de melhorias dos roleplays","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"3.1.2","title":"Definir cadência de treinamentos","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"3.1.3","title":"Definir KPI''s e OKR''s pretendidos","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"3.1.4","title":"Definir focos da POC","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"3.1.5","title":"Definir datas e horários das reuniões semanais","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false}]'),
    ('4.1', 'calibrar', 'Calibração de roleplays com base nos feedbacks trazidos e no foco definido', 'os',
     '[{"code":"4.1.1","title":"Realizar calibração de roleplays","responsavel":"perfecting","tipo":"assincrono","canal":"os","done":false},
       {"code":"4.1.2","title":"Avisar sobre liberação dos roleplays calibrados","responsavel":"perfecting","tipo":"assincrono","canal":"whatsapp","done":false}]'),
    ('4.2', 'calibrar', 'Validação das melhorias', 'os',
     '[{"code":"4.2.1","title":"Conferência da validação dos roleplays calibrados","responsavel":"ambos","tipo":"assincrono","canal":"whatsapp","done":false},
       {"code":"4.2.2","title":"Agendar dia/horário da go-live e definição dos integrantes da reunião","responsavel":"ambos","tipo":"assincrono","canal":"whatsapp","done":false}]'),
    ('5.1', 'executar', 'Go-Live (Apresentação ao operacional)', 'meet',
     '[{"code":"5.1.1","title":"Criar apresentação com as rotinas de treinamento e engajamento do operacional","responsavel":"perfecting","tipo":"assincrono","canal":"os","done":false},
       {"code":"5.1.2","title":"Coletar percepções, feedbacks, e demais pontos pertinentes da reunião","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false}]'),
    ('5.2', 'executar', 'Reunião de alinhamentos com a gestão: boas práticas, KPIs desejados, cadência mínima e ideal', 'meet',
     '[{"code":"5.2.1","title":"Definir data/horário da reunião com a gestão","responsavel":"ambos","tipo":"assincrono","canal":"whatsapp","done":false},
       {"code":"5.2.2","title":"Alinhar e validar pontos extraídos da reunião de go-live","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"5.2.3","title":"Alinhar e validar modelo de relatório semanal","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false}]'),
    ('5.3', 'executar', 'Confecção do relatório de resultados (semana 1)', 'os',
     '[{"code":"5.3.1","title":"Criar relatório semanal de resultados","responsavel":"perfecting","tipo":"assincrono","canal":"os","done":false}]'),
    ('5.4', 'executar', 'Reunião semanal 1: apresentação de relatório, prática semanal e encaminhamentos', 'meet',
     '[{"code":"5.4.1","title":"Apresentar relatório de resultados semanais","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"5.4.2","title":"Coletar feedbacks e sugestão de melhorias","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"5.4.3","title":"Levar feedback e sugestão de melhorias ao time responsável","responsavel":"perfecting","tipo":"sincrono","canal":"meet","done":false},
       {"code":"5.4.4","title":"Devolver as melhorias trazidas","responsavel":"ambos","tipo":"assincrono","canal":"whatsapp","done":false}]'),
    ('5.5', 'executar', 'Confecção do relatório de resultados (semana 2)', 'os',
     '[{"code":"5.5.1","title":"Criar relatório semanal de resultados","responsavel":"perfecting","tipo":"assincrono","canal":"os","done":false}]'),
    ('5.6', 'executar', 'Reunião semanal 2: apresentação de relatório, prática semanal e encaminhamentos', 'meet',
     '[{"code":"5.6.1","title":"Apresentar relatório de resultados semanais","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"5.6.2","title":"Coletar feedbacks e sugestão de melhorias","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"5.6.3","title":"Levar feedback e sugestão de melhorias ao time responsável","responsavel":"perfecting","tipo":"sincrono","canal":"meet","done":false},
       {"code":"5.6.4","title":"Devolver as melhorias trazidas","responsavel":"ambos","tipo":"assincrono","canal":"whatsapp","done":false}]'),
    ('5.7', 'executar', 'Confecção do relatório de resultados (semana 3)', 'os',
     '[{"code":"5.7.1","title":"Criar relatório semanal de resultados","responsavel":"perfecting","tipo":"assincrono","canal":"os","done":false}]'),
    ('5.8', 'executar', 'Reunião semanal 3: apresentação de relatório, prática semanal e encaminhamentos', 'meet',
     '[{"code":"5.8.1","title":"Apresentar relatório de resultados semanais","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"5.8.2","title":"Coletar feedbacks e sugestão de melhorias","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"5.8.3","title":"Levar feedback e sugestão de melhorias ao time responsável","responsavel":"perfecting","tipo":"sincrono","canal":"meet","done":false},
       {"code":"5.8.4","title":"Devolver as melhorias trazidas","responsavel":"ambos","tipo":"assincrono","canal":"whatsapp","done":false}]'),
    ('6.1', 'medir', 'Relatório final de impacto', 'os',
     '[{"code":"6.1.1","title":"Criar relatório final de resultados","responsavel":"perfecting","tipo":"assincrono","canal":"os","done":false}]'),
    ('6.2', 'medir', 'Reunião semanal 4: apresentação do relatório final de impacto', 'meet',
     '[{"code":"6.2.1","title":"Apresentar relatório final de impacto","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"6.2.2","title":"Coletar feedbacks finais","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"6.2.3","title":"Levar feedback e sugestão de melhorias ao time responsável","responsavel":"perfecting","tipo":"sincrono","canal":"meet","done":false},
       {"code":"6.2.4","title":"Devolver as melhorias trazidas","responsavel":"ambos","tipo":"assincrono","canal":"whatsapp","done":false}]'),
    ('6.3', 'medir', 'O cliente pretende avançar com a solução e realizar negociação para fechar contrato?', 'whatsapp',
     '[{"code":"6.3.1","title":"Agendar reunião final de gestão","responsavel":"ambos","tipo":"assincrono","canal":"whatsapp","done":false},
       {"code":"6.3.2","title":"Criar apresentação de vendas","responsavel":"perfecting","tipo":"assincrono","canal":"os","done":false},
       {"code":"6.3.3","title":"Reunião para ressaltar os impactos, alinhar gargalos, e definir próximos passos apresentando a proposta de venda","responsavel":"ambos","tipo":"sincrono","canal":"meet","done":false},
       {"code":"6.3.4","title":"Envio de proposta","responsavel":"perfecting","tipo":"assincrono","canal":"email","done":false},
       {"code":"6.3.5","title":"Conferência sobre retorno da proposta","responsavel":"ambos","tipo":"assincrono","canal":"email","done":false}]')
)
update public.activities a
set cat           = tpl.cat,
    canal         = coalesce(a.canal, tpl.canal),
    subatividades = case
      -- Preserva qualquer conteúdo já preenchido manualmente.
      when a.subatividades <> '[]'::jsonb then a.subatividades
      when a.status = 'concluida' then
        (select coalesce(jsonb_agg(elem || '{"done": true}'::jsonb), '[]'::jsonb)
           from jsonb_array_elements(tpl.subatividades) elem)
      else tpl.subatividades
    end
from tpl
where a.stage = tpl.stage
  and a.title = tpl.title
  and a.cat is null;
