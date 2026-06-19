import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listSales } from "@/lib/data.functions";
import { getDashboardMetrics } from "@/lib/dashboard.functions";
import { formatCurrency, formatNumber, formatPercent, shortDate } from "@/lib/format";
import { Database, Webhook } from "lucide-react";

export const Route = createFileRoute("/_authenticated/crm")({ component: CrmPage });

function CrmPage() {
  const { data: sales } = useQuery({ queryKey: ["sales"], queryFn: () => listSales() });
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardMetrics() });

  const fontes = (sales ?? []).reduce((acc: any, s: any) => { acc[s.fonte] = (acc[s.fonte] ?? 0) + Number(s.valor); return acc; }, {});

  return (
    <>
      <Topbar title="CRM Performance" subtitle="Vendas, conversão e fontes (Hotmart + Clint)" />
      <main className="space-y-6 p-4 md:p-6">
        <Card className="border-info/30 bg-info/5">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Webhook className="h-5 w-5 text-info" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Integração via webhook</p>
              <p className="text-xs text-muted-foreground">
                Configure os webhooks da Hotmart e Clint para o endpoint <code className="rounded bg-muted px-1.5 py-0.5">/api/public/webhooks/&lt;origem&gt;</code> e as vendas aparecerão aqui em tempo real.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(fontes).map(([k, v]: any) => (
            <Card key={k}>
              <CardHeader className="pb-2"><CardDescription className="uppercase text-xs">{k}</CardDescription></CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(v)}</div></CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><div className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /><CardTitle className="text-base">Últimas vendas</CardTitle></div></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Vendedor</TableHead><TableHead>Produto</TableHead><TableHead>País</TableHead><TableHead>Fonte</TableHead><TableHead className="text-right">Valor</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(sales ?? []).slice(0, 50).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{shortDate(s.vendido_em)}</TableCell>
                    <TableCell className="text-xs">{s.profile?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.produto}</TableCell>
                    <TableCell className="text-xs">{s.pais ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.fonte}</Badge></TableCell>
                    <TableCell className="text-right text-xs font-medium">{formatCurrency(s.valor)}</TableCell>
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
