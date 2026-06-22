
-- 1. Commission rates
CREATE TABLE IF NOT EXISTS public.commission_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    produto_grupo TEXT NOT NULL,
    percentual DECIMAL(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
    vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(profile_id, produto_grupo, vigente_desde)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rates TO authenticated;
GRANT ALL ON public.commission_rates TO service_role;
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all commission_rates" ON public.commission_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Manual revenue entries
CREATE TABLE IF NOT EXISTS public.manual_revenue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    valor DECIMAL(12,2) NOT NULL CHECK (valor > 0),
    moeda TEXT NOT NULL DEFAULT 'EUR',
    produto_grupo TEXT NOT NULL,
    motivo TEXT,
    data_venda DATE NOT NULL,
    mes_referencia TEXT NOT NULL,
    lancado_por UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_revenue_entries TO authenticated;
GRANT ALL ON public.manual_revenue_entries TO service_role;
ALTER TABLE public.manual_revenue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all manual_revenue_entries" ON public.manual_revenue_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Roleta prizes
CREATE TABLE IF NOT EXISTS public.roleta_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    valor DECIMAL(10,2),
    tipo TEXT NOT NULL DEFAULT 'monetario',
    peso INT NOT NULL DEFAULT 1 CHECK (peso > 0),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roleta_prizes TO authenticated;
GRANT ALL ON public.roleta_prizes TO service_role;
ALTER TABLE public.roleta_prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all roleta_prizes" ON public.roleta_prizes FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.roleta_prizes (nome, valor, tipo, peso) VALUES
    ('€ 30', 30, 'monetario', 3),
    ('€ 50', 50, 'monetario', 2),
    ('€ 100', 100, 'monetario', 1),
    ('Day Off', NULL, 'beneficio', 2),
    ('Jantar para 2', NULL, 'beneficio', 1)
ON CONFLICT DO NOTHING;

-- 4. Roleta spins
CREATE TABLE IF NOT EXISTS public.roleta_spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    prize_id UUID REFERENCES public.roleta_prizes(id) ON DELETE SET NULL,
    premio_nome TEXT NOT NULL,
    premio_valor DECIMAL(10,2),
    mes_referencia TEXT NOT NULL,
    pago BOOLEAN NOT NULL DEFAULT false,
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roleta_spins TO authenticated;
GRANT ALL ON public.roleta_spins TO service_role;
ALTER TABLE public.roleta_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all roleta_spins" ON public.roleta_spins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Roleta config (eligibility per product)
CREATE TABLE IF NOT EXISTS public.roleta_config (
    produto_grupo TEXT PRIMARY KEY,
    elegivel BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roleta_config TO authenticated;
GRANT ALL ON public.roleta_config TO service_role;
ALTER TABLE public.roleta_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all roleta_config" ON public.roleta_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.roleta_config (produto_grupo, elegivel) VALUES
    ('Mentoria Gestor de Tráfego', false),
    ('Mentoria Gestão de Redes Sociais', false),
    ('Master and Scale', false),
    ('Renovações', false)
ON CONFLICT DO NOTHING;

-- 6. Weekly bonus config
CREATE TABLE IF NOT EXISTS public.weekly_bonus_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    valor_bonus DECIMAL(10,2) NOT NULL DEFAULT 60,
    moeda TEXT NOT NULL DEFAULT 'EUR',
    meta_semanal_eur DECIMAL(12,2) NOT NULL,
    vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(profile_id, vigente_desde)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_bonus_config TO authenticated;
GRANT ALL ON public.weekly_bonus_config TO service_role;
ALTER TABLE public.weekly_bonus_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all weekly_bonus_config" ON public.weekly_bonus_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Manager commission config
CREATE TABLE IF NOT EXISTS public.manager_commission_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_profile_id UUID NOT NULL REFERENCES public.profiles(id),
    percentual_sobre_equipe DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    salario_fixo_brl DECIMAL(10,2) NOT NULL DEFAULT 3200.00,
    vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_commission_config TO authenticated;
GRANT ALL ON public.manager_commission_config TO service_role;
ALTER TABLE public.manager_commission_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all manager_commission_config" ON public.manager_commission_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
