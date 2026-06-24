import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { z } from "zod";

// ============ PROFILES ============
export const listProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("profiles").select("*").order("full_name");
    if (error) throw error;
    return data;
  });

export const getCurrentProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return {
      profile,
      roles: (roles ?? []).map((r: any) => r.role),
      isHead: (roles ?? []).some((r: any) => r.role === "head"),
    };
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
      .from("daily_reports")
      .upsert(data, { onConflict: "profile_id,data" });
    if (error) throw error;
    return { ok: true };
  });

export const listDailyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("daily_reports")
      .select("*, profile:profiles(id, full_name)")
      .order("data", { ascending: false })
      .limit(100);
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
      .from("objections")
      .select("*, profile:profiles(full_name)")
      .order("frequencia", { ascending: false });
    if (error) throw error;
    return data;
  });

// ============ SALES ============
const periodoInput = z.object({
  dataInicio: z.string().optional().nullable(),
  dataFim: z.string().optional().nullable(),
});

export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodoInput.parse(d ?? {}))
  .handler(async ({ context, data: { dataInicio, dataFim } }) => {
    if (!dataInicio && !dataFim) {
      const { data, error } = await context.supabase
        .from("sales")
        .select("*, profile:profiles(full_name)")
        .eq("possible_duplicate", false)
        .order("vendido_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    }
    // Periodos sem limite (ex: ano inteiro) podem passar de 1000 linhas, que e o
    // teto padrao do Supabase/PostgREST — sem paginar aqui os cards de "Fontes"
    // no CRM ficavam contando só uma fatia truncada das vendas do período.
    const rows = await fetchAllRows<any>(({ from, to }) => {
      let query = context.supabase
        .from("sales")
        .select("*, profile:profiles(full_name)")
        .eq("possible_duplicate", false)
        .order("vendido_em", { ascending: false })
        .range(from, to);
      if (dataInicio) query = query.gte("vendido_em", dataInicio);
      if (dataFim) query = query.lt("vendido_em", `${dataFim}T23:59:59.999`);
      return query as any;
    });
    return rows;
  });

export const getVendasPorProduto = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodoInput.parse(d ?? {}))
  .handler(async ({ context, data: { dataInicio, dataFim } }) => {
    const rows: {
      profile_id: string | null;
      produto_grupo: string | null;
      valor: number;
      profiles: { full_name: string } | null;
    }[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      let query = context.supabase
        .from("sales")
        .select("profile_id, produto_grupo, valor, profiles(full_name)")
        .eq("possible_duplicate", false)
        .range(from, from + pageSize - 1);
      if (dataInicio) query = query.gte("vendido_em", dataInicio);
      if (dataFim) query = query.lt("vendido_em", `${dataFim}T23:59:59.999`);
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows.push(...(data as any));
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const produtos = new Set<string>();
    const porVendedor = new Map<
      string,
      {
        nome: string;
        produtos: Map<string, { vendas: number; valor: number }>;
        totalVendas: number;
        totalValor: number;
      }
    >();

    for (const r of rows) {
      const nome = r.profiles?.full_name ?? "Sem vendedor";
      const produto = r.produto_grupo ?? "Não classificado";
      produtos.add(produto);

      if (!porVendedor.has(nome)) {
        porVendedor.set(nome, { nome, produtos: new Map(), totalVendas: 0, totalValor: 0 });
      }
      const vendedor = porVendedor.get(nome)!;
      if (!vendedor.produtos.has(produto)) vendedor.produtos.set(produto, { vendas: 0, valor: 0 });
      const cell = vendedor.produtos.get(produto)!;
      cell.vendas += 1;
      cell.valor += Number(r.valor) || 0;
      vendedor.totalVendas += 1;
      vendedor.totalValor += Number(r.valor) || 0;
    }

    const vendedores = [...porVendedor.values()]
      .map((v) => ({ ...v, produtos: Object.fromEntries(v.produtos) }))
      .sort((a, b) => b.totalValor - a.totalValor);

    return { produtos: [...produtos].sort(), vendedores };
  });

export const getVendasMensaisPorProduto = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows: { produto_grupo: string | null; valor: number; vendido_em: string }[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await context.supabase
        .from("sales")
        .select("produto_grupo, valor, vendido_em")
        .eq("possible_duplicate", false)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const meses = new Set<string>();
    const produtos = new Set<string>();
    const porProduto = new Map<string, Map<string, { vendas: number; valor: number }>>();

    for (const r of rows) {
      const produto = r.produto_grupo ?? "Não classificado";
      const mes = r.vendido_em.slice(0, 7); // YYYY-MM
      produtos.add(produto);
      meses.add(mes);

      if (!porProduto.has(produto)) porProduto.set(produto, new Map());
      const porMes = porProduto.get(produto)!;
      if (!porMes.has(mes)) porMes.set(mes, { vendas: 0, valor: 0 });
      const cell = porMes.get(mes)!;
      cell.vendas += 1;
      cell.valor += Number(r.valor) || 0;
    }

    const mesesOrdenados = [...meses].sort();
    const produtosLinhas = [...produtos].sort().map((produto) => ({
      produto,
      meses: Object.fromEntries(porProduto.get(produto) ?? new Map()),
      totalVendas: [...(porProduto.get(produto)?.values() ?? [])].reduce((s, c) => s + c.vendas, 0),
      totalValor: [...(porProduto.get(produto)?.values() ?? [])].reduce((s, c) => s + c.valor, 0),
    }));

    return { meses: mesesOrdenados, produtos: produtosLinhas };
  });

export const getReembolsosPorProduto = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodoInput.parse(d ?? {}))
  .handler(async ({ context, data: { dataInicio, dataFim } }) => {
    async function carregar(tabela: "refunds" | "cancellations") {
      let query = context.supabase
        .from(tabela)
        .select("produto_grupo, valor, ocorreu_em")
        .order("ocorreu_em", { ascending: false })
        .limit(5000);
      if (dataInicio) query = query.gte("ocorreu_em", dataInicio);
      if (dataFim) query = query.lt("ocorreu_em", `${dataFim}T23:59:59.999`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    }

    const [refunds, cancellations] = await Promise.all([
      carregar("refunds"),
      carregar("cancellations"),
    ]);

    const porProduto = new Map<
      string,
      {
        produto: string;
        reembolsos: number;
        valorReembolsos: number;
        cancelamentos: number;
        valorCancelamentos: number;
      }
    >();
    function acumular(
      rows: { produto_grupo: string | null; valor: number }[],
      tipo: "reembolsos" | "cancelamentos",
    ) {
      for (const r of rows) {
        const produto = r.produto_grupo ?? "Não classificado";
        if (!porProduto.has(produto)) {
          porProduto.set(produto, {
            produto,
            reembolsos: 0,
            valorReembolsos: 0,
            cancelamentos: 0,
            valorCancelamentos: 0,
          });
        }
        const cell = porProduto.get(produto)!;
        if (tipo === "reembolsos") {
          cell.reembolsos += 1;
          cell.valorReembolsos += Number(r.valor) || 0;
        } else {
          cell.cancelamentos += 1;
          cell.valorCancelamentos += Number(r.valor) || 0;
        }
      }
    }
    acumular(refunds, "reembolsos");
    acumular(cancellations, "cancelamentos");

    return [...porProduto.values()].sort(
      (a, b) =>
        b.valorReembolsos + b.valorCancelamentos - (a.valorReembolsos + a.valorCancelamentos),
    );
  });

// ============ DUPLICATE DETECTION ============
export const listPossibleDuplicates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sales")
      .select(
        "*, profile:profiles(full_name), original:sales!sales_duplicate_of_fkey(id, produto, valor, vendido_em, fonte)",
      )
      .eq("possible_duplicate", true)
      .order("vendido_em", { ascending: false });
    if (error) throw error;
    return data;
  });

const resolveDuplicateInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["dismiss", "delete"]),
});

export const resolveDuplicate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resolveDuplicateInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: isHead } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "head",
    });
    if (!isHead) throw new Error("Apenas heads podem resolver duplicatas.");

    if (data.action === "delete") {
      const { error } = await context.supabase.from("sales").delete().eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase
        .from("sales")
        .update({ possible_duplicate: false, duplicate_of: null, duplicate_reason: null })
        .eq("id", data.id);
      if (error) throw error;
    }
    return { ok: true };
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
    const { error } = await context.supabase
      .from("goals")
      .upsert(data, { onConflict: "profile_id,mes,ano" });
    if (error) throw error;
    return { ok: true };
  });
