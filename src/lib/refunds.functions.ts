import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { z } from "zod";

function currentMonthRef(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(mesRef: string): { start: string; endExclusive: string } {
  const [y, m] = mesRef.split("-").map(Number);
  const start = new Date(y, m - 1, 1).toISOString();
  const endExclusive = new Date(y, m, 1).toISOString();
  return { start, endExclusive };
}

/**
 * KPIs de reembolsos/cancelamentos/chargebacks do mês atual + churn.
 * Lê da tabela `refunds` (campo `tipo` distingue REEMBOLSO/CANCELAMENTO/CHARGEBACK).
 */
export const getRefundsKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const mesRef = currentMonthRef();
    const { start, endExclusive } = monthRange(mesRef);

    const [refundsRes, salesRes] = await Promise.all([
      fetchAllRows<{ valor: number; tipo: string | null; mes_referencia: string | null; data_evento: string | null; ocorreu_em: string | null }>(
        ({ from, to }) =>
          supabase
            .from("refunds")
            .select("valor, tipo, mes_referencia, data_evento, ocorreu_em")
            .range(from, to) as any,
      ),
      fetchAllRows<{ valor: number; comprador_email: string | null; vendido_em: string }>(
        ({ from, to }) =>
          supabase
            .from("sales")
            .select("valor, comprador_email, vendido_em")
            .eq("possible_duplicate", false)
            .gte("vendido_em", start)
            .lt("vendido_em", endExclusive)
            .range(from, to) as any,
      ),
    ]);

    // Filtra refunds do mês atual: usa mes_referencia quando existir; senão usa data_evento/ocorreu_em.
    const refundsMes = refundsRes.filter((r) => {
      if (r.mes_referencia) return r.mes_referencia === mesRef;
      const ts = r.data_evento ?? r.ocorreu_em;
      if (!ts) return false;
      const d = new Date(ts);
      return d >= new Date(start) && d < new Date(endExclusive);
    });

    const reembolsos = refundsMes.filter((r) => r.tipo === "REEMBOLSO");
    const cancelamentos = refundsMes.filter((r) => r.tipo === "CANCELAMENTO");
    const chargebacks = refundsMes.filter((r) => r.tipo === "CHARGEBACK");

    const reembolsoValor = reembolsos.reduce((s, r) => s + Number(r.valor ?? 0), 0);
    const totalVendasMes = salesRes.reduce((s, r) => s + Number(r.valor ?? 0), 0);
    const percentDoBruto = totalVendasMes > 0 ? (reembolsoValor / totalVendasMes) * 100 : 0;

    // Clientes ativos = emails distintos vendidos no mês.
    const emails = new Set<string>();
    for (const s of salesRes) {
      if (s.comprador_email) emails.add(s.comprador_email.toLowerCase());
    }
    const clientesAtivos = emails.size;
    const churnRate = clientesAtivos > 0 ? (cancelamentos.length / clientesAtivos) * 100 : 0;

    return {
      mesRef,
      reembolsoValor,
      reembolsoCount: reembolsos.length,
      cancelamentoCount: cancelamentos.length,
      chargebackCount: chargebacks.length,
      clientesAtivos,
      churnRate,
      percentDoBruto,
      totalVendasMes,
    };
  });

/** Lista detalhada de refunds para a tela do CRM, filtrada por mês de referência. */
export const listRefundsByMonth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mesReferencia: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { start, endExclusive } = monthRange(data.mesReferencia);

    const rows = await fetchAllRows<{
      id: string;
      hotmart_transaction: string | null;
      email: string | null;
      produto_nome: string | null;
      produto: string | null;
      produto_grupo: string | null;
      valor: number;
      moeda: string | null;
      tipo: string | null;
      data_evento: string | null;
      ocorreu_em: string | null;
      mes_referencia: string | null;
    }>(({ from, to }) =>
      supabase
        .from("refunds")
        .select(
          "id, hotmart_transaction, email, produto_nome, produto, produto_grupo, valor, moeda, tipo, data_evento, ocorreu_em, mes_referencia",
        )
        .range(from, to) as any,
    );

    const filtered = rows.filter((r) => {
      if (r.mes_referencia) return r.mes_referencia === data.mesReferencia;
      const ts = r.data_evento ?? r.ocorreu_em;
      if (!ts) return false;
      const d = new Date(ts);
      return d >= new Date(start) && d < new Date(endExclusive);
    });

    const items = filtered
      .map((r) => ({
        id: r.id,
        data: r.data_evento ?? r.ocorreu_em ?? null,
        tipo: r.tipo ?? "—",
        produto: r.produto_nome ?? r.produto ?? r.produto_grupo ?? "—",
        valor: Number(r.valor ?? 0),
        moeda: r.moeda ?? "EUR",
        email: r.email ?? "—",
        transacao: r.hotmart_transaction ?? "—",
      }))
      .sort((a, b) => {
        const ad = a.data ? new Date(a.data).getTime() : 0;
        const bd = b.data ? new Date(b.data).getTime() : 0;
        return bd - ad;
      });

    const reembolsos = items.filter((i) => i.tipo === "REEMBOLSO");
    const cancelamentos = items.filter((i) => i.tipo === "CANCELAMENTO");
    const chargebacks = items.filter((i) => i.tipo === "CHARGEBACK");

    // Faturamento bruto do mês para calcular % do faturamento.
    const salesRes = await fetchAllRows<{ valor: number }>(({ from, to }) =>
      supabase
        .from("sales")
        .select("valor")
        .eq("possible_duplicate", false)
        .gte("vendido_em", start)
        .lt("vendido_em", endExclusive)
        .range(from, to) as any,
    );
    const totalVendasMes = salesRes.reduce((s, r) => s + Number(r.valor ?? 0), 0);
    const totalReembolsado = reembolsos.reduce((s, r) => s + r.valor, 0);
    const percentDoBruto = totalVendasMes > 0 ? (totalReembolsado / totalVendasMes) * 100 : 0;

    return {
      items,
      totals: {
        totalReembolsado,
        reembolsoCount: reembolsos.length,
        cancelamentoCount: cancelamentos.length,
        chargebackCount: chargebacks.length,
        totalVendasMes,
        percentDoBruto,
      },
    };
  });
