-- Configuração de duração de programa por produto, usada para calcular a data
-- de vencimento da renovação (vendido_em + duracao_dias). renovacao_produto_grupo
-- aponta para o produto_grupo gravado quando o cliente efetivamente renova, usado
-- para detectar renovações já feitas.
CREATE TABLE IF NOT EXISTS public.renewal_settings (
    produto_grupo TEXT PRIMARY KEY,
    duracao_dias INT NOT NULL DEFAULT 120 CHECK (duracao_dias > 0),
    renovacao_produto_grupo TEXT NOT NULL DEFAULT 'Renovações / Sucesso do Cliente',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_settings TO authenticated;
GRANT ALL ON public.renewal_settings TO service_role;
ALTER TABLE public.renewal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all renewal_settings" ON public.renewal_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.renewal_settings (produto_grupo, duracao_dias, renovacao_produto_grupo) VALUES
    ('Mentoria Gestor de Tráfego', 120, 'Renovações / Sucesso do Cliente')
ON CONFLICT DO NOTHING;

-- Status manual de acompanhamento de renovação por venda original (já que a Clint
-- não expõe uma data de vencimento de contrato, o acompanhamento de contato é
-- registrado aqui pelo time).
CREATE TABLE IF NOT EXISTS public.renewal_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Aguardando'
        CHECK (status IN ('Aguardando', 'Contato feito', 'Reunião agendada', 'Proposta enviada', 'Renovado', 'Perdido')),
    ultimo_contato_em TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(sale_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_status TO authenticated;
GRANT ALL ON public.renewal_status TO service_role;
ALTER TABLE public.renewal_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all renewal_status" ON public.renewal_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
