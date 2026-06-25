import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { z } from "zod";

const periodoInput = z.object({
  dataInicio: z.string(),
  dataFim: z.string(),
});

// Resultados de um periodo qualquer escolhido na tela (dia/semana/mes/customizado),
// para apresentar numeros oficiais (sem duplicata) de uma janela especifica — ex:
// "01/06/2026 a 24/06/2026" — sem depender dos cartoes fixos de hoje/mes atual.
export const getResultadosPeriodo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodoInput.parse(d))
  .handler(async ({ context, data: { dataInicio, dataFim } }) => {
    const { supabase } = context;
    const fimExclusivo = `${dataFim}T23:59:59.999`;

    const [sales, refunds, cancellations] = await Promise.all([
      fetchAllRows<{
        valor: number;
        produto_grupo: string | null;
        profile_id: string | null;
        profiles: { full_name: string } | null;
      }>(
        ({ from, to }) =>
          supabase
            .from("sales")
            .select("valor, produto_grupo, profile_id, profiles(full_name)")
            .eq("possible_duplicate", false)
            .gte("vendido_em", dataInicio)
            .lte("vendido_em", fimExclusivo)
            .range(from, to) as any,
      ),
      fetchAllRows<{ valor: number }>(({ from, to }) =>
        supabase
          .from("refunds")
          .select("valor")
          .gte("ocorreu_em", dataInicio)
          .lte("ocorreu_em", fimExclusivo)
          .range(from, to),
      ),
      fetchAllRows<{ valor: number }>(({ from, to }) =>
        supabase
          .from("cancellations")
          .select("valor")
          .gte("ocorreu_em", dataInicio)
          .lte("ocorreu_em", fimExclusivo)
          .range(from, to),
      ),
    ]);

    const receita = sales.reduce((s, r) => s + Number(r.valor), 0);
    const reembolsos = refunds.reduce((s, r) => s + Number(r.valor), 0);
    const cancelamentosTotal = cancellations.reduce((s, r) => s + Number(r.valor), 0);

    const porVendedorMap = new Map<string, { nome: string; receita: number; vendas: number }>();
    const porProdutoMap = new Map<string, { produto: string; receita: number; vendas: number }>();
    for (const s of sales) {
      const nome = s.profiles?.full_name ?? "Sem vendedor";
      if (!porVendedorMap.has(nome)) porVendedorMap.set(nome, { nome, receita: 0, vendas: 0 });
      const v = porVendedorMap.get(nome)!;
      v.receita += Number(s.valor);
      v.vendas += 1;

      const produto = s.produto_grupo ?? "Não classificado";
      if (!porProdutoMap.has(produto))
        porProdutoMap.set(produto, { produto, receita: 0, vendas: 0 });
      const p = porProdutoMap.get(produto)!;
      p.receita += Number(s.valor);
      p.vendas += 1;
    }

    return {
      receita,
      deals: sales.length,
      ticketMedio: sales.length ? receita / sales.length : 0,
      reembolsos,
      cancelamentos: cancelamentosTotal,
      porVendedor: [...porVendedorMap.values()].sort((a, b) => b.receita - a.receita),
      porProduto: [...porProdutoMap.values()].sort((a, b) => b.receita - a.receita),
    };
  });

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startYesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
    ).toISOString();
    const start6mo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
    const endNow = now.toISOString();


    // Vendas marcadas como possivel duplicata (mesma venda gravada duas vezes por

    // fontes diferentes — Clint + Hotmart) ainda nao foram confirmadas como reais,
    // entao nao contam nos totais oficiais ate alguem revisar no CRM.
    const salesQuery =
      (select: string, gte: [string, string], lt?: [string, string]) =>
      ({
        from,
        to,
      }: {
        from: number;
        to: number;
      }): PromiseLike<{ data: any[] | null; error: unknown }> => {
        let q = supabase
          .from("sales")
          .select(select)
          .eq("possible_duplicate", false)
          .gte(gte[0], gte[1])
          .range(from, to);
        if (lt) q = q.lt(lt[0], lt[1]);
        return q as unknown as PromiseLike<{ data: any[] | null; error: unknown }>;
      };

    const currentMesAno = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [
      salesMonth,
      salesMonthRanked,
      salesToday,
      salesYest,
      goalsRes,
      refunds,
      cancellations,
      profilesRes,
      leads,
      sales6mo,
      goals6mo,
      metaMensalRes,
      metasMensaisAllRes,
    ] = await Promise.all([
      fetchAllRows<{
        id: string;
        valor: number;
        profile_id: string | null;
        vendido_em: string;
        produto: string;
      }>(salesQuery("id, valor, profile_id, vendido_em, produto", ["vendido_em", startMonth])),
      fetchAllRows<{
        id: string;
        valor: number;
        profile_id: string | null;
        vendido_em: string;
        produto: string;
      }>(
        ({ from, to }) =>
          supabase
            .from("sales")
            .select("id, valor, profile_id, vendido_em, produto")
            .eq("possible_duplicate", false)
            .gte("vendido_em", startMonth)
            .lte("vendido_em", endNow)
            .in("fonte", ["clint", "hotmart"])
            .range(from, to) as any,
      ),
      fetchAllRows<{ valor: number }>(salesQuery("valor", ["vendido_em", startToday])),

      fetchAllRows<{ valor: number }>(
        salesQuery("valor", ["vendido_em", startYesterday], ["vendido_em", startToday]),
      ),
      supabase
        .from("goals")
        .select("valor_meta")
        .eq("mes", now.getMonth() + 1)
        .eq("ano", now.getFullYear()),
      fetchAllRows<{ valor: number }>(({ from, to }) =>
        supabase.from("refunds").select("valor").gte("ocorreu_em", startMonth).range(from, to),
      ),
      fetchAllRows<{ valor: number }>(({ from, to }) =>
        supabase
          .from("cancellations")
          .select("valor")
          .gte("ocorreu_em", startMonth)
          .range(from, to),
      ),
      supabase.from("profiles").select("id, full_name, ativo").eq("ativo", true),
      supabase.rpc("dashboard_leads_summary", { p_start: startMonth }),

      fetchAllRows<{ valor: number; profile_id: string | null; vendido_em: string }>(
        salesQuery("valor, profile_id, vendido_em", ["vendido_em", start6mo]),
      ),
      supabase.from("goals").select("valor_meta, mes, ano"),
      supabase
        .from("metas_mensais")
        .select("meta_geral_eur")
        .eq("mes_ano", currentMesAno)
        .maybeSingle(),
      supabase.from("metas_mensais").select("mes_ano, meta_geral_eur"),
    ]);


    const sum = (arr: any[] | null, k = "valor") =>
      (arr ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);
    const receitaMes = sum(salesMonth);
    const receitaHoje = sum(salesToday);
    const receitaOntem = sum(salesYest);
    const metaFromMetasMensais = metaMensalRes.data?.meta_geral_eur;
    const meta =
      metaFromMetasMensais != null
        ? Number(metaFromMetasMensais)
        : sum(goalsRes.data ?? [], "valor_meta") || 250000;
    const metasMensaisMap = new Map<string, number>();
    (metasMensaisAllRes.data ?? []).forEach((m: any) =>
      metasMensaisMap.set(m.mes_ano, Number(m.meta_geral_eur ?? 0)),
    );

    const reembolsos = sum(refunds);
    const cancelamentos = sum(cancellations);
    const ticketMedio = salesMonth.length ? receitaMes / salesMonth.length : 0;

    type LeadAgg = { profile_id: string | null; status: string; c: number };
    const leadsAgg: LeadAgg[] = ((leads as any)?.data ?? []) as LeadAgg[];
    const totalLeads = leadsAgg.reduce((a, r) => a + Number(r.c), 0);
    const ganhos = leadsAgg
      .filter((l) => l.status === "ganho")
      .reduce((a, r) => a + Number(r.c), 0);
    const conversao = totalLeads ? (ganhos / totalLeads) * 100 : 0;

    // por vendedor (com ticket médio + meta individual se houver)
    const profiles = profilesRes.data ?? [];
    const porVendedor = profiles
      .map((p: any) => {
        const vendas = salesMonthRanked.filter((s) => s.profile_id === p.id);
        const receita = sum(vendas);
        const leadsV = leadsAgg.filter((l) => l.profile_id === p.id);
        const totalLeadsV = leadsV.reduce((a, r) => a + Number(r.c), 0);
        const ganhosV = leadsV
          .filter((l) => l.status === "ganho")
          .reduce((a, r) => a + Number(r.c), 0);
        return {
          id: p.id,
          nome: p.full_name,
          receita,
          vendas: vendas.length,
          ticketMedio: vendas.length ? receita / vendas.length : 0,
          conversao: totalLeadsV ? (ganhosV / totalLeadsV) * 100 : 0,
        };
      })
      .sort((a, b) => b.receita - a.receita);


    // por produto
    const prodMap = new Map<string, number>();
    salesMonth.forEach((s) =>
      prodMap.set(s.produto, (prodMap.get(s.produto) ?? 0) + Number(s.valor)),
    );
    const porProduto = Array.from(prodMap, ([produto, receita]) => ({ produto, receita })).sort(
      (a, b) => b.receita - a.receita,
    );

    // evolução diária últimos 30d
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    salesMonth.forEach((s) => {
      const k = new Date(s.vendido_em).toISOString().slice(0, 10);
      if (k in days) days[k] += Number(s.valor);
    });
    const evolucao = Object.entries(days).map(([data, valor]) => ({ data, valor }));

    // dias úteis restantes no mês (seg-sex) incluindo hoje
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    let diasUteisRestantes = 0;
    for (let d = now.getDate(); d <= dim; d++) {
      const wd = new Date(now.getFullYear(), now.getMonth(), d).getDay();
      if (wd !== 0 && wd !== 6) diasUteisRestantes++;
    }
    const restante = Math.max(0, meta - receitaMes);
    const ritmoNecessario = diasUteisRestantes > 0 ? restante / diasUteisRestantes : 0;

    // histórico mensal últimos 6 meses
    const goals6moData = goals6mo.data ?? [];
    const monthly: Array<{
      key: string;
      mes: string;
      ano: number;
      mesNum: number;
      receita: number;
      deals: number;
      ticketMedio: number;
      meta: number;
      melhorVendedor: string;
      topVendedorReceita: number;
    }> = [];
    const monthNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mNum = d.getMonth() + 1;
      const y = d.getFullYear();
      const key = `${y}-${String(mNum).padStart(2, "0")}`;
      const monthSales = sales6mo.filter((s) => {
        const sd = new Date(s.vendido_em);
        return sd.getMonth() === d.getMonth() && sd.getFullYear() === y;
      });
      const receita = sum(monthSales);
      const deals = monthSales.length;
      const goal = goals6moData.filter((g: any) => g.mes === mNum && g.ano === y);
      const metaMes = metasMensaisMap.get(key) ?? sum(goal, "valor_meta");

      // melhor vendedor
      const byV = new Map<string, number>();
      monthSales.forEach((s) =>
        byV.set(s.profile_id ?? "", (byV.get(s.profile_id ?? "") ?? 0) + Number(s.valor)),
      );
      let topId = "",
        topVal = 0;
      byV.forEach((v, k) => {
        if (v > topVal) {
          topVal = v;
          topId = k;
        }
      });
      const topProfile = profiles.find((p: any) => p.id === topId);
      monthly.push({
        key,
        mes: monthNames[d.getMonth()],
        ano: y,
        mesNum: mNum,
        receita,
        deals,
        ticketMedio: deals ? receita / deals : 0,
        meta: metaMes,
        melhorVendedor: topProfile?.full_name ?? "—",
        topVendedorReceita: topVal,
      });
    }

    return {
      kpis: {
        receitaHoje,
        receitaOntem,
        receitaMes,
        meta,
        percentMeta: meta ? (receitaMes / meta) * 100 : 0,
        ticketMedio,
        conversao,
        reembolsos,
        cancelamentos,
        totalDeals: salesMonth.length,
        diasUteisRestantes,
        ritmoNecessario,
        restante,
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
      },
      porVendedor,
      porProduto,
      evolucao,
      monthly,
      topDia: porVendedor[0] ?? null,
    };
  });
