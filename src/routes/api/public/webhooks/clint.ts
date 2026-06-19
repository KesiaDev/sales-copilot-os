import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/clint")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload = await request.json() as any;

          const eventType = payload?.event ?? payload?.type ?? "";
          const data = payload?.data ?? payload ?? {};

          if (eventType.includes("lead") || eventType.includes("contact")) {
            await supabaseAdmin.from("leads").insert({
              origem: data?.source ?? "Clint",
              status: "novo",
              nome: data?.name ?? data?.full_name,
              email: data?.email,
              telefone: data?.phone,
              pais: data?.country,
              recebido_em: new Date().toISOString(),
              metadata: payload,
            });
          } else if (eventType.includes("deal") || eventType.includes("sale")) {
            await supabaseAdmin.from("sales").insert({
              produto: data?.product ?? data?.deal_name ?? "Clint Deal",
              valor: Number(data?.value ?? data?.amount ?? 0),
              moeda: data?.currency ?? "EUR",
              pais: data?.country,
              fonte: "clint",
              external_id: String(data?.id ?? ""),
              vendido_em: new Date().toISOString(),
              metadata: payload,
            });
          }

          return Response.json({ ok: true });
        } catch (e: any) {
          console.error("clint webhook", e);
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      },
    },
  },
});
