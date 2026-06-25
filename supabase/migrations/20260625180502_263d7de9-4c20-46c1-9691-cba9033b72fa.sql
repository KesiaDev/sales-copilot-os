
UPDATE public.sales SET produto_grupo = 'Mentoria Gestor de Tráfego' WHERE produto_grupo LIKE 'Mentoria Gestor de Tr%fego';
UPDATE public.sales SET produto_grupo = 'Mentoria Gestão de Redes Sociais' WHERE produto_grupo LIKE 'Mentoria Gest%o de Redes Sociais';
UPDATE public.sales SET produto_grupo = 'Renovações / Sucesso do Cliente' WHERE produto_grupo LIKE 'Renova%es / Sucesso do Cliente';
UPDATE public.sales SET produto = regexp_replace(produto, E'\uFFFD', '', 'g') WHERE produto ~ E'\uFFFD';
