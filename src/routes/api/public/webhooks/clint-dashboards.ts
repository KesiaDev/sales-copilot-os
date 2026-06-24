import { createFileRoute } from "@tanstack/react-router";
import { checkWebhookSecret } from "@/lib/webhook-auth";

type ClintChart = {
  id?: string;
  name?: string;
  type?: string;
  result?: any;
  error?: string;
};

type VendedorRow = {
  user_name: string;
  capturado_em: string;
  profile_id: string | null;
  reunioes_agendadas?: number;
  reunioes_realizadas?: number;
  ligacoes?: number;
  emails?: number;
  tarefas?: number;
  whatsapp?: number;
  no_show?: number;
  negocios_total?: number;
  negocios_ganhos?: number;
  negocios_perdidos?: number;
  taxa_conversao?: number | null;
};

// Recebe os charts dos dashboards "Produtividade por usuário" e "Funis Perpétuos
// V3 - Liderança" já existentes na conta Clint (não criamos esses dashboards —
// eles já tinham os dados de atividade, no-show e performance por vendedor).
// A API de dashboards não filtra por data, então cada chamada traz o acumulado
// configurado no próprio dashboard; aqui só registramos snapshots.
export const Route = createFileRoute("/api/public/webhooks/clint-dashboards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = checkWebhookSecret(request);
        if (unauthorized) return unauthorized;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload = (await request.json()) as {
            capturado_em?: string;
            charts?: ClintChart[];
          };
          const charts = payload?.charts ?? [];
          const capturadoEm =
            payload?.capturado_em && !isNaN(Date.parse(payload.capturado_em))
              ? new Date(payload.capturado_em).toISOString()
              : `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

          const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name");
          const findProfileId = (userName: string): string | null => {
            const firstName = userName.trim().split(/\s+/)[0]?.toLowerCase();
            if (!firstName) return null;
            const matches = (profiles ?? []).filter((p) =>
              (p.full_name ?? "").trim().toLowerCase().startsWith(firstName),
            );
            return matches.length === 1 ? matches[0].id : null;
          };

          const porVendedor = new Map<string, VendedorRow>();
          const getRow = (userNameRaw: string): VendedorRow | null => {
            const userName = userNameRaw.trim();
            if (!userName) return null;
            if (!porVendedor.has(userName)) {
              // Colunas numericas sao NOT NULL DEFAULT 0, mas o upsert em lote do
              // PostgREST grava NULL explicito (em vez de usar o default) quando uma
              // linha do batch nao tem a chave e outra linha tem — por isso toda
              // linha precisa partir com os campos numericos zerados, nunca undefined.
              porVendedor.set(userName, {
                user_name: userName,
                capturado_em: capturadoEm,
                profile_id: findProfileId(userName),
                reunioes_agendadas: 0,
                reunioes_realizadas: 0,
                ligacoes: 0,
                emails: 0,
                tarefas: 0,
                whatsapp: 0,
                no_show: 0,
                negocios_total: 0,
                negocios_ganhos: 0,
                negocios_perdidos: 0,
              });
            }
            return porVendedor.get(userName)!;
          };

          const funilInserts: { tipo: string; capturado_em: string; dados: any }[] = [];

          for (const chart of charts) {
            if (chart.error) continue;
            const name = chart.name ?? "";

            if (name === "Produtividade time" && chart.type === "table") {
              for (const row of chart.result?.rows ?? []) {
                const r = getRow(row.user_name ?? "");
                if (!r) continue;
                r.reunioes_agendadas = Number(
                  row.track_activities_meeting_scheduled_activities ?? 0,
                );
                r.reunioes_realizadas = Number(row.track_activities_meeting_activities ?? 0);
                r.ligacoes = Number(row.track_activities_call_activities ?? 0);
                r.emails = Number(row.track_activities_email_activities ?? 0);
                r.tarefas = Number(row.track_activities_task_activities ?? 0);
                r.whatsapp = Number(row.track_activities_whatsapp_activities ?? 0);
              }
            } else if (name === "No-show" && chart.type === "line") {
              for (const series of chart.result ?? []) {
                const r = getRow(series?.name ?? "");
                if (!r) continue;
                const total = (series.data ?? []).reduce(
                  (s: number, d: any) => s + Number(d.value ?? 0),
                  0,
                );
                r.no_show = total;
              }
            } else if (name === "Performance por Vendedor" && chart.type === "table") {
              for (const row of chart.result?.rows ?? []) {
                const r = getRow(row.user_name ?? "");
                if (!r) continue;
                r.negocios_total = Number(row.deal_count ?? 0);
                r.negocios_ganhos = Number(row.deal_count_won ?? 0);
                r.negocios_perdidos = Number(row.deal_count_lost ?? 0);
                r.taxa_conversao =
                  row.deal_conversion_rate != null ? Number(row.deal_conversion_rate) : null;
              }
            } else if (chart.type === "funnel") {
              funilInserts.push({
                tipo: "funil_conversao",
                capturado_em: capturadoEm,
                dados: chart.result ?? [],
              });
            } else if (name.toLowerCase().includes("motivo de perda")) {
              funilInserts.push({
                tipo: "motivo_perda",
                capturado_em: capturadoEm,
                dados: chart.result ?? [],
              });
            } else if (name === "Tempo médio em cada etapa") {
              funilInserts.push({
                tipo: "tempo_por_etapa",
                capturado_em: capturadoEm,
                dados: chart.result ?? {},
              });
            }
          }

          if (porVendedor.size > 0) {
            const { error } = await supabaseAdmin
              .from("clint_vendedor_metricas")
              .upsert([...porVendedor.values()], { onConflict: "user_name,capturado_em" });
            if (error) throw error;
          }
          if (funilInserts.length > 0) {
            const { error } = await supabaseAdmin
              .from("clint_funil_snapshots")
              .insert(funilInserts);
            if (error) throw error;
          }

          return Response.json({
            ok: true,
            vendedores: porVendedor.size,
            snapshots: funilInserts.length,
          });
        } catch (e: any) {
          console.error("clint-dashboards webhook", e);
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      },
    },
  },
});
