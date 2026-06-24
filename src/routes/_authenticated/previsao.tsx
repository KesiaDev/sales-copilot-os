import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics } from "@/lib/dashboard.functions";
import { formatPercent } from "@/lib/format";
import { useFormatCurrency } from "@/components/currency-provider";
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
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/previsao")({ component: PrevisaoPage });

function PrevisaoPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardMetrics() });
  const fmt = useFormatCurrency();
  if (!data) return <Topbar title="Previsão de Fechamento" />;

  const now = new Date();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const day = now.getDate();
  const diasRestantes = Math.max(1, dim - day);
  const ritmoDiario = data.kpis.receitaMes / day;
  const projecao = ritmoDiario * dim;
  const projPessimista = projecao * 0.8;
  const projOtimista = projecao * 1.2;
  const meta = data.kpis.meta;
  const gap = meta - projecao;
  const probabilidade = meta > 0 ? Math.min(100, (projecao / meta) * 100) : 0;

  const cor = probabilidade >= 95 ? "success" : probabilidade >= 70 ? "warning" : "destructive";
  const label =
    probabilidade >= 95
      ? "Alta probabilidade de bater a meta"
      : probabilidade >= 70
        ? "Atenção: ritmo abaixo do ideal"
        : "Risco crítico de não bater";

  // Per-vendedor velocidade
  const velocidades = data.porVendedor.map((v: any) => {
    const ritmo = v.receita / day;
    const projInd = ritmo * dim;
    const metaInd = meta && data.porVendedor.length ? meta / data.porVendedor.length : 0;
    const faltaInd = Math.max(0, metaInd - v.receita);
    const diasNecessarios = ritmo > 0 ? Math.ceil(faltaInd / ritmo) : null;
    return { ...v, ritmo, projecao: projInd, metaInd, diasNecessarios };
  });

  const risco = meta > 0 && projecao < meta * 0.8;
  const necessarioPorDia =
    diasRestantes > 0 ? Math.max(0, meta - data.kpis.receitaMes) / diasRestantes : 0;

  // Gauge: simple radial as percent ring
  const gaugePct = Math.min(100, Math.max(0, probabilidade));

  return (
    <>
      <Topbar
        title="Previsão de Fechamento"
        subtitle="Projeção mensal com base no ritmo atual"
        showCurrencyToggle
      />
      <main className="space-y-6 p-4 md:p-6">
        {risco && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Risco de não bater a meta</p>
              <p>
                Necessário <strong>{fmt(necessarioPorDia)}/dia</strong> nos {diasRestantes} dias
                restantes para fechar em {fmt(meta)}.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projeção de fechamento</CardTitle>
            <CardDescription>{label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid items-center gap-6 md:grid-cols-[200px_1fr]">
              {/* Gauge circular */}
              <div className="flex flex-col items-center">
                <Gauge value={gaugePct} />
                <div className="mt-2 text-xs text-muted-foreground">% projeção vs meta</div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat label="Pessimista (-20%)" value={fmt(projPessimista)} tone="destructive" />
                <Stat label="Realista" value={fmt(projecao)} tone="primary" />
                <Stat label="Otimista (+20%)" value={fmt(projOtimista)} tone="success" />
                <Stat label="Receita atual" value={fmt(data.kpis.receitaMes)} />
                <Stat label="Meta" value={fmt(meta)} />
                <Stat
                  label="Gap projetado"
                  value={fmt(gap)}
                  tone={gap > 0 ? "destructive" : "success"}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Probabilidade de bater a meta</span>
                <Badge
                  variant={
                    cor === "success" ? "default" : cor === "warning" ? "secondary" : "destructive"
                  }
                >
                  {formatPercent(probabilidade)}
                </Badge>
              </div>
              <Progress value={probabilidade} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Velocidade por vendedor</CardTitle>
            <CardDescription>Ritmo atual em €/dia e projeção individual</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Ritmo €/dia</TableHead>
                  <TableHead className="text-right">Projeção fim do mês</TableHead>
                  <TableHead className="text-right">Meta indiv.</TableHead>
                  <TableHead className="text-right">Dias p/ bater</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {velocidades.map((v: any) => {
                  const pct = v.metaInd ? (v.projecao / v.metaInd) * 100 : 0;
                  const status =
                    pct >= 100
                      ? { cls: "text-success", icon: TrendingUp, label: "No ritmo" }
                      : pct >= 80
                        ? { cls: "text-warning", icon: Minus, label: "Atenção" }
                        : { cls: "text-destructive", icon: TrendingDown, label: "Em risco" };
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(v.receita)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(v.ritmo)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(v.projecao)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(v.metaInd)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {v.diasNecessarios ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${status.cls}`}
                        >
                          <status.icon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "destructive" | "success" | "primary";
}) {
  const cls =
    tone === "destructive"
      ? "text-destructive"
      : tone === "success"
        ? "text-success"
        : tone === "primary"
          ? "text-primary"
          : "";
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color =
    value >= 95 ? "hsl(142 71% 45%)" : value >= 70 ? "hsl(35 95% 55%)" : "hsl(0 84% 60%)";
  return (
    <div className="relative h-[170px] w-[170px]">
      <svg viewBox="0 0 170 170" className="h-full w-full -rotate-90">
        <circle cx="85" cy="85" r={r} fill="none" stroke="var(--color-border)" strokeWidth="14" />
        <circle
          cx="85"
          cy="85"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold tabular-nums">{value.toFixed(0)}%</div>
      </div>
    </div>
  );
}
