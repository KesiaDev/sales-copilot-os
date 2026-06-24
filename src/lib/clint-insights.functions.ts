import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";

const NUMERIC_FIELDS = [
  "reunioes_agendadas",
  "reunioes_realizadas",
  "ligacoes",
  "emails",
  "tarefas",
  "whatsapp",
  "no_show",
  "negocios_total",
  "negocios_ganhos",
  "negocios_perdidos",
] as const;

type VendedorMetricaRow = {
  id: string;
  user_name: string;
  profile_id: string | null;
  profile: { full_name: string } | null;
  capturado_em: string;
  taxa_conversao: number | null;
} & Record<(typeof NUMERIC_FIELDS)[number], number>;

function baselineDateFor(periodo: "dia" | "semana" | "mes", atual: Date): Date {
  if (periodo === "dia") return new Date(atual.getTime() - 1 * 86400000);
  if (periodo === "semana") return new Date(atual.getTime() - 7 * 86400000);
  return new Date(atual.getFullYear(), atual.getMonth(), 1);
}

// Le os snapshots gravados pelo endpoint /api/public/webhooks/clint-dashboards
// (workflow n8n 05), que por sua vez vem dos dashboards "Produtividade por
// usuário" e "Funis Perpétuos V3 - Liderança" já existentes na conta Clint.
// Os números desses dashboards são acumulados desde o início (confirmado
// 24/06/2026), então dia/semana/mês são calculados aqui como a diferença entre
// o snapshot mais recente e o snapshot mais próximo do início do período —
// não existe filtro de período na API da Clint.
const periodoInput = z.object({
  periodo: z.enum(["dia", "semana", "mes", "tudo"]).optional().default("tudo"),
});

export const getClintVendedorMetricas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodoInput.parse(d ?? {}))
  .handler(async ({ context, data: { periodo } }) => {
    const { data: latestRow } = await context.supabase
      .from("clint_vendedor_metricas")
      .select("capturado_em")
      .order("capturado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latestRow) return { vendedores: [], capturadoEm: null, baselineCapturadoEm: null };

    const { data: atuais, error } = await context.supabase
      .from("clint_vendedor_metricas")
      .select("*, profile:profiles(full_name)")
      .eq("capturado_em", latestRow.capturado_em);
    if (error) throw error;

    if (periodo === "tudo" || !atuais) {
      return {
        vendedores: (atuais ?? []).sort((a, b) => b.negocios_ganhos - a.negocios_ganhos),
        capturadoEm: latestRow.capturado_em,
        baselineCapturadoEm: null,
      };
    }

    const baselineDate = baselineDateFor(periodo, new Date(latestRow.capturado_em));
    const { data: baselineRow } = await context.supabase
      .from("clint_vendedor_metricas")
      .select("capturado_em")
      .lte("capturado_em", baselineDate.toISOString())
      .order("capturado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!baselineRow) {
      // Ainda nao ha snapshot antigo o suficiente para calcular o periodo — mostra
      // o acumulado mesmo, o front avisa que e o total (sem historico suficiente).
      return {
        vendedores: atuais.sort((a, b) => b.negocios_ganhos - a.negocios_ganhos),
        capturadoEm: latestRow.capturado_em,
        baselineCapturadoEm: null,
      };
    }

    const { data: baseRows, error: baseError } = await context.supabase
      .from("clint_vendedor_metricas")
      .select("*")
      .eq("capturado_em", baselineRow.capturado_em);
    if (baseError) throw baseError;
    const baseByUser = new Map((baseRows ?? []).map((r) => [r.user_name, r]));

    const vendedores: VendedorMetricaRow[] = atuais.map((atual) => {
      const base = baseByUser.get(atual.user_name);
      const delta = { ...atual } as VendedorMetricaRow;
      for (const field of NUMERIC_FIELDS) {
        delta[field] = Math.max(0, atual[field] - (base?.[field] ?? 0));
      }
      delta.taxa_conversao =
        delta.negocios_total > 0 ? (delta.negocios_ganhos / delta.negocios_total) * 100 : 0;
      return delta;
    });

    return {
      vendedores: vendedores.sort((a, b) => b.negocios_ganhos - a.negocios_ganhos),
      capturadoEm: latestRow.capturado_em,
      baselineCapturadoEm: baselineRow.capturado_em,
    };
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
