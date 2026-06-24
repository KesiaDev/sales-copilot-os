// Client-side Hotmart CSV parser
import {
  classifyHotmartProduct,
  isOutOfScopeProduct,
  isOwnProducerDocument,
} from "@/lib/hotmart-product";
import { norm } from "@/lib/text-normalize";

export type ParsedRow = {
  external_id: string;
  produto: string;
  produto_grupo: string | null;
  vendedor: string | null;
  comprador: string | null;
  comprador_email: string | null;
  valor: number;
  vendido_em: string; // ISO
  pais: string | null;
  status: "aprovada" | "reembolsada" | "cancelada" | "outro";
  raw: Record<string, string>;
};

export type ExcludedRow = {
  external_id: string;
  produto: string;
  valor: number;
  motivo: string;
};

function detectDelimiter(line: string): string {
  const candidates = [";", ",", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const c = line.split(d).length;
    if (c > bestCount) {
      bestCount = c;
      best = d;
    }
  }
  return best;
}

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === delim && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function findCol(headers: string[], keys: string[]): number {
  const normH = headers.map(norm);
  for (const k of keys) {
    const nk = norm(k);
    const idx = normH.findIndex((h) => h === nk || h.includes(nk));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseValor(raw: string): number {
  if (!raw) return 0;
  let s = raw.replace(/[^\d,.-]/g, "");
  // If both . and , present, assume . thousands and , decimal (pt-BR)
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  const t = raw.trim();
  // DD/MM/YYYY [HH:mm[:ss]]
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, d, mo, y, h = "0", mi = "0", se = "0"] = m;
    const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
    return dt.toISOString();
  }
  const dt = new Date(t);
  if (!isNaN(dt.getTime())) return dt.toISOString();
  return new Date().toISOString();
}

function parseStatus(raw: string): ParsedRow["status"] {
  const s = norm(raw);
  if (!s) return "outro";
  if (s.includes("aprov") || s.includes("complet") || s.includes("paid")) return "aprovada";
  if (
    s.includes("reembols") ||
    s.includes("refund") ||
    s.includes("estorn") ||
    s.includes("chargeback")
  )
    return "reembolsada";
  if (s.includes("cancel")) return "cancelada";
  return "outro";
}

export function parseHotmartCsv(text: string): {
  rows: ParsedRow[];
  excluded: ExcludedRow[];
  headers: string[];
  skipped: number;
} {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], excluded: [], headers: [], skipped: 0 };
  const delim = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delim);

  const idxTx = findCol(headers, ["transacao", "transaction", "codigo da transacao"]);
  const idxProd = findCol(headers, ["nome do produto", "produto", "product"]);
  const idxVend = findCol(headers, ["vendedor", "seller"]);
  const idxComp = findCol(headers, ["comprador", "buyer", "cliente"]);
  const idxEmail = findCol(headers, [
    "email do comprador",
    "e-mail do comprador",
    "email",
    "buyer email",
  ]);
  const idxValor = findCol(headers, [
    "voce recebeu",
    "valor",
    "vocereceberau",
    "comissao",
    "price",
  ]);
  const idxData = findCol(headers, ["data da compra", "data", "order date", "purchase date"]);
  const idxStatus = findCol(headers, ["status", "situacao"]);
  const idxProdutorDoc = findCol(headers, ["documento do produtor", "producer document"]);
  const idxPais = findCol(headers, ["pais", "country"]);

  const rows: ParsedRow[] = [];
  const excluded: ExcludedRow[] = [];
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delim);
    const raw: Record<string, string> = {};
    headers.forEach((h, j) => (raw[h] = cols[j] ?? ""));
    const external_id = (idxTx >= 0 ? cols[idxTx] : "").trim();
    if (!external_id) {
      skipped++;
      continue;
    }
    const status = parseStatus(idxStatus >= 0 ? cols[idxStatus] : "");
    if (status === "outro") {
      skipped++;
      continue;
    }
    const produto = (idxProd >= 0 ? cols[idxProd] : "").trim() || "Hotmart Product";
    const produtorDoc = idxProdutorDoc >= 0 ? cols[idxProdutorDoc].trim() : "";
    const valor = parseValor(idxValor >= 0 ? cols[idxValor] : "");

    if (!isOwnProducerDocument(produtorDoc)) {
      excluded.push({
        external_id,
        produto,
        valor,
        motivo: "Comissão de afiliação — produto não é da LLMídia",
      });
      continue;
    }
    if (isOutOfScopeProduct(produto)) {
      excluded.push({ external_id, produto, valor, motivo: "Produto fora do escopo da Sales OS" });
      continue;
    }

    rows.push({
      external_id,
      produto,
      produto_grupo: classifyHotmartProduct(produto),
      vendedor: idxVend >= 0 ? cols[idxVend].trim() || null : null,
      comprador: idxComp >= 0 ? cols[idxComp].trim() || null : null,
      comprador_email: idxEmail >= 0 ? cols[idxEmail].trim() || null : null,
      valor,
      vendido_em: parseDate(idxData >= 0 ? cols[idxData] : ""),
      pais: idxPais >= 0 ? cols[idxPais].trim() || null : null,
      status,
      raw,
    });
  }
  return { rows, excluded, headers, skipped };
}
