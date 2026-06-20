import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  if (typeof window !== "undefined") {
    supabase.auth.getUser().then(({ data }) => {
      window.location.replace(data.user ? "/dashboard" : "/auth");
    });
  }
  return null;
}
