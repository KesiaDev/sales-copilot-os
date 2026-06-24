-- Snapshots de métricas vindas dos dashboards já existentes na conta Clint
-- ("Produtividade por usuário" e "Visão Geral - Funis Perpétuos V3 - Liderança").
-- A API de dashboards da Clint não aceita filtro de data (testado em 23/06/2026 —
-- parâmetros from/to nao alteram o resultado), entao cada chamada devolve o
-- acumulado configurado no próprio dashboard. Por isso guardamos uma linha por
-- sincronizacao (snapshot), e a evolucao no tempo vem de comparar snapshots,
-- nao de um filtro de periodo na API.

CREATE TABLE public.clint_vendedor_metricas (
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
CREATE INDEX clint_vendedor_metricas_profile_idx ON public.clint_vendedor_metricas(profile_id);
CREATE INDEX clint_vendedor_metricas_capturado_idx ON public.clint_vendedor_metricas(capturado_em);
-- Uma linha por vendedor por snapshot (n8n envia o mesmo capturado_em para todos os
-- charts de uma mesma rodada de sync, mesmo vindo de dashboards/chamadas diferentes),
-- permitindo upsert parcial: cada chamada atualiza so os campos daquele chart.
CREATE UNIQUE INDEX clint_vendedor_metricas_unique_idx ON public.clint_vendedor_metricas(user_name, capturado_em);
GRANT SELECT ON public.clint_vendedor_metricas TO authenticated;
GRANT ALL ON public.clint_vendedor_metricas TO service_role;
ALTER TABLE public.clint_vendedor_metricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clint_vendedor_metricas_select_all" ON public.clint_vendedor_metricas
  FOR SELECT TO authenticated USING (true);

-- Charts que não são por vendedor (funil de conversão, motivo de perda, tempo
-- por etapa, etc.) guardados como JSON bruto — estrutura varia por tipo de chart.
CREATE TABLE public.clint_funil_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'funil_conversao' | 'motivo_perda' | 'tempo_por_etapa' | 'indicadores_gerais'
  capturado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  dados JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clint_funil_snapshots_tipo_idx ON public.clint_funil_snapshots(tipo, capturado_em);
GRANT SELECT ON public.clint_funil_snapshots TO authenticated;
GRANT ALL ON public.clint_funil_snapshots TO service_role;
ALTER TABLE public.clint_funil_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clint_funil_snapshots_select_all" ON public.clint_funil_snapshots
  FOR SELECT TO authenticated USING (true);
