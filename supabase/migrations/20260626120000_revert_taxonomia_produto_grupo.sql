-- Uma sessao paralela renomeou a taxonomia de produto_grupo hoje de manha
-- (26/06/2026) sem atualizar comissionamento.tsx/metas.tsx, que ainda usam
-- os nomes antigos. Decisao da Kesia: reverter por agora. Normaliza qualquer
-- venda/reembolso/cancelamento ja gravado com os nomes novos de volta pros
-- nomes antigos, para nao ficar orfao da configuracao de comissao/metas.

UPDATE public.sales SET produto_grupo = 'Renovações' WHERE produto_grupo IN ('Renovação TM', 'Renovação acc', 'Renovação mentoria');
UPDATE public.sales SET produto_grupo = 'Mentoria Gestor de Tráfego' WHERE produto_grupo = 'Gestor de tráfego pago 2.0 - AU';
UPDATE public.sales SET produto_grupo = 'Mentoria Gestão de Redes Sociais' WHERE produto_grupo = 'Formação gestor de redes sociais 2.0';
UPDATE public.sales SET produto_grupo = 'Master and Scale' WHERE produto_grupo = 'Master and Scale 2025';
UPDATE public.sales SET produto_grupo = 'Traffic Master' WHERE produto_grupo = 'Tráfico Master';
UPDATE public.sales SET produto_grupo = 'Accelerator' WHERE produto_grupo = 'Programa Accelerator';

UPDATE public.refunds SET produto_grupo = 'Renovações' WHERE produto_grupo IN ('Renovação TM', 'Renovação acc', 'Renovação mentoria');
UPDATE public.refunds SET produto_grupo = 'Mentoria Gestor de Tráfego' WHERE produto_grupo = 'Gestor de tráfego pago 2.0 - AU';
UPDATE public.refunds SET produto_grupo = 'Mentoria Gestão de Redes Sociais' WHERE produto_grupo = 'Formação gestor de redes sociais 2.0';
UPDATE public.refunds SET produto_grupo = 'Master and Scale' WHERE produto_grupo = 'Master and Scale 2025';
UPDATE public.refunds SET produto_grupo = 'Traffic Master' WHERE produto_grupo = 'Tráfico Master';
UPDATE public.refunds SET produto_grupo = 'Accelerator' WHERE produto_grupo = 'Programa Accelerator';

UPDATE public.cancellations SET produto_grupo = 'Renovações' WHERE produto_grupo IN ('Renovação TM', 'Renovação acc', 'Renovação mentoria');
UPDATE public.cancellations SET produto_grupo = 'Mentoria Gestor de Tráfego' WHERE produto_grupo = 'Gestor de tráfego pago 2.0 - AU';
UPDATE public.cancellations SET produto_grupo = 'Mentoria Gestão de Redes Sociais' WHERE produto_grupo = 'Formação gestor de redes sociais 2.0';
UPDATE public.cancellations SET produto_grupo = 'Master and Scale' WHERE produto_grupo = 'Master and Scale 2025';
UPDATE public.cancellations SET produto_grupo = 'Traffic Master' WHERE produto_grupo = 'Tráfico Master';
UPDATE public.cancellations SET produto_grupo = 'Accelerator' WHERE produto_grupo = 'Programa Accelerator';
