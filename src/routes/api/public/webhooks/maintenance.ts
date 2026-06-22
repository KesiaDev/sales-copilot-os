import { createFileRoute } from "@tanstack/react-router";
import { checkWebhookSecret } from "@/lib/webhook-auth";

// Rota temporaria de manutencao, protegida pelo mesmo segredo dos webhooks.
// Usada uma unica vez para limpar dados de teste e validar o backfill de vendas.
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

          if (action === "cleanup_test_rows") {
            const { data: rows, error: selErr } = await supabaseAdmin
              .from("sales")
              .select("id, produto, valor, metadata")
              .is("profile_id", null)
              .is("external_id", null)
              .eq("produto", "Clint Deal");

            if (selErr) throw selErr;

            const toDelete = (rows ?? []).filter((r: any) => {
              const title = r?.metadata?.data?.title;
              return title === "TESTE IDEMPOTENCIA";
            });

            for (const r of toDelete) {
              await supabaseAdmin.from("sales").delete().eq("id", r.id);
            }

            return Response.json({ ok: true, deleted: toDelete.length, ids: toDelete.map((r: any) => r.id) });
          }

          if (action === "cleanup_no_vendor_rows") {
            const { count: before } = await supabaseAdmin
              .from("sales")
              .select("id", { count: "exact", head: true })
              .is("profile_id", null);

            const { error: delErr } = await supabaseAdmin
              .from("sales")
              .delete()
              .is("profile_id", null);

            if (delErr) throw delErr;

            return Response.json({ ok: true, deleted: before ?? 0 });
          }

          if (action === "cleanup_external_id_prefix") {
            const prefix = String(body?.prefix ?? "teste-diagnostico");
            const { data: rows, error: selErr } = await supabaseAdmin
              .from("sales")
              .select("id, external_id")
              .like("external_id", `${prefix}%`);
            if (selErr) throw selErr;

            for (const r of rows ?? []) {
              await supabaseAdmin.from("sales").delete().eq("id", r.id);
            }

            return Response.json({ ok: true, deleted: (rows ?? []).length });
          }

          if (action === "backfill_clint_page") {
            const page = Number(body?.page ?? 1);
            const CLINT_TOKEN = "U2FsdGVkX19qpxX7Y7vkyZMDSMx6PXQMCEWfKkEyJ7mgynG9278yllllxQtGVkvlt1aAh+0iDpps2sZHjAhdmA==";

            function parseValue(raw: any): number {
              if (typeof raw === "number") return raw;
              if (typeof raw !== "string") return 0;
              let cleaned = raw.replace(/[^\d.,-]/g, "");
              if (cleaned.includes(",") && cleaned.includes(".")) {
                cleaned = cleaned.replace(/\./g, "").replace(",", ".");
              } else if (cleaned.includes(",")) {
                cleaned = cleaned.replace(",", ".");
              }
              const n = parseFloat(cleaned);
              return isNaN(n) ? 0 : n;
            }

            const pageSize = Number(body?.pageSize ?? 25);
            const clintResp = await fetch(
              `https://api.clint.digital/v1/deals?status=WON&limit=${pageSize}&page=${page}`,
              { headers: { "api-token": CLINT_TOKEN } }
            );
            const clintData = await clintResp.json() as any;
            const deals = clintData?.data ?? [];
            const totalPages = clintData?.totalPages ?? 1;

            let processed = 0;
            const errors: string[] = [];

            for (const deal of deals) {
              try {
                const fields = deal.fields || {};
                const title = fields.oferta || fields.produto || "Clint Deal";
                const value = parseValue(deal.value);
                const wonAt = deal.won_at || deal.updated_stage_at || deal.updated_at;
                const sellerName = (deal.user?.full_name || "").trim() || null;
                const sellerEmail = (deal.user?.email || "").trim() || null;
                const externalId = String(deal.id);

                let profileId: string | null = null;
                if (sellerEmail) {
                  const { data: byEmail } = await supabaseAdmin
                    .from("profiles").select("id").ilike("email", sellerEmail).limit(1);
                  profileId = byEmail?.[0]?.id ?? null;
                }
                if (!profileId && sellerName) {
                  const firstName = sellerName.split(/\s+/)[0];
                  const { data: byName } = await supabaseAdmin
                    .from("profiles").select("id").ilike("full_name", `${firstName}%`).limit(1);
                  profileId = byName?.[0]?.id ?? null;
                }

                const row = {
                  profile_id: profileId,
                  produto: title,
                  valor: value,
                  moeda: deal.currency || "EUR",
                  pais: deal.contact?.ddi === "55" ? "BR" : "PT",
                  fonte: "clint" as const,
                  external_id: externalId,
                  external_source: "clint",
                  vendido_em: wonAt && !isNaN(Date.parse(wonAt)) ? new Date(wonAt).toISOString() : new Date().toISOString(),
                  metadata: { type: "deal", data: { title, value, source: "clint", external_id: externalId } },
                };

                const { data: existing } = await supabaseAdmin
                  .from("sales").select("id").eq("external_id", externalId).eq("external_source", "clint").maybeSingle();

                if (existing?.id) {
                  await supabaseAdmin.from("sales").update(row).eq("id", existing.id);
                } else {
                  await supabaseAdmin.from("sales").insert(row);
                }
                processed++;
              } catch (e: any) {
                errors.push(`${deal.id}: ${e.message}`);
              }
            }

            return Response.json({ ok: true, page, totalPages, processed, errors });
          }

          if (action === "list_profiles") {
            const { data: profiles, error } = await supabaseAdmin
              .from("profiles")
              .select("id, full_name, email, ativo");
            if (error) throw error;
            return Response.json({ ok: true, profiles });
          }

          if (action === "verify_sales") {
            const { count: totalCount } = await supabaseAdmin
              .from("sales")
              .select("id", { count: "exact", head: true });

            const { count: noProfileCount } = await supabaseAdmin
              .from("sales")
              .select("id", { count: "exact", head: true })
              .is("profile_id", null);

            const byProfile: any[] = [];
            let from = 0;
            const pageSize = 1000;
            while (true) {
              const { data: page } = await supabaseAdmin
                .from("sales")
                .select("profile_id, valor, profiles(full_name)")
                .not("profile_id", "is", null)
                .range(from, from + pageSize - 1);
              if (!page || page.length === 0) break;
              byProfile.push(...page);
              if (page.length < pageSize) break;
              from += pageSize;
            }

            const grouped: Record<string, { nome: string; count: number; total: number }> = {};
            for (const row of byProfile ?? []) {
              const pid = row.profile_id as string;
              const nome = (row as any).profiles?.full_name ?? "?";
              if (!grouped[pid]) grouped[pid] = { nome, count: 0, total: 0 };
              grouped[pid].count++;
              grouped[pid].total += Number(row.valor ?? 0);
            }

            return Response.json({
              ok: true,
              total_sales: totalCount,
              sales_sem_vendedor: noProfileCount,
              por_vendedor: Object.values(grouped).sort((a, b) => b.count - a.count),
            });
          }

          if (action === "diagnose_seller_names_page") {
            const CLINT_TOKEN = "U2FsdGVkX19qpxX7Y7vkyZMDSMx6PXQMCEWfKkEyJ7mgynG9278yllllxQtGVkvlt1aAh+0iDpps2sZHjAhdmA==";
            const page = Number(body?.page ?? 1);
            const pageSize = Number(body?.pageSize ?? 200);
            const knownFirstNames = ["gisele", "rita", "joão", "joao", "fabio", "luana", "kesia"];

            const clintResp = await fetch(
              `https://api.clint.digital/v1/deals?status=WON&limit=${pageSize}&page=${page}`,
              { headers: { "api-token": CLINT_TOKEN } }
            );
            const clintData = await clintResp.json() as any;
            const deals = clintData?.data ?? [];
            const totalPages = clintData?.totalPages ?? 1;

            const unmatched: Record<string, number> = {};
            for (const deal of deals) {
              const sellerName = (deal.user?.full_name || "").trim();
              const firstName = sellerName.split(/\s+/)[0]?.toLowerCase() ?? "";
              if (!knownFirstNames.includes(firstName)) {
                const key = sellerName || "(sem nome)";
                unmatched[key] = (unmatched[key] ?? 0) + 1;
              }
            }
            return Response.json({
              ok: true,
              page,
              totalPages,
              dealsInPage: deals.length,
              unmatched_count: Object.values(unmatched).reduce((a, b) => a + b, 0),
              por_nome: Object.entries(unmatched).sort((a, b) => b[1] - a[1]),
            });
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
