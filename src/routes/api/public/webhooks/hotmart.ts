import { createFileRoute } from "@tanstack/react-router";
import { checkWebhookSecret } from "@/lib/webhook-auth";

export const Route = createFileRoute("/api/public/webhooks/hotmart")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = checkWebhookSecret(request);
        if (unauthorized) return unauthorized;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload = await request.json() as any;

          // Hotmart event shape: { event, data: { purchase: { transaction, price, status }, buyer, producer, ... } }
          // NOTA: vendas aprovadas/completas NAO sao gravadas aqui. A Clint ja cria o deal WON
          // automaticamente para vendas Hotmart, e o workflow n8n "02 - Clint: Sync Negocios
          // Ganhos" sincroniza esse deal (com vendedor correto) para a tabela sales. Gravar aqui
          // tambem duplicaria a venda (uma vez sem vendedor, outra com).
          const event = payload?.event ?? "UNKNOWN";
          const purchase = payload?.data?.purchase ?? payload?.data ?? {};
          const buyer = payload?.data?.buyer ?? {};
          const transaction = String(purchase?.transaction ?? "");
          const buyerInfo = buyer?.email ? ` - ${buyer.email}` : "";

          if (event === "PURCHASE_REFUNDED") {
            await supabaseAdmin.from("refunds").insert({
              valor: Number(purchase?.price?.value ?? 0),
              motivo: `Hotmart refund - transacao ${transaction}${buyerInfo}`,
              ocorreu_em: new Date().toISOString(),
            });
          } else if (event === "PURCHASE_CANCELED") {
            await supabaseAdmin.from("cancellations").insert({
              valor: Number(purchase?.price?.value ?? 0),
              motivo: `Hotmart cancellation - transacao ${transaction}${buyerInfo}`,
              ocorreu_em: new Date().toISOString(),
            });
          } else if (event === "PURCHASE_CHARGEBACK" || event === "CHARGEBACK") {
            await supabaseAdmin.from("refunds").insert({
              valor: Number(purchase?.price?.value ?? 0),
              motivo: `Hotmart chargeback - transacao ${transaction}${buyerInfo}`,
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
