import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSales, getVendasPorProduto, getVendasMensaisPorProduto } from "@/lib/data.functions";
import { getDashboardMetrics } from "@/lib/dashboard.functions";
import { formatNumber, formatPercent, shortDate, monthLabel, todayISO } from "@/lib/format";
import { useFormatCurrency } from "@/components/currency-provider";
import { Database, Webhook, Package, CalendarRange } from "lucide-react";
import { HotmartCsvImport } from "@/components/hotmart-csv-import";
import { DuplicateSalesReview } from "@/components/duplicate-sales-review";

export const Route = createFileRoute("/_authenticated/crm")({ component: CrmPage });

function inicioDoAno() {
  return `${new Date().getFullYear()}-01-01`;
}

function CrmPage() {
  const fmt = useFormatCurrency();
  const [dataInicio, setDataInicio] = useState(inicioDoAno());
  const [dataFim, setDataFim] = useState(todayISO());
  const [mes, setMes] = useState("");

  function aplicarMes(valor: string) {
    setMes(valor);
    if (!valor) return;
    const [y, m] = valor.split("-").map(Number);
    setDataInicio(`${valor}-01`);
    setDataFim(new Date(y, m, 0).toISOString().slice(0, 10));
  }

  function aplicarPreset(inicio: string, fim: string) {
    setMes("");
    setDataInicio(inicio);
    setDataFim(fim);
  }

  const periodo = useMemo(() => ({ dataInicio, dataFim }), [dataInicio, dataFim]);

  const { data: sales } = useQuery({
    queryKey: ["sales", periodo],
    queryFn: () => listSales({ data: periodo }),
  });
  const { data: dash } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardMetrics(),
  });
  const { data: porProduto } = useQuery({
    queryKey: ["vendas-por-produto", periodo],
    queryFn: () => getVendasPorProduto({ data: periodo }),
  });
  const { data: porProdutoMes } = useQuery({
    queryKey: ["vendas-mensais-por-produto"],
    queryFn: () => getVendasMensaisPorProduto(),
  });

  const fontes = (sales ?? []).reduce((acc: any, s: any) => {
    acc[s.fonte] = (acc[s.fonte] ?? 0) + Number(s.valor);
    return acc;
  }, {});

  return (
    <>
      <Topbar
        title="CRM Performance"
        subtitle="Vendas, conversão e fontes (Hotmart + Clint)"
        showCurrencyToggle
      />
      <main className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <HotmartCsvImport />
        </div>
        <DuplicateSalesReview />

        <Card className="border-info/30 bg-info/5">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Webhook className="h-5 w-5 text-info" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Integração via webhook ou CSV</p>
              <p className="text-xs text-muted-foreground">
                Configure os webhooks da Hotmart e Clint para{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">
                  /api/public/webhooks/&lt;origem&gt;
                </code>{" "}
                ou importe o CSV de vendas da Hotmart manualmente pelo botão acima.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(fontes).map(([k, v]: any) => (
            <Card key={k}>
              <CardHeader className="pb-2">
                <CardDescription className="uppercase text-xs">{k}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(v)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Vendas por vendedor × produto</CardTitle>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">De</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => {
                      setMes("");
                      setDataInicio(e.target.value);
                    }}
                    className="h-8 w-[150px]"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">Até</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => {
                      setMes("");
                      setDataFim(e.target.value);
                    }}
                    className="h-8 w-[150px]"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">Mês</Label>
                  <Input
                    type="month"
                    value={mes}
                    onChange={(e) => aplicarMes(e.target.value)}
                    className="h-8 w-[140px]"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => aplicarPreset(inicioDoAno(), todayISO())}
                >
                  Este ano
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => aplicarPreset("2020-01-01", todayISO())}
                >
                  Tudo
                </Button>
              </div>
            </div>
            <CardDescription>
              Produto identificado a partir do funil de origem na Clint. Accelerator é vendido como
              upsell dentro do funil de Mentoria Gestor de Tráfego e por isso ainda não aparece
              separado. Período: {shortDate(dataInicio)} a {shortDate(dataFim)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  {(porProduto?.produtos ?? []).map((p) => (
                    <TableHead key={p} className="text-right">
                      {p}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(porProduto?.vendedores ?? []).map((v) => (
                  <TableRow key={v.nome}>
                    <TableCell className="text-xs font-medium">{v.nome}</TableCell>
                    {(porProduto?.produtos ?? []).map((p) => {
                      const cell = (v.produtos as any)[p];
                      return (
                        <TableCell key={p} className="text-right text-xs">
                          {cell ? `${cell.vendas} · ${fmt(cell.valor)}` : "—"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right text-xs font-semibold">
                      {v.totalVendas} · {fmt(v.totalValor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Vendas por produto × mês</CardTitle>
            </div>
            <CardDescription>Evolução mensal de vendas e faturamento por produto.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Produto</TableHead>
                  {(porProdutoMes?.meses ?? []).map((m) => (
                    <TableHead key={m} className="text-right whitespace-nowrap">
                      {monthLabel(m)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(porProdutoMes?.produtos ?? []).map((p) => (
                  <TableRow key={p.produto}>
                    <TableCell className="sticky left-0 bg-card text-xs font-medium">
                      {p.produto}
                    </TableCell>
                    {(porProdutoMes?.meses ?? []).map((m) => {
                      const cell = (p.meses as any)[m];
                      return (
                        <TableCell key={m} className="text-right text-xs whitespace-nowrap">
                          {cell ? `${cell.vendas} · ${fmt(cell.valor)}` : "—"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right text-xs font-semibold whitespace-nowrap">
                      {p.totalVendas} · {fmt(p.totalValor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Últimas vendas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sales ?? []).slice(0, 50).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{shortDate(s.vendido_em)}</TableCell>
                    <TableCell className="text-xs">{s.profile?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.produto}</TableCell>
                    <TableCell className="text-xs">{s.pais ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {s.fonte}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">{fmt(s.valor)}</TableCell>
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
