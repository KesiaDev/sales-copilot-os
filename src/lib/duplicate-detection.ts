import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Heuristica de deteccao de duplicatas entre fontes diferentes (Clint sync x
// import manual de CSV da Hotmart x webhook Hotmart). O external_id de cada
// fonte vive em um namespace diferente (id do deal na Clint vs. codigo da
// transacao na Hotmart), entao o unique index de external_id/external_source
// nao pega duplicatas entre fontes. Aqui so flagamos por valor + janela de
// data para revisao humana — nunca apagamos ou bloqueamos a venda automaticamente,
// porque dois compradores diferentes pagando o mesmo preco no mesmo dia é um
// falso positivo legitimo.
const WINDOW_HOURS = 36;
const EMAIL_WINDOW_DAYS = 30;
const VALOR_EPSILON = 0.01;

export type DuplicateCandidate = {
  id: string;
  fonte: string;
  external_source: string | null;
  valor: number;
  vendido_em: string;
  matchedBy: "email" | "heuristic";
};

export async function findPossibleDuplicateSale(
  supabaseAdmin: SupabaseClient<Database>,
  params: {
    valor: number;
    vendidoEm: string;
    excludeExternalSource: string | null;
    compradorEmail?: string | null;
  },
): Promise<DuplicateCandidate | null> {
  const center = new Date(params.vendidoEm).getTime();
  if (isNaN(center)) return null;

  // Match por email do comprador é alta confiança (mesma pessoa, mesmo valor) e usa
  // uma janela mais larga, já que o atraso entre Hotmart registrar a compra e a
  // Clint marcar o negócio como ganho pode passar de 36h.
  if (params.compradorEmail) {
    const emailFrom = new Date(center - EMAIL_WINDOW_DAYS * 24 * 3600_000).toISOString();
    const emailTo = new Date(center + EMAIL_WINDOW_DAYS * 24 * 3600_000).toISOString();
    const { data: byEmail } = await supabaseAdmin
      .from("sales")
      .select("id, fonte, external_source, valor, vendido_em")
      .ilike("comprador_email", params.compradorEmail)
      .gte("vendido_em", emailFrom)
      .lte("vendido_em", emailTo)
      .gte("valor", params.valor - VALOR_EPSILON)
      .lte("valor", params.valor + VALOR_EPSILON)
      .eq("possible_duplicate", false)
      .limit(5);
    const emailMatch = (byEmail ?? []).find(
      (r) => (r.external_source ?? null) !== (params.excludeExternalSource ?? null),
    );
    if (emailMatch) return { ...emailMatch, matchedBy: "email" };
  }

  const from = new Date(center - WINDOW_HOURS * 3600_000).toISOString();
  const to = new Date(center + WINDOW_HOURS * 3600_000).toISOString();

  const { data } = await supabaseAdmin
    .from("sales")
    .select("id, fonte, external_source, valor, vendido_em")
    .gte("vendido_em", from)
    .lte("vendido_em", to)
    .gte("valor", params.valor - VALOR_EPSILON)
    .lte("valor", params.valor + VALOR_EPSILON)
    .eq("possible_duplicate", false)
    .limit(5);

  const heuristicMatch = (data ?? []).find(
    (r) => (r.external_source ?? null) !== (params.excludeExternalSource ?? null),
  );
  return heuristicMatch ? { ...heuristicMatch, matchedBy: "heuristic" } : null;
}

export function buildDuplicateReason(candidate: DuplicateCandidate): string {
  if (candidate.matchedBy === "email") {
    return `Possível duplicata: mesmo comprador (e-mail) e mesmo valor (${candidate.valor}) já registrados via "${candidate.fonte}" (id ${candidate.id}). Alta confiança — provavelmente a mesma venda gravada duas vezes.`;
  }
  return `Possível duplicata: já existe venda de mesmo valor (${candidate.valor}) registrada via "${candidate.fonte}" (id ${candidate.id}) em data próxima. Revisar manualmente — pode ser falso positivo (dois compradores diferentes no mesmo preço/dia).`;
}
