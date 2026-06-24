-- Reembolsos/cancelamentos da Hotmart nao tinham produto/grupo/pais associado,
-- entao era impossivel saber qual produto gerou qual reembolso (pedido da Kesia
-- em 24/06/2026, depois de identificar que o CSV da Hotmart tras produtos fora
-- do catalogo do time — ex: comissao de afiliado "Scalehot" e o produto "Reset
-- Relacional", que nao pertence a esse time de vendas).
ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS produto TEXT,
  ADD COLUMN IF NOT EXISTS produto_grupo TEXT,
  ADD COLUMN IF NOT EXISTS pais TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE public.cancellations
  ADD COLUMN IF NOT EXISTS produto TEXT,
  ADD COLUMN IF NOT EXISTS produto_grupo TEXT,
  ADD COLUMN IF NOT EXISTS pais TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS refunds_produto_grupo_idx ON public.refunds(produto_grupo);
CREATE INDEX IF NOT EXISTS cancellations_produto_grupo_idx ON public.cancellations(produto_grupo);
