ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS external_source TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS leads_external_unique_idx ON public.leads (external_id, external_source) WHERE external_id IS NOT NULL;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS external_source TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS sales_external_unique_idx ON public.sales (external_id, external_source) WHERE external_id IS NOT NULL;

ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS external_source TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS refunds_external_unique_idx ON public.refunds (external_id, external_source) WHERE external_id IS NOT NULL;

ALTER TABLE public.cancellations ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.cancellations ADD COLUMN IF NOT EXISTS external_source TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS cancellations_external_unique_idx ON public.cancellations (external_id, external_source) WHERE external_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_daily_metrics AS
SELECT COALESCE(SUM(s.valor),0) AS receita_hoje, COUNT(s.id) AS vendas_hoje, COUNT(DISTINCT l.id) AS leads_hoje, CASE WHEN COUNT(l.id)>0 THEN ROUND((COUNT(s.id)::numeric/COUNT(l.id)::numeric)*100,1) ELSE 0 END AS conversao_pct, COALESCE(SUM(r.valor),0) AS reembolsos_hoje, COALESCE(SUM(c.valor),0) AS cancelamentos_hoje FROM (SELECT 1) dummy LEFT JOIN public.sales s ON DATE(s.vendido_em)=CURRENT_DATE LEFT JOIN public.leads l ON DATE(l.recebido_em)=CURRENT_DATE LEFT JOIN public.refunds r ON DATE(r.created_at)=CURRENT_DATE LEFT JOIN public.cancellations c ON DATE(c.created_at)=CURRENT_DATE;

CREATE OR REPLACE VIEW public.v_top_performer_hoje AS
SELECT p.full_name AS nome, COUNT(s.id) AS vendas, SUM(s.valor) AS receita, ROUND(AVG(s.valor),2) AS ticket_medio FROM public.sales s JOIN public.profiles p ON p.id=s.profile_id WHERE DATE(s.vendido_em)=CURRENT_DATE GROUP BY p.full_name ORDER BY receita DESC LIMIT 1;

CREATE OR REPLACE VIEW public.v_meta_mes AS
SELECT SUM(g.valor_meta) AS meta_total, COALESCE((SELECT SUM(s.valor) FROM public.sales s WHERE EXTRACT(MONTH FROM s.vendido_em::date)=EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM s.vendido_em::date)=EXTRACT(YEAR FROM CURRENT_DATE)),0) AS receita_mes, ROUND(COALESCE((SELECT SUM(s.valor) FROM public.sales s WHERE EXTRACT(MONTH FROM s.vendido_em::date)=EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM s.vendido_em::date)=EXTRACT(YEAR FROM CURRENT_DATE)),0)/NULLIF(SUM(g.valor_meta),0)*100,1) AS pct_meta FROM public.goals g WHERE g.mes=EXTRACT(MONTH FROM CURRENT_DATE) AND g.ano=EXTRACT(YEAR FROM CURRENT_DATE);