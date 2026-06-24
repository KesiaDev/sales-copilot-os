import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

type CurrencyCode = "EUR" | "BRL";

// Cotação de fallback usada só se a API de câmbio estiver fora — mantém a UI
// funcional, mas o valor real sempre vem do fetch quando disponível.
const FALLBACK_RATE = 6.1;

type CurrencyCtxValue = {
  currency: CurrencyCode;
  toggle: () => void;
  rate: number;
  rateLoading: boolean;
  convert: (valorEur: number) => number;
};

const CurrencyCtx = createContext<CurrencyCtxValue>({
  currency: "EUR",
  toggle: () => {},
  rate: FALLBACK_RATE,
  rateLoading: false,
  convert: (v) => v,
});

async function fetchEurBrlRate(): Promise<number> {
  const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=BRL");
  if (!res.ok) throw new Error("Falha ao buscar cotação EUR/BRL");
  const json = await res.json();
  const rate = json?.rates?.BRL;
  if (typeof rate !== "number") throw new Error("Cotação EUR/BRL inválida");
  return rate;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");

  useEffect(() => {
    const stored =
      (typeof window !== "undefined" &&
        (localStorage.getItem("display_currency") as CurrencyCode | null)) ||
      "EUR";
    setCurrency(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("display_currency", currency);
  }, [currency]);

  const { data: rate, isLoading } = useQuery({
    queryKey: ["eur-brl-rate"],
    queryFn: fetchEurBrlRate,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const effectiveRate = rate ?? FALLBACK_RATE;

  return (
    <CurrencyCtx.Provider
      value={{
        currency,
        toggle: () => setCurrency((c) => (c === "EUR" ? "BRL" : "EUR")),
        rate: effectiveRate,
        rateLoading: isLoading,
        convert: (valorEur) => (currency === "BRL" ? valorEur * effectiveRate : valorEur),
      }}
    >
      {children}
    </CurrencyCtx.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyCtx);

export function useFormatCurrency(maximumFractionDigits = 0) {
  const { currency, convert } = useCurrency();
  return (valorEur: number | null | undefined) => {
    const n = convert(Number(valorEur ?? 0));
    const locale = currency === "BRL" ? "pt-BR" : "pt-PT";
    return n.toLocaleString(locale, { style: "currency", currency, maximumFractionDigits });
  };
}
