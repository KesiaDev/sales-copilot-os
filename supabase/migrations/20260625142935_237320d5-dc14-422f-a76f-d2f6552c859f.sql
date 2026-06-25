CREATE INDEX IF NOT EXISTS leads_recebido_em_idx ON public.leads (recebido_em);
CREATE INDEX IF NOT EXISTS leads_profile_status_idx ON public.leads (profile_id, status);

CREATE OR REPLACE FUNCTION public.dashboard_leads_summary(p_start timestamptz)
RETURNS TABLE(profile_id uuid, status text, c bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile_id, status, COUNT(*)::bigint
  FROM public.leads
  WHERE recebido_em >= p_start
  GROUP BY profile_id, status;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_leads_summary(timestamptz) TO authenticated, service_role;