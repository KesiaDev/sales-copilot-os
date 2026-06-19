
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('head', 'vendedor');
CREATE TYPE public.priority_level AS ENUM ('alta', 'media', 'reconhecimento');
CREATE TYPE public.lead_status AS ENUM ('novo', 'qualificado', 'em_negociacao', 'ganho', 'perdido');
CREATE TYPE public.activity_type AS ENUM ('call', 'follow_up', 'proposta');
CREATE TYPE public.sale_source AS ENUM ('hotmart', 'clint', 'manual', 'outro');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  cargo TEXT,
  telefone TEXT,
  data_entrada DATE,
  observacoes TEXT,
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_head(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'head'::public.app_role) $$;

-- profiles policies
CREATE POLICY "profiles_select_all_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own_or_head" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_head(auth.uid()));
CREATE POLICY "profiles_insert_head" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_head(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "profiles_delete_head" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_head(auth.uid()));

-- user_roles policies
CREATE POLICY "user_roles_select_own_or_head" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_head(auth.uid()));
CREATE POLICY "user_roles_head_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_head(auth.uid())) WITH CHECK (public.is_head(auth.uid()));

-- ============ GOALS ============
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INT NOT NULL,
  valor_meta NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, mes, ano)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER goals_touch BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "goals_select_all" ON public.goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "goals_head_write" ON public.goals FOR ALL TO authenticated
  USING (public.is_head(auth.uid())) WITH CHECK (public.is_head(auth.uid()));

-- ============ SALES ============
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  produto TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'EUR',
  pais TEXT,
  fonte public.sale_source NOT NULL DEFAULT 'manual',
  external_id TEXT,
  vendido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sales_profile_idx ON public.sales(profile_id);
CREATE INDEX sales_vendido_em_idx ON public.sales(vendido_em);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_select_all" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_insert_own_or_head" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (
    public.is_head(auth.uid())
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "sales_update_head" ON public.sales FOR UPDATE TO authenticated
  USING (public.is_head(auth.uid()));
CREATE POLICY "sales_delete_head" ON public.sales FOR DELETE TO authenticated
  USING (public.is_head(auth.uid()));

-- ============ REFUNDS ============
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  valor NUMERIC(12,2) NOT NULL,
  motivo TEXT,
  ocorreu_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refunds_select_all" ON public.refunds FOR SELECT TO authenticated USING (true);
CREATE POLICY "refunds_head_write" ON public.refunds FOR ALL TO authenticated
  USING (public.is_head(auth.uid())) WITH CHECK (public.is_head(auth.uid()));

-- ============ CANCELLATIONS ============
CREATE TABLE public.cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  motivo TEXT,
  ocorreu_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cancellations TO authenticated;
GRANT ALL ON public.cancellations TO service_role;
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cancellations_select_all" ON public.cancellations FOR SELECT TO authenticated USING (true);
CREATE POLICY "cancellations_head_write" ON public.cancellations FOR ALL TO authenticated
  USING (public.is_head(auth.uid())) WITH CHECK (public.is_head(auth.uid()));

-- ============ LEADS ============
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  origem TEXT,
  status public.lead_status NOT NULL DEFAULT 'novo',
  nome TEXT,
  email TEXT,
  telefone TEXT,
  pais TEXT,
  tempo_resposta_min INT,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualificado_em TIMESTAMPTZ,
  fechado_em TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX leads_profile_idx ON public.leads(profile_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER leads_touch BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "leads_select_all" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads_write_own_or_head" ON public.leads FOR ALL TO authenticated
  USING (
    public.is_head(auth.uid())
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_head(auth.uid())
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- ============ ACTIVITIES ============
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  tipo public.activity_type NOT NULL,
  descricao TEXT,
  ocorreu_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_select_all" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "activities_write_own_or_head" ON public.activities FOR ALL TO authenticated
  USING (
    public.is_head(auth.uid())
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_head(auth.uid())
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- ============ DAILY REPORTS ============
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  leads_recebidos INT NOT NULL DEFAULT 0,
  leads_atendidos INT NOT NULL DEFAULT 0,
  calls_realizadas INT NOT NULL DEFAULT 0,
  follow_ups INT NOT NULL DEFAULT 0,
  propostas_enviadas INT NOT NULL DEFAULT 0,
  vendas_fechadas INT NOT NULL DEFAULT 0,
  valor_vendido NUMERIC(12,2) NOT NULL DEFAULT 0,
  principais_objecoes TEXT,
  principais_dificuldades TEXT,
  proximas_oportunidades TEXT,
  precisa_ajuda BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, data)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_reports TO authenticated;
GRANT ALL ON public.daily_reports TO service_role;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER daily_reports_touch BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "daily_reports_select_all" ON public.daily_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "daily_reports_write_own_or_head" ON public.daily_reports FOR ALL TO authenticated
  USING (
    public.is_head(auth.uid())
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_head(auth.uid())
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- ============ OBJECTIONS ============
CREATE TABLE public.objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  produto TEXT,
  pais TEXT,
  resposta_sugerida TEXT,
  frequencia INT NOT NULL DEFAULT 1,
  registrada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objections TO authenticated;
GRANT ALL ON public.objections TO service_role;
ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "objections_select_all" ON public.objections FOR SELECT TO authenticated USING (true);
CREATE POLICY "objections_write_authenticated" ON public.objections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "objections_update_own_or_head" ON public.objections FOR UPDATE TO authenticated
  USING (
    public.is_head(auth.uid())
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "objections_delete_head" ON public.objections FOR DELETE TO authenticated
  USING (public.is_head(auth.uid()));

-- ============ BEHAVIOR PROFILES (DISC) ============
CREATE TABLE public.behavior_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  dominancia INT,
  influencia INT,
  estabilidade INT,
  conformidade INT,
  perfil_resumido TEXT,
  pontos_fortes TEXT,
  pontos_atencao TEXT,
  como_liderar TEXT,
  como_cobrar TEXT,
  como_reconhecer TEXT,
  como_conduzir_feedback TEXT,
  gatilhos_motivacionais TEXT,
  gatilhos_desmotivacao TEXT,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.behavior_profiles TO authenticated;
GRANT ALL ON public.behavior_profiles TO service_role;
ALTER TABLE public.behavior_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER behavior_touch BEFORE UPDATE ON public.behavior_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "behavior_select_all" ON public.behavior_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "behavior_write_own_or_head" ON public.behavior_profiles FOR ALL TO authenticated
  USING (
    public.is_head(auth.uid())
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_head(auth.uid())
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- ============ PERFORMANCE SCORES ============
CREATE TABLE public.performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  receita NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversao NUMERIC(5,2) NOT NULL DEFAULT 0,
  pontuacao NUMERIC(8,2) NOT NULL DEFAULT 0,
  vendas INT NOT NULL DEFAULT 0,
  leads INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, data)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_scores TO authenticated;
GRANT ALL ON public.performance_scores TO service_role;
ALTER TABLE public.performance_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perf_select_all" ON public.performance_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "perf_head_write" ON public.performance_scores FOR ALL TO authenticated
  USING (public.is_head(auth.uid())) WITH CHECK (public.is_head(auth.uid()));

-- ============ DAILY INSIGHTS (IA) ============
CREATE TABLE public.daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  prioridade public.priority_level NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  acao_sugerida TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX daily_insights_data_idx ON public.daily_insights(data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_insights TO authenticated;
GRANT ALL ON public.daily_insights TO service_role;
ALTER TABLE public.daily_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insights_select_all" ON public.daily_insights FOR SELECT TO authenticated USING (true);
CREATE POLICY "insights_head_write" ON public.daily_insights FOR ALL TO authenticated
  USING (public.is_head(auth.uid())) WITH CHECK (public.is_head(auth.uid()));

-- ============ DAILY EXECUTIVE SUMMARIES ============
CREATE TABLE public.daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL UNIQUE,
  receita NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta_diaria NUMERIC(12,2) NOT NULL DEFAULT 0,
  gap NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversao NUMERIC(5,2) NOT NULL DEFAULT 0,
  melhor_vendedor TEXT,
  ponto_atencao TEXT,
  plano_acao TEXT,
  resumo_ia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_summaries TO authenticated;
GRANT ALL ON public.daily_summaries TO service_role;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summary_select_all" ON public.daily_summaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "summary_head_write" ON public.daily_summaries FOR ALL TO authenticated
  USING (public.is_head(auth.uid())) WITH CHECK (public.is_head(auth.uid()));

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_is_first BOOLEAN;
  v_full_name TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Try to attach to an existing seed profile by email match
  UPDATE public.profiles
    SET user_id = NEW.id, email = NEW.email
    WHERE email = NEW.email AND user_id IS NULL
    RETURNING id INTO v_profile_id;

  IF v_profile_id IS NULL THEN
    INSERT INTO public.profiles (id, user_id, full_name, email)
    VALUES (gen_random_uuid(), NEW.id, v_full_name, NEW.email)
    RETURNING id INTO v_profile_id;
  END IF;

  -- First user becomes head; others vendedor
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'head') INTO v_is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN v_is_first THEN 'head'::public.app_role ELSE 'vendedor'::public.app_role END)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
