import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { listProfiles, listDailyReports, upsertDailyReport, getCurrentProfile } from "@/lib/data.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { todayISO, formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fechamento")({ component: FechamentoPage });

function FechamentoPage() {
  const qc = useQueryClient();
  const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: () => listProfiles() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => getCurrentProfile() });
  const { data: reports } = useQuery({ queryKey: ["reports"], queryFn: () => listDailyReports() });

  const [form, setForm] = useState({
    profile_id: "",
    data: todayISO(),
    leads_recebidos: 0, leads_atendidos: 0, calls_realizadas: 0, follow_ups: 0,
    propostas_enviadas: 0, vendas_fechadas: 0, valor_vendido: 0,
    principais_objecoes: "", principais_dificuldades: "", proximas_oportunidades: "",
    precisa_ajuda: false, observacoes: "",
  });

  // default selected profile
  if (!form.profile_id && me?.profile?.id) {
    setForm({ ...form, profile_id: me.profile.id });
  }

  const m = useMutation({
    mutationFn: () => upsertDailyReport({ data: form as any }),
    onSuccess: () => { toast.success("Fechamento registrado"); qc.invalidateQueries({ queryKey: ["reports"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const nums = ["leads_recebidos","leads_atendidos","calls_realizadas","follow_ups","propostas_enviadas","vendas_fechadas"] as const;

  return (
    <>
      <Topbar title="Fechamento Diário" subtitle="Resumo do final do expediente" />
      <main className="grid gap-6 p-4 md:p-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Novo fechamento</CardTitle>
            <CardDescription>Preencha ao final do expediente</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="col-span-2 md:col-span-1">
                <Label>Colaborador</Label>
                <Select value={form.profile_id} onValueChange={(v) => setForm({ ...form, profile_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(profiles ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
              {nums.map((k) => (
                <div key={k}><Label className="capitalize">{k.replaceAll("_", " ")}</Label>
                  <Input type="number" min={0} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} />
                </div>
              ))}
              <div><Label>Valor vendido (€)</Label><Input type="number" min={0} step="0.01" value={form.valor_vendido} onChange={(e) => setForm({ ...form, valor_vendido: Number(e.target.value) })} /></div>

              <div className="col-span-2 md:col-span-3"><Label>Principais objeções</Label>
                <Textarea rows={2} value={form.principais_objecoes} onChange={(e) => setForm({ ...form, principais_objecoes: e.target.value })} />
              </div>
              <div className="col-span-2 md:col-span-3"><Label>Principais dificuldades</Label>
                <Textarea rows={2} value={form.principais_dificuldades} onChange={(e) => setForm({ ...form, principais_dificuldades: e.target.value })} />
              </div>
              <div className="col-span-2 md:col-span-3"><Label>Próximas oportunidades</Label>
                <Textarea rows={2} value={form.proximas_oportunidades} onChange={(e) => setForm({ ...form, proximas_oportunidades: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-lg border border-border/60 p-3 md:col-span-3">
                <div>
                  <Label className="text-sm">Precisa de ajuda da liderança?</Label>
                  <p className="text-xs text-muted-foreground">Marque para o Head ser notificado</p>
                </div>
                <Switch checked={form.precisa_ajuda} onCheckedChange={(v) => setForm({ ...form, precisa_ajuda: v })} />
              </div>
              <div className="col-span-2 md:col-span-3"><Label>Observações</Label>
                <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
              <div className="col-span-2 md:col-span-3">
                <Button type="submit" disabled={m.isPending || !form.profile_id} className="w-full">Salvar fechamento</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Histórico recente</CardTitle></CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Vendedor</TableHead><TableHead className="text-right">Vendido</TableHead></TableRow></TableHeader>
              <TableBody>
                {(reports ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.data}</TableCell>
                    <TableCell className="text-xs">
                      {r.profile?.full_name}
                      {r.precisa_ajuda && <Badge variant="destructive" className="ml-2 gap-1"><AlertCircle className="h-3 w-3" />Ajuda</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">{formatCurrency(r.valor_vendido)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
