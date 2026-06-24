import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

// Le os snapshots gravados pelo endpoint /api/public/webhooks/clint-dashboards
// (workflow n8n 05), que por sua vez vem dos dashboards "Produtividade por
// usuário" e "Funis Perpétuos V3 - Liderança" já existentes na conta Clint.
export const getClintVendedorMetricas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: latest } = await context.supabase
      .from("clint_vendedor_metricas")
      .select("capturado_em")
      .order("capturado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return [];

    const { data, error } = await context.supabase
      .from("clint_vendedor_metricas")
      .select("*, profile:profiles(full_name)")
      .eq("capturado_em", latest.capturado_em)
      .order("negocios_ganhos", { ascending: false });
    if (error) throw error;
    return data;
  });

export const getClintFunilSnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clint_funil_snapshots")
      .select("*")
      .order("capturado_em", { ascending: false })
      .limit(40);
    if (error) throw error;

    const latestByTipo: Record<string, { capturado_em: string; dados: Json }> = {};
    for (const row of data ?? []) {
      if (!latestByTipo[row.tipo])
        latestByTipo[row.tipo] = { capturado_em: row.capturado_em, dados: row.dados };
    }
    return latestByTipo;
  });
