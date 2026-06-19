export function formatCurrency(value: number | null | undefined, currency = "EUR") {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
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
