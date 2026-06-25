// CurrencyProvider simplificado: a plataforma trabalha exclusivamente em EUR.
// O toggle EUR/BRL e a cotação automática foram removidos para evitar
// confusão de moeda nos dashboards e rankings.
import { createContext, useContext, type ReactNode } from "react";

type CurrencyCtxValue = {
  currency: "EUR";
  convert: (valorEur: number) => number;
  format: (valorEur: number | null | undefined) => string;
};

const CurrencyCtx = createContext<CurrencyCtxValue>({
  currency: "EUR",
  convert: (v) => v,
  format: (v) => formatEur(v),
});

function formatEur(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  return (
    <CurrencyCtx.Provider
      value={{
        currency: "EUR",
        convert: (valorEur) => valorEur,
        format: formatEur,
      }}
    >
      {children}
    </CurrencyCtx.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyCtx);

export function useFormatCurrency(maximumFractionDigits = 0) {
  return (valorEur: number | null | undefined) => {
    const n = Number(valorEur ?? 0);
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits,
    }).format(n);
  };
}
