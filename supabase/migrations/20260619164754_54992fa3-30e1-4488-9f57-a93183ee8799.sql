
-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_head(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
-- RLS still needs these to be invokable, so re-grant where needed
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_head(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_updated_at() TO authenticated, service_role;

-- Tighten objections insert policy
DROP POLICY IF EXISTS "objections_write_authenticated" ON public.objections;
CREATE POLICY "objections_insert_own_or_head" ON public.objections FOR INSERT TO authenticated
  WITH CHECK (
    public.is_head(auth.uid())
    OR profile_id IS NULL
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- ============ SEED COLABORADORES ============
INSERT INTO public.profiles (id, full_name, cargo, data_entrada, ativo)
VALUES
  (gen_random_uuid(), 'Fabio Nadal', 'Closer Sênior', CURRENT_DATE - INTERVAL '365 days', true),
  (gen_random_uuid(), 'Rita', 'Closer', CURRENT_DATE - INTERVAL '200 days', true),
  (gen_random_uuid(), 'João', 'SDR', CURRENT_DATE - INTERVAL '120 days', true),
  (gen_random_uuid(), 'Gisele', 'Closer', CURRENT_DATE - INTERVAL '180 days', true),
  (gen_random_uuid(), 'Luana', 'SDR', CURRENT_DATE - INTERVAL '90 days', true);

-- Goals for current month
INSERT INTO public.goals (profile_id, mes, ano, valor_meta)
SELECT id, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT, 50000
FROM public.profiles;
