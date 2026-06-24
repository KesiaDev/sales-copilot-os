import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDashboardMetrics, getResultadosPeriodo } from "@/lib/dashboard.functions";
import { formatPercent, shortDate, todayISO } from "@/lib/format";
import { useFormatCurrency } from "@/components/currency-provider";
import { CalendarRange } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  Receipt,
  RefreshCw,
  XCircle,
  Percent,
  Crown,
  AlertTriangle,
  PartyPopper,
  Award,
} from "lucide-react";

const dashboardQuery = () =>
  queryOptions({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardMetrics(),
  });

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7; // segunda = 0
  r.setDate(r.getDate() - dow);
  return r;
}

function ResultadosPeriodo() {
  const formatCurrency = useFormatCurrency();
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(
    isoDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
  );
  const [dataFim, setDataFim] = useState(todayISO());
  const [presetAtivo, setPresetAtivo] = useState<"hoje" | "semana" | "mes" | "ano" | "custom">(
    "mes",
  );

  const periodo = useMemo(() => ({ dataInicio, dataFim }), [dataInicio, dataFim]);
  const { data, isFetching } = useQuery({
    queryKey: ["resultados-periodo", periodo],
    queryFn: () => getResultadosPeriodo({ data: periodo }),
  });

  function aplicarPreset(preset: "hoje" | "semana" | "mes" | "ano") {
    setPresetAtivo(preset);
    const hoje = new Date();
    if (preset === "hoje") setDataInicio(isoDate(hoje));
    if (preset === "semana") setDataInicio(isoDate(startOfWeek(hoje)));
    if (preset === "mes") setDataInicio(isoDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
    if (preset === "ano") setDataInicio(isoDate(new Date(hoje.getFullYear(), 0, 1)));
    setDataFim(todayISO());
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Resultados do período</CardTitle>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {(["hoje", "semana", "mes", "ano"] as const).map((p) => (
              <Button
                key={p}
                variant={presetAtivo === p ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => aplicarPreset(p)}
              >
                {p === "hoje"
                  ? "Hoje"
                  : p === "semana"
                    ? "Esta semana"
                    : p === "mes"
                      ? "Este mês"
                      : "Este ano"}
              </Button>
            ))}
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setPresetAtivo("custom");
                  setDataInicio(e.target.value);
                }}
                className="h-8 w-[150px]"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setPresetAtivo("custom");
                  setDataFim(e.target.value);
                }}
                className="h-8 w-[150px]"
              />
            </div>
          </div>
        </div>
        <CardDescription>
          {shortDate(dataInicio)} a {shortDate(dataFim)}
          {isFetching ? " — atualizando..." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-lg border border-border/60 bg-card/50 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Receita</div>
            <div className="mt-1 text-xl font-bold tabular-nums">
              {formatCurrency(data?.receita ?? 0)}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/50 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Deals</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{data?.deals ?? 0}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/50 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Ticket médio
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums">
              {formatCurrency(data?.ticketMedio ?? 0)}
            </div>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Reembolsos</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-destructive">
              {formatCurrency(data?.reembolsos ?? 0)}
            </div>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Cancelamentos
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums text-destructive">
              {formatCurrency(data?.cancelamentos ?? 0)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Por vendedor
            </p>
            <div className="space-y-1">
              {(data?.porVendedor ?? []).map((v) => (
                <div key={v.nome} className="flex items-center justify-between text-sm">
                  <span>{v.nome}</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(v.receita)}{" "}
                    <span className="text-xs text-muted-foreground">({v.vendas})</span>
                  </span>
                </div>
              ))}
              {!data?.porVendedor?.length && (
                <p className="text-xs text-muted-foreground">Sem vendas no período.</p>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Por produto
            </p>
            <div className="space-y-1">
              {(data?.porProduto ?? []).map((p) => (
                <div key={p.produto} className="flex items-center justify-between text-sm">
                  <span>{p.produto}</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(p.receita)}{" "}
                    <span className="text-xs text-muted-foreground">({p.vendas})</span>
                  </span>
                </div>
              ))}
              {!data?.porProduto?.length && (
                <p className="text-xs text-muted-foreground">Sem vendas no período.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ icon: Icon, label, value, hint, hintClass, accent }: any) {
  return (
    <Card className="relative overflow-hidden border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-medium uppercase tracking-wider">
            {label}
          </CardDescription>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ?? "bg-primary/10 text-primary"}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {hint && <p className={`mt-1 text-xs ${hintClass ?? "text-muted-foreground"}`}>{hint}</p>}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { data } = useQuery(dashboardQuery());
  const formatCurrency = useFormatCurrency();
  if (!data)
    return (
      <>
        <Topbar title="Dashboard Executivo" subtitle="Carregando..." showCurrencyToggle />
        <div className="p-6 text-sm text-muted-foreground">Carregando indicadores...</div>
      </>
    );
  const k = data.kpis;
  const delta = k.receitaOntem ? ((k.receitaHoje - k.receitaOntem) / k.receitaOntem) * 100 : 0;
  const now = new Date();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const segundaMetade = now.getDate() > dim / 2;

  // Banner contextual
  let banner: { tone: "destructive" | "success" | "gold"; icon: any; text: string } | null = null;
  if (k.percentMeta >= 100) {
    banner = {
      tone: "gold",
      icon: Award,
      text: `🏆 Meta batida! Parabéns ao time! (${formatCurrency(k.receitaMes - k.meta)} acima)`,
    };
  } else if (k.percentMeta > 80) {
    banner = {
      tone: "success",
      icon: PartyPopper,
      text: `🎉 Quase lá! Faltam apenas ${formatCurrency(k.restante)} para bater a meta`,
    };
  } else if (k.percentMeta < 30 && segundaMetade) {
    banner = {
      tone: "destructive",
      icon: AlertTriangle,
      text: `⚠ Atenção: ritmo abaixo da meta — necessário ${formatCurrency(k.ritmoNecessario)}/dia útil`,
    };
  }

  // Card meta dia
  const noRitmo = k.receitaHoje >= k.ritmoNecessario;
  const gapMeta = k.meta - k.receitaMes;
  const metaHint =
    gapMeta > 0
      ? { text: `Faltam ${formatCurrency(gapMeta)}`, cls: "text-destructive" }
      : { text: `Superou em ${formatCurrency(-gapMeta)}`, cls: "text-success" };

  // Hint receita hoje
  let receitaHojeHint = `vs ontem ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
  let receitaHojeHintClass: string | undefined;
  if (k.receitaHoje === 0 && k.isWeekend) {
    receitaHojeHint = "Sem vendas (fim de semana)";
    receitaHojeHintClass = "text-muted-foreground italic";
  }

  return (
    <>
      <Topbar
        title="Dashboard Executivo"
        subtitle="Visão completa do dia, semana e mês"
        showCurrencyToggle
      />
      <main className="space-y-6 p-4 md:p-6">
        {banner && (
          <div
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
              banner.tone === "destructive"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : banner.tone === "success"
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-accent/50 bg-accent/15 text-accent"
            }`}
          >
            <banner.icon className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{banner.text}</p>
          </div>
        )}

        <ResultadosPeriodo />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            icon={Receipt}
            label="Receita Hoje"
            value={formatCurrency(k.receitaHoje)}
            hint={receitaHojeHint}
            hintClass={receitaHojeHintClass}
            accent="bg-primary/15 text-primary"
          />
          <Kpi
            icon={Receipt}
            label="Receita Ontem"
            value={formatCurrency(k.receitaOntem)}
            accent="bg-muted text-muted-foreground"
          />
          <Kpi
            icon={Target}
            label="Receita do Mês"
            value={formatCurrency(k.receitaMes)}
            hint={`Meta ${formatCurrency(k.meta)}`}
            accent="bg-info/15 text-info"
          />
          <Kpi
            icon={Trophy}
            label="% da Meta"
            value={formatPercent(k.percentMeta)}
            hint={metaHint.text}
            hintClass={metaHint.cls}
            accent="bg-accent/20 text-accent"
          />
          <Kpi
            icon={Receipt}
            label="Ticket Médio"
            value={formatCurrency(k.ticketMedio)}
            hint={`${k.totalDeals} deals este mês`}
          />
          <Kpi icon={Percent} label="Conversão" value={formatPercent(k.conversao)} />
          <Kpi
            icon={RefreshCw}
            label="Reembolsos"
            value={formatCurrency(k.reembolsos)}
            accent="bg-destructive/15 text-destructive"
          />
          <Kpi
            icon={XCircle}
            label="Cancelamentos"
            value={formatCurrency(k.cancelamentos)}
            accent="bg-destructive/15 text-destructive"
          />
        </div>

        {/* Meta do dia */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Meta do Dia</CardTitle>
                <CardDescription>
                  Para bater {formatCurrency(k.meta)} até fim do mês
                </CardDescription>
              </div>
              <Badge
                className={
                  noRitmo
                    ? "bg-success text-success-foreground"
                    : "bg-destructive text-destructive-foreground"
                }
              >
                {noRitmo ? "✓ No ritmo" : "⚠ Abaixo do ritmo"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Necessário hoje
                </div>
                <div className="mt-1 text-xl font-bold tabular-nums text-warning">
                  {formatCurrency(k.ritmoNecessario)}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Realizado hoje
                </div>
                <div className="mt-1 text-xl font-bold tabular-nums">
                  {formatCurrency(k.receitaHoje)}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Dias úteis restantes
                </div>
                <div className="mt-1 text-xl font-bold tabular-nums">{k.diasUteisRestantes}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goal Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Progresso da meta mensal</CardTitle>
                <CardDescription>
                  {formatCurrency(k.receitaMes)} de {formatCurrency(k.meta)}
                </CardDescription>
              </div>
              <Badge
                variant={
                  k.percentMeta >= 100
                    ? "default"
                    : k.percentMeta >= 70
                      ? "secondary"
                      : "destructive"
                }
              >
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
              <CardDescription>
                Linha tracejada laranja = ritmo necessário por dia útil
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.evolucao}>
                  <defs>
                    <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(258 90% 66%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(258 90% 66%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="data"
                    tickFormatter={(v) => shortDate(v)}
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                  />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: any, n: any) => [
                      formatCurrency(Number(v)),
                      n === "valor" ? "Receita" : "Ritmo necessário",
                    ]}
                    labelFormatter={(v) => shortDate(v)}
                  />
                  <ReferenceLine
                    y={k.ritmoNecessario}
                    stroke="hsl(35 95% 55%)"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    label={{
                      value: "Ritmo necessário",
                      fill: "hsl(35 95% 55%)",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="hsl(258 90% 66%)"
                    strokeWidth={2}
                    fill="url(#gradPrimary)"
                    fillOpacity={1}
                  />
                </AreaChart>
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
                  <YAxis
                    type="category"
                    dataKey="nome"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: any, _n: any, item: any) => {
                      const p = item?.payload ?? {};
                      return [
                        `${formatCurrency(Number(v))} · ${p.vendas} deals · ticket ${formatCurrency(p.ticketMedio)}`,
                        "Receita",
                      ];
                    }}
                  />
                  <Bar dataKey="receita" radius={[0, 6, 6, 0]}>
                    {data.porVendedor.map((v: any, i: number) => (
                      <Cell key={v.id} fill={i === 0 ? "hsl(45 95% 55%)" : "hsl(258 90% 66%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Histórico Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução Mensal</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: any, _n: any, item: any) => {
                      const p = item?.payload ?? {};
                      return [
                        `${formatCurrency(Number(v))} · ${p.deals} vendas · ticket ${formatCurrency(p.ticketMedio)}`,
                        p.mes,
                      ];
                    }}
                  />
                  <ReferenceLine
                    y={k.meta || 250000}
                    stroke="hsl(35 95% 55%)"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    label={{
                      value: "Meta",
                      fill: "hsl(35 95% 55%)",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Bar dataKey="receita" fill="hsl(258 90% 66%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">vs Meta</TableHead>
                  <TableHead className="text-right">vs Mês ant.</TableHead>
                  <TableHead>Melhor vendedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthly.map((m: any, i: number) => {
                  const prev = data.monthly[i - 1];
                  const variacao =
                    prev && prev.receita ? ((m.receita - prev.receita) / prev.receita) * 100 : null;
                  const pctMeta = m.meta ? (m.receita / m.meta) * 100 : 0;
                  return (
                    <TableRow key={m.key}>
                      <TableCell className="font-medium">
                        {m.mes}/{String(m.ano).slice(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(m.receita)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{m.deals}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(m.ticketMedio)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            pctMeta >= 100 ? "default" : pctMeta >= 70 ? "secondary" : "destructive"
                          }
                        >
                          {m.meta ? formatPercent(pctMeta) : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {variacao === null ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${variacao >= 0 ? "text-success" : "text-destructive"}`}
                          >
                            {variacao >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {variacao >= 0 ? "+" : ""}
                            {variacao.toFixed(1)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{m.melhorVendedor}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top vendedores do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.porVendedor.slice(0, 5).map((v: any, i: number) => {
                const metaInd =
                  k.meta && data.porVendedor.length ? k.meta / data.porVendedor.length : 0;
                const pctInd = metaInd ? (v.receita / metaInd) * 100 : 0;
                return (
                  <div
                    key={v.id}
                    title={`${v.vendas} deals · ticket médio ${formatCurrency(v.ticketMedio)}`}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${i === 0 ? "border-accent/60 bg-accent/10" : "border-border/60 bg-card/50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-accent text-accent-foreground" : i === 1 ? "bg-muted text-foreground" : i === 2 ? "bg-accent/20 text-accent" : "bg-muted/50 text-muted-foreground"}`}
                      >
                        {i === 0 ? <Crown className="h-4 w-4" /> : i + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {v.nome}
                          {i === 0 && <Badge className="bg-accent/20 text-accent">👑 #1</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {v.vendas} deals · ticket {formatCurrency(v.ticketMedio)} · conv.{" "}
                          {formatPercent(v.conversao)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-bold tabular-nums">
                        {formatCurrency(v.receita)}
                      </div>
                      {metaInd > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {formatPercent(pctInd)} da meta ind.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
