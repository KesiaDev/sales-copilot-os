import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { listObjections, addObjection } from "@/lib/data.functions";
import { suggestObjectionResponse } from "@/lib/ai.functions";
import { MessageSquareWarning, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/objecoes")({ component: ObjPage });

function ObjPage() {
  const qc = useQueryClient();
  const { data: list } = useQuery({ queryKey: ["objections"], queryFn: () => listObjections() });
  const [form, setForm] = useState({ texto: "", produto: "", pais: "", resposta_sugerida: "" });

  const m = useMutation({
    mutationFn: () => addObjection({ data: form as any }),
    onSuccess: () => { toast.success("Objeção registrada"); qc.invalidateQueries({ queryKey: ["objections"] }); setForm({ texto: "", produto: "", pais: "", resposta_sugerida: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const sug = useMutation({
    mutationFn: () => suggestObjectionResponse({ data: { texto: form.texto } }),
    onSuccess: (r) => setForm({ ...form, resposta_sugerida: r.resposta }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Topbar title="Banco de Objeções" subtitle="Registre, ranqueie e treine respostas" />
      <main className="grid gap-6 p-4 md:p-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Registrar objeção</CardTitle>
            <CardDescription>A IA pode sugerir uma resposta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Objeção</Label><Textarea rows={3} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Produto</Label><Input value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} /></div>
              <div><Label>País</Label><Input value={form.pais} maxLength={4} onChange={(e) => setForm({ ...form, pais: e.target.value })} /></div>
            </div>
            <Button variant="outline" size="sm" onClick={() => sug.mutate()} disabled={sug.isPending || form.texto.length < 3} className="w-full">
              <Sparkles className="mr-2 h-3.5 w-3.5" />{sug.isPending ? "..." : "Sugerir resposta com IA"}
            </Button>
            <div><Label>Resposta sugerida</Label><Textarea rows={4} value={form.resposta_sugerida} onChange={(e) => setForm({ ...form, resposta_sugerida: e.target.value })} /></div>
            <Button onClick={() => m.mutate()} disabled={m.isPending || form.texto.length < 3} className="w-full">Registrar</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2"><MessageSquareWarning className="h-5 w-5 text-accent" /><CardTitle className="text-base">Ranking de objeções</CardTitle></div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(list ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem objeções registradas.</p>}
            {(list ?? []).map((o: any) => (
              <div key={o.id} className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{o.texto}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {o.produto && <Badge variant="outline">{o.produto}</Badge>}
                      {o.pais && <Badge variant="outline">{o.pais}</Badge>}
                    </div>
                    {o.resposta_sugerida && <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs"><span className="font-semibold">Resposta: </span>{o.resposta_sugerida}</p>}
                  </div>
                  <Badge className="shrink-0">{o.frequencia}×</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
