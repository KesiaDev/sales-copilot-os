import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DIA_MS = 86400000;
const JANELA_FUTURA_DIAS = 45;
const JANELA_PASSADA_DIAS = 30;
const PERDIDO_APOS_DIAS = 30;

export type RenewalItem = {
  saleId: string;
  nome: string;
  vendedor: string;
  produtoGrupo: string;
  valor: number;
  vendidoEm: string;
  dueDate: string;
  diasRestantes: number;
  status: string;
  ultimoContato: string | null;
};

export const getRenewalSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("renewal_settings")
      .select("*")
      .order("produto_grupo");
    if (error) throw error;
    return data;
  });

const updateDurationInput = z.object({
  produto_grupo: z.string().min(1),
  duracao_dias: z.number().int().min(1).max(3650),
});

export const updateRenewalDuration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateDurationInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("renewal_settings")
      .update({ duracao_dias: data.duracao_dias, updated_at: new Date().toISOString() })
      .eq("produto_grupo", data.produto_grupo);
    if (error) throw error;
    return { ok: true };
  });

export const getRenewalRadar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: settings, error: settingsError } = await context.supabase
      .from("renewal_settings")
      .select("*");
    if (settingsError) throw settingsError;
    if (!settings || settings.length === 0) {
      return { items: [] as RenewalItem[], settings: [], renovadosMes: { count: 0, valor: 0 } };
    }

    const agora = Date.now();
    const items: RenewalItem[] = [];

    for (const cfg of settings) {
      const duracaoMs = cfg.duracao_dias * DIA_MS;
      const vendidoDe = new Date(agora - duracaoMs - JANELA_FUTURA_DIAS * DIA_MS);
      const vendidoAte = new Date(agora - duracaoMs + JANELA_PASSADA_DIAS * DIA_MS);

      const { data: vendas, error: vendasError } = await context.supabase
        .from("sales")
        .select("id, valor, vendido_em, comprador_email, metadata, profile:profiles(full_name)")
        .eq("produto_grupo", cfg.produto_grupo)
        .eq("possible_duplicate", false)
        .gte("vendido_em", vendidoDe.toISOString())
        .lte("vendido_em", vendidoAte.toISOString());
      if (vendasError) throw vendasError;
      if (!vendas || vendas.length === 0) continue;

      const emails = [
        ...new Set(vendas.map((v) => v.comprador_email).filter((e): e is string => !!e)),
      ];
      let renovacoes: { comprador_email: string | null; vendido_em: string }[] = [];
      if (emails.length > 0) {
        const { data: renovData, error: renovError } = await context.supabase
          .from("sales")
          .select("comprador_email, vendido_em")
          .eq("produto_grupo", cfg.renovacao_produto_grupo)
          .eq("possible_duplicate", false)
          .in("comprador_email", emails);
        if (renovError) throw renovError;
        renovacoes = renovData ?? [];
      }

      const saleIds = vendas.map((v) => v.id);
      const { data: statusRows, error: statusError } = await context.supabase
        .from("renewal_status")
        .select("*")
        .in("sale_id", saleIds);
      if (statusError) throw statusError;
      const statusBySale = new Map((statusRows ?? []).map((s) => [s.sale_id, s]));

      for (const v of vendas) {
        const dueDate = new Date(new Date(v.vendido_em).getTime() + duracaoMs);
        const diasRestantes = Math.round((dueDate.getTime() - agora) / DIA_MS);

        const jaRenovou = renovacoes.some(
          (r) =>
            r.comprador_email === v.comprador_email &&
            new Date(r.vendido_em) > new Date(v.vendido_em),
        );

        const manual = statusBySale.get(v.id);
        let status = manual?.status ?? "Aguardando";
        if (jaRenovou) status = "Renovado";
        else if (!manual && diasRestantes < -PERDIDO_APOS_DIAS) status = "Perdido";

        const meta = v.metadata as {
          data?: { contact_name?: string };
          contact_name?: string;
        } | null;
        const nome =
          meta?.data?.contact_name ?? meta?.contact_name ?? v.comprador_email ?? "Sem contato";

        items.push({
          saleId: v.id,
          nome,
          vendedor: v.profile?.full_name ?? "Sem vendedor",
          produtoGrupo: cfg.produto_grupo,
          valor: Number(v.valor) || 0,
          vendidoEm: v.vendido_em,
          dueDate: dueDate.toISOString(),
          diasRestantes,
          status,
          ultimoContato: manual?.ultimo_contato_em ?? null,
        });
      }
    }

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const gruposRenovacao = [...new Set(settings.map((s) => s.renovacao_produto_grupo))];
    const { data: renovadosMesData, error: renovadosMesError } = await context.supabase
      .from("sales")
      .select("valor")
      .in("produto_grupo", gruposRenovacao)
      .eq("possible_duplicate", false)
      .gte("vendido_em", inicioMes.toISOString());
    if (renovadosMesError) throw renovadosMesError;
    const renovadosMes = {
      count: renovadosMesData?.length ?? 0,
      valor: (renovadosMesData ?? []).reduce((s, r) => s + (Number(r.valor) || 0), 0),
    };

    return { items, settings, renovadosMes };
  });

const setStatusInput = z.object({
  saleId: z.string().uuid(),
  status: z.enum([
    "Aguardando",
    "Contato feito",
    "Reunião agendada",
    "Proposta enviada",
    "Renovado",
    "Perdido",
  ]),
});

export const setRenewalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setStatusInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("renewal_status")
      .upsert(
        { sale_id: data.saleId, status: data.status, ultimo_contato_em: new Date().toISOString() },
        { onConflict: "sale_id" },
      );
    if (error) throw error;
    return { ok: true };
  });
