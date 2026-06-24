import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getClintVendedorMetricas, getClintFunilSnapshots } from "@/lib/clint-insights.functions";
import { formatNumber, formatPercent, formatDurationSeconds, shortDate } from "@/lib/format";
import { Activity, GitBranch, XCircle, Clock3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/desempenho")({ component: DesempenhoPage });

type VendedorMetrica = Awaited<ReturnType<typeof getClintVendedorMetricas>>[number];
type FunilEntry = { name: string; value: number };
type EtapaTempo = { track_stage_old_stage: string; track_stage_stage_time: number };

function DesempenhoPage() {
  const { data: vendedores } = useQuery({
    queryKey: ["clint-vendedor-metricas"],
    queryFn: () => getClintVendedorMetricas(),
  });
  const { data: snapshots } = useQuery({
    queryKey: ["clint-funil-snapshots"],
    queryFn: () => getClintFunilSnapshots(),
  });

  const capturadoEm = vendedores?.[0]?.capturado_em;

  const funil = ((snapshots?.funil_conversao?.dados as FunilEntry[]) ?? [])
    .filter((s) => s.name !== "Total")
    .slice(0, 12);
  const motivoPerda = ((snapshots?.motivo_perda?.dados as FunilEntry[]) ?? [])
    .filter((s) => s.name !== "Total")
    .slice(0, 10);
  const tempoPorEtapa = (
    (snapshots?.tempo_por_etapa?.dados as { rows?: EtapaTempo[] })?.rows ?? []
  ).slice(0, 12);

  return (
    <>
      <Topbar
        title="Desempenho Comercial"
        subtitle="Atividades, no-show, funil e motivo de perda — sincronizado da Clint"
      />
      <main className="space-y-6 p-4 md:p-6">
        {capturadoEm ? (
          <p className="text-xs text-muted-foreground">
            Última sincronização: {shortDate(capturadoEm)} — os valores são o acumulado configurado
            em cada dashboard na Clint (a API não permite filtrar por período).
          </p>
        ) : (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-4 text-sm">
              Nenhum snapshot da Clint sincronizado ainda. Ative o workflow n8n{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">05 - Clint: Sync Dashboards</code>{" "}
              para popular esta página.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Performance e atividades por vendedor</CardTitle>
            </div>
            <CardDescription>
              Negócios, conversão, reuniões, ligações, WhatsApp e no-show — direto da Clint.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Negócios</TableHead>
                  <TableHead className="text-right">Ganhos</TableHead>
                  <TableHead className="text-right">Perdidos</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                  <TableHead className="text-right">Reuniões Ag.</TableHead>
                  <TableHead className="text-right">Reuniões Real.</TableHead>
                  <TableHead className="text-right">Ligações</TableHead>
                  <TableHead className="text-right">WhatsApp</TableHead>
                  <TableHead className="text-right">No-show</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(vendedores ?? []).map((v: VendedorMetrica) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-xs font-medium">
                      {v.profile?.full_name ?? v.user_name}
                      {!v.profile_id && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          não mapeado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(v.negocios_total)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-success">
                      {formatNumber(v.negocios_ganhos)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-destructive">
                      {formatNumber(v.negocios_perdidos)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatPercent(v.taxa_conversao)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(v.reunioes_agendadas)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(v.reunioes_realizadas)}
                    </TableCell>
                    <TableCell className="text-right text-xs">{formatNumber(v.ligacoes)}</TableCell>
                    <TableCell className="text-right text-xs">{formatNumber(v.whatsapp)}</TableCell>
                    <TableCell className="text-right text-xs">
                      {v.no_show > 0 ? (
                        <Badge variant="destructive" className="text-[10px]">
                          {v.no_show}
                        </Badge>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(vendedores ?? []).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-6 text-center text-xs text-muted-foreground"
                    >
                      Sem dados sincronizados ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Funil de conversão</CardTitle>
              </div>
              <CardDescription>Quantidade de negócios em cada etapa (top 12).</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funil} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--color-muted-foreground)"
                    fontSize={10}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="hsl(258 90% 66%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-base">Principais motivos de perda</CardTitle>
              </div>
              <CardDescription>Top 10 motivos pelos quais negócios são perdidos.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {motivoPerda.map((m) => (
                    <TableRow key={m.name}>
                      <TableCell className="text-xs">{m.name}</TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatNumber(m.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {motivoPerda.length === 0 && (
                    <TableRow>
                      <TableCell className="py-6 text-center text-xs text-muted-foreground">
                        Sem dados sincronizados ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Tempo médio em cada etapa</CardTitle>
            </div>
            <CardDescription>
              Onde os negócios ficam parados por mais tempo — útil para achar gaps no funil.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Tempo médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tempoPorEtapa.map((r) => (
                  <TableRow key={r.track_stage_old_stage}>
                    <TableCell className="text-xs">{r.track_stage_old_stage}</TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {formatDurationSeconds(r.track_stage_stage_time)}
                    </TableCell>
                  </TableRow>
                ))}
                {tempoPorEtapa.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="py-6 text-center text-xs text-muted-foreground"
                    >
                      Sem dados sincronizados ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
