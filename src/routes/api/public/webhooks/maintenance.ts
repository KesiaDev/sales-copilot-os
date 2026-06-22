import { createFileRoute } from "@tanstack/react-router";
import { checkWebhookSecret } from "@/lib/webhook-auth";

// Rota temporaria de manutencao, protegida pelo mesmo segredo dos webhooks.
// Usada uma unica vez para backfillar produto_grupo nas vendas ja importadas.
// Remover apos o uso.
export const Route = createFileRoute("/api/public/webhooks/maintenance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = checkWebhookSecret(request);
        if (unauthorized) return unauthorized;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const body = await request.json() as any;
          const action = body?.action;
          const CLINT_TOKEN = "U2FsdGVkX19qpxX7Y7vkyZMDSMx6PXQMCEWfKkEyJ7mgynG9278yllllxQtGVkvlt1aAh+0iDpps2sZHjAhdmA==";

          function classifyOrigin(group: string, name: string): string {
            const s = `${group || ""} ${name || ""}`;
            if (/WGRS/i.test(s)) return "Mentoria Gestão de Redes Sociais";
            if (/FGRS/i.test(s)) return "Mentoria Gestão de Redes Sociais";
            if (/IGT/i.test(s)) return "Mentoria Gestor de Tráfego";
            if (/WGT/i.test(s)) return "Mentoria Gestor de Tráfego";
            if (/SESS.*ESTRAT/i.test(s)) return "Mentoria Gestor de Tráfego";
            if (/MASTER AND SCALE/i.test(s)) return "Master and Scale";
            if (/SUCESSO DO CLIENTE/i.test(s)) return "Renovações / Sucesso do Cliente";
            return "Outros";
          }

          if (action === "backfill_produto_grupo_page") {
            const page = Number(body?.page ?? 1);
            const pageSize = Number(body?.pageSize ?? 200);

            const originsResp = await fetch(
              "https://api.clint.digital/v1/origins?limit=100",
              { headers: { "api-token": CLINT_TOKEN } }
            );
            const originsData = await originsResp.json() as any;
            const originsMap: Record<string, { group: string; name: string }> = {};
            for (const o of originsData?.data ?? []) {
              originsMap[o.id] = { group: o.group?.name ?? "", name: o.name ?? "" };
            }

            const clintResp = await fetch(
              `https://api.clint.digital/v1/deals?status=WON&limit=${pageSize}&page=${page}`,
              { headers: { "api-token": CLINT_TOKEN } }
            );
            const clintData = await clintResp.json() as any;
            const deals = clintData?.data ?? [];
            const totalPages = clintData?.totalPages ?? 1;

            let updated = 0;
            const errors: string[] = [];
            for (const deal of deals) {
              try {
                const origin = originsMap[deal.origin_id] ?? { group: "", name: "" };
                const produtoGrupo = classifyOrigin(origin.group, origin.name);
                const externalId = String(deal.id);

                const { error } = await supabaseAdmin
                  .from("sales")
                  .update({ produto_grupo: produtoGrupo })
                  .eq("external_id", externalId)
                  .eq("external_source", "clint");
                if (error) throw error;
                updated++;
              } catch (e: any) {
                errors.push(`${deal.id}: ${e.message}`);
              }
            }
            return Response.json({ ok: true, page, totalPages, updated, errors });
          }

          if (action === "vendas_por_produto") {
            const pageSize = 1000;
            let from = 0;
            const rows: any[] = [];
            while (true) {
              const { data: pageRows } = await supabaseAdmin
                .from("sales")
                .select("profile_id, produto_grupo, valor, profiles(full_name)")
                .range(from, from + pageSize - 1);
              if (!pageRows || pageRows.length === 0) break;
              rows.push(...pageRows);
              if (pageRows.length < pageSize) break;
              from += pageSize;
            }

            const grouped: Record<string, Record<string, { vendas: number; total: number }>> = {};
            for (const r of rows) {
              const nome = (r as any).profiles?.full_name ?? "Sem vendedor";
              const grupo = (r as any).produto_grupo ?? "(nao classificado)";
              grouped[nome] = grouped[nome] ?? {};
              grouped[nome][grupo] = grouped[nome][grupo] ?? { vendas: 0, total: 0 };
              grouped[nome][grupo].vendas++;
              grouped[nome][grupo].total += Number(r.valor) || 0;
            }
            return Response.json({ ok: true, grouped });
          }

          return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
        } catch (e: any) {
          console.error("maintenance webhook", e);
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      },
    },
  },
});
