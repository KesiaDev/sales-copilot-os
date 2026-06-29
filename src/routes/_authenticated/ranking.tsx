import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getDashboardMetrics, getDestaques } from "@/lib/dashboard.functions";
import { listDailyReports } from "@/lib/data.functions";
import { formatPercent } from "@/lib/format";
import { useFormatCurrency } from "@/components/currency-provider";
import { getSellerPhoto } from "@/lib/seller-photos";
import { Trophy, Star, TrendingUp, CalendarDays, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ranking")({ component: RankingPage });

function medal(i: number) {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return `#${i + 1}`;
}

function calcScore(receita: number, conversao: number, vendas: number) {
  return Math.round(receita / 100 + conversao * 5 + vendas * 10);
}

function initials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function SellerAvatar({ nome, size = "md" }: { nome: string; size?: "sm" | "md" | "lg" }) {
  const photo = getSellerPhoto(nome);
  const sizeClass = size === "lg" ? "h-16 w-16" : size === "md" ? "h-10 w-10" : "h-8 w-8";
  const textClass = size === "lg" ? "text-xl" : size === "md" ? "text-sm" : "text-xs";
  return (
    <Avatar className={`${sizeClass} ring-2 ring-accent/30`}>
      <AvatarImage src={photo} alt={nome} />
      <AvatarFallback className={`bg-gradient-to-br from-accent/20 to-primary/20 font-bold ${textClass}`}>
        {initials(nome)}
      </AvatarFallback>
    </Avatar>
  );
}

function DestaqueCard({
  label,
  icon: Icon,
  data,
  accent,
}: {
  label: string;
  icon: React.ElementType;
  data: { nome: string; avatarUrl: string | null; receita: number; vendas: number } | null | undefined;
  accent: string;
}) {
  const fmt = useFormatCurrency();
  if (!data) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur-sm`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`h-4 w-4 ${accent}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <p className="text-sm text-muted-foreground">Sem dados ainda</p>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 p-5 backdrop-blur-sm transition-all hover:shadow-glow hover:border-accent/30`}>
      {/* glow blob */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-4 w-4 ${accent}`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <SellerAvatar nome={data.nome} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold truncate">{data.nome}</p>
            <Crown className="h-4 w-4 text-accent flex-shrink-0" />
          </div>
          <p className="text-2xl font-black text-gradient-primary tabular-nums">{fmt(data.receita)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.vendas} {data.vendas === 1 ? "venda" : "vendas"}</p>
        </div>
      </div>
    </div>
  );
}

function RankRow({ rank, nome, receita, conversao, vendas }: any) {
  const fmt = useFormatCurrency();
  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 transition-all ${rank === 0 ? "bg-gradient-to-r from-accent/15 to-transparent border-accent/20" : "bg-card/50"}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 text-center text-xl">{medal(rank)}</div>
        <SellerAvatar nome={nome} size="sm" />
        <div>
          <div className="text-sm font-semibold">{nome}</div>
          <div className="text-xs text-muted-foreground">
            {vendas} vendas · {formatPercent(conversao)} conv.
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold tabular-nums">{fmt(receita)}</div>
        <div className="text-xs text-muted-foreground">
          {calcScore(receita, conversao, vendas)} pts
        </div>
      </div>
    </div>
  );
}

function RankingPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardMetrics() });
  const { data: reports } = useQuery({ queryKey: ["reports"], queryFn: () => listDailyReports() });
  const { data: destaques, isLoading: loadingDestaques } = useQuery({
    queryKey: ["destaques"],
    queryFn: () => getDestaques(),
  });

  const buildFromReports = (days: number) => {
    const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const filtered = (reports ?? []).filter((r: any) => r.data >= cutoff);
    const map = new Map<string, { nome: string; receita: number; vendas: number; conversao: number; leads: number }>();
    for (const r of filtered) {
      const k = r.profile?.full_name ?? "—";
      const cur = map.get(k) ?? { nome: k, receita: 0, vendas: 0, conversao: 0, leads: 0 };
      cur.receita += Number(r.valor_vendido);
      cur.vendas += Number(r.vendas_fechadas);
      cur.leads += Number(r.leads_atendidos);
      map.set(k, cur);
    }
    return [...map.values()]
      .map((v) => ({ ...v, conversao: v.leads ? (v.vendas / v.leads) * 100 : 0 }))
      .sort((a, b) => b.receita - a.receita);
  };

  const daily = buildFromReports(1);
  const weekly = buildFromReports(7);
  const monthly = (data?.porVendedor ?? []).map((v: any) => ({
    nome: v.nome,
    receita: v.receita,
    vendas: v.vendas,
    conversao: v.conversao,
  }));

  return (
    <>
      <Topbar title="Ranking" subtitle="Destaques e performance individual" showCurrencyToggle />
      <main className="p-4 md:p-6 space-y-6">

        {/* ── Destaques section ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold">Destaques</h2>
            {loadingDestaques && (
              <Badge variant="secondary" className="text-xs">carregando…</Badge>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <DestaqueCard
              label="Destaque do dia anterior"
              icon={CalendarDays}
              data={destaques?.dia}
              accent="text-blue-400"
            />
            <DestaqueCard
              label="Destaque da semana"
              icon={TrendingUp}
              data={destaques?.semana}
              accent="text-accent"
            />
            <DestaqueCard
              label="Destaque do mês"
              icon={Crown}
              data={destaques?.mes}
              accent="text-amber-400"
            />
          </div>
        </div>

        {/* ── Full ranking tabs ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              <CardTitle className="text-base">Ranking de vendedores</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="monthly">
              <TabsList>
                <TabsTrigger value="daily">Diário</TabsTrigger>
                <TabsTrigger value="weekly">Semanal</TabsTrigger>
                <TabsTrigger value="monthly">Mensal</TabsTrigger>
              </TabsList>
              <TabsContent value="daily" className="mt-4 space-y-2">
                {daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem fechamentos hoje.</p>
                ) : (
                  daily.map((v, i) => <RankRow key={v.nome} rank={i} {...v} />)
                )}
              </TabsContent>
              <TabsContent value="weekly" className="mt-4 space-y-2">
                {weekly.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  weekly.map((v, i) => <RankRow key={v.nome} rank={i} {...v} />)
                )}
              </TabsContent>
              <TabsContent value="monthly" className="mt-4 space-y-2">
                {monthly.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  monthly.map((v: any, i: number) => <RankRow key={v.nome} rank={i} {...v} />)
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
