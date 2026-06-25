
CREATE TABLE public.metas_mensais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_ano TEXT NOT NULL UNIQUE,
  meta_geral_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.metas_mensais TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_mensais TO authenticated;
GRANT ALL ON public.metas_mensais TO service_role;
ALTER TABLE public.metas_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metas_mensais public read" ON public.metas_mensais FOR SELECT USING (true);
CREATE POLICY "metas_mensais auth insert" ON public.metas_mensais FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "metas_mensais auth update" ON public.metas_mensais FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "metas_mensais auth delete" ON public.metas_mensais FOR DELETE TO authenticated USING (true);

CREATE TABLE public.metas_produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_ano TEXT NOT NULL,
  produto_grupo TEXT NOT NULL,
  meta_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta_vendas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mes_ano, produto_grupo)
);
GRANT SELECT ON public.metas_produtos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_produtos TO authenticated;
GRANT ALL ON public.metas_produtos TO service_role;
ALTER TABLE public.metas_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metas_produtos public read" ON public.metas_produtos FOR SELECT USING (true);
CREATE POLICY "metas_produtos auth insert" ON public.metas_produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "metas_produtos auth update" ON public.metas_produtos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "metas_produtos auth delete" ON public.metas_produtos FOR DELETE TO authenticated USING (true);

CREATE TRIGGER metas_mensais_touch BEFORE UPDATE ON public.metas_mensais FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER metas_produtos_touch BEFORE UPDATE ON public.metas_produtos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.metas_mensais (mes_ano, meta_geral_eur) VALUES ('2026-06', 250000)
  ON CONFLICT (mes_ano) DO NOTHING;

INSERT INTO public.metas_produtos (mes_ano, produto_grupo, meta_eur, meta_vendas) VALUES
  ('2026-06', 'Mentoria Gestor de Tráfego', 0, 0),
  ('2026-06', 'Mentoria Gestão de Redes Sociais', 0, 0),
  ('2026-06', 'Renovações', 9000, 18),
  ('2026-06', 'Master and Scale', 0, 0),
  ('2026-06', 'Accelerator', 0, 0),
  ('2026-06', 'Traffic Master', 0, 0),
  ('2026-06', 'Estrategista de Infoprodutos', 0, 0)
  ON CONFLICT (mes_ano, produto_grupo) DO NOTHING;
