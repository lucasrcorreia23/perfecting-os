-- Perfecting v1 — seed de desenvolvimento.
-- UUIDs fixos para permitir referências literais entre tabelas.
-- created_by/actor_id/uploaded_by ficam NULL (nenhum auth.user existe no seed;
-- o primeiro cadastro real vira profile 'interno' via trigger e já enxerga tudo).

-- =============================================================================
-- Clientes — 10, cobrindo as 6 etapas; ≥2 acima de 25 dias; ≥2 em risco
-- =============================================================================

insert into public.clients (id, name, company, email, phone, status, stage, stage_entered_at, stage_deadline_days, notes) values
  ('00000000-0000-4000-8000-000000000001', 'Ana Souza',       'Padaria Pão Dourado',       'ana@paodourado.com.br',      '5511987654321', 'ativo',     'diagnosticar', now() - interval '3 days',  25, 'Indicação da rede de franquias.'),
  ('00000000-0000-4000-8000-000000000002', 'Bruno Lima',      'TechVale Sistemas',         'bruno@techvale.com.br',      '5519976543210', 'em_risco',  'diagnosticar', now() - interval '28 days', 25, 'Diagnóstico travado aguardando acesso ao ERP.'),
  ('00000000-0000-4000-8000-000000000003', 'Carla Menezes',   'Bella Moda Boutique',       'carla@bellamoda.com.br',     '5511965432109', 'ativo',     'priorizar',    now() - interval '10 days', 25, null),
  ('00000000-0000-4000-8000-000000000004', 'Diego Ferreira',  'AgroCampo Insumos',         'diego@agrocampo.agr.br',     '5562954321098', 'ativo',     'priorizar',    now() - interval '5 days',  25, 'Foco em expansão para o Centro-Oeste.'),
  ('00000000-0000-4000-8000-000000000005', 'Elisa Martins',   'Clínica Vida Plena',        'elisa@vidaplena.med.br',     '5521943210987', 'em_risco',  'construir',    now() - interval '31 days', 25, 'Aguardando aprovação da diretoria para o plano.'),
  ('00000000-0000-4000-8000-000000000006', 'Fábio Nogueira',  'Construtora Horizonte',     'fabio@chorizonte.com.br',    '5531932109876', 'ativo',     'construir',    now() - interval '15 days', 25, null),
  ('00000000-0000-4000-8000-000000000007', 'Gabriela Rocha',  'Restaurante Sabor & Arte',  'gabriela@saborearte.com.br', '5511921098765', 'ativo',     'calibrar',     now() - interval '8 days',  25, null),
  ('00000000-0000-4000-8000-000000000008', 'Henrique Alves',  'LogExpress Transportes',    'henrique@logexpress.log.br', '5541910987654', 'pausado',   'executar',     now() - interval '20 days', 25, 'Pausado a pedido do cliente até o fim do trimestre.'),
  ('00000000-0000-4000-8000-000000000009', 'Isabela Castro',  'EducaMais Cursos',          'isabela@educamais.edu.br',   '5585909876543', 'ativo',     'executar',     now() - interval '12 days', 25, null),
  ('00000000-0000-4000-8000-000000000010', 'João Pereira',    'Estúdio Criativo Pixel',    'joao@pixelestudio.com.br',   '5548998765432', 'encerrado', 'medir',        now() - interval '18 days', 25, 'Ciclo concluído; avaliar renovação em 2027.');

-- =============================================================================
-- Atividades — 3 a 6 por cliente, na etapa atual; status mistos; algumas vencidas
-- =============================================================================

insert into public.activities (client_id, stage, title, description, status, due_date, position) values
  -- Ana Souza · diagnosticar
  ('00000000-0000-4000-8000-000000000001', 'diagnosticar', 'Reunião de kickoff',                'Alinhar expectativas e apresentar o processo.',            'concluida',    current_date - 2, 0),
  ('00000000-0000-4000-8000-000000000001', 'diagnosticar', 'Mapear jornada do cliente',         'Entrevistar equipe de atendimento e produção.',            'em_andamento', current_date + 4, 1),
  ('00000000-0000-4000-8000-000000000001', 'diagnosticar', 'Coletar métricas de vendas',        'Últimos 12 meses, por canal.',                             'pendente',     current_date + 7, 2),

  -- Bruno Lima · diagnosticar (atrasado)
  ('00000000-0000-4000-8000-000000000002', 'diagnosticar', 'Obter acesso ao ERP',               'Bloqueado com o time de TI do cliente.',                   'em_andamento', current_date - 9, 0),
  ('00000000-0000-4000-8000-000000000002', 'diagnosticar', 'Analisar funil de aquisição',       null,                                                       'pendente',     current_date - 3, 1),
  ('00000000-0000-4000-8000-000000000002', 'diagnosticar', 'Entrevistar time comercial',        'Três entrevistas de 45 minutos.',                          'concluida',    current_date - 15, 2),
  ('00000000-0000-4000-8000-000000000002', 'diagnosticar', 'Consolidar relatório de diagnóstico', null,                                                     'pendente',     current_date + 5, 3),

  -- Carla Menezes · priorizar
  ('00000000-0000-4000-8000-000000000003', 'priorizar', 'Workshop de priorização',              'Matriz impacto × esforço com a sócia.',                    'concluida',    current_date - 4, 0),
  ('00000000-0000-4000-8000-000000000003', 'priorizar', 'Definir OKRs do trimestre',            null,                                                       'em_andamento', current_date + 3, 1),
  ('00000000-0000-4000-8000-000000000003', 'priorizar', 'Validar backlog com stakeholders',     null,                                                       'pendente',     current_date + 10, 2),

  -- Diego Ferreira · priorizar
  ('00000000-0000-4000-8000-000000000004', 'priorizar', 'Ranquear iniciativas por ROI',         null,                                                       'em_andamento', current_date + 2, 0),
  ('00000000-0000-4000-8000-000000000004', 'priorizar', 'Mapear dependências técnicas',         'Integração com o sistema da cooperativa.',                 'pendente',     current_date + 6, 1),
  ('00000000-0000-4000-8000-000000000004', 'priorizar', 'Aprovar orçamento das ações',          null,                                                       'pendente',     current_date + 12, 2),

  -- Elisa Martins · construir (atrasada)
  ('00000000-0000-4000-8000-000000000005', 'construir', 'Desenhar fluxo de agendamento',        'Reduzir no-show das consultas.',                           'concluida',    current_date - 20, 0),
  ('00000000-0000-4000-8000-000000000005', 'construir', 'Implementar lembretes por WhatsApp',   'Depende da aprovação da diretoria.',                       'em_andamento', current_date - 6, 1),
  ('00000000-0000-4000-8000-000000000005', 'construir', 'Treinar recepção no novo fluxo',       null,                                                       'pendente',     current_date - 1, 2),
  ('00000000-0000-4000-8000-000000000005', 'construir', 'Configurar painel de indicadores',     null,                                                       'pendente',     current_date + 8, 3),

  -- Fábio Nogueira · construir
  ('00000000-0000-4000-8000-000000000006', 'construir', 'Montar playbook comercial',            null,                                                       'em_andamento', current_date + 5, 0),
  ('00000000-0000-4000-8000-000000000006', 'construir', 'Estruturar CRM por obra',              'Separar funis por empreendimento.',                        'pendente',     current_date + 9, 1),
  ('00000000-0000-4000-8000-000000000006', 'construir', 'Definir SLA de resposta a leads',      null,                                                       'concluida',    current_date - 3, 2),

  -- Gabriela Rocha · calibrar
  ('00000000-0000-4000-8000-000000000007', 'calibrar', 'Revisar metas do delivery',             'Ajustar após o primeiro mês de operação.',                 'em_andamento', current_date + 1, 0),
  ('00000000-0000-4000-8000-000000000007', 'calibrar', 'A/B de cardápio digital',               null,                                                       'pendente',     current_date + 7, 1),
  ('00000000-0000-4000-8000-000000000007', 'calibrar', 'Calibrar precificação dos combos',      null,                                                       'concluida',    current_date - 2, 2),

  -- Henrique Alves · executar (pausado)
  ('00000000-0000-4000-8000-000000000008', 'executar', 'Rodar campanha de reativação',          'Aguardando retomada do contrato.',                         'pendente',     current_date - 5, 0),
  ('00000000-0000-4000-8000-000000000008', 'executar', 'Implantar roteirização de entregas',    null,                                                       'em_andamento', current_date + 15, 1),
  ('00000000-0000-4000-8000-000000000008', 'executar', 'Publicar painel de frota',              null,                                                       'concluida',    current_date - 10, 2),

  -- Isabela Castro · executar
  ('00000000-0000-4000-8000-000000000009', 'executar', 'Lançar trilha de certificação',         'Primeira turma com 40 alunos.',                            'em_andamento', current_date + 3, 0),
  ('00000000-0000-4000-8000-000000000009', 'executar', 'Automatizar onboarding de alunos',      null,                                                       'concluida',    current_date - 7, 1),
  ('00000000-0000-4000-8000-000000000009', 'executar', 'Campanha de indicação',                 'Meta: 15% das matrículas via indicação.',                  'pendente',     current_date + 11, 2),
  ('00000000-0000-4000-8000-000000000009', 'executar', 'Integrar gateway de pagamento',         null,                                                       'pendente',     current_date - 2, 3),

  -- João Pereira · medir (encerrado)
  ('00000000-0000-4000-8000-000000000010', 'medir', 'Consolidar resultados do ciclo',           'Comparativo antes/depois das iniciativas.',                'concluida',    current_date - 12, 0),
  ('00000000-0000-4000-8000-000000000010', 'medir', 'Apresentação executiva final',             null,                                                       'concluida',    current_date - 8, 1),
  ('00000000-0000-4000-8000-000000000010', 'medir', 'Proposta de renovação',                    'Enviada; sem resposta até o momento.',                     'pendente',     current_date - 4, 2);

-- =============================================================================
-- Eventos — ~20 nos últimos 30 dias (alimentam o feed e as tendências da Home)
-- =============================================================================

insert into public.events (client_id, type, payload, created_at) values
  ('00000000-0000-4000-8000-000000000001', 'cliente_criado',       '{"name": "Ana Souza"}',                                              now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000001', 'atividade_criada',     '{"title": "Mapear jornada do cliente"}',                             now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000001', 'atividade_concluida',  '{"title": "Reunião de kickoff"}',                                    now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000002', 'atividade_criada',     '{"title": "Obter acesso ao ERP"}',                                   now() - interval '26 days'),
  ('00000000-0000-4000-8000-000000000002', 'atividade_concluida',  '{"title": "Entrevistar time comercial"}',                            now() - interval '15 days'),
  ('00000000-0000-4000-8000-000000000003', 'etapa_alterada',       '{"from": "diagnosticar", "to": "priorizar"}',                        now() - interval '10 days'),
  ('00000000-0000-4000-8000-000000000003', 'atividade_concluida',  '{"title": "Workshop de priorização"}',                               now() - interval '4 days'),
  ('00000000-0000-4000-8000-000000000004', 'cliente_criado',       '{"name": "Diego Ferreira"}',                                         now() - interval '9 days'),
  ('00000000-0000-4000-8000-000000000004', 'etapa_alterada',       '{"from": "diagnosticar", "to": "priorizar"}',                        now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000000005', 'atividade_criada',     '{"title": "Configurar painel de indicadores"}',                      now() - interval '14 days'),
  ('00000000-0000-4000-8000-000000000005', 'arquivo_enviado',      '{"name": "plano-de-acao.pdf"}',                                      now() - interval '12 days'),
  ('00000000-0000-4000-8000-000000000006', 'etapa_alterada',       '{"from": "priorizar", "to": "construir"}',                           now() - interval '15 days'),
  ('00000000-0000-4000-8000-000000000006', 'atividade_concluida',  '{"title": "Definir SLA de resposta a leads"}',                       now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000007', 'etapa_alterada',       '{"from": "construir", "to": "calibrar"}',                            now() - interval '8 days'),
  ('00000000-0000-4000-8000-000000000007', 'atividade_concluida',  '{"title": "Calibrar precificação dos combos"}',                      now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000008', 'atividade_concluida',  '{"title": "Publicar painel de frota"}',                              now() - interval '10 days'),
  ('00000000-0000-4000-8000-000000000009', 'etapa_alterada',       '{"from": "calibrar", "to": "executar"}',                             now() - interval '12 days'),
  ('00000000-0000-4000-8000-000000000009', 'atividade_concluida',  '{"title": "Automatizar onboarding de alunos"}',                      now() - interval '7 days'),
  ('00000000-0000-4000-8000-000000000009', 'atividade_criada',     '{"title": "Campanha de indicação"}',                                 now() - interval '6 days'),
  ('00000000-0000-4000-8000-000000000010', 'etapa_alterada',       '{"from": "executar", "to": "medir"}',                                now() - interval '18 days'),
  ('00000000-0000-4000-8000-000000000010', 'atividade_concluida',  '{"title": "Apresentação executiva final"}',                          now() - interval '8 days'),
  ('00000000-0000-4000-8000-000000000010', 'arquivo_enviado',      '{"name": "relatorio-final.pdf"}',                                    now() - interval '11 days');
