import { createFileRoute } from "@tanstack/react-router";
import { checkWebhookSecret } from "@/lib/webhook-auth";

export const Route = createFileRoute("/api/public/webhooks/clint")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = checkWebhookSecret(request);
        if (unauthorized) return unauthorized;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { findPossibleDuplicateSale, buildDuplicateReason } =
            await import("@/lib/duplicate-detection");
          const { classifyHotmartProduct } = await import("@/lib/hotmart-product");
          const payload = (await request.json()) as any;

          const eventType = String(payload?.event ?? payload?.type ?? "").toLowerCase();
          const data = payload?.data ?? payload ?? {};
          const dealStatus = String(data?.status ?? data?.stage ?? "").toLowerCase();

          // Eventos que NAO sao venda fechada — ignora silenciosamente para
          // nao poluir a base. Clint dispara deal_created/updated em cada
          // mudanca de etapa do funil; so deal_won/sale_won vira venda.
          const isWonEvent =
            eventType.includes("won") ||
            eventType === "deal_closed" ||
            dealStatus === "won" ||
            dealStatus === "ganho" ||
            dealStatus === "fechado";
          const isDealEvent = eventType.includes("deal") || eventType.includes("sale");

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
          } else if (isDealEvent && !isWonEvent) {
            // Deal aberto/perdido/movido — registra evento mas nao cria venda.
            return Response.json({ ok: true, skipped: "not_won", eventType, dealStatus });
          } else if (isDealEvent && isWonEvent) {
            const externalId: string | null = data?.external_id ? String(data.external_id) : null;
            const externalSource = externalId ? "clint" : null;

            let profileId: string | null = null;
            let sellerMatchWarning: string | null = null;
            const sellerEmail = data?.user_email ? String(data.user_email).trim() : null;
            const sellerName = data?.user_name ? String(data.user_name).trim() : null;
            if (sellerEmail) {
              const { data: byEmail } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .ilike("email", sellerEmail)
                .limit(1);
              profileId = byEmail?.[0]?.id ?? null;
            }
            if (!profileId && sellerName) {
              // profiles.full_name no app costuma ser so o primeiro nome (ex: "Gisele"),
              // enquanto a Clint manda o nome completo (ex: "Gisele Pimentel"). Casa pelo
              // primeiro nome como prefixo para cobrir os dois casos. Se mais de um perfil
              // bater com o mesmo prefixo, nao adivinha — fica sem vendedor e sinaliza para
              // revisao, pra nao atribuir a venda para a pessoa errada.
              const firstName = sellerName.split(/\s+/)[0];
              const { data: byName } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .ilike("full_name", `${firstName}%`);
              if (byName && byName.length === 1) {
                profileId = byName[0].id;
              } else if (byName && byName.length > 1) {
                sellerMatchWarning = `Nome de vendedor ambíguo na Clint ("${sellerName}") — ${byName.length} perfis correspondem ao prefixo "${firstName}". Atribua manualmente.`;
              }
            }

            const wonAt =
              data?.won_at && !isNaN(Date.parse(data.won_at))
                ? new Date(data.won_at).toISOString()
                : data?.closed_at && !isNaN(Date.parse(data.closed_at))
                  ? new Date(data.closed_at).toISOString()
                  : data?.updated_at && !isNaN(Date.parse(data.updated_at))
                    ? new Date(data.updated_at).toISOString()
                    : new Date().toISOString();

            const validSources = ["hotmart", "clint", "manual", "outro"];
            const fonte = validSources.includes(data?.source) ? data.source : "clint";

            const valor = Number(data?.value ?? data?.amount ?? 0);
            if (!valor || valor <= 0) {
              return new Response(
                JSON.stringify({ ok: true, skipped: "valor_zero" }),
                { headers: { "Content-Type": "application/json" } },
              );
            }
            const compradorEmail: string | null = data?.contact_email
              ? String(data.contact_email).trim()
              : null;
            const compradorTelefone: string | null = data?.contact_phone
              ? String(data.contact_phone).trim()
              : null;
            const produto = data?.title ?? data?.product ?? data?.deal_name ?? "Clint Deal";
            const produtoGrupo =
              data?.produto_grupo ?? classifyHotmartProduct(String(produto)) ?? null;
            const row = {
              profile_id: profileId,
              produto,
              produto_grupo: produtoGrupo,
              valor,
              moeda: data?.currency ?? "EUR",
              pais: data?.country,
              fonte,
              external_id: externalId,
              external_source: externalSource,
              vendido_em: wonAt,
              comprador_email: compradorEmail,
              comprador_telefone: compradorTelefone,
              metadata: sellerMatchWarning
                ? { ...payload, _sync_warning: sellerMatchWarning }
                : payload,
            };

            if (externalId) {
              const { data: existing } = await supabaseAdmin
                .from("sales")
                .select("id")
                .eq("external_id", externalId)
                .eq("external_source", externalSource ?? "clint")
                .maybeSingle();

              if (existing?.id) {
                await supabaseAdmin.from("sales").update(row).eq("id", existing.id);
              } else {
                // Esta venda da Clint ainda nao existe — checa se ja foi gravada por outra
                // fonte (ex: import manual do CSV da Hotmart) antes de inserir, ja que o
                // external_id da Clint e da Hotmart vivem em namespaces diferentes e o
                // unique index nao pega esse tipo de duplicata entre fontes.
                const duplicate = await findPossibleDuplicateSale(supabaseAdmin, {
                  valor,
                  vendidoEm: wonAt,
                  excludeExternalSource: externalSource,
                  compradorEmail,
                });
                let possible_duplicate = false;
                let duplicate_of: string | null = null;
                let duplicate_reason: string | null = null;
                if (duplicate) {
                  possible_duplicate = true;
                  duplicate_of = duplicate.id;
                  duplicate_reason = buildDuplicateReason(duplicate);
                }
                await supabaseAdmin
                  .from("sales")
                  .insert({ ...row, possible_duplicate, duplicate_of, duplicate_reason });
              }
            } else {
              await supabaseAdmin.from("sales").insert(row);
            }
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
