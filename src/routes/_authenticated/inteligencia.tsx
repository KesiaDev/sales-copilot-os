import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateIntelligence, listInsights } from "@/lib/ai.functions";
import { Sparkles, AlertTriangle, AlertCircle, Award } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inteligencia")({ component: IntelPage });

const iconFor = (p: string) => p === "alta" ? AlertCircle : p === "media" ? AlertTriangle : Award;
const styleFor = (p: string) =>
  p === "alta" ? "bg-destructive/10 text-destructive border-destructive/30" :
  p === "media" ? "bg-warning/10 text-warning-foreground border-warning/40" :
  "bg-success/10 text-success-foreground border-success/40";
const labelFor = (p: string) => p === "alta" ? "Alta prioridade" : p === "media" ? "Média prioridade" : "Reconhecimento";

function IntelPage() {
  const qc = useQueryClient();
  const { data: insights } = useQuery({ queryKey: ["insights"], queryFn: () => listInsights() });
  const m = useMutation({
    mutationFn: () => generateIntelligence({}),
    onSuccess: () => { toast.success("Prioridades atualizadas pela IA"); qc.invalidateQueries({ queryKey: ["insights"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const today = new Date().toISOString().slice(0, 10);
  const todays = (insights ?? []).filter((i: any) => i.data === today);

  return (
    <>
      <Topbar title="Inteligência de Gestão" subtitle="Prioridades para amanhã, geradas pela IA" />
      <main className="space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Análise automática</CardTitle>
                <CardDescription>A IA analisa vendas, fechamentos e conversões dos últimos 30 dias</CardDescription>
              </div>
              <Button onClick={() => m.mutate()} disabled={m.isPending}>
                <Sparkles className="mr-2 h-4 w-4" />{m.isPending ? "Analisando..." : "Gerar prioridades"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-3">
          {todays.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma prioridade gerada ainda hoje. Clique em "Gerar prioridades".</p>}
          {todays.map((i: any) => {
            const Icon = iconFor(i.prioridade);
            return (
              <Card key={i.id} className={`border ${styleFor(i.prioridade)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{labelFor(i.prioridade)}</Badge>
                        {i.profile?.full_name && <Badge variant="secondary">{i.profile.full_name}</Badge>}
                      </div>
                      <h3 className="text-sm font-semibold">{i.titulo}</h3>
                      <p className="text-sm text-muted-foreground">{i.descricao}</p>
                      {i.acao_sugerida && <p className="mt-2 text-xs"><span className="font-semibold">Ação sugerida: </span>{i.acao_sugerida}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
