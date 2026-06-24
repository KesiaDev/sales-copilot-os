import { createFileRoute } from "@tanstack/react-router";
import { checkWebhookSecret } from "@/lib/webhook-auth";
import {
  classifyHotmartProduct,
  isOutOfScopeProduct,
  isOwnProducerDocument,
} from "@/lib/hotmart-product";

export const Route = createFileRoute("/api/public/webhooks/hotmart")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = checkWebhookSecret(request);
        if (unauthorized) return unauthorized;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload = (await request.json()) as any;

          // Hotmart event shape: { event, data: { purchase: { transaction, price, status }, buyer, producer, product, ... } }
          // NOTA: vendas aprovadas/completas NAO sao gravadas aqui. A Clint ja cria o deal WON
          // automaticamente para vendas Hotmart, e o workflow n8n "02 - Clint: Sync Negocios
          // Ganhos" sincroniza esse deal (com vendedor correto) para a tabela sales. Gravar aqui
          // tambem duplicaria a venda (uma vez sem vendedor, outra com).
          const event = payload?.event ?? "UNKNOWN";
          const purchase = payload?.data?.purchase ?? payload?.data ?? {};
          const buyer = payload?.data?.buyer ?? {};
          const transaction = String(purchase?.transaction ?? "");
          const buyerInfo = buyer?.email ? ` - ${buyer.email}` : "";

          // Campos de produto/produtor variam de payload pra payload — extracao best-effort,
          // nunca bloqueia o insert se algum nao vier (so fica sem classificacao).
          const productName: string =
            payload?.data?.product?.name ?? payload?.data?.purchase?.product?.name ?? "";
          const producerDocument: string =
            payload?.data?.producer?.document ?? payload?.data?.producer?.cnpj ?? "";
          const pais: string | null = buyer?.address?.country ?? null;

          // Confirmado com a Kesia em 24/06/2026: vendas/reembolsos de produtos que nao sao
          // da LLMidia (comissao de afiliacao em produto de outro produtor, ou produtos como
          // "Reset Relacional" que pertencem a outra frente do negocio) nao devem entrar nos
          // numeros da Sales OS.
          if (
            productName &&
            (!isOwnProducerDocument(producerDocument) || isOutOfScopeProduct(productName))
          ) {
            return Response.json({ ok: true, skipped: "out_of_scope_product" });
          }

          const produto_grupo = productName ? classifyHotmartProduct(productName) : null;

          if (event === "PURCHASE_REFUNDED") {
            await supabaseAdmin.from("refunds").insert({
              valor: Number(purchase?.price?.value ?? 0),
              produto: productName || null,
              produto_grupo,
              pais,
              motivo: `Hotmart refund - transacao ${transaction}${buyerInfo}`,
              ocorreu_em: new Date().toISOString(),
              metadata: payload,
            });
          } else if (event === "PURCHASE_CANCELED") {
            await supabaseAdmin.from("cancellations").insert({
              valor: Number(purchase?.price?.value ?? 0),
              produto: productName || null,
              produto_grupo,
              pais,
              motivo: `Hotmart cancellation - transacao ${transaction}${buyerInfo}`,
              ocorreu_em: new Date().toISOString(),
              metadata: payload,
            });
          } else if (event === "PURCHASE_CHARGEBACK" || event === "CHARGEBACK") {
            await supabaseAdmin.from("refunds").insert({
              valor: Number(purchase?.price?.value ?? 0),
              produto: productName || null,
              produto_grupo,
              pais,
              motivo: `Hotmart chargeback - transacao ${transaction}${buyerInfo}`,
              ocorreu_em: new Date().toISOString(),
              metadata: payload,
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
