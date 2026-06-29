
-- bi_product_config (mínimo padrão + categoria + produto_pai_id)
CREATE TABLE public.bi_product_config (
  product_id text PRIMARY KEY,
  label text NOT NULL,
  categoria text NOT NULL DEFAULT 'outro',
  produto_pai_id text REFERENCES public.bi_product_config(product_id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bi_product_config_parent ON public.bi_product_config(produto_pai_id);

REVOKE ALL ON public.bi_product_config FROM anon, authenticated;
GRANT ALL ON public.bi_product_config TO service_role;
ALTER TABLE public.bi_product_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_product_config FORCE ROW LEVEL SECURITY;

-- bi_channels
CREATE TABLE public.bi_channels (
  id text PRIMARY KEY,
  label text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro',
  clint_group_names text[] NOT NULL DEFAULT '{}',
  sck_prefixes text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.bi_channels FROM anon, authenticated;
GRANT ALL ON public.bi_channels TO service_role;
ALTER TABLE public.bi_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_channels FORCE ROW LEVEL SECURITY;
