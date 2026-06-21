import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const start6mo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

    const [salesMonthRes, salesTodayRes, salesYestRes, goalsRes, refundsRes, cancelsRes, profilesRes, leadsRes, sales6moRes, goals6moRes] = await Promise.all([
      supabase.from("sales").select("id, valor, profile_id, vendido_em, produto").gte("vendido_em", startMonth),
      supabase.from("sales").select("valor").gte("vendido_em", startToday),
      supabase.from("sales").select("valor").gte("vendido_em", startYesterday).lt("vendido_em", startToday),
      supabase.from("goals").select("valor_meta").eq("mes", now.getMonth() + 1).eq("ano", now.getFullYear()),
      supabase.from("refunds").select("valor").gte("ocorreu_em", startMonth),
      supabase.from("cancellations").select("valor").gte("ocorreu_em", startMonth),
      supabase.from("profiles").select("id, full_name, ativo").eq("ativo", true),
      supabase.from("leads").select("id, profile_id, status").gte("recebido_em", startMonth),
      supabase.from("sales").select("valor, profile_id, vendido_em").gte("vendido_em", start6mo),
      supabase.from("goals").select("valor_meta, mes, ano"),
    ]);

    const sum = (arr: any[] | null, k = "valor") => (arr ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);
    const salesMonth = salesMonthRes.data ?? [];
    const receitaMes = sum(salesMonth);
    const receitaHoje = sum(salesTodayRes.data ?? []);
    const receitaOntem = sum(salesYestRes.data ?? []);
    const meta = sum(goalsRes.data ?? [], "valor_meta");
    const reembolsos = sum(refundsRes.data ?? []);
    const cancelamentos = sum(cancelsRes.data ?? []);
    const ticketMedio = salesMonth.length ? receitaMes / salesMonth.length : 0;

    const leads = leadsRes.data ?? [];
    const ganhos = leads.filter((l: any) => l.status === "ganho").length;
    const conversao = leads.length ? (ganhos / leads.length) * 100 : 0;

    // por vendedor (com ticket médio + meta individual se houver)
    const profiles = profilesRes.data ?? [];
    const porVendedor = profiles.map((p: any) => {
      const vendas = salesMonth.filter((s: any) => s.profile_id === p.id);
      const receita = sum(vendas);
      const leadsV = leads.filter((l: any) => l.profile_id === p.id);
      const ganhosV = leadsV.filter((l: any) => l.status === "ganho").length;
      return {
        id: p.id, nome: p.full_name, receita,
        vendas: vendas.length,
        ticketMedio: vendas.length ? receita / vendas.length : 0,
        conversao: leadsV.length ? (ganhosV / leadsV.length) * 100 : 0,
      };
    }).sort((a, b) => b.receita - a.receita);

    // por produto
    const prodMap = new Map<string, number>();
    salesMonth.forEach((s: any) => prodMap.set(s.produto, (prodMap.get(s.produto) ?? 0) + Number(s.valor)));
    const porProduto = Array.from(prodMap, ([produto, receita]) => ({ produto, receita })).sort((a, b) => b.receita - a.receita);

    // evolução diária últimos 30d
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    salesMonth.forEach((s: any) => {
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
    const sales6mo = sales6moRes.data ?? [];
    const goals6mo = goals6moRes.data ?? [];
    const monthly: Array<{ key: string; mes: string; ano: number; mesNum: number; receita: number; deals: number; ticketMedio: number; meta: number; melhorVendedor: string; topVendedorReceita: number }> = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mNum = d.getMonth() + 1;
      const y = d.getFullYear();
      const key = `${y}-${String(mNum).padStart(2, "0")}`;
      const monthSales = sales6mo.filter((s: any) => {
        const sd = new Date(s.vendido_em);
        return sd.getMonth() === d.getMonth() && sd.getFullYear() === y;
      });
      const receita = sum(monthSales);
      const deals = monthSales.length;
      const goal = goals6mo.filter((g: any) => g.mes === mNum && g.ano === y);
      const metaMes = sum(goal, "valor_meta");
      // melhor vendedor
      const byV = new Map<string, number>();
      monthSales.forEach((s: any) => byV.set(s.profile_id, (byV.get(s.profile_id) ?? 0) + Number(s.valor)));
      let topId = "", topVal = 0;
      byV.forEach((v, k) => { if (v > topVal) { topVal = v; topId = k; } });
      const topProfile = profiles.find((p: any) => p.id === topId);
      monthly.push({
        key, mes: monthNames[d.getMonth()], ano: y, mesNum: mNum,
        receita, deals, ticketMedio: deals ? receita / deals : 0,
        meta: metaMes, melhorVendedor: topProfile?.full_name ?? "—",
        topVendedorReceita: topVal,
      });
    }

    return {
      kpis: {
        receitaHoje, receitaOntem, receitaMes, meta,
        percentMeta: meta ? (receitaMes / meta) * 100 : 0,
        ticketMedio, conversao, reembolsos, cancelamentos,
        totalDeals: salesMonth.length,
        diasUteisRestantes, ritmoNecessario, restante,
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
      },
      porVendedor,
      porProduto,
      evolucao,
      monthly,
      topDia: porVendedor[0] ?? null,
    };
  });
