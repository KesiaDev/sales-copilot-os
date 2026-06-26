// Classificacao de produtos da Hotmart para o time da LLMidia Sales OS.
// Os grupos seguem a mesma nomenclatura ja usada em comissionamento.tsx
// (PRODUTOS), para nao criar uma segunda taxonomia divergente.

import { norm as normalize } from "@/lib/text-normalize";

export const LLMIDIA_PRODUCER_DOCUMENT = "28469058000106";

// Produtos que existem na conta produtora da Hotmart mas nao pertencem a
// este time de vendas (confirmado com a Kesia em 24/06/2026: "Reset Relacional"
// nao deve contar nos numeros da Sales OS).
const OUT_OF_SCOPE_PRODUCT_PATTERNS = [/resetrelacional/];

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

// Vendas/reembolsos vindos de um Documento do Produtor diferente do da
// LLMidia sao comissao de afiliacao por promover produto de outra empresa
// (ex: "Scalehot" na planilha de 24/06/2026) — nunca devem contar como
// receita/reembolso do time. Quando o campo nao vem preenchido (ex: webhook
// sem esse dado), nao bloqueia — so filtra quando ha certeza.
export function isOwnProducerDocument(documentoProdutor: string | null | undefined): boolean {
  if (!documentoProdutor) return true;
  return onlyDigits(documentoProdutor) === LLMIDIA_PRODUCER_DOCUMENT;
}

export function isOutOfScopeProduct(nomeProduto: string): boolean {
  const n = normalize(nomeProduto);
  return OUT_OF_SCOPE_PRODUCT_PATTERNS.some((re) => re.test(n));
}

// normalize() (de hotmart-csv.ts) remove tudo que nao for letra/numero, entao
// as palavras-chave abaixo tambem vem sem espaco/acento para bater certo.
// Subtipos confirmados com a Kesia em 26/06/2026: renovacao precisa ser
// quebrada em mentoria/TM/accelerator para o comissionamento bater certo.
export function classifyHotmartProduct(nomeProduto: string): string | null {
  const n = normalize(nomeProduto);
  const isRenewal = n.includes("renovacao") || n.includes("renewal") || n.includes("sucesso");
  if (isRenewal) {
    if (n.includes("trafficmaster") || n.includes("traficmaster") || /\btm\b/.test(nomeProduto.toLowerCase()))
      return "Renovação TM";
    if (n.includes("accelerator") || n.includes("acc")) return "Renovação acc";
    return "Renovação mentoria";
  }
  if ((n.includes("mentoria") || n.includes("gestor")) && (n.includes("trafego") || n.includes("gt")))
    return "Gestor de tráfego pago 2.0 - AU";
  if ((n.includes("formacao") || n.includes("gestao")) && n.includes("redessociais"))
    return "Formação gestor de redes sociais 2.0";
  if (n.includes("masterandscale") || n.includes("master&scale") || n.includes("masterandscala"))
    return "Master and Scale 2025";
  if (n.includes("trafficmaster") || n.includes("traficmaster")) return "Tráfico Master";
  if (n.includes("accelerator")) return "Programa Accelerator";
  if (n.includes("estrategista")) return "Estrategista de Infoprodutos";
  return null;
}
