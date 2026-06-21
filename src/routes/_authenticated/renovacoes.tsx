import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, CheckCircle2, UserX, RefreshCw, Bell, Phone, MessageCircle,
  AlertTriangle, Copy,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/renovacoes")({ component: RenovacoesPage });

type Stage = "D-45" | "D-30" | "D-15" | "D-0";
type Status =
  | "Aguardando" | "Contato feito" | "Reunião agendada"
  | "Proposta enviada" | "Renovado" | "Perdido";

type Aluno = {
  id: string; nome: string; vendedor: string; stage: Stage;
  diasRestantes: number; valor: number; status: Status; ultimoContato?: string;
};

const ALUNOS: Aluno[] = [
  { id: "1", nome: "Ana Costa",        vendedor: "Fabio Nadal", stage: "D-45", diasRestantes: 45, valor: 3600, status: "Aguardando" },
  { id: "2", nome: "Bruno Lima",       vendedor: "Rita",        stage: "D-45", diasRestantes: 42, valor: 3600, status: "Aguardando" },
  { id: "3", nome: "Carla Mendes",     vendedor: "João",        stage: "D-30", diasRestantes: 28, valor: 3600, status: "Contato feito" },
  { id: "4", nome: "Diego Santos",     vendedor: "Fabio Nadal", stage: "D-30", diasRestantes: 25, valor: 4200, status: "Reunião agendada" },
  { id: "5", nome: "Elena Rocha",      vendedor: "Gisele",      stage: "D-15", diasRestantes: 14, valor: 3600, status: "Proposta enviada" },
  { id: "6", nome: "Felipe Nunes",     vendedor: "Luana",       stage: "D-15", diasRestantes: 12, valor: 3600, status: "Contato feito" },
  { id: "7", nome: "Gabriela Alves",   vendedor: "Rita",        stage: "D-0",  diasRestantes: 2,  valor: 3600, status: "Proposta enviada", ultimoContato: "há 3 dias" },
  { id: "8", nome: "Henrique Souza",   vendedor: "João",        stage: "D-0",  diasRestantes: 0,  valor: 3600, status: "Aguardando",       ultimoContato: "há 7 dias" },
];

const RENOVADOS_MES = 8;
const VALOR_RECUPERADO = 28400;
const EM_OFFBOARDING = 3;
const TAXA_RENOVACAO = 73;
const META_RENOVACAO = 30;

const STAGES: { key: Stage; label: string; subtitle: string; color: string; ring: string; bg: string }[] = [
  { key: "D-45", label: "D-45", subtitle: "No radar",         color: "text-blue-400",   ring: "border-blue-500/40",   bg: "bg-blue-500/10" },
  { key: "D-30", label: "D-30", subtitle: "1º contato",       color: "text-yellow-400", ring: "border-yellow-500/40", bg: "bg-yellow-500/10" },
  { key: "D-15", label: "D-15", subtitle: "Oferta especial",  color: "text-orange-400", ring: "border-orange-500/40", bg: "bg-orange-500/10" },
  { key: "D-0",  label: "D-0",  subtitle: "Última chance",    color: "text-red-400",    ring: "border-red-500/40",    bg: "bg-red-500/10" },
];

const STATUS_VARIANT: Record<Status, string> = {
  "Aguardando":        "bg-muted text-muted-foreground",
  "Contato feito":     "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Reunião agendada":  "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "Proposta enviada":  "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Renovado":          "bg-green-500/15 text-green-300 border-green-500/30",
  "Perdido":           "bg-red-500/15 text-red-300 border-red-500/30",
};

const SCRIPTS = [
  {
    objecao: "Está caro, não tenho esse valor agora.",
    script: "Entendo. Pensando no impacto que o programa já trouxe pra você, faz mais sentido dividir em 12x para manter o ritmo ou pausar e voltar do zero depois?",
    tatica: "Parcelamento",
  },
  {
    objecao: "Já aprendi o que precisava, não vejo motivo para renovar.",
    script: "Faz sentido você sentir isso. O próximo nível não é mais conteúdo — é execução guiada nos seus números atuais. Posso te mostrar o que muda?",
    tatica: "Reframing",
  },
  {
    objecao: "Preciso pensar, te respondo semana que vem.",
    script: "Claro. Só pra você saber: as vagas com a condição atual fecham em 48h e voltam ao valor cheio. Quer que eu te reserve enquanto decide?",
    tatica: "Urgência",
  },
  {
    objecao: "Vou tentar sozinho esse ciclo.",
    script: "Posso ser sincero? Quem renova é exatamente quem chega no patamar que você quer. Sozinho dá pra manter, mas escalar sem mentoria custa muito mais caro depois.",
    tatica: "Exclusividade",
  },
  {
    objecao: "Meu negócio está em um momento ruim.",
    script: "Conta mais o que está acontecendo. Antes de qualquer proposta quero entender se o problema é fluxo, oferta ou tráfego — pode ser que a renovação seja exatamente o que destrava.",
    tatica: "Escuta ativa",
  },
];

const TATICA_COLOR: Record<string, string> = {
  "Parcelamento":  "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Reframing":     "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "Exclusividade": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "Urgência":      "bg-red-500/15 text-red-300 border-red-500/30",
  "Escuta ativa":  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function fmtEUR(v: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function RenovacoesPage() {
  const [filtro, setFiltro] = useState<"Todas" | Stage>("Todas");

  const valorPotencial = useMemo(() => ALUNOS.reduce((s, a) => s + a.valor, 0), []);
  const valorConvertido = useMemo(
    () => ALUNOS.filter(a => a.status === "Renovado").reduce((s, a) => s + a.valor, 0),
    []
  );
  const valorPerdido = useMemo(
    () => ALUNOS.filter(a => a.status === "Perdido").reduce((s, a) => s + a.valor, 0),
    []
  );
  const pctConvertido = valorPotencial ? Math.round((valorConvertido / valorPotencial) * 100) : 0;
  const pctPerdido = valorPotencial ? Math.round((valorPerdido / valorPotencial) * 100) : 0;

  const alunosFiltrados = filtro === "Todas" ? ALUNOS : ALUNOS.filter(a => a.stage === filtro);
  const urgentes = ALUNOS.filter(a => (a.stage === "D-0" || a.stage === "D-15") && a.status === "Aguardando");

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Script copiado");
  }

  return (
    <>
      <Topbar title="Renovações" subtitle="Radar automático D-45 → D-0 · Mentoria Gestor de Tráfego" />
      <main className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Sincronizado")}>
            <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar
          </Button>
          <Button size="sm" className="bg-purple-600 text-white hover:bg-purple-700" onClick={() => toast.success("Alertas configurados")}>
            <Bell className="mr-2 h-4 w-4" /> Configurar alertas
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em processo</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{ALUNOS.length}</div>
              <p className="text-xs text-muted-foreground mt-1">alunos no radar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Renovados este mês</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{RENOVADOS_MES}</div>
              <p className="text-xs text-muted-foreground mt-1">{fmtEUR(VALOR_RECUPERADO)} recuperados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de renovação</CardTitle>
              <RefreshCw className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{TAXA_RENOVACAO}%</div>
              <Progress value={TAXA_RENOVACAO} className="mt-2 h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Meta {META_RENOVACAO}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em offboarding</CardTitle>
              <UserX className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">{EM_OFFBOARDING}</div>
              <p className="text-xs text-muted-foreground mt-1">descontinuando</p>
            </CardContent>
          </Card>
        </div>

        {/* Valor potencial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Valor potencial em processo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="text-3xl font-bold">{fmtEUR(valorPotencial)}</div>
              <div className="text-sm text-muted-foreground">
                <span className="text-green-400 font-medium">{pctConvertido}% convertido</span>
                {" · "}
                <span className="text-red-400 font-medium">{pctPerdido}% perdido</span>
              </div>
            </div>
            <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="bg-green-500" style={{ width: `${pctConvertido}%` }} />
              <div className="bg-red-500" style={{ width: `${pctPerdido}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Filtro */}
        <div className="flex flex-wrap gap-2">
          {(["Todas", "D-45", "D-30", "D-15", "D-0"] as const).map(f => (
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
          {STAGES.map(stage => {
            const items = alunosFiltrados.filter(a => a.stage === stage.key);
            return (
              <div key={stage.key} className="space-y-3">
                <div className={`rounded-lg border ${stage.ring} ${stage.bg} p-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm font-bold ${stage.color}`}>{stage.label}</div>
                      <div className="text-xs text-muted-foreground">{stage.subtitle}</div>
                    </div>
                    <Badge variant="outline" className={stage.color}>{items.length}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.map(a => (
                    <Card key={a.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{a.nome}</div>
                            <div className="text-xs text-muted-foreground">{a.vendedor}</div>
                          </div>
                          <div className={`text-xs font-medium ${stage.color}`}>{a.diasRestantes}d</div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Valor</span>
                          <span className="font-medium">{fmtEUR(a.valor)}</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_VARIANT[a.status]}`}>
                          {a.status}
                        </Badge>
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
                  {items.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-4">Sem alunos</p>
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
                    <Badge variant="outline" className={TATICA_COLOR[s.tatica]}>{s.tatica}</Badge>
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
            {urgentes.map(a => {
              const stage = STAGES.find(s => s.key === a.stage)!;
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`${stage.color} ${stage.ring}`}>{a.stage}</Badge>
                    <div>
                      <div className="text-sm font-medium">{a.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.vendedor} · último contato {a.ultimoContato ?? "—"}
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
