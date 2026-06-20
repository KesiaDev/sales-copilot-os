import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const rowSchema = z.object({
  external_id: z.string().min(1),
  produto: z.string().min(1),
  vendedor: z.string().optional().nullable(),
  valor: z.number(),
  vendido_em: z.string(),
  status: z.enum(["aprovada", "reembolsada", "cancelada"]),
  raw: z.record(z.string(), z.any()).optional(),
});

const input = z.object({ rows: z.array(rowSchema).min(1).max(5000) });

export const importHotmartCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ context, data }) => {
    // Only heads can import
    const { data: isHead } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "head",
    });
    if (!isHead) throw new Error("Apenas heads podem importar CSV.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load profiles for vendor mapping
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name");
    const findProfileId = (name?: string | null): string | null => {
      if (!name) return null;
      const n = name.trim().toLowerCase();
      if (!n) return null;
      const exact = profiles?.find((p) => (p.full_name ?? "").trim().toLowerCase() === n);
      if (exact) return exact.id;
      const partial = profiles?.find((p) => {
        const fn = (p.full_name ?? "").trim().toLowerCase();
        return fn && (fn.includes(n) || n.includes(fn));
      });
      return partial?.id ?? null;
    };

    const SOURCE = "hotmart_csv";
    let inserted = 0;
    let duplicated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Pre-check existing external_ids across the three tables
    const ids = data.rows.map((r) => r.external_id);
    const [existingSales, existingRefunds, existingCancels] = await Promise.all([
      supabaseAdmin.from("sales").select("external_id").in("external_id", ids).eq("external_source", SOURCE),
      supabaseAdmin.from("refunds").select("external_id").in("external_id", ids).eq("external_source", SOURCE),
      supabaseAdmin.from("cancellations").select("external_id").in("external_id", ids).eq("external_source", SOURCE),
    ]);
    const existing = new Set<string>([
      ...(existingSales.data ?? []).map((r: any) => r.external_id),
      ...(existingRefunds.data ?? []).map((r: any) => r.external_id),
      ...(existingCancels.data ?? []).map((r: any) => r.external_id),
    ]);

    for (const row of data.rows) {
      if (existing.has(row.external_id)) {
        duplicated++;
        continue;
      }
      try {
        const profile_id = findProfileId(row.vendedor);
        const when = row.vendido_em || new Date().toISOString();
        if (row.status === "aprovada") {
          const { error } = await supabaseAdmin.from("sales").insert({
            produto: row.produto,
            valor: row.valor,
            moeda: "BRL",
            fonte: "hotmart",
            external_id: row.external_id,
            external_source: SOURCE,
            profile_id,
            vendido_em: when,
            metadata: row.raw ?? null,
          });
          if (error) throw error;
        } else if (row.status === "reembolsada") {
          const { error } = await supabaseAdmin.from("refunds").insert({
            valor: row.valor,
            motivo: "Hotmart CSV - Reembolsada",
            ocorreu_em: when,
            external_id: row.external_id,
            external_source: SOURCE,
            profile_id,
          });
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin.from("cancellations").insert({
            valor: row.valor,
            motivo: "Hotmart CSV - Cancelada",
            ocorreu_em: when,
            external_id: row.external_id,
            external_source: SOURCE,
            profile_id,
          });
          if (error) throw error;
        }
        inserted++;
      } catch (e: any) {
        errors++;
        if (errorDetails.length < 10) errorDetails.push(`${row.external_id}: ${e.message ?? e}`);
      }
    }

    return { inserted, duplicated, errors, errorDetails };
  });
