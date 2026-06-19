import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics } from "@/lib/dashboard.functions";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/previsao")({ component: PrevisaoPage });

function PrevisaoPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardMetrics() });
  if (!data) return <Topbar title="Previsão de Fechamento" />;

  const now = new Date();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const day = now.getDate();
  const ritmoDiario = data.kpis.receitaMes / day;
  const projecao = ritmoDiario * dim;
  const meta = data.kpis.meta;
  const gap = meta - projecao;
  const probabilidade = meta > 0 ? Math.min(100, (projecao / meta) * 100) : 0;

  const cor = probabilidade >= 95 ? "success" : probabilidade >= 70 ? "warning" : "destructive";
  const label = probabilidade >= 95 ? "Alta probabilidade de bater a meta" : probabilidade >= 70 ? "Atenção: ritmo abaixo do ideal" : "Risco crítico de não bater";

  return (
    <>
      <Topbar title="Previsão de Fechamento" subtitle="Projeção mensal com base no ritmo atual" />
      <main className="space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Indicador de fechamento mensal</CardTitle>
            <CardDescription>{label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Receita atual" value={formatCurrency(data.kpis.receitaMes)} />
              <Stat label="Projeção" value={formatCurrency(projecao)} />
              <Stat label="Meta" value={formatCurrency(meta)} />
              <Stat label="Gap projetado" value={formatCurrency(gap)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Probabilidade</span>
                <Badge variant={cor === "success" ? "default" : cor === "warning" ? "secondary" : "destructive"}>{formatPercent(probabilidade)}</Badge>
              </div>
              <Progress value={probabilidade} className="h-3" />
            </div>
            <div className="flex gap-2">
              <Light color="success" active={probabilidade >= 95} label="Verde" />
              <Light color="warning" active={probabilidade >= 70 && probabilidade < 95} label="Amarelo" />
              <Light color="destructive" active={probabilidade < 70} label="Vermelho" />
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Stat({ label, value }: any) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
function Light({ color, active, label }: any) {
  const cls = color === "success" ? "bg-success" : color === "warning" ? "bg-warning" : "bg-destructive";
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 ${active ? "ring-2 ring-primary/40" : "opacity-50"}`}>
      <div className={`h-3 w-3 rounded-full ${cls}`} />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
