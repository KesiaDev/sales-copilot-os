-- Corrige v_daily_metrics: os LEFT JOINs entre sales/leads/refunds/cancellations
-- nao tinham chave de ligacao (so filtro de data), o que gerava produto cartesiano
-- e inflava receita_hoje/vendas_hoje sempre que houvesse mais de 1 linha em
-- qualquer uma das outras tabelas no mesmo dia. Trocado por subqueries isoladas.
CREATE OR REPLACE VIEW public.v_daily_metrics AS
SELECT
  (SELECT COALESCE(SUM(valor), 0) FROM public.sales WHERE DATE(vendido_em) = CURRENT_DATE) AS receita_hoje,
  (SELECT COUNT(*) FROM public.sales WHERE DATE(vendido_em) = CURRENT_DATE) AS vendas_hoje,
  (SELECT COUNT(*) FROM public.leads WHERE DATE(recebido_em) = CURRENT_DATE) AS leads_hoje,
  CASE WHEN (SELECT COUNT(*) FROM public.leads WHERE DATE(recebido_em) = CURRENT_DATE) > 0
       THEN ROUND(
         (SELECT COUNT(*) FROM public.sales WHERE DATE(vendido_em) = CURRENT_DATE)::numeric
         / (SELECT COUNT(*) FROM public.leads WHERE DATE(recebido_em) = CURRENT_DATE)::numeric * 100, 1)
       ELSE 0 END AS conversao_pct,
  (SELECT COALESCE(SUM(valor), 0) FROM public.refunds WHERE DATE(created_at) = CURRENT_DATE) AS reembolsos_hoje,
  (SELECT COALESCE(SUM(valor), 0) FROM public.cancellations WHERE DATE(created_at) = CURRENT_DATE) AS cancelamentos_hoje;

-- Deteccao de duplicatas entre fontes: a sincronizacao Clint (deal ganho) e a
-- importacao manual do CSV da Hotmart usam namespaces de external_id diferentes
-- (id do deal na Clint vs. codigo da transacao na Hotmart), entao a mesma venda
-- pode ser gravada duas vezes sem que o unique index de external_id/external_source
-- detecte. Estas colunas guardam uma marcacao heuristica (valor + janela de data)
-- para revisao humana na tela de CRM, sem apagar nenhuma venda automaticamente.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS possible_duplicate BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_reason TEXT;

CREATE INDEX IF NOT EXISTS sales_duplicate_lookup_idx ON public.sales (vendido_em, valor);
CREATE INDEX IF NOT EXISTS sales_possible_duplicate_idx ON public.sales (possible_duplicate) WHERE possible_duplicate = true;

-- Dados do comprador: confirmado em 23/06/2026 que cada deal da Clint ja traz
-- contact.email/contact.phone embutido. Guardar isso na venda permite cruzar com
-- precisao (por comprador) em vez de so heuristica por valor+data.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS comprador_email TEXT,
  ADD COLUMN IF NOT EXISTS comprador_telefone TEXT;

CREATE INDEX IF NOT EXISTS sales_comprador_email_idx ON public.sales (lower(comprador_email)) WHERE comprador_email IS NOT NULL;
