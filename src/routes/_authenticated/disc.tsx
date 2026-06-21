import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listProfiles } from "@/lib/data.functions";
import { analyzeDISC, listBehaviorProfiles } from "@/lib/ai.functions";
import { Brain, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { CoachingActions } from "@/components/coaching-actions";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/disc")({ component: DiscPage });

function DiscPage() {
  const qc = useQueryClient();
  const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: () => listProfiles() });
  const { data: behaviors } = useQuery({ queryKey: ["behaviors"], queryFn: () => listBehaviorProfiles() });

  const [profileId, setProfileId] = useState("");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");

  const m = useMutation({
    mutationFn: () => analyzeDISC({ data: { profile_id: profileId, raw_text: rawText, arquivo_nome: fileName } }),
    onSuccess: () => { toast.success("Perfil DISC analisado pela IA"); qc.invalidateQueries({ queryKey: ["behaviors"] }); setRawText(""); },
    onError: (e: any) => toast.error(e.message),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    if (f.type.startsWith("text/") || f.name.endsWith(".txt")) {
      setRawText(await f.text());
    } else {
      toast.info("Arquivo recebido. Cole o conteúdo principal do relatório no campo abaixo para análise.");
    }
  }

  return (
    <>
      <Topbar title="Perfil Comportamental DISC" subtitle="Upload de relatório + análise de liderança por IA" />
      <main className="grid gap-6 p-4 md:p-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Analisar novo perfil</CardTitle>
            </div>
            <CardDescription>Cole o conteúdo do relatório DISC (PDF/DOCX/imagem). A IA extrai D/I/S/C e gera o plano de liderança.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Colaborador</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(profiles ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arquivo (opcional)</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer"><Upload className="mr-2 h-3.5 w-3.5" />Anexar
                    <input type="file" className="hidden" accept=".pdf,.docx,.txt,image/*" onChange={onFile} />
                  </label>
                </Button>
                {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
              </div>
            </div>
            <div>
              <Label>Conteúdo do relatório</Label>
              <Textarea rows={10} value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Cole aqui o texto extraído do relatório DISC: pontuações, descrições e perfil." />
            </div>
            <Button onClick={() => m.mutate()} disabled={m.isPending || !profileId || rawText.length < 20} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />{m.isPending ? "Analisando..." : "Analisar com IA"}
            </Button>
            {(!profileId || rawText.length < 20) && (
              <p className="text-xs text-amber-600">
                {!profileId
                  ? "Selecione um colaborador para continuar."
                  : "Cole o conteúdo do relatório DISC no campo acima (mín. 20 caracteres). PDFs e imagens não são lidos automaticamente — abra o arquivo, copie o texto e cole aqui."}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {(behaviors ?? []).length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum perfil DISC analisado ainda.</CardContent></Card>}
          {(behaviors ?? []).map((b: any) => (
            <Card key={b.id} className="border-border/60">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{b.profile?.full_name}</CardTitle>
                    <CardDescription>{b.profile?.cargo}</CardDescription>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge variant="outline">D {b.dominancia ?? "—"}</Badge>
                    <Badge variant="outline">I {b.influencia ?? "—"}</Badge>
                    <Badge variant="outline">S {b.estabilidade ?? "—"}</Badge>
                    <Badge variant="outline">C {b.conformidade ?? "—"}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { axis: "Dominância", v: b.dominancia ?? 0 },
                        { axis: "Influência", v: b.influencia ?? 0 },
                        { axis: "Estabilidade", v: b.estabilidade ?? 0 },
                        { axis: "Conformidade", v: b.conformidade ?? 0 },
                      ]}>
                        <PolarGrid stroke="var(--color-border)" />
                        <PolarAngleAxis dataKey="axis" stroke="var(--color-muted-foreground)" fontSize={11} />
                        <PolarRadiusAxis stroke="var(--color-muted-foreground)" fontSize={9} angle={90} domain={[0, 100]} />
                        <Radar dataKey="v" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 text-sm">
                    {b.perfil_resumido && <p className="text-muted-foreground">{b.perfil_resumido}</p>}
                    <DiscSection title="Pontos fortes" content={b.pontos_fortes} />
                    <DiscSection title="Pontos de atenção" content={b.pontos_atencao} />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <DiscSection title="Como liderar" content={b.como_liderar} />
                  <DiscSection title="Como cobrar" content={b.como_cobrar} />
                  <DiscSection title="Como reconhecer" content={b.como_reconhecer} />
                  <DiscSection title="Conduzir feedback" content={b.como_conduzir_feedback} />
                  <DiscSection title="Gatilhos motivacionais" content={b.gatilhos_motivacionais} />
                  <DiscSection title="Gatilhos de desmotivação" content={b.gatilhos_desmotivacao} />
                </div>
                {b.profile?.id && <CoachingActions profileId={b.profile.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}

function DiscSection({ title, content }: { title: string; content?: string | null }) {
  if (!content) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <p className="whitespace-pre-wrap text-xs leading-relaxed">{content}</p>
    </div>
  );
}
