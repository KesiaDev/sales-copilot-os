import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/hotmart")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload = await request.json() as any;

          // Hotmart event shape: { event, data: { purchase: { transaction, price, status }, buyer, producer, ... } }
          const event = payload?.event ?? "UNKNOWN";
          const purchase = payload?.data?.purchase ?? payload?.data ?? {};
          const buyer = payload?.data?.buyer ?? {};
          const product = payload?.data?.product ?? {};

          if (event === "PURCHASE_COMPLETE" || event === "PURCHASE_APPROVED") {
            await supabaseAdmin.from("sales").insert({
              produto: product?.name ?? "Hotmart Product",
              valor: Number(purchase?.price?.value ?? purchase?.value ?? 0),
              moeda: purchase?.price?.currency_value ?? "EUR",
              pais: buyer?.address?.country ?? buyer?.country,
              fonte: "hotmart",
              external_id: String(purchase?.transaction ?? ""),
              vendido_em: purchase?.order_date ? new Date(purchase.order_date).toISOString() : new Date().toISOString(),
              metadata: payload,
            });
          } else if (event === "PURCHASE_REFUNDED") {
            await supabaseAdmin.from("refunds").insert({
              valor: Number(purchase?.price?.value ?? 0),
              motivo: "Hotmart refund",
              ocorreu_em: new Date().toISOString(),
            });
          } else if (event === "PURCHASE_CANCELED") {
            await supabaseAdmin.from("cancellations").insert({
              valor: Number(purchase?.price?.value ?? 0),
              motivo: "Hotmart cancellation",
              ocorreu_em: new Date().toISOString(),
            });
          }

          return Response.json({ ok: true });
        } catch (e: any) {
          console.error("hotmart webhook", e);
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      },
    },
  },
});
