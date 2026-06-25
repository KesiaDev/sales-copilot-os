import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/metas")({
  component: MetasPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

const PRODUTOS = [
  "Mentoria Gestor de Tráfego",
  "Mentoria Gestão de Redes Sociais",
  "Renovações",
  "Master and Scale",
  "Accelerator",
  "Traffic Master",
  "Estrategista de Infoprodutos",
];

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function currentMesAno() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMesesOptions() {
  // Generate 12 months back and 6 forward from today
  const now = new Date();
  const list: { value: string; label: string }[] = [];
  for (let i = -12; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`;
    list.push({ value, label });
  }
  return list;
}

type ProdRow = { produto_grupo: string; meta_eur: number; meta_vendas: number };

function MetasPage() {
  const mesesOptions = useMemo(buildMesesOptions, []);
  const [mesAno, setMesAno] = useState<string>(currentMesAno());
  const [loading, setLoading] = useState(true);

  const [metaGeral, setMetaGeral] = useState<number>(0);
  const [savingGeral, setSavingGeral] = useState(false);

  const [rows, setRows] = useState<ProdRow[]>(
    PRODUTOS.map((p) => ({ produto_grupo: p, meta_eur: 0, meta_vendas: 0 })),
  );
  const [savingRows, setSavingRows] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [{ data: geral }, { data: prods }] = await Promise.all([
        supabase
          .from("metas_mensais")
          .select("meta_geral_eur")
          .eq("mes_ano", mesAno)
          .maybeSingle(),
        supabase
          .from("metas_produtos")
          .select("produto_grupo, meta_eur, meta_vendas")
          .eq("mes_ano", mesAno),
      ]);
      if (cancelled) return;
      setMetaGeral(Number(geral?.meta_geral_eur ?? 0));
      const byProd = new Map<string, ProdRow>();
      (prods ?? []).forEach((r) =>
        byProd.set(r.produto_grupo, {
          produto_grupo: r.produto_grupo,
          meta_eur: Number(r.meta_eur ?? 0),
          meta_vendas: Number(r.meta_vendas ?? 0),
        }),
      );
      setRows(
        PRODUTOS.map(
          (p) => byProd.get(p) ?? { produto_grupo: p, meta_eur: 0, meta_vendas: 0 },
        ),
      );
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mesAno]);

  async function salvarGeral() {
    setSavingGeral(true);
    const { error } = await supabase
      .from("metas_mensais")
      .upsert(
        { mes_ano: mesAno, meta_geral_eur: metaGeral },
        { onConflict: "mes_ano" },
      );
    setSavingGeral(false);
    if (error) toast.error("Erro ao salvar meta geral", { description: error.message });
    else toast.success("Meta geral salva");
  }

  async function salvarProdutos() {
    setSavingRows(true);
    const payload = rows.map((r) => ({
      mes_ano: mesAno,
      produto_grupo: r.produto_grupo,
      meta_eur: r.meta_eur,
      meta_vendas: r.meta_vendas,
    }));
    const { error } = await supabase
      .from("metas_produtos")
      .upsert(payload, { onConflict: "mes_ano,produto_grupo" });
    setSavingRows(false);
    if (error) toast.error("Erro ao salvar produtos", { description: error.message });
    else toast.success("Metas por produto salvas");
  }

  function updateRow(idx: number, patch: Partial<ProdRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurar Metas</h1>
          <p className="text-sm text-muted-foreground">
            Defina a meta geral e as metas por produto para cada mês.
          </p>
        </div>
        <div className="w-full md:w-64">
          <Label className="text-xs text-muted-foreground">Mês</Label>
          <Select value={mesAno} onValueChange={setMesAno}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mesesOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meta Geral do Mês</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Label htmlFor="meta-geral">Meta geral (€)</Label>
            <Input
              id="meta-geral"
              type="number"
              step="0.01"
              min={0}
              disabled={loading}
              value={metaGeral}
              onChange={(e) => setMetaGeral(Number(e.target.value) || 0)}
            />
          </div>
          <Button onClick={salvarGeral} disabled={loading || savingGeral}>
            {savingGeral && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Metas por Produto</CardTitle>
          <Button onClick={salvarProdutos} disabled={loading || savingRows}>
            {savingRows && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Todos
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="w-48">Meta em €</TableHead>
                <TableHead className="w-48">Contratos / Vendas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={r.produto_grupo}>
                  <TableCell className="font-medium">{r.produto_grupo}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      disabled={loading}
                      value={r.meta_eur}
                      onChange={(e) =>
                        updateRow(idx, { meta_eur: Number(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="1"
                      min={0}
                      disabled={loading}
                      value={r.meta_vendas}
                      onChange={(e) =>
                        updateRow(idx, {
                          meta_vendas: parseInt(e.target.value || "0", 10) || 0,
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
