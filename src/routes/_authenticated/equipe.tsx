import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { listProfiles, updateProfile, upsertGoal } from "@/lib/data.functions";
import { Pencil, Target } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/equipe")({ component: EquipePage });

function EquipePage() {
  const qc = useQueryClient();
  const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: () => listProfiles() });

  return (
    <>
      <Topbar title="Gestão de Equipe" subtitle="Colaboradores, metas e observações" />
      <main className="p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(profiles ?? []).map((p: any) => (
            <Card key={p.id} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{p.full_name}</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.cargo ?? "—"}</p>
                  </div>
                  <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Entrada</span><span>{p.data_entrada ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="truncate">{p.email ?? "—"}</span></div>
                {p.observacoes && <p className="rounded-md bg-muted/50 p-2 text-xs">{p.observacoes}</p>}
                <div className="flex gap-2">
                  <EditDialog profile={p} onSaved={() => qc.invalidateQueries({ queryKey: ["profiles"] })} />
                  <GoalDialog profile={p} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}

function EditDialog({ profile, onSaved }: { profile: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...profile });
  const m = useMutation({
    mutationFn: () => updateProfile({ data: {
      id: profile.id, full_name: form.full_name, cargo: form.cargo, telefone: form.telefone,
      data_entrada: form.data_entrada, observacoes: form.observacoes, ativo: form.ativo,
    } }),
    onSuccess: () => { toast.success("Perfil atualizado"); onSaved(); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="flex-1"><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar colaborador</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Cargo</Label><Input value={form.cargo ?? ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div><Label>Data de entrada</Label><Input type="date" value={form.data_entrada ?? ""} onChange={(e) => setForm({ ...form, data_entrada: e.target.value })} /></div>
          <div><Label>Observações</Label><Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoalDialog({ profile }: { profile: any }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [valor, setValor] = useState(50000);
  const m = useMutation({
    mutationFn: () => upsertGoal({ data: { profile_id: profile.id, mes: now.getMonth() + 1, ano: now.getFullYear(), valor_meta: valor } }),
    onSuccess: () => { toast.success("Meta atualizada"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Target className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Meta mensal — {profile.full_name}</DialogTitle></DialogHeader>
        <div><Label>Valor da meta (mês atual)</Label><Input type="number" value={valor} onChange={(e) => setValor(Number(e.target.value))} /></div>
        <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
