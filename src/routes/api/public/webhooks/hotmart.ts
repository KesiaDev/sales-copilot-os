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

          // ---- Status canonical mapping (Hotmart -> Clint) ----
          // Confirmado em 26/06/2026: trataremos cada evento numa unica categoria.
          // Eventos *_REQUESTED nao mudam estado financeiro (so abrem ticket) — ignorados.
          const SALE_EVENTS = new Set([
            "PURCHASE_APPROVED",
            "PURCHASE_COMPLETE",
            "PURCHASE_BILLET_PAID",
            "BILLET_PAID",
            "PURCHASE_OVERDUE_PAID",
            "OVERDUE_PAID",
          ]);
          const REFUND_EVENTS = new Set(["PURCHASE_REFUNDED", "REFUNDED"]);
          const CHARGEBACK_EVENTS = new Set([
            "PURCHASE_CHARGEBACK",
            "CHARGEBACK",
            "PURCHASE_PROTEST",
          ]);
          const CANCEL_EVENTS = new Set([
            "PURCHASE_CANCELED",
            "PURCHASE_CANCELLED",
            "PURCHASE_EXPIRED",
            "PURCHASE_BILLET_EXPIRED",
            "ADMIN_CANCELED",
          ]);

          // Data do evento (data_de_confirmacao p/ vendas, data_de_estorno p/ perdas)
          // Hotmart envia timestamps em ms epoch. Fallback: creation_date do payload, depois now().
          const parseHotmartDate = (v: any): string | null => {
            if (!v) return null;
            const n = typeof v === "number" ? v : Number(v);
            if (Number.isFinite(n) && n > 0) return new Date(n).toISOString();
            const d = new Date(v);
            return Number.isFinite(d.getTime()) ? d.toISOString() : null;
          };
          const eventDate =
            parseHotmartDate(purchase?.approved_date) ||
            parseHotmartDate(purchase?.order_date) ||
            parseHotmartDate(purchase?.date_next_charge) ||
            parseHotmartDate(payload?.creation_date) ||
            new Date().toISOString();

          const valor = Number(purchase?.price?.value ?? 0);
          const moeda = purchase?.price?.currency_value ?? purchase?.price?.currency ?? "EUR";

          if (SALE_EVENTS.has(event)) {
            const externalSource = "hotmart_webhook";
            const compradorEmail: string | null = buyer?.email ?? null;
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
                vendidoEm: eventDate,
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
                vendido_em: eventDate,
                comprador_email: compradorEmail,
                metadata: payload,
                possible_duplicate: !!duplicate,
                duplicate_of: duplicate?.id ?? null,
                duplicate_reason: duplicate ? buildDuplicateReason(duplicate) : null,
              });
            }
          } else if (REFUND_EVENTS.has(event) || CHARGEBACK_EVENTS.has(event)) {
            // refunds compartilha tabela com chargebacks (campo tipo distingue).
            const tipo = CHARGEBACK_EVENTS.has(event) ? "CHARGEBACK" : "REEMBOLSO";
            const externalSource = `hotmart_webhook_${tipo.toLowerCase()}`;
            // Idempotencia via UNIQUE INDEX em (external_id, external_source) — upsert seguro.
            await supabaseAdmin.from("refunds").upsert(
              {
                valor,
                produto: productName || null,
                produto_grupo,
                pais,
                motivo: `Hotmart ${tipo.toLowerCase()} - ${event} - transacao ${transaction}${buyerInfo}`,
                ocorreu_em: eventDate,
                data_evento: eventDate,
                hotmart_transaction: transaction || null,
                external_id: transaction || null,
                external_source: externalSource,
                email: buyer?.email ?? null,
                produto_nome: productName || null,
                moeda,
                tipo,
                metadata: payload,
              },
              { onConflict: "external_id,external_source", ignoreDuplicates: false },
            );
          } else if (CANCEL_EVENTS.has(event)) {
            const externalSource = "hotmart_webhook_cancel";
            await supabaseAdmin.from("cancellations").upsert(
              {
                valor,
                produto: productName || null,
                produto_grupo,
                pais,
                motivo: `Hotmart cancellation - ${event} - transacao ${transaction}${buyerInfo}`,
                ocorreu_em: eventDate,
                external_id: transaction || null,
                external_source: externalSource,
                metadata: payload,
              },
              { onConflict: "external_id,external_source", ignoreDuplicates: false },
            );
          } else {
            // PURCHASE_DELAYED, PURCHASE_OUT_OF_SHOPPING_CART, *_REQUESTED, PURCHASE_PRINT_BILLET, etc.
            // Sao eventos de ciclo de vida que nao alteram metrica financeira — apenas logamos.
            console.log("hotmart webhook ignored event", { event, transaction });
            return Response.json({ ok: true, skipped: "non_financial_event", event });
          }

          return Response.json({ ok: true, event });
        } catch (e: any) {
          console.error("hotmart webhook", e);
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      },
    },
  },
});

