import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGemini(messages: any[], opts?: { model?: string; json?: boolean }) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const body: any = {
    model: opts?.model ?? "google/gemini-3-flash-preview",
    messages,
  };
  if (opts?.json) body.response_format = { type: "json_object" };
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("Limite de uso da IA atingido. Aguarde um instante.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos ao workspace.");
    throw new Error(`IA falhou (${res.status}): ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

// ===== DISC analysis from extracted text =====
const discInput = z.object({
  profile_id: z.string().uuid(),
  raw_text: z.string().min(20).max(20000),
  arquivo_nome: z.string().optional(),
  arquivo_url: z.string().optional(),
});

export const analyzeDISC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => discInput.parse(d))
  .handler(async ({ context, data }) => {
    const prompt = `Você é um especialista em perfil comportamental DISC para lideranças comerciais.
Analise o conteúdo abaixo do relatório DISC e retorne JSON estrito com os campos:
{
  "dominancia": int 0-100,
  "influencia": int 0-100,
  "estabilidade": int 0-100,
  "conformidade": int 0-100,
  "perfil_resumido": string (2-3 frases),
  "pontos_fortes": string (3 a 5 bullets em uma única string com - no início de cada linha),
  "pontos_atencao": string (3 a 5 bullets - idem),
  "como_liderar": string (1 parágrafo prático),
  "como_cobrar": string,
  "como_reconhecer": string,
  "como_conduzir_feedback": string,
  "gatilhos_motivacionais": string (lista),
  "gatilhos_desmotivacao": string (lista)
}

Conteúdo do relatório:
"""
${data.raw_text}
"""

Retorne SOMENTE o JSON, sem markdown.`;

    const text = await callGemini([{ role: "user", content: prompt }], { json: true });
    let parsed: any;
    try { parsed = JSON.parse(text); }
    catch { throw new Error("IA retornou formato inválido. Tente novamente."); }

    const { error } = await context.supabase.from("behavior_profiles").upsert({
      profile_id: data.profile_id,
      dominancia: parsed.dominancia ?? null,
      influencia: parsed.influencia ?? null,
      estabilidade: parsed.estabilidade ?? null,
      conformidade: parsed.conformidade ?? null,
      perfil_resumido: parsed.perfil_resumido,
      pontos_fortes: parsed.pontos_fortes,
      pontos_atencao: parsed.pontos_atencao,
      como_liderar: parsed.como_liderar,
      como_cobrar: parsed.como_cobrar,
      como_reconhecer: parsed.como_reconhecer,
      como_conduzir_feedback: parsed.como_conduzir_feedback,
      gatilhos_motivacionais: parsed.gatilhos_motivacionais,
      gatilhos_desmotivacao: parsed.gatilhos_desmotivacao,
      arquivo_nome: data.arquivo_nome,
      arquivo_url: data.arquivo_url,
    }, { onConflict: "profile_id" });
    if (error) throw error;
    return parsed;
  });

export const listBehaviorProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("behavior_profiles").select("*, profile:profiles(id, full_name, cargo)");
    if (error) throw error;
    return data;
  });

// ===== Intelligence: Priorities for tomorrow =====
export const generateIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [profilesR, salesR, reportsR, leadsR] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, cargo").eq("ativo", true),
      context.supabase.from("sales").select("profile_id, valor, vendido_em").gte("vendido_em", since),
      context.supabase.from("daily_reports").select("*").gte("data", since.slice(0, 10)),
      context.supabase.from("leads").select("profile_id, status").gte("recebido_em", since),
    ]);

    const summary = (profilesR.data ?? []).map((p: any) => {
      const sales = (salesR.data ?? []).filter((s: any) => s.profile_id === p.id);
      const receita = sales.reduce((a: number, s: any) => a + Number(s.valor), 0);
      const reports = (reportsR.data ?? []).filter((r: any) => r.profile_id === p.id);
      const leads = (leadsR.data ?? []).filter((l: any) => l.profile_id === p.id);
      const ganhos = leads.filter((l: any) => l.status === "ganho").length;
      const conversao = leads.length ? (ganhos / leads.length) * 100 : 0;
      const callsAvg = reports.length ? reports.reduce((a, r: any) => a + r.calls_realizadas, 0) / reports.length : 0;
      const followAvg = reports.length ? reports.reduce((a, r: any) => a + r.follow_ups, 0) / reports.length : 0;
      const ajudaPedida = reports.filter((r: any) => r.precisa_ajuda).length;
      return { nome: p.full_name, cargo: p.cargo, receita, conversao, callsAvg, followAvg, ajudaPedida, vendas: sales.length };
    });

    const prompt = `Você é Copiloto de Head Comercial. Com base nos dados a seguir dos últimos 30 dias, identifique prioridades para amanhã.
Classifique cada item como "alta", "media" ou "reconhecimento" e retorne JSON estrito:

{ "prioridades": [ { "prioridade": "alta"|"media"|"reconhecimento", "profile_nome": string, "titulo": string, "descricao": string, "acao_sugerida": string } ] }

Inclua 4 a 7 itens. Equilibre alertas e reconhecimentos. Use linguagem direta e executiva.

Dados:
${JSON.stringify(summary, null, 2)}

Retorne SOMENTE o JSON.`;

    const text = await callGemini([{ role: "user", content: prompt }], { json: true });
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { throw new Error("IA retornou formato inválido."); }

    const today = new Date().toISOString().slice(0, 10);
    await context.supabase.from("daily_insights").delete().eq("data", today);

    const profiles = profilesR.data ?? [];
    const rows = (parsed.prioridades ?? []).map((p: any) => {
      const prof = profiles.find((x: any) => x.full_name === p.profile_nome);
      return {
        data: today,
        profile_id: prof?.id ?? null,
        prioridade: p.prioridade,
        titulo: p.titulo,
        descricao: p.descricao,
        acao_sugerida: p.acao_sugerida,
      };
    });
    if (rows.length) {
      const { error } = await context.supabase.from("daily_insights").insert(rows);
      if (error) throw error;
    }
    return { count: rows.length };
  });

export const listInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("daily_insights").select("*, profile:profiles(full_name)")
      .order("data", { ascending: false }).limit(50);
    if (error) throw error;
    return data;
  });

// ===== Daily Executive Summary =====
export const generateDailySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const yStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
    const yEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1).toISOString();

    const [salesR, leadsR, profilesR, goalsR] = await Promise.all([
      context.supabase.from("sales").select("valor, profile_id").gte("vendido_em", yStart).lt("vendido_em", yEnd),
      context.supabase.from("leads").select("status").gte("recebido_em", yStart).lt("recebido_em", yEnd),
      context.supabase.from("profiles").select("id, full_name"),
      context.supabase.from("goals").select("valor_meta").eq("mes", yesterday.getMonth() + 1).eq("ano", yesterday.getFullYear()),
    ]);

    const receita = (salesR.data ?? []).reduce((a, s: any) => a + Number(s.valor), 0);
    const metaMensal = (goalsR.data ?? []).reduce((a, g: any) => a + Number(g.valor_meta), 0);
    const dim = new Date(yesterday.getFullYear(), yesterday.getMonth() + 1, 0).getDate();
    const metaDiaria = metaMensal / dim;
    const gap = metaDiaria - receita;
    const leads = leadsR.data ?? [];
    const ganhos = leads.filter((l: any) => l.status === "ganho").length;
    const conversao = leads.length ? (ganhos / leads.length) * 100 : 0;

    const profiles = profilesR.data ?? [];
    const byVend = new Map<string, number>();
    (salesR.data ?? []).forEach((s: any) => byVend.set(s.profile_id, (byVend.get(s.profile_id) ?? 0) + Number(s.valor)));
    const top = [...byVend.entries()].sort((a, b) => b[1] - a[1])[0];
    const melhor = top ? (profiles.find((p: any) => p.id === top[0])?.full_name ?? "—") : "—";

    const prompt = `Gere um resumo executivo para Head Comercial em português, em até 6 linhas, com tom direto e prático. Inclua ponto de atenção e plano de ação para hoje.

Dados de ontem:
- Receita: €${receita.toFixed(2)}
- Meta diária: €${metaDiaria.toFixed(2)}
- Gap: €${gap.toFixed(2)}
- Conversão: ${conversao.toFixed(1)}%
- Melhor vendedor: ${melhor}

Retorne JSON: { "resumo": string, "ponto_atencao": string, "plano_acao": string }`;

    const text = await callGemini([{ role: "user", content: prompt }], { json: true });
    let parsed: any = { resumo: text, ponto_atencao: "—", plano_acao: "—" };
    try { parsed = JSON.parse(text); } catch {}

    const today = new Date().toISOString().slice(0, 10);
    const row = {
      data: today, receita, meta_diaria: metaDiaria, gap, conversao,
      melhor_vendedor: melhor,
      ponto_atencao: parsed.ponto_atencao,
      plano_acao: parsed.plano_acao,
      resumo_ia: parsed.resumo,
    };
    await context.supabase.from("daily_summaries").upsert(row, { onConflict: "data" });
    return row;
  });

export const getLatestSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("daily_summaries").select("*").order("data", { ascending: false }).limit(1).maybeSingle();
    return data;
  });

// ===== Objection AI suggestion =====
export const suggestObjectionResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ texto: z.string().min(3).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const text = await callGemini([
      { role: "system", content: "Você é coach de vendas. Dê respostas curtas (até 3 frases), persuasivas e éticas." },
      { role: "user", content: `Sugira uma resposta para a objeção: "${data.texto}"` },
    ]);
    return { resposta: text.trim() };
  });

// ===== AI Leadership Copilot chat =====
const chatInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() })).max(40),
});
export const copilotChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => chatInput.parse(d))
  .handler(async ({ context, data }) => {
    // Gather context
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [profilesR, salesR, reportsR, discR, insightsR] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, cargo, observacoes").eq("ativo", true),
      context.supabase.from("sales").select("profile_id, valor, vendido_em").gte("vendido_em", since),
      context.supabase.from("daily_reports").select("*").gte("data", since.slice(0, 10)),
      context.supabase.from("behavior_profiles").select("*, profile:profiles(full_name)"),
      context.supabase.from("daily_insights").select("*").order("data", { ascending: false }).limit(10),
    ]);

    const ctx = {
      equipe: profilesR.data,
      vendas_30d: salesR.data,
      fechamentos_30d: reportsR.data,
      perfis_disc: discR.data,
      insights_recentes: insightsR.data,
    };

    const system = `Você é o Copiloto de IA de Liderança Comercial da LLMídia. Responda em português, sempre prático e direto. Use os dados abaixo para responder, citando vendedores por nome quando relevante. Quando faltarem dados, diga claramente.

DADOS:
${JSON.stringify(ctx).slice(0, 18000)}`;

    const text = await callGemini([
      { role: "system", content: system },
      ...data.messages,
    ]);
    return { content: text };
  });
