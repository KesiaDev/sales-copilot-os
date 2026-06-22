ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS produto_grupo TEXT;

CREATE INDEX IF NOT EXISTS sales_produto_grupo_idx ON public.sales(produto_grupo);
