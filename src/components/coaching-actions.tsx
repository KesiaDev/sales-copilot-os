import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCoachingAction, listCoachingActions, deleteCoachingAction } from "@/lib/coaching.functions";
import { toast } from "sonner";
import { Plus, Trash2, ClipboardList } from "lucide-react";

const TIPO_LABELS: Record<string, { label: string; cls: string }> = {
  cobranca: { label: "Cobrança", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  parabens: { label: "Parabéns", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  alinhamento_1x1: { label: "Alinhamento 1x1", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  feedback: { label: "Feedback", cls: "bg-violet-500/15 text-violet-600 border-violet-500/30" },
  outro: { label: "Outro", cls: "bg-muted text-muted-foreground border-border" },
};

export function CoachingActions({ profileId }: { profileId: string }) {
  const qc = useQueryClient();
  const key = ["coaching_actions", profileId];
  const { data: actions } = useQuery({
    queryKey: key,
    queryFn: () => listCoachingActions({ data: { profile_id: profileId } }),
  });

  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<string>("alinhamento_1x1");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  const add = useMutation({
    mutationFn: () => createCoachingAction({ data: { profile_id: profileId, tipo: tipo as any, titulo, descricao: descricao || undefined } }),
    onSuccess: () => {
      toast.success("Ação registrada");
      setTitulo(""); setDescricao(""); setOpen(false);
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteCoachingAction({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mt-4 rounded-lg border border-border/60 bg-card/30 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="h-4 w-4 text-primary" />
          Histórico de ações de liderança
          <Badge variant="outline" className="ml-1">{actions?.length ?? 0}</Badge>
        </div>
        <Button size="sm" variant={open ? "ghost" : "secondary"} onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 h-3.5 w-3.5" />{open ? "Cancelar" : "Nova ação"}
        </Button>
      </div>

      {open && (
        <div className="mb-3 space-y-2 rounded-md border border-border/60 bg-background/60 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([v, m]) => (
                    <SelectItem key={v} value={v}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Cobrança meta semanal" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Descrição (o que foi tratado, combinados, próximos passos)</Label>
            <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => add.mutate()} disabled={add.isPending || titulo.trim().length < 2}>
            {add.isPending ? "Salvando..." : "Salvar ação"}
          </Button>
        </div>
      )}

      {(actions ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma ação registrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {(actions ?? []).map((a: any) => {
            const meta = TIPO_LABELS[a.tipo] ?? TIPO_LABELS.outro;
            return (
              <li key={a.id} className="rounded-md border border-border/60 bg-background/40 p-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                      <span className="font-medium">{a.titulo}</span>
                      <span className="text-muted-foreground">{new Date(a.ocorreu_em).toLocaleString("pt-BR")}</span>
                    </div>
                    {a.descricao && <p className="whitespace-pre-wrap text-muted-foreground">{a.descricao}</p>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del.mutate(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
