export function formatCurrency(value: number | null | undefined, _currency = "EUR") {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
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
  return new Date().toISOString().slice(0, 10);
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
