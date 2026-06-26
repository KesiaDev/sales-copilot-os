export function formatCurrency(value: number | null | undefined, currency = "EUR") {
  const n = Number(value ?? 0);
  const locale = currency === "BRL" ? "pt-BR" : "pt-PT";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  const n = Number(value ?? 0);
  return `${n.toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-PT").format(Number(value ?? 0));
}

export function shortDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(date);
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDurationSeconds(seconds: number | null | undefined) {
  const s = Number(seconds ?? 0);
  if (!s || s <= 0) return "—";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((s % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function monthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-PT", { month: "short", year: "2-digit" }).format(
    new Date(y, m - 1, 1),
  );
}
