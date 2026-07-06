-- Perfecting v1 — o prazo da etapa deixa de ser configurável por cliente.
-- Vira uma preferência fixa do usuário (perfil > Preferências, campo
-- prazo_etapa_dias em profiles.preferences), aplicada a todos os clientes.

alter table public.clients
  drop column if exists stage_deadline_days;
