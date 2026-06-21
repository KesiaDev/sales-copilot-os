import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const actionInput = z.object({
  profile_id: z.string().uuid(),
  tipo: z.enum(["cobranca", "parabens", "alinhamento_1x1", "feedback", "outro"]),
  titulo: z.string().min(2).max(200),
  descricao: z.string().max(4000).optional(),
  ocorreu_em: z.string().optional(),
});

export const createCoachingAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => actionInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error, data: row } = await context.supabase
      .from("coaching_actions")
      .insert({
        profile_id: data.profile_id,
        tipo: data.tipo,
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        ocorreu_em: data.ocorreu_em ?? new Date().toISOString(),
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const listCoachingActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ profile_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("coaching_actions")
      .select("*, profile:profiles(id, full_name, cargo)")
      .order("ocorreu_em", { ascending: false })
      .limit(200);
    if (data.profile_id) q = q.eq("profile_id", data.profile_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows;
  });

export const deleteCoachingAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("coaching_actions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
