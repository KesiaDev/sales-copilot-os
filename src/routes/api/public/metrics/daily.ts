import { createFileRoute } from "@tanstack/react-router";
import { checkWebhookSecret } from "@/lib/webhook-auth";

export const Route = createFileRoute("/api/public/metrics/daily")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const unauthorized = checkWebhookSecret(request);
        if (unauthorized) return unauthorized;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const [daily, top, meta] = await Promise.all([
            supabaseAdmin.from("v_daily_metrics").select("*").maybeSingle(),
            supabaseAdmin.from("v_top_performer_hoje").select("*").maybeSingle(),
            supabaseAdmin.from("v_meta_mes").select("*").maybeSingle(),
          ]);

          const d: any = daily.data ?? {};
          const t: any = top.data ?? {};
          const m: any = meta.data ?? {};

          const body = {
            receita_hoje: Number(d.receita_hoje ?? 0),
            vendas_hoje: Number(d.vendas_hoje ?? 0),
            leads_hoje: Number(d.leads_hoje ?? 0),
            conversao_pct: Number(d.conversao_pct ?? 0),
            reembolsos_hoje: Number(d.reembolsos_hoje ?? 0),
            cancelamentos_hoje: Number(d.cancelamentos_hoje ?? 0),
            top_performer: {
              nome: t.nome ?? t.full_name ?? null,
              vendas: Number(t.vendas ?? 0),
              receita: Number(t.receita ?? 0),
            },
            meta_total: Number(m.meta_total ?? 0),
            receita_mes: Number(m.receita_mes ?? 0),
            pct_meta: Number(m.pct_meta ?? 0),
          };

          return Response.json(body);
        } catch (e: any) {
          console.error("metrics/daily", e);
          return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
