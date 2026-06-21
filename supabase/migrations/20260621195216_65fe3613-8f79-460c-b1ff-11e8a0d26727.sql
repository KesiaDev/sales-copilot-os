CREATE TYPE public.coaching_action_type AS ENUM ('cobranca','parabens','alinhamento_1x1','feedback','outro');

CREATE TABLE public.coaching_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo public.coaching_action_type NOT NULL,
  titulo text NOT NULL,
  descricao text,
  ocorreu_em timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coaching_actions_profile_idx ON public.coaching_actions(profile_id, ocorreu_em DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_actions TO authenticated;
GRANT ALL ON public.coaching_actions TO service_role;

ALTER TABLE public.coaching_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaching_actions_select_all" ON public.coaching_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "coaching_actions_write_head_or_own" ON public.coaching_actions
  FOR ALL TO authenticated
  USING (public.is_head(auth.uid()) OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (public.is_head(auth.uid()) OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));