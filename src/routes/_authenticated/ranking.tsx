import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDashboardMetrics } from "@/lib/dashboard.functions";
import { listDailyReports } from "@/lib/data.functions";
import { formatPercent } from "@/lib/format";
import { useFormatCurrency } from "@/components/currency-provider";
import { Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ranking")({ component: RankingPage });

function medal(i: number) {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return `#${i + 1}`;
}

function calcScore(receita: number, conversao: number, vendas: number) {
  return Math.round(receita / 100 + conversao * 5 + vendas * 10);
}

function RankRow({ rank, nome, receita, conversao, vendas }: any) {
  const fmt = useFormatCurrency();
  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 ${rank === 0 ? "bg-gradient-to-r from-accent/15 to-transparent" : "bg-card/50"}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 text-center text-2xl">{medal(rank)}</div>
        <div>
          <div className="text-sm font-semibold">{nome}</div>
          <div className="text-xs text-muted-foreground">
            {vendas} vendas · {formatPercent(conversao)} conv.
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold tabular-nums">{fmt(receita)}</div>
        <div className="text-xs text-muted-foreground">
          {calcScore(receita, conversao, vendas)} pts
        </div>
      </div>
    </div>
  );
}

function RankingPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardMetrics() });
  const { data: reports } = useQuery({ queryKey: ["reports"], queryFn: () => listDailyReports() });

  // Daily/weekly approximations using daily_reports
  const buildFromReports = (days: number) => {
    const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const filtered = (reports ?? []).filter((r: any) => r.data >= cutoff);
    const map = new Map<
      string,
      { nome: string; receita: number; vendas: number; conversao: number; leads: number }
    >();
    for (const r of filtered) {
      const k = r.profile?.full_name ?? "—";
      const cur = map.get(k) ?? { nome: k, receita: 0, vendas: 0, conversao: 0, leads: 0 };
      cur.receita += Number(r.valor_vendido);
      cur.vendas += Number(r.vendas_fechadas);
      cur.leads += Number(r.leads_atendidos);
      map.set(k, cur);
    }
    return [...map.values()]
      .map((v) => ({ ...v, conversao: v.leads ? (v.vendas / v.leads) * 100 : 0 }))
      .sort((a, b) => b.receita - a.receita);
  };

  const daily = buildFromReports(1);
  const weekly = buildFromReports(7);
  const monthly = (data?.porVendedor ?? []).map((v: any) => ({
    nome: v.nome,
    receita: v.receita,
    vendas: v.vendas,
    conversao: v.conversao,
  }));

  return (
    <>
      <Topbar title="Ranking" subtitle="Performance individual com pontuação" showCurrencyToggle />
      <main className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              <CardTitle className="text-base">Ranking de vendedores</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="monthly">
              <TabsList>
                <TabsTrigger value="daily">Diário</TabsTrigger>
                <TabsTrigger value="weekly">Semanal</TabsTrigger>
                <TabsTrigger value="monthly">Mensal</TabsTrigger>
              </TabsList>
              <TabsContent value="daily" className="mt-4 space-y-2">
                {daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem fechamentos hoje.</p>
                ) : (
                  daily.map((v, i) => <RankRow key={v.nome} rank={i} {...v} />)
                )}
              </TabsContent>
              <TabsContent value="weekly" className="mt-4 space-y-2">
                {weekly.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  weekly.map((v, i) => <RankRow key={v.nome} rank={i} {...v} />)
                )}
              </TabsContent>
              <TabsContent value="monthly" className="mt-4 space-y-2">
                {monthly.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  monthly.map((v: any, i: number) => <RankRow key={v.nome} rank={i} {...v} />)
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
