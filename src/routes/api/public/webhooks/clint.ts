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
            const externalId: string | null = data?.external_id ? String(data.external_id) : null;
            const externalSource = externalId ? "clint" : null;

            let profileId: string | null = null;
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
              // primeiro nome como prefixo para cobrir os dois casos.
              const firstName = sellerName.split(/\s+/)[0];
              const { data: byName } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .ilike("full_name", `${firstName}%`)
                .limit(1);
              profileId = byName?.[0]?.id ?? null;
            }

            const wonAt = data?.won_at && !isNaN(Date.parse(data.won_at))
              ? new Date(data.won_at).toISOString()
              : new Date().toISOString();

            const validSources = ["hotmart", "clint", "manual", "outro"];
            const fonte = validSources.includes(data?.source) ? data.source : "outro";

            const row = {
              profile_id: profileId,
              produto: data?.title ?? data?.product ?? data?.deal_name ?? "Clint Deal",
              valor: Number(data?.value ?? data?.amount ?? 0),
              moeda: data?.currency ?? "EUR",
              pais: data?.country,
              fonte,
              external_id: externalId,
              external_source: externalSource,
              vendido_em: wonAt,
              metadata: payload,
            };

            if (externalId) {
              const { data: existing } = await supabaseAdmin
                .from("sales")
                .select("id")
                .eq("external_id", externalId)
                .eq("external_source", externalSource)
                .maybeSingle();

              if (existing?.id) {
                await supabaseAdmin.from("sales").update(row).eq("id", existing.id);
              } else {
                await supabaseAdmin.from("sales").insert(row);
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
