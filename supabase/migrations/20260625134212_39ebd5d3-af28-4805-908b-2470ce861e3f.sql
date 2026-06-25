ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS hotmart_transaction TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS produto_nome TEXT,
  ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS data_evento TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mes_referencia TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'refunds_tipo_check'
  ) THEN
    ALTER TABLE public.refunds
      ADD CONSTRAINT refunds_tipo_check
      CHECK (tipo IS NULL OR tipo IN ('REEMBOLSO','CANCELAMENTO','CHARGEBACK'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_hotmart_transaction_tipo_uidx
  ON public.refunds (hotmart_transaction, tipo)
  WHERE hotmart_transaction IS NOT NULL AND tipo IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;