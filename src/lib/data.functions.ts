import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============ PROFILES ============
export const listProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles").select("*").order("full_name");
    if (error) throw error;
    return data;
  });

export const getCurrentProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("*").eq("user_id", context.userId).maybeSingle();
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    return { profile, roles: (roles ?? []).map((r: any) => r.role), isHead: (roles ?? []).some((r: any) => r.role === "head") };
  });

const profileUpdate = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(2).max(100).optional(),
  cargo: z.string().max(80).optional().nullable(),
  telefone: z.string().max(40).optional().nullable(),
  data_entrada: z.string().optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  ativo: z.boolean().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileUpdate.parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("profiles").update(rest).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

// ============ DAILY REPORTS ============
const dailyReportInput = z.object({
  profile_id: z.string().uuid(),
  data: z.string(),
  leads_recebidos: z.number().int().min(0),
  leads_atendidos: z.number().int().min(0),
  calls_realizadas: z.number().int().min(0),
  follow_ups: z.number().int().min(0),
  propostas_enviadas: z.number().int().min(0),
  vendas_fechadas: z.number().int().min(0),
  valor_vendido: z.number().min(0),
  principais_objecoes: z.string().max(2000).optional().nullable(),
  principais_dificuldades: z.string().max(2000).optional().nullable(),
  proximas_oportunidades: z.string().max(2000).optional().nullable(),
  precisa_ajuda: z.boolean(),
  observacoes: z.string().max(2000).optional().nullable(),
});

export const upsertDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dailyReportInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("daily_reports").upsert(data, { onConflict: "profile_id,data" });
    if (error) throw error;
    return { ok: true };
  });

export const listDailyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("daily_reports")
      .select("*, profile:profiles(id, full_name)")
      .order("data", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  });

// ============ OBJECTIONS ============
const objectionInput = z.object({
  texto: z.string().min(3).max(1000),
  produto: z.string().max(120).optional().nullable(),
  pais: z.string().max(8).optional().nullable(),
  profile_id: z.string().uuid().optional().nullable(),
  resposta_sugerida: z.string().max(2000).optional().nullable(),
});

export const addObjection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => objectionInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("objections").insert(data);
    if (error) throw error;
    return { ok: true };
  });

export const listObjections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("objections").select("*, profile:profiles(full_name)").order("frequencia", { ascending: false });
    if (error) throw error;
    return data;
  });

// ============ SALES ============
export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sales").select("*, profile:profiles(full_name)")
      .order("vendido_em", { ascending: false }).limit(200);
    if (error) throw error;
    return data;
  });

// ============ GOALS ============
const goalInput = z.object({
  profile_id: z.string().uuid().nullable(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2020).max(2100),
  valor_meta: z.number().min(0),
});
export const upsertGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => goalInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("goals").upsert(data, { onConflict: "profile_id,mes,ano" });
    if (error) throw error;
    return { ok: true };
  });
