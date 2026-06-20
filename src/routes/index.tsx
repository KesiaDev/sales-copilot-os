import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#888" }}>
      Carregando…
    </div>
  );
}
