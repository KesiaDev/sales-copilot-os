import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateDailySummary, getLatestSummary } from "@/lib/ai.functions";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Copy, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/daily")({ component: DailyPage });

function DailyPage() {
  const qc = useQueryClient();
  const { data: summary } = useQuery({ queryKey: ["summary"], queryFn: () => getLatestSummary() });
  const m = useMutation({
    mutationFn: () => generateDailySummary({}),
    onSuccess: () => { toast.success("Daily gerada"); qc.invalidateQueries({ queryKey: ["summary"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function copyWhats() {
    if (!summary) return;
    const txt = `📊 *Daily LLMídia — ${summary.data}*

💰 Receita ontem: ${formatCurrency(summary.receita)}
🎯 Meta diária: ${formatCurrency(summary.meta_diaria)}
📉 Gap: ${formatCurrency(summary.gap)}
🔄 Conversão: ${formatPercent(summary.conversao)}
🏆 Melhor vendedor: ${summary.melhor_vendedor}

⚠️ Atenção: ${summary.ponto_atencao}
✅ Plano: ${summary.plano_acao}`;
    navigator.clipboard.writeText(txt);
    toast.success("Copiado para WhatsApp");
  }

  function printPdf() { window.print(); }

  return (
    <>
      <Topbar title="Daily Executiva" subtitle="Resumo automático para liderança" />
      <main className="space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Gerar daily de hoje</CardTitle>
                <CardDescription>Consolida resultados de ontem com plano de ação por IA</CardDescription>
              </div>
              <Button onClick={() => m.mutate()} disabled={m.isPending}>
                <Sparkles className="mr-2 h-4 w-4" />{m.isPending ? "Gerando..." : "Gerar daily"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {summary ? (
          <Card id="daily-print" className="border-border/60">
            <CardHeader>
              <CardTitle>Daily — {summary.data}</CardTitle>
              <CardDescription>Resumo da operação comercial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Receita Ontem" value={formatCurrency(summary.receita)} />
                <Stat label="Meta Diária" value={formatCurrency(summary.meta_diaria)} />
                <Stat label="Gap" value={formatCurrency(summary.gap)} accent={summary.gap > 0 ? "text-destructive" : "text-success"} />
                <Stat label="Conversão" value={formatPercent(summary.conversao)} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <InfoBox label="Melhor vendedor" value={summary.melhor_vendedor} />
                <InfoBox label="Ponto de atenção" value={summary.ponto_atencao} />
                <InfoBox label="Plano de ação" value={summary.plano_acao} />
              </div>
              {summary.resumo_ia && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Sparkles className="h-3.5 w-3.5" />Resumo IA
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{summary.resumo_ia}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 print:hidden">
                <Button variant="outline" onClick={printPdf}><FileText className="mr-2 h-4 w-4" />Gerar PDF</Button>
                <Button variant="outline" onClick={copyWhats}><Copy className="mr-2 h-4 w-4" />Copiar para WhatsApp</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma daily gerada ainda. Clique em "Gerar daily".</p>
        )}
      </main>
    </>
  );
}

function Stat({ label, value, accent }: any) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
function InfoBox({ label, value }: any) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value ?? "—"}</div>
    </div>
  );
}
