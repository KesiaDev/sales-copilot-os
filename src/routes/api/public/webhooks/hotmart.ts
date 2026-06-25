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
          const { findPossibleDuplicateSale, buildDuplicateReason } =
            await import("@/lib/duplicate-detection");
          const payload = (await request.json()) as any;

          // Hotmart event shape: { event, data: { purchase: { transaction, price, status }, buyer, producer, product, ... } }
          // NOTA: a Clint normalmente cria o deal WON e sincroniza pra tabela sales com o
          // vendedor correto (workflow n8n "02 - Clint: Sync Negocios Ganhos"). Mas vendedores
          // as vezes esquecem de marcar "Ganho" na Clint, e a venda nunca aparecia em lugar
          // nenhum mesmo o dinheiro tendo entrado na Hotmart — por isso PURCHASE_APPROVED/
          // PURCHASE_COMPLETE tambem gravam aqui (sem vendedor), usando a mesma deteccao de
          // duplicata da Clint pra nao contar a venda duas vezes quando ela sincronizar depois.
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

          const produto_grupo: string | null =
            (typeof payload?.mapped_produto_grupo === "string" && payload.mapped_produto_grupo) ||
            (productName ? classifyHotmartProduct(productName) : null);

          // Match best-effort do vendedor enviado pelo n8n ("mapped_seller") com profiles.name.
          const mappedSeller: string | null =
            typeof payload?.mapped_seller === "string" && payload.mapped_seller.trim()
              ? payload.mapped_seller.trim()
              : null;
          let profileId: string | null = null;
          if (mappedSeller) {
            const firstName = mappedSeller.split(/\s+/)[0] ?? mappedSeller;
            const { data: profileMatch } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .ilike("name", `${firstName}%`)
              .limit(1)
              .maybeSingle();
            profileId = profileMatch?.id ?? null;
          }

          if (event === "PURCHASE_APPROVED" || event === "PURCHASE_COMPLETE") {
            const externalSource = "hotmart_webhook";
            const compradorEmail: string | null = buyer?.email ?? null;
            const valor = Number(purchase?.price?.value ?? 0);
            const vendidoEm = purchase?.approved_date
              ? new Date(purchase.approved_date).toISOString()
              : new Date().toISOString();

            const { data: existing } = transaction
              ? await supabaseAdmin
                  .from("sales")
                  .select("id")
                  .eq("external_id", transaction)
                  .eq("external_source", externalSource)
                  .maybeSingle()
              : { data: null };

            if (!existing) {
              const duplicate = await findPossibleDuplicateSale(supabaseAdmin, {
                valor,
                vendidoEm,
                excludeExternalSource: externalSource,
                compradorEmail,
              });
              await supabaseAdmin.from("sales").insert({
                produto: productName || "Hotmart Product",
                produto_grupo,
                profile_id: profileId,
                valor,
                pais,
                fonte: "hotmart",
                external_id: transaction || null,
                external_source: externalSource,
                vendido_em: vendidoEm,
                comprador_email: compradorEmail,
                metadata: payload,
                possible_duplicate: !!duplicate,
                duplicate_of: duplicate?.id ?? null,
                duplicate_reason: duplicate ? buildDuplicateReason(duplicate) : null,
              });
            }
          } else if (event === "PURCHASE_REFUNDED") {
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
