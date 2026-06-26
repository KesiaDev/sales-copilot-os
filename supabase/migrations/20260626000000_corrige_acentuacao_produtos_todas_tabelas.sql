-- A migration anterior (20260625180502) so corrigiu acentuacao corrompida em
-- public.sales, e so removeu o caractere de substituicao (U+FFFD) de produto,
-- sem reconstituir produto_grupo. Reaplica a correcao (idempotente, sem efeito
-- se o valor ja estiver certo) cobrindo as 3 tabelas que guardam produto_grupo.

UPDATE public.sales SET produto_grupo = 'Mentoria Gestor de Tráfego' WHERE produto_grupo LIKE 'Mentoria Gestor de Tr%fego' AND produto_grupo <> 'Mentoria Gestor de Tráfego';
UPDATE public.sales SET produto_grupo = 'Mentoria Gestão de Redes Sociais' WHERE produto_grupo LIKE 'Mentoria Gest%o de Redes Sociais' AND produto_grupo <> 'Mentoria Gestão de Redes Sociais';
UPDATE public.sales SET produto_grupo = 'Renovações / Sucesso do Cliente' WHERE produto_grupo LIKE 'Renova%es / Sucesso do Cliente' AND produto_grupo <> 'Renovações / Sucesso do Cliente';
UPDATE public.sales SET produto_grupo = 'Renovações' WHERE produto_grupo LIKE 'Renova%es' AND produto_grupo NOT LIKE '%/%' AND produto_grupo <> 'Renovações';
UPDATE public.sales SET produto = regexp_replace(produto, E'�', '', 'g') WHERE produto ~ E'�';

UPDATE public.refunds SET produto_grupo = 'Mentoria Gestor de Tráfego' WHERE produto_grupo LIKE 'Mentoria Gestor de Tr%fego' AND produto_grupo <> 'Mentoria Gestor de Tráfego';
UPDATE public.refunds SET produto_grupo = 'Mentoria Gestão de Redes Sociais' WHERE produto_grupo LIKE 'Mentoria Gest%o de Redes Sociais' AND produto_grupo <> 'Mentoria Gestão de Redes Sociais';
UPDATE public.refunds SET produto_grupo = 'Renovações / Sucesso do Cliente' WHERE produto_grupo LIKE 'Renova%es / Sucesso do Cliente' AND produto_grupo <> 'Renovações / Sucesso do Cliente';
UPDATE public.refunds SET produto_grupo = 'Renovações' WHERE produto_grupo LIKE 'Renova%es' AND produto_grupo NOT LIKE '%/%' AND produto_grupo <> 'Renovações';
UPDATE public.refunds SET produto = regexp_replace(produto, E'�', '', 'g') WHERE produto ~ E'�';

UPDATE public.cancellations SET produto_grupo = 'Mentoria Gestor de Tráfego' WHERE produto_grupo LIKE 'Mentoria Gestor de Tr%fego' AND produto_grupo <> 'Mentoria Gestor de Tráfego';
UPDATE public.cancellations SET produto_grupo = 'Mentoria Gestão de Redes Sociais' WHERE produto_grupo LIKE 'Mentoria Gest%o de Redes Sociais' AND produto_grupo <> 'Mentoria Gestão de Redes Sociais';
UPDATE public.cancellations SET produto_grupo = 'Renovações / Sucesso do Cliente' WHERE produto_grupo LIKE 'Renova%es / Sucesso do Cliente' AND produto_grupo <> 'Renovações / Sucesso do Cliente';
UPDATE public.cancellations SET produto_grupo = 'Renovações' WHERE produto_grupo LIKE 'Renova%es' AND produto_grupo NOT LIKE '%/%' AND produto_grupo <> 'Renovações';
UPDATE public.cancellations SET produto = regexp_replace(produto, E'�', '', 'g') WHERE produto ~ E'�';

-- Renovacao_settings/renewal_settings tambem guarda esses nomes como config fixa.
UPDATE public.renewal_settings SET produto_grupo = 'Mentoria Gestor de Tráfego' WHERE produto_grupo LIKE 'Mentoria Gestor de Tr%fego' AND produto_grupo <> 'Mentoria Gestor de Tráfego';
UPDATE public.renewal_settings SET produto_grupo = 'Mentoria Gestão de Redes Sociais' WHERE produto_grupo LIKE 'Mentoria Gest%o de Redes Sociais' AND produto_grupo <> 'Mentoria Gestão de Redes Sociais';
UPDATE public.renewal_settings SET renovacao_produto_grupo = 'Renovações / Sucesso do Cliente' WHERE renovacao_produto_grupo LIKE 'Renova%es / Sucesso do Cliente' AND renovacao_produto_grupo <> 'Renovações / Sucesso do Cliente';
