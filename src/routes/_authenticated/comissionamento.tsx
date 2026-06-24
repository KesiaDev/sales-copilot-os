import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { useFormatCurrency } from "@/components/currency-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Save, Trash2, Plus, Sparkles, Printer, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/comissionamento")({
  component: ComissionamentoPage,
});

const PRODUTOS = [
  "Mentoria Gestor de Tráfego",
  "Mentoria Gestão de Redes Sociais",
  "Master and Scale",
  "Renovações",
] as const;

const GESTOR_NOME = "Fabio Nadal";

type Profile = { id: string; full_name: string; ativo: boolean };

const db = supabase as any;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function firstOfMonth(key: string) {
  return `${key}-01`;
}
function prevMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}
function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-[180px]"
    />
  );
}

function ComissionamentoPage() {
  const [month, setMonth] = useState<string>(monthKey(new Date()));
  const [tab, setTab] = useState("taxas");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Topbar
        title="Comissionamento"
        subtitle="Taxas, lançamentos, roleta e relatório mensal"
        showCurrencyToggle
      />
      <main className="flex-1 space-y-6 p-4 md:p-6 print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Mês de referência</Label>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 print:hidden">
            <TabsTrigger value="taxas">Taxas</TabsTrigger>
            <TabsTrigger value="manuais">Lançamentos Manuais</TabsTrigger>
            <TabsTrigger value="roleta">Roleta</TabsTrigger>
            <TabsTrigger value="relatorio">Relatório Mensal</TabsTrigger>
          </TabsList>

          <TabsContent value="taxas">
            <TaxasTab month={month} />
          </TabsContent>
          <TabsContent value="manuais">
            <ManuaisTab month={month} />
          </TabsContent>
          <TabsContent value="roleta">
            <RoletaTab month={month} />
          </TabsContent>
          <TabsContent value="relatorio">
            <RelatorioTab month={month} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ------------------ TAXAS ------------------
function TaxasTab({ month }: { month: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rates, setRates] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: profs } = await db
      .from("profiles")
      .select("id, full_name, ativo")
      .eq("ativo", true)
      .order("full_name");
    const list: Profile[] = (profs ?? []).filter((p: Profile) => p.full_name !== GESTOR_NOME);
    setProfiles(list);

    const cutoff = firstOfMonth(month);
    const { data: rs } = await db
      .from("commission_rates")
      .select("profile_id, produto_grupo, percentual, vigente_desde")
      .lte("vigente_desde", cutoff)
      .order("vigente_desde", { ascending: false });

    const map: Record<string, Record<string, string>> = {};
    for (const r of rs ?? []) {
      map[r.profile_id] ??= {};
      if (!map[r.profile_id][r.produto_grupo]) {
        map[r.profile_id][r.produto_grupo] = String(r.percentual);
      }
    }
    setRates(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [month]);

  function setCell(pid: string, prod: string, v: string) {
    setRates((prev) => ({ ...prev, [pid]: { ...(prev[pid] ?? {}), [prod]: v } }));
  }

  async function save() {
    const rows: any[] = [];
    const vigente = firstOfMonth(month);
    for (const p of profiles) {
      for (const prod of PRODUTOS) {
        const v = rates[p.id]?.[prod];
        if (v === undefined || v === "") continue;
        const num = Number(v.replace(",", "."));
        if (Number.isNaN(num)) continue;
        rows.push({
          profile_id: p.id,
          produto_grupo: prod,
          percentual: num,
          vigente_desde: vigente,
        });
      }
    }
    if (!rows.length) return toast.error("Nada para salvar");
    const { error } = await db
      .from("commission_rates")
      .upsert(rows, { onConflict: "profile_id,produto_grupo,vigente_desde" });
    if (error) return toast.error(error.message);
    toast.success("Taxas salvas");
    load();
  }

  async function copyPrev() {
    const prev = firstOfMonth(prevMonth(month));
    const { data: rs } = await db
      .from("commission_rates")
      .select("profile_id, produto_grupo, percentual, vigente_desde")
      .lte("vigente_desde", prev)
      .order("vigente_desde", { ascending: false });
    const seen = new Set<string>();
    const map: Record<string, Record<string, string>> = {};
    for (const r of rs ?? []) {
      const k = `${r.profile_id}|${r.produto_grupo}`;
      if (seen.has(k)) continue;
      seen.add(k);
      map[r.profile_id] ??= {};
      map[r.profile_id][r.produto_grupo] = String(r.percentual);
    }
    setRates(map);
    toast.info("Taxas do mês anterior carregadas. Clique em Salvar para aplicar.");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Taxas por vendedor × produto</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyPrev}>
            <Copy className="mr-2 h-4 w-4" /> Copiar do mês anterior
          </Button>
          <Button size="sm" onClick={save}>
            <Save className="mr-2 h-4 w-4" /> Salvar alterações
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Vendedor</TableHead>
                  {PRODUTOS.map((p) => (
                    <TableHead key={p}>{p}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p, i) => (
                  <TableRow key={p.id} className={i % 2 ? "bg-muted/20" : ""}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    {PRODUTOS.map((prod) => (
                      <TableCell key={prod}>
                        <div className="relative w-28">
                          <Input
                            inputMode="decimal"
                            placeholder="—"
                            value={rates[p.id]?.[prod] ?? ""}
                            onChange={(e) => setCell(p.id, prod, e.target.value)}
                            className="pr-7"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            %
                          </span>
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ------------------ LANÇAMENTOS MANUAIS ------------------
function ManuaisTab({ month }: { month: string }) {
  const fmtEUR = useFormatCurrency(2);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState(month);
  const [form, setForm] = useState({
    profile_id: "",
    produto_grupo: PRODUTOS[0] as string,
    valor: "",
    data_venda: new Date().toISOString().slice(0, 10),
    motivo: "",
    mes_referencia: month,
  });

  useEffect(() => {
    setFilterMonth(month);
    setForm((f) => ({ ...f, mes_referencia: month }));
  }, [month]);

  async function loadProfiles() {
    const { data } = await db
      .from("profiles")
      .select("id, full_name, ativo")
      .eq("ativo", true)
      .order("full_name");
    setProfiles(data ?? []);
  }
  async function loadRows() {
    const { data } = await db
      .from("manual_revenue_entries")
      .select(
        "id, profile_id, valor, produto_grupo, motivo, data_venda, mes_referencia, created_at",
      )
      .eq("mes_referencia", filterMonth)
      .order("data_venda", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => {
    loadProfiles();
  }, []);
  useEffect(() => {
    loadRows();
  }, [filterMonth]);

  async function submit() {
    if (!form.profile_id) return toast.error("Selecione um vendedor");
    const valor = Number(form.valor.replace(",", "."));
    if (!valor || valor <= 0) return toast.error("Valor inválido");
    const { data: u } = await supabase.auth.getUser();
    const lancadoPor = u?.user?.id
      ? (await db.from("profiles").select("id").eq("user_id", u.user.id).maybeSingle()).data?.id
      : null;
    const { error } = await db.from("manual_revenue_entries").insert({
      profile_id: form.profile_id,
      valor,
      produto_grupo: form.produto_grupo,
      motivo: form.motivo || null,
      data_venda: form.data_venda,
      mes_referencia: form.mes_referencia,
      lancado_por: lancadoPor,
    });
    if (error) return toast.error(error.message);
    toast.success("Lançamento registrado");
    setForm((f) => ({ ...f, valor: "", motivo: "" }));
    loadRows();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await db.from("manual_revenue_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    loadRows();
  }

  const total = rows.reduce((s, r) => s + Number(r.valor), 0);
  const profById = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Novo lançamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="mb-1 block text-xs">Vendedor</Label>
              <Select
                value={form.profile_id}
                onValueChange={(v) => setForm({ ...form, profile_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Produto</Label>
              <Select
                value={form.produto_grupo}
                onValueChange={(v) => setForm({ ...form, produto_grupo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUTOS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Valor (€)</Label>
              <Input
                inputMode="decimal"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Data da venda</Label>
              <Input
                type="date"
                value={form.data_venda}
                onChange={(e) => setForm({ ...form, data_venda: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Mês de referência</Label>
              <Input
                type="month"
                value={form.mes_referencia}
                onChange={(e) => setForm({ ...form, mes_referencia: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <Label className="mb-1 block text-xs">Motivo (opcional)</Label>
              <Textarea
                rows={2}
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={submit}>
              <Plus className="mr-2 h-4 w-4" /> Registrar lançamento
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lançamentos</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Filtrar mês</Label>
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-[180px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Mês Ref</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Sem lançamentos neste mês
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r, i) => (
                <TableRow key={r.id} className={i % 2 ? "bg-muted/20" : ""}>
                  <TableCell>{r.data_venda}</TableCell>
                  <TableCell>{profById[r.profile_id] ?? "—"}</TableCell>
                  <TableCell>{r.produto_grupo}</TableCell>
                  <TableCell className="font-medium">{fmtEUR(Number(r.valor))}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground">
                    {r.motivo ?? "—"}
                  </TableCell>
                  <TableCell>{r.mes_referencia}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex justify-end border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total do mês:</span>
            <span className="ml-2 font-semibold text-emerald-400">{fmtEUR(total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ------------------ ROLETA ------------------
function RoletaTab({ month }: { month: string }) {
  const fmtEUR = useFormatCurrency(2);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [config, setConfig] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [spins, setSpins] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState(month);
  const [spinForm, setSpinForm] = useState({ profile_id: "", mes_referencia: month });
  const [spinning, setSpinning] = useState(false);
  const [spinDisplay, setSpinDisplay] = useState<string>("");
  const [newPrize, setNewPrize] = useState({ nome: "", valor: "", tipo: "monetario", peso: "1" });

  useEffect(() => {
    setFilterMonth(month);
    setSpinForm((f) => ({ ...f, mes_referencia: month }));
  }, [month]);

  async function loadAll() {
    const [pz, cf, pr] = await Promise.all([
      db.from("roleta_prizes").select("*").order("created_at"),
      db.from("roleta_config").select("*"),
      db.from("profiles").select("id, full_name, ativo").eq("ativo", true).order("full_name"),
    ]);
    setPrizes(pz.data ?? []);
    setConfig(cf.data ?? []);
    setProfiles(pr.data ?? []);
  }
  async function loadSpins() {
    const { data } = await db
      .from("roleta_spins")
      .select("*")
      .eq("mes_referencia", filterMonth)
      .order("created_at", { ascending: false });
    setSpins(data ?? []);
  }
  useEffect(() => {
    loadAll();
  }, []);
  useEffect(() => {
    loadSpins();
  }, [filterMonth]);

  async function addPrize() {
    if (!newPrize.nome) return toast.error("Nome obrigatório");
    const { error } = await db.from("roleta_prizes").insert({
      nome: newPrize.nome,
      valor: newPrize.valor ? Number(newPrize.valor.replace(",", ".")) : null,
      tipo: newPrize.tipo,
      peso: Math.max(1, Number(newPrize.peso) || 1),
    });
    if (error) return toast.error(error.message);
    setNewPrize({ nome: "", valor: "", tipo: "monetario", peso: "1" });
    loadAll();
  }
  async function updatePrize(id: string, patch: any) {
    await db.from("roleta_prizes").update(patch).eq("id", id);
    loadAll();
  }
  async function delPrize(id: string) {
    if (!confirm("Excluir prêmio?")) return;
    await db.from("roleta_prizes").delete().eq("id", id);
    loadAll();
  }
  async function toggleProduto(produto: string, elegivel: boolean) {
    await db
      .from("roleta_config")
      .upsert({ produto_grupo: produto, elegivel, updated_at: new Date().toISOString() });
    loadAll();
  }

  async function sortear() {
    if (!spinForm.profile_id) return toast.error("Selecione vendedor");
    const ativos = prizes.filter((p) => p.ativo);
    if (!ativos.length) return toast.error("Nenhum prêmio ativo");
    setSpinning(true);
    // animation cycling
    let i = 0;
    const intv = setInterval(() => {
      setSpinDisplay(ativos[i % ativos.length].nome);
      i++;
    }, 80);
    await new Promise((r) => setTimeout(r, 1500));
    clearInterval(intv);
    // weighted draw
    const total = ativos.reduce((s, p) => s + p.peso, 0);
    let n = Math.random() * total;
    const chosen = ativos.find((p) => (n -= p.peso) < 0) ?? ativos[0];
    setSpinDisplay(chosen.nome);
    await db.from("roleta_spins").insert({
      profile_id: spinForm.profile_id,
      prize_id: chosen.id,
      premio_nome: chosen.nome,
      premio_valor: chosen.valor,
      mes_referencia: spinForm.mes_referencia,
      pago: false,
    });
    toast.success(`Sorteado: ${chosen.nome}`);
    setSpinning(false);
    loadSpins();
  }

  async function togglePago(id: string, pago: boolean) {
    await db.from("roleta_spins").update({ pago }).eq("id", id);
    loadSpins();
  }

  const profById = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Prêmios da roleta</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valor (€)</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prizes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Input
                      defaultValue={p.nome}
                      onBlur={(e) =>
                        e.target.value !== p.nome && updatePrize(p.id, { nome: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      inputMode="decimal"
                      defaultValue={p.valor ?? ""}
                      onBlur={(e) =>
                        updatePrize(p.id, {
                          valor: e.target.value ? Number(e.target.value.replace(",", ".")) : null,
                        })
                      }
                      className="w-28"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={p.tipo}
                      onValueChange={(v) => updatePrize(p.id, { tipo: v })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monetario">Monetário</SelectItem>
                        <SelectItem value="beneficio">Benefício</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      defaultValue={p.peso}
                      onBlur={(e) =>
                        updatePrize(p.id, { peso: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.ativo}
                      onCheckedChange={(v) => updatePrize(p.id, { ativo: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => delPrize(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30">
                <TableCell>
                  <Input
                    placeholder="Novo prêmio"
                    value={newPrize.nome}
                    onChange={(e) => setNewPrize({ ...newPrize, nome: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="opcional"
                    value={newPrize.valor}
                    onChange={(e) => setNewPrize({ ...newPrize, valor: e.target.value })}
                    className="w-28"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={newPrize.tipo}
                    onValueChange={(v) => setNewPrize({ ...newPrize, tipo: v })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monetario">Monetário</SelectItem>
                      <SelectItem value="beneficio">Benefício</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={newPrize.peso}
                    onChange={(e) => setNewPrize({ ...newPrize, peso: e.target.value })}
                    className="w-20"
                  />
                </TableCell>
                <TableCell></TableCell>
                <TableCell>
                  <Button size="sm" onClick={addPrize}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Peso define a probabilidade: peso 3 é 3× mais provável que peso 1.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos com Roleta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PRODUTOS.map((prod) => {
              const cfg = config.find((c) => c.produto_grupo === prod);
              const elegivel = cfg?.elegivel ?? false;
              return (
                <div
                  key={prod}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/10 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{prod}</p>
                    <p className="text-xs text-muted-foreground">
                      Vendas deste produto habilitam giro de roleta?
                    </p>
                  </div>
                  <Switch checked={elegivel} onCheckedChange={(v) => toggleProduto(prod, v)} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar giro manual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="mb-1 block text-xs">Vendedor</Label>
              <Select
                value={spinForm.profile_id}
                onValueChange={(v) => setSpinForm({ ...spinForm, profile_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Mês de referência</Label>
              <Input
                type="month"
                value={spinForm.mes_referencia}
                onChange={(e) => setSpinForm({ ...spinForm, mes_referencia: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={sortear} disabled={spinning} className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                {spinning ? "Sorteando…" : "Sortear Agora"}
              </Button>
            </div>
          </div>
          {spinDisplay && (
            <div className="mt-4 flex justify-center">
              <Badge
                className={`px-6 py-3 text-lg ${spinning ? "animate-pulse" : ""} bg-amber-500/20 text-amber-300 border border-amber-500/40`}
              >
                🎰 {spinDisplay}
              </Badge>
            </div>
          )}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Histórico</h3>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Prêmio</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pago?</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Nenhum giro neste mês
                    </TableCell>
                  </TableRow>
                )}
                {spins.map((s, i) => (
                  <TableRow key={s.id} className={i % 2 ? "bg-muted/20" : ""}>
                    <TableCell>{s.mes_referencia}</TableCell>
                    <TableCell>{profById[s.profile_id] ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                        {s.premio_nome}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.premio_valor ? fmtEUR(Number(s.premio_valor)) : "—"}</TableCell>
                    <TableCell>
                      <Switch checked={s.pago} onCheckedChange={(v) => togglePago(s.id, v)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ------------------ RELATÓRIO MENSAL ------------------
function RelatorioTab({ month }: { month: string }) {
  const fmtEUR = useFormatCurrency(2);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [manuais, setManuais] = useState<any[]>([]);
  const [spins, setSpins] = useState<any[]>([]);
  const [bonus, setBonus] = useState<any[]>([]);
  const [mgrCfg, setMgrCfg] = useState<any>(null);
  const [mgrEdit, setMgrEdit] = useState(false);
  const [mgrForm, setMgrForm] = useState({ percentual: "5.00", salario: "3200.00" });
  const [showBonusModal, setShowBonusModal] = useState(false);

  const [y, m] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  const endDate = new Date(y, m, 1).toISOString().slice(0, 10); // first of next month

  async function loadAll() {
    const [pr, rt, sl, mn, sp, bn, mg] = await Promise.all([
      db.from("profiles").select("id, full_name, ativo").eq("ativo", true).order("full_name"),
      db
        .from("commission_rates")
        .select("*")
        .lte("vigente_desde", startDate)
        .order("vigente_desde", { ascending: false }),
      db
        .from("sales")
        .select("profile_id, produto_grupo, valor, moeda, vendido_em")
        .eq("possible_duplicate", false)
        .gte("vendido_em", startDate)
        .lt("vendido_em", endDate),
      db
        .from("manual_revenue_entries")
        .select("profile_id, produto_grupo, valor")
        .eq("mes_referencia", month),
      db.from("roleta_spins").select("*").eq("mes_referencia", month),
      db
        .from("weekly_bonus_config")
        .select("*")
        .lte("vigente_desde", startDate)
        .order("vigente_desde", { ascending: false }),
      db
        .from("manager_commission_config")
        .select("*")
        .lte("vigente_desde", startDate)
        .order("vigente_desde", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setProfiles(pr.data ?? []);
    setRates(rt.data ?? []);
    setSales(sl.data ?? []);
    setManuais(mn.data ?? []);
    setSpins(sp.data ?? []);
    setBonus(bn.data ?? []);
    setMgrCfg(mg.data);
    if (mg.data)
      setMgrForm({
        percentual: String(mg.data.percentual_sobre_equipe),
        salario: String(mg.data.salario_fixo_brl),
      });
  }
  useEffect(() => {
    loadAll();
  }, [month]);

  // helpers
  function rateFor(pid: string, prod: string): number {
    const r = rates.find((x) => x.profile_id === pid && x.produto_grupo === prod);
    return r ? Number(r.percentual) : 0;
  }
  function bonusFor(pid: string) {
    const b = bonus.find((x) => x.profile_id === pid);
    return b ? { meta: Number(b.meta_semanal_eur), valor: Number(b.valor_bonus) } : null;
  }
  function weeksOfMonth() {
    const weeks: { start: Date; end: Date; label: string }[] = [];
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const cur = new Date(start);
    let i = 1;
    while (cur <= end) {
      const ws = new Date(cur);
      const we = new Date(cur);
      we.setDate(we.getDate() + 6);
      if (we > end) we.setTime(end.getTime());
      weeks.push({ start: ws, end: we, label: `Semana ${i}` });
      cur.setDate(cur.getDate() + 7);
      i++;
    }
    return weeks;
  }

  type SellerCalc = {
    profile: Profile;
    byProduto: { produto: string; fat: number; pct: number; com: number }[];
    comissaoTotal: number;
    bonusSemanal: { label: string; ok: boolean; valor: number }[];
    bonusTotal: number;
    roletaMonetaria: number;
    roletaSpins: any[];
    total: number;
  };

  const sellers: SellerCalc[] = useMemo(() => {
    const weeks = weeksOfMonth();
    return profiles
      .filter((p) => p.full_name !== GESTOR_NOME)
      .map((p) => {
        const byProduto = PRODUTOS.map((prod) => {
          const fatSales = sales
            .filter((s) => s.profile_id === p.id && s.produto_grupo === prod)
            .reduce((sum, s) => sum + Number(s.valor ?? 0), 0);
          const fatMan = manuais
            .filter((s) => s.profile_id === p.id && s.produto_grupo === prod)
            .reduce((sum, s) => sum + Number(s.valor ?? 0), 0);
          const fat = fatSales + fatMan;
          const pct = rateFor(p.id, prod);
          return { produto: prod, fat, pct, com: (fat * pct) / 100 };
        });
        const comissaoTotal = byProduto.reduce((s, x) => s + x.com, 0);

        const bcfg = bonusFor(p.id);
        const bonusSemanal = weeks.map((w) => {
          const total = sales
            .filter((s) => s.profile_id === p.id)
            .filter((s) => {
              const d = new Date(s.vendido_em);
              return d >= w.start && d <= w.end;
            })
            .reduce((sum, s) => sum + Number(s.valor ?? 0), 0);
          const ok = bcfg ? total >= bcfg.meta : false;
          return { label: w.label, ok, valor: ok ? (bcfg?.valor ?? 0) : 0 };
        });
        const bonusTotal = bonusSemanal.reduce((s, x) => s + x.valor, 0);

        const myspins = spins.filter((sp) => sp.profile_id === p.id);
        const roletaMonetaria = myspins.reduce((s, sp) => s + Number(sp.premio_valor ?? 0), 0);

        return {
          profile: p,
          byProduto,
          comissaoTotal,
          bonusSemanal,
          bonusTotal,
          roletaSpins: myspins,
          roletaMonetaria,
          total: comissaoTotal + bonusTotal + roletaMonetaria,
        };
      });
  }, [profiles, sales, manuais, rates, bonus, spins, month]);

  const nadal = profiles.find((p) => p.full_name === GESTOR_NOME);
  const pctEquipe = mgrCfg ? Number(mgrCfg.percentual_sobre_equipe) : 5;
  const salarioFixo = mgrCfg ? Number(mgrCfg.salario_fixo_brl) : 3200;
  const comissaoEquipe = sellers.reduce((s, x) => s + (x.comissaoTotal * pctEquipe) / 100, 0);
  const nadalSales = nadal
    ? sales.filter((s) => s.profile_id === nadal.id).reduce((s, x) => s + Number(x.valor ?? 0), 0) +
      manuais.filter((s) => s.profile_id === nadal.id).reduce((s, x) => s + Number(x.valor ?? 0), 0)
    : 0;
  // assume Nadal commission on own sales uses commission_rates as well — average? we'll sum by product
  const nadalComissaoPropria = nadal
    ? PRODUTOS.reduce((sum, prod) => {
        const fatS = sales
          .filter((s) => s.profile_id === nadal.id && s.produto_grupo === prod)
          .reduce((a, b) => a + Number(b.valor ?? 0), 0);
        const fatM = manuais
          .filter((s) => s.profile_id === nadal.id && s.produto_grupo === prod)
          .reduce((a, b) => a + Number(b.valor ?? 0), 0);
        return sum + ((fatS + fatM) * rateFor(nadal.id, prod)) / 100;
      }, 0)
    : 0;

  async function saveMgr() {
    if (!nadal) return toast.error("Perfil do gestor não encontrado");
    const { error } = await db.from("manager_commission_config").insert({
      manager_profile_id: nadal.id,
      percentual_sobre_equipe: Number(mgrForm.percentual.replace(",", ".")),
      salario_fixo_brl: Number(mgrForm.salario.replace(",", ".")),
      vigente_desde: startDate,
    });
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setMgrEdit(false);
    loadAll();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => setShowBonusModal(true)}>
          <Settings className="mr-2 h-4 w-4" /> Configurar Bônus Semanal
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Configuração do gestor — {GESTOR_NOME}</CardTitle>
          {!mgrEdit && (
            <Button size="sm" variant="ghost" onClick={() => setMgrEdit(true)}>
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {mgrEdit ? (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs">Salário fixo (R$)</Label>
                <Input
                  value={mgrForm.salario}
                  onChange={(e) => setMgrForm({ ...mgrForm, salario: e.target.value })}
                  className="w-40"
                />
              </div>
              <div>
                <Label className="text-xs">% sobre equipe</Label>
                <Input
                  value={mgrForm.percentual}
                  onChange={(e) => setMgrForm({ ...mgrForm, percentual: e.target.value })}
                  className="w-32"
                />
              </div>
              <Button size="sm" onClick={saveMgr}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMgrEdit(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Salário fixo:</span>{" "}
                <span className="font-medium">{fmtBRL(salarioFixo)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">% sobre equipe:</span>{" "}
                <span className="font-medium">{pctEquipe}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {sellers.map((s) => (
        <Card key={s.profile.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{s.profile.full_name}</CardTitle>
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              Total: {fmtEUR(s.total)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.byProduto.map((b) => (
                  <TableRow key={b.produto}>
                    <TableCell>{b.produto}</TableCell>
                    <TableCell>{fmtEUR(b.fat)}</TableCell>
                    <TableCell>{b.pct}%</TableCell>
                    <TableCell className="font-medium">{fmtEUR(b.com)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={3} className="text-right font-medium">
                    Comissão Total
                  </TableCell>
                  <TableCell className="font-semibold">{fmtEUR(s.comissaoTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="rounded-md border border-border bg-muted/10 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Bônus Semanal
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                {s.bonusSemanal.map((b) => (
                  <span
                    key={b.label}
                    className={b.ok ? "text-emerald-300" : "text-muted-foreground"}
                  >
                    {b.label}: {b.ok ? `✅ ${fmtEUR(b.valor)}` : "❌"}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs">
                Total bônus: <span className="font-semibold">{fmtEUR(s.bonusTotal)}</span>
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/10 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Roleta
              </p>
              {s.roletaSpins.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum giro neste mês</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {s.roletaSpins.map((sp: any) => (
                    <li key={sp.id}>
                      🎰 {sp.premio_nome}{" "}
                      {sp.premio_valor ? `— ${fmtEUR(Number(sp.premio_valor))}` : ""}{" "}
                      {sp.pago ? "(pago)" : "(pendente)"}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs">
                Total monetário: <span className="font-semibold">{fmtEUR(s.roletaMonetaria)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      ))}

      {nadal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comissão do {GESTOR_NOME}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Salário Fixo</TableCell>
                  <TableCell className="text-right font-medium">{fmtBRL(salarioFixo)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Comissão sobre equipe ({pctEquipe}%)</TableCell>
                  <TableCell className="text-right font-medium">{fmtEUR(comissaoEquipe)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Comissão própria (vendas {nadal.full_name})</TableCell>
                  <TableCell className="text-right font-medium">
                    {fmtEUR(nadalComissaoPropria)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableCell className="font-semibold">Total {nadal.full_name}</TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold">{fmtBRL(salarioFixo)}</div>
                    <div className="font-semibold text-emerald-300">
                      + {fmtEUR(comissaoEquipe + nadalComissaoPropria)}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">
              Valores em BRL e EUR mantidos separados (sem conversão).
            </p>
          </CardContent>
        </Card>
      )}

      <BonusModal
        open={showBonusModal}
        onClose={() => {
          setShowBonusModal(false);
          loadAll();
        }}
        profiles={profiles.filter((p) => p.full_name !== GESTOR_NOME)}
        currentBonus={bonus}
        startDate={startDate}
      />

      <style>{`@media print { aside, .print\\:hidden, [data-sidebar], header { display: none !important; } main { padding: 0 !important; } }`}</style>
    </div>
  );
}

function BonusModal({
  open,
  onClose,
  profiles,
  currentBonus,
  startDate,
}: {
  open: boolean;
  onClose: () => void;
  profiles: Profile[];
  currentBonus: any[];
  startDate: string;
}) {
  const [draft, setDraft] = useState<Record<string, { meta: string; valor: string }>>({});

  useEffect(() => {
    if (!open) return;
    const map: Record<string, { meta: string; valor: string }> = {};
    for (const p of profiles) {
      const b = currentBonus.find((x) => x.profile_id === p.id);
      map[p.id] = {
        meta: b ? String(b.meta_semanal_eur) : "",
        valor: b ? String(b.valor_bonus) : "60",
      };
    }
    setDraft(map);
  }, [open, profiles, currentBonus]);

  async function save() {
    const rows = profiles
      .map((p) => {
        const d = draft[p.id];
        const meta = Number((d?.meta || "").replace(",", "."));
        const valor = Number((d?.valor || "60").replace(",", "."));
        if (!meta) return null;
        return {
          profile_id: p.id,
          meta_semanal_eur: meta,
          valor_bonus: valor,
          vigente_desde: startDate,
        };
      })
      .filter(Boolean);
    if (!rows.length) return toast.error("Defina ao menos uma meta");
    const { error } = await db
      .from("weekly_bonus_config")
      .upsert(rows, { onConflict: "profile_id,vigente_desde" });
    if (error) return toast.error(error.message);
    toast.success("Bônus salvo");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Bônus Semanal</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead>Meta semanal (€)</TableHead>
              <TableHead>Valor bônus (€)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.full_name}</TableCell>
                <TableCell>
                  <Input
                    value={draft[p.id]?.meta ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [p.id]: {
                          ...(draft[p.id] ?? { valor: "60", meta: "" }),
                          meta: e.target.value,
                        },
                      })
                    }
                    placeholder="ex: 5000"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={draft[p.id]?.valor ?? "60"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [p.id]: {
                          ...(draft[p.id] ?? { meta: "", valor: "" }),
                          valor: e.target.value,
                        },
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
