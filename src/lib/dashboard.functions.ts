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

    const [salesMonthRes, salesTodayRes, salesYestRes, goalsRes, refundsRes, cancelsRes, profilesRes, leadsRes] = await Promise.all([
      supabase.from("sales").select("id, valor, profile_id, vendido_em, produto").gte("vendido_em", startMonth),
      supabase.from("sales").select("valor").gte("vendido_em", startToday),
      supabase.from("sales").select("valor").gte("vendido_em", startYesterday).lt("vendido_em", startToday),
      supabase.from("goals").select("valor_meta").eq("mes", now.getMonth() + 1).eq("ano", now.getFullYear()),
      supabase.from("refunds").select("valor").gte("ocorreu_em", startMonth),
      supabase.from("cancellations").select("valor").gte("ocorreu_em", startMonth),
      supabase.from("profiles").select("id, full_name, ativo").eq("ativo", true),
      supabase.from("leads").select("id, profile_id, status").gte("recebido_em", startMonth),
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

    // por vendedor
    const profiles = profilesRes.data ?? [];
    const porVendedor = profiles.map((p: any) => {
      const vendas = salesMonth.filter((s: any) => s.profile_id === p.id);
      const receita = sum(vendas);
      const leadsV = leads.filter((l: any) => l.profile_id === p.id);
      const ganhosV = leadsV.filter((l: any) => l.status === "ganho").length;
      return {
        id: p.id, nome: p.full_name, receita,
        vendas: vendas.length,
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

    return {
      kpis: {
        receitaHoje, receitaOntem, receitaMes, meta,
        percentMeta: meta ? (receitaMes / meta) * 100 : 0,
        ticketMedio, conversao, reembolsos, cancelamentos,
      },
      porVendedor,
      porProduto,
      evolucao,
      topDia: porVendedor[0] ?? null,
    };
  });
