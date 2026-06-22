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

          if (action === "verify_sales") {
            const { count: totalCount } = await supabaseAdmin
              .from("sales")
              .select("id", { count: "exact", head: true });

            const { count: noProfileCount } = await supabaseAdmin
              .from("sales")
              .select("id", { count: "exact", head: true })
              .is("profile_id", null);

            const { data: byProfile } = await supabaseAdmin
              .from("sales")
              .select("profile_id, valor, profiles(full_name)")
              .not("profile_id", "is", null);

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

          return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
        } catch (e: any) {
          console.error("maintenance webhook", e);
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      },
    },
  },
});
