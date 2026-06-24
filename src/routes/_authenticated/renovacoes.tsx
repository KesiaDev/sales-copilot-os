import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  CheckCircle2,
  UserX,
  RefreshCw,
  Phone,
  MessageCircle,
  AlertTriangle,
  Copy,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRenewalRadar,
  getRenewalSettings,
  updateRenewalDuration,
  setRenewalStatus,
} from "@/lib/renewal.functions";

export const Route = createFileRoute("/_authenticated/renovacoes")({ component: RenovacoesPage });

type Stage = "D-45" | "D-30" | "D-15" | "D-0";
type Status =
  | "Aguardando"
  | "Contato feito"
  | "Reunião agendada"
  | "Proposta enviada"
  | "Renovado"
  | "Perdido";

const STAGES: {
  key: Stage;
  label: string;
  subtitle: string;
  color: string;
  ring: string;
  bg: string;
}[] = [
  {
    key: "D-45",
    label: "D-45",
    subtitle: "No radar",
    color: "text-blue-400",
    ring: "border-blue-500/40",
    bg: "bg-blue-500/10",
  },
  {
    key: "D-30",
    label: "D-30",
    subtitle: "1º contato",
    color: "text-yellow-400",
    ring: "border-yellow-500/40",
    bg: "bg-yellow-500/10",
  },
  {
    key: "D-15",
    label: "D-15",
    subtitle: "Oferta especial",
    color: "text-orange-400",
    ring: "border-orange-500/40",
    bg: "bg-orange-500/10",
  },
  {
    key: "D-0",
    label: "D-0",
    subtitle: "Última chance",
    color: "text-red-400",
    ring: "border-red-500/40",
    bg: "bg-red-500/10",
  },
];

function stageFor(diasRestantes: number): Stage {
  if (diasRestantes > 30) return "D-45";
  if (diasRestantes > 15) return "D-30";
  if (diasRestantes > 0) return "D-15";
  return "D-0";
}

const STATUS_VARIANT: Record<Status, string> = {
  Aguardando: "bg-muted text-muted-foreground",
  "Contato feito": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Reunião agendada": "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "Proposta enviada": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Renovado: "bg-green-500/15 text-green-300 border-green-500/30",
  Perdido: "bg-red-500/15 text-red-300 border-red-500/30",
};

const STATUS_OPCOES: Status[] = [
  "Aguardando",
  "Contato feito",
  "Reunião agendada",
  "Proposta enviada",
  "Renovado",
  "Perdido",
];

const SCRIPTS = [
  {
    objecao: "Está caro, não tenho esse valor agora.",
    script:
      "Entendo. Pensando no impacto que o programa já trouxe pra você, faz mais sentido dividir em 12x para manter o ritmo ou pausar e voltar do zero depois?",
    tatica: "Parcelamento",
  },
  {
    objecao: "Já aprendi o que precisava, não vejo motivo para renovar.",
    script:
      "Faz sentido você sentir isso. O próximo nível não é mais conteúdo — é execução guiada nos seus números atuais. Posso te mostrar o que muda?",
    tatica: "Reframing",
  },
  {
    objecao: "Preciso pensar, te respondo semana que vem.",
    script:
      "Claro. Só pra você saber: as vagas com a condição atual fecham em 48h e voltam ao valor cheio. Quer que eu te reserve enquanto decide?",
    tatica: "Urgência",
  },
  {
    objecao: "Vou tentar sozinho esse ciclo.",
    script:
      "Posso ser sincero? Quem renova é exatamente quem chega no patamar que você quer. Sozinho dá pra manter, mas escalar sem mentoria custa muito mais caro depois.",
    tatica: "Exclusividade",
  },
  {
    objecao: "Meu negócio está em um momento ruim.",
    script:
      "Conta mais o que está acontecendo. Antes de qualquer proposta quero entender se o problema é fluxo, oferta ou tráfego — pode ser que a renovação seja exatamente o que destrava.",
    tatica: "Escuta ativa",
  },
];

const TATICA_COLOR: Record<string, string> = {
  Parcelamento: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Reframing: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  Exclusividade: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Urgência: "bg-red-500/15 text-red-300 border-red-500/30",
  "Escuta ativa": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function fmtEUR(v: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

function RenovacoesPage() {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<"Todas" | Stage>("Todas");
  const [showConfig, setShowConfig] = useState(false);

  const { data: radar, isLoading } = useQuery({
    queryKey: ["renewal-radar"],
    queryFn: () => getRenewalRadar(),
  });

  const items = useMemo(
    () => (radar?.items ?? []).map((it) => ({ ...it, stage: stageFor(it.diasRestantes) as Stage })),
    [radar],
  );

  const ativos = items.filter((i) => i.status !== "Renovado" && i.status !== "Perdido");
  const vencidos = items.filter((i) => i.diasRestantes <= 0);
  const renovadosVencidos = vencidos.filter((i) => i.status === "Renovado").length;
  const perdidos = items.filter((i) => i.status === "Perdido").length;
  const taxaRenovacao = vencidos.length
    ? Math.round((renovadosVencidos / vencidos.length) * 100)
    : 0;

  const valorPotencial = ativos.reduce((s, a) => s + a.valor, 0);
  const itensFiltrados = filtro === "Todas" ? ativos : ativos.filter((a) => a.stage === filtro);
  const urgentes = ativos.filter(
    (a) => (a.stage === "D-0" || a.stage === "D-15") && a.status === "Aguardando",
  );

  async function mudarStatus(saleId: string, status: Status) {
    await setRenewalStatus({ data: { saleId, status } });
    queryClient.invalidateQueries({ queryKey: ["renewal-radar"] });
    toast.success("Status atualizado");
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Script copiado");
  }

  return (
    <>
      <Topbar
        title="Renovações"
        subtitle="Radar automático D-45 → D-0 · baseado nas vendas reais da Clint"
      />
      <main className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConfig((v) => !v)}>
            <Settings className="mr-2 h-4 w-4" /> Configurar duração do programa
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["renewal-radar"] })}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>

        {showConfig && <ConfigDuracao onClose={() => setShowConfig(false)} />}

        {!isLoading && items.length === 0 && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-4 text-sm">
              Nenhuma venda encontrada na janela de vencimento configurada. Confirme a duração do
              programa em "Configurar duração do programa" — o radar usa{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">vendido_em + duração</code> para
              estimar quando cada cliente precisa renovar.
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em processo
              </CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{ativos.length}</div>
              <p className="text-xs text-muted-foreground mt-1">clientes no radar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Renovados este mês
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {radar?.renovadosMes.count ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtEUR(radar?.renovadosMes.valor ?? 0)} recuperados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de renovação
              </CardTitle>
              <RefreshCw className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{taxaRenovacao}%</div>
              <Progress value={taxaRenovacao} className="mt-2 h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {renovadosVencidos} de {vencidos.length} vencidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Perdidos</CardTitle>
              <UserX className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">{perdidos}</div>
              <p className="text-xs text-muted-foreground mt-1">vencidos sem renovação</p>
            </CardContent>
          </Card>
        </div>

        {/* Valor potencial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Valor potencial em processo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fmtEUR(valorPotencial)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma do valor da última venda dos clientes ainda no radar (não renovados nem
              perdidos).
            </p>
          </CardContent>
        </Card>

        {/* Filtro */}
        <div className="flex flex-wrap gap-2">
          {(["Todas", "D-45", "D-30", "D-15", "D-0"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filtro === f ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setFiltro(f)}
            >
              {f}
            </Button>
          ))}
        </div>

        {/* Kanban */}
        <div className="grid gap-4 lg:grid-cols-4">
          {STAGES.map((stage) => {
            const itemsDoStage = itensFiltrados.filter((a) => a.stage === stage.key);
            return (
              <div key={stage.key} className="space-y-3">
                <div className={`rounded-lg border ${stage.ring} ${stage.bg} p-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm font-bold ${stage.color}`}>{stage.label}</div>
                      <div className="text-xs text-muted-foreground">{stage.subtitle}</div>
                    </div>
                    <Badge variant="outline" className={stage.color}>
                      {itemsDoStage.length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {itemsDoStage.map((a) => (
                    <Card key={a.saleId} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{a.nome}</div>
                            <div className="text-xs text-muted-foreground">{a.vendedor}</div>
                          </div>
                          <div className={`text-xs font-medium ${stage.color}`}>
                            {a.diasRestantes}d
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Valor</span>
                          <span className="font-medium">{fmtEUR(a.valor)}</span>
                        </div>
                        <Select
                          value={a.status}
                          onValueChange={(v) => mudarStatus(a.saleId, v as Status)}
                        >
                          <SelectTrigger className="h-7 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPCOES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1.5 pt-1">
                          <Button size="sm" variant="outline" className="h-7 flex-1 text-xs">
                            <Phone className="mr-1 h-3 w-3" /> Ligar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 flex-1 text-xs">
                            <MessageCircle className="mr-1 h-3 w-3" /> WA
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {itemsDoStage.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-4">Sem clientes</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scripts */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Scripts de objeção</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SCRIPTS.map((s, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-red-400">"{s.objecao}"</p>
                  <p className="text-sm text-foreground/90">{s.script}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={TATICA_COLOR[s.tatica]}>
                      {s.tatica}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => copy(s.script)}>
                      <Copy className="mr-1 h-3 w-3" /> Copiar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Ações urgentes */}
        <Card className="border-orange-500/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <CardTitle className="text-base">Ações urgentes hoje</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma ação urgente.</p>
            )}
            {urgentes.map((a) => {
              const stage = STAGES.find((s) => s.key === a.stage)!;
              return (
                <div
                  key={a.saleId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`${stage.color} ${stage.ring}`}>
                      {a.stage}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium">{a.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.vendedor} · vence em {a.diasRestantes}d
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Phone className="mr-1 h-3 w-3" /> Ligar
                    </Button>
                    <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
                      <MessageCircle className="mr-1 h-3 w-3" /> WhatsApp
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function ConfigDuracao({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["renewal-settings"],
    queryFn: () => getRenewalSettings(),
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function salvar(produtoGrupo: string) {
    const dias = Number(drafts[produtoGrupo]);
    if (!dias || dias <= 0) return toast.error("Duração inválida");
    await updateRenewalDuration({ data: { produto_grupo: produtoGrupo, duracao_dias: dias } });
    queryClient.invalidateQueries({ queryKey: ["renewal-settings"] });
    queryClient.invalidateQueries({ queryKey: ["renewal-radar"] });
    toast.success("Duração atualizada");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Duração do programa por produto</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          A Clint não guarda data de vencimento de contrato — o radar calcula{" "}
          <code className="rounded bg-muted px-1 py-0.5">data da venda + duração</code> para cada
          produto abaixo.
        </p>
        {(settings ?? []).map((s) => (
          <div key={s.produto_grupo} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px]">
              <Label className="mb-1 block text-xs">{s.produto_grupo}</Label>
              <Input
                type="number"
                min={1}
                defaultValue={s.duracao_dias}
                onChange={(e) => setDrafts((d) => ({ ...d, [s.produto_grupo]: e.target.value }))}
                className="w-32"
              />
            </div>
            <Button size="sm" onClick={() => salvar(s.produto_grupo)}>
              Salvar
            </Button>
          </div>
        ))}
        {(settings ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma configuração encontrada.</p>
        )}
      </CardContent>
    </Card>
  );
}
