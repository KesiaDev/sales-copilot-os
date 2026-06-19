import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics } from "@/lib/dashboard.functions";
import { formatCurrency, formatNumber, formatPercent, shortDate } from "@/lib/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Trophy, Receipt, RefreshCw, XCircle, Percent } from "lucide-react";

const dashboardQuery = () => queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboardMetrics(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function Kpi({ icon: Icon, label, value, hint, accent }: any) {
  return (
    <Card className="relative overflow-hidden border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-medium uppercase tracking-wider">{label}</CardDescription>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ?? "bg-primary/10 text-primary"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { data } = useQuery(dashboardQuery());
  if (!data) return (
    <>
      <Topbar title="Dashboard Executivo" subtitle="Carregando..." />
      <div className="p-6 text-sm text-muted-foreground">Carregando indicadores...</div>
    </>
  );
  const k = data.kpis;
  const delta = k.receitaOntem ? ((k.receitaHoje - k.receitaOntem) / k.receitaOntem) * 100 : 0;

  return (
    <>
      <Topbar title="Dashboard Executivo" subtitle="Visão completa do dia, semana e mês" />
      <main className="space-y-6 p-4 md:p-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi icon={Receipt} label="Receita Hoje" value={formatCurrency(k.receitaHoje)} hint={`vs ontem ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`} accent="bg-primary/15 text-primary" />
          <Kpi icon={Receipt} label="Receita Ontem" value={formatCurrency(k.receitaOntem)} accent="bg-muted text-muted-foreground" />
          <Kpi icon={Target} label="Receita do Mês" value={formatCurrency(k.receitaMes)} hint={`Meta ${formatCurrency(k.meta)}`} accent="bg-info/15 text-info" />
          <Kpi icon={Trophy} label="% da Meta" value={formatPercent(k.percentMeta)} accent="bg-accent/20 text-accent" />
          <Kpi icon={Receipt} label="Ticket Médio" value={formatCurrency(k.ticketMedio)} />
          <Kpi icon={Percent} label="Conversão" value={formatPercent(k.conversao)} />
          <Kpi icon={RefreshCw} label="Reembolsos" value={formatCurrency(k.reembolsos)} accent="bg-destructive/15 text-destructive" />
          <Kpi icon={XCircle} label="Cancelamentos" value={formatCurrency(k.cancelamentos)} accent="bg-destructive/15 text-destructive" />
        </div>

        {/* Goal Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Progresso da meta mensal</CardTitle>
                <CardDescription>{formatCurrency(k.receitaMes)} de {formatCurrency(k.meta)}</CardDescription>
              </div>
              <Badge variant={k.percentMeta >= 100 ? "default" : k.percentMeta >= 70 ? "secondary" : "destructive"}>
                {formatPercent(k.percentMeta)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(k.percentMeta, 100)} className="h-3" />
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução diária (30d)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="data" tickFormatter={(v) => shortDate(v)} stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: any) => formatCurrency(Number(v))} labelFormatter={(v) => shortDate(v)} />
                  <Line type="monotone" dataKey="valor" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita por vendedor (mês)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.porVendedor} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis type="category" dataKey="nome" stroke="var(--color-muted-foreground)" fontSize={11} width={90} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: any) => formatCurrency(Number(v))} />
                  <Bar dataKey="receita" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top vendedores do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.porVendedor.slice(0, 5).map((v: any, i: number) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-accent/20 text-accent" : i === 1 ? "bg-muted text-foreground" : i === 2 ? "bg-accent/10 text-accent" : "bg-muted/50 text-muted-foreground"}`}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{v.nome}</div>
                      <div className="text-xs text-muted-foreground">{v.vendas} vendas · conv. {formatPercent(v.conversao)}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums">{formatCurrency(v.receita)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
