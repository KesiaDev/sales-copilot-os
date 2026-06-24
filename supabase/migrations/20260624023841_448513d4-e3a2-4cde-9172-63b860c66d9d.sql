-- Fix v_daily_metrics
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

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS possible_duplicate BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_reason TEXT,
  ADD COLUMN IF NOT EXISTS comprador_email TEXT,
  ADD COLUMN IF NOT EXISTS comprador_telefone TEXT;

CREATE INDEX IF NOT EXISTS sales_duplicate_lookup_idx ON public.sales (vendido_em, valor);
CREATE INDEX IF NOT EXISTS sales_possible_duplicate_idx ON public.sales (possible_duplicate) WHERE possible_duplicate = true;
CREATE INDEX IF NOT EXISTS sales_comprador_email_idx ON public.sales (lower(comprador_email)) WHERE comprador_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.clint_vendedor_metricas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  capturado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  reunioes_agendadas INT NOT NULL DEFAULT 0,
  reunioes_realizadas INT NOT NULL DEFAULT 0,
  ligacoes INT NOT NULL DEFAULT 0,
  emails INT NOT NULL DEFAULT 0,
  tarefas INT NOT NULL DEFAULT 0,
  whatsapp INT NOT NULL DEFAULT 0,
  no_show INT NOT NULL DEFAULT 0,
  negocios_total INT NOT NULL DEFAULT 0,
  negocios_ganhos INT NOT NULL DEFAULT 0,
  negocios_perdidos INT NOT NULL DEFAULT 0,
  taxa_conversao NUMERIC(7,3),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clint_vendedor_metricas_profile_idx ON public.clint_vendedor_metricas(profile_id);
CREATE INDEX IF NOT EXISTS clint_vendedor_metricas_capturado_idx ON public.clint_vendedor_metricas(capturado_em);
CREATE UNIQUE INDEX IF NOT EXISTS clint_vendedor_metricas_unique_idx ON public.clint_vendedor_metricas(user_name, capturado_em);
GRANT SELECT ON public.clint_vendedor_metricas TO authenticated;
GRANT ALL ON public.clint_vendedor_metricas TO service_role;
ALTER TABLE public.clint_vendedor_metricas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clint_vendedor_metricas_select_all" ON public.clint_vendedor_metricas;
CREATE POLICY "clint_vendedor_metricas_select_all" ON public.clint_vendedor_metricas
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.clint_funil_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  capturado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  dados JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clint_funil_snapshots_tipo_idx ON public.clint_funil_snapshots(tipo, capturado_em);
GRANT SELECT ON public.clint_funil_snapshots TO authenticated;
GRANT ALL ON public.clint_funil_snapshots TO service_role;
ALTER TABLE public.clint_funil_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clint_funil_snapshots_select_all" ON public.clint_funil_snapshots;
CREATE POLICY "clint_funil_snapshots_select_all" ON public.clint_funil_snapshots
  FOR SELECT TO authenticated USING (true);