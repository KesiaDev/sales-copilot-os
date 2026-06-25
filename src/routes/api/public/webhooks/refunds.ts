import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkWebhookSecret } from "@/lib/webhook-auth";

const PayloadSchema = z.object({
  hotmart_transaction: z.string().min(1),
  email: z.string().email(),
  produto_nome: z.string().optional().nullable(),
  produto_grupo: z.string().optional().nullable(),
  valor: z.coerce.number().default(0),
  moeda: z.string().default("EUR"),
  tipo: z.enum(["REEMBOLSO", "CANCELAMENTO", "CHARGEBACK"]),
  data_evento: z.string().refine((v) => !isNaN(Date.parse(v)), "data_evento inválida"),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/, "mes_referencia deve ser YYYY-MM"),
});

export const Route = createFileRoute("/api/public/webhooks/refunds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = checkWebhookSecret(request);
        if (unauthorized) return unauthorized;
        try {
          const json = await request.json();
          const data = PayloadSchema.parse(json);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Tenta casar profile_id pelo email do comprador.
          let profileId: string | null = null;
          const { data: profileMatch } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .ilike("email", data.email)
            .limit(1)
            .maybeSingle();
          profileId = profileMatch?.id ?? null;

          const ocorreuEm = new Date(data.data_evento).toISOString();

          // Procura registro existente para a mesma (hotmart_transaction, tipo).
          const { data: existing } = await supabaseAdmin
            .from("refunds")
            .select("id")
            .eq("hotmart_transaction", data.hotmart_transaction)
            .eq("tipo", data.tipo)
            .maybeSingle();

          const row = {
            hotmart_transaction: data.hotmart_transaction,
            email: data.email,
            profile_id: profileId,
            produto: data.produto_nome ?? null,
            produto_nome: data.produto_nome ?? null,
            produto_grupo: data.produto_grupo ?? null,
            valor: data.valor,
            moeda: data.moeda,
            tipo: data.tipo,
            data_evento: ocorreuEm,
            ocorreu_em: ocorreuEm,
            mes_referencia: data.mes_referencia,
            motivo: data.tipo,
            external_source: "hotmart_refund_webhook",
            external_id: `${data.hotmart_transaction}:${data.tipo}`,
          };

          let id: string;
          if (existing?.id) {
            const { error } = await supabaseAdmin
              .from("refunds")
              .update(row)
              .eq("id", existing.id);
            if (error) throw error;
            id = existing.id;
          } else {
            const { data: inserted, error } = await supabaseAdmin
              .from("refunds")
              .insert(row)
              .select("id")
              .single();
            if (error) throw error;
            id = inserted.id;
          }

          return Response.json({ success: true, id });
        } catch (e: any) {
          console.error("refunds webhook", e);
          if (e?.issues) {
            return new Response(JSON.stringify({ success: false, error: "ValidationError", issues: e.issues }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ success: false, error: e?.message ?? "Internal error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
