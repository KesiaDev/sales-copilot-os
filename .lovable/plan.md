# LLMídia Sales OS — Plano de Construção

Plataforma SaaS de gestão comercial com 11 módulos, IA, auth, banco de dados, integrações Hotmart/Clint.

## Stack & Direção Visual

- **Stack**: TanStack Start + React + TS + Tailwind + Shadcn + Recharts + Lovable Cloud (Supabase) + Lovable AI Gateway (Gemini)
- **Visual**: "Moderno produtivo" — fundo `#0B1220`, primária índigo `#6366F1`, accent âmbar `#F59E0B`, info ciano `#22D3EE`. Dark-first com toggle light. Tipografia Inter. Cards densos, gráficos limpos, gamificação no ranking.

## Fase 1 — Infraestrutura (Cloud + Auth + Schema)

1. Ativar Lovable Cloud
2. Migration criando todas as tabelas com RLS + GRANTs:
   - `profiles` (linked a auth.users — nome, cargo, data_entrada, observações)
   - `user_roles` + enum `app_role` (`head`, `vendedor`) + função `has_role`
   - `behavior_profiles` (DISC: D/I/S/C + análises geradas por IA + arquivo url)
   - `goals` (mensal, por vendedor + meta global)
   - `sales` (vendedor, produto, valor, data, país, fonte)
   - `refunds`, `cancellations`, `chargebacks`
   - `leads` (origem, status, vendedor, tempo_resposta)
   - `daily_reports` (todos os campos do Módulo 4)
   - `objections` (texto, produto, país, vendedor, data, resposta_sugerida)
   - `activities` (calls, follow-ups, propostas)
   - `performance_scores` (snapshot diário calculado)
   - `daily_insights` (saída da IA do módulo 5/8)
3. Trigger auto-cria profile no signup
4. Auth com email/password + Google (broker Lovable)
5. Layout `_authenticated` (gerenciado pela integração)
6. Seed dos colaboradores: Fabio Nadal, Rita, João, Gisele, Luana (perfis, sem auth users — head cria invites depois)

## Fase 2 — Shell & Navegação

- Sidebar fixa com 11 módulos + topbar (usuário, dark/light toggle, busca)
- Rota `/auth` pública; tudo abaixo de `/_authenticated/`
- Layout responsivo (sidebar colapsa em mobile → drawer)

## Fase 3 — Módulos (em ordem de prioridade)

1. **Dashboard Executivo** (`/`): cards KPI, Recharts (line/bar), top vendedores. Lê de `sales`, `goals`, `refunds`.
2. **Gestão de Equipe** (`/equipe`): grid de colaboradores → detalhe com histórico, metas, observações, gráfico de evolução.
3. **Fechamento Diário** (`/fechamento`): form completo + histórico em tabela. Vendedor preenche, Head visualiza tudo.
4. **Ranking** (`/ranking`): tabs diário/semanal/mensal, medalhas 🥇🥈🥉, pontuação calculada.
5. **Perfil Comportamental** (`/disc`): upload PDF/DOCX/imagem → server fn envia para Gemini (visão) → extrai D/I/S/C + gera análises de liderança → painel visual com radar chart.
6. **Inteligência de Gestão** (`/inteligencia`): server fn que roda análise sobre últimos 30 dias e gera "Prioridades para Amanhã" classificadas (alta/média/reconhecimento) via IA.
7. **Daily Executiva** (`/daily`): resumo gerado por IA + botão "Gerar PDF" (skill pdf) + "Copiar para WhatsApp" (gera mensagem formatada).
8. **Previsão de Fechamento** (`/previsao`): projeção linear de receita vs meta, semáforo visual.
9. **Banco de Objeções** (`/objecoes`): CRUD + ranking de frequência + IA sugere resposta ao cadastrar.
10. **CRM Performance** (`/crm`): cards de leads/conversão/tempo resposta. Webhook receiver em `/api/public/webhooks/hotmart` e `/api/public/webhooks/clint` para receber eventos (vendas, reembolsos, leads). Sem polling — webhooks empurram para tabelas. Vou pedir as credenciais e instruções de configuração na Hotmart/Clint depois que o esqueleto estiver pronto.
11. **IA de Liderança** (`/copiloto`): chat streaming com `useChat` + AI SDK. Tools que consultam Supabase (performance, daily reports, perfis DISC). Server route `/api/copiloto`.

## Detalhes Técnicos

- **IA**: helper `src/lib/ai-gateway.server.ts` (gateway Lovable). Modelo `google/gemini-3-flash-preview` para chat/análises; `google/gemini-2.5-flash` para visão (DISC upload).
- **Server fns** em `src/lib/*.functions.ts`, todas com `requireSupabaseAuth`.
- **Webhooks** em `src/routes/api/public/webhooks/*` com verificação de assinatura HMAC (segredo via `add_secret`).
- **PDF da Daily**: skill PDF executada server-side via server fn.
- **Storage**: bucket `disc-uploads` para arquivos DISC, RLS por user_id.
- **RBAC**: `head` vê tudo, `vendedor` vê apenas seus próprios dados.

## O que NÃO entra agora

- Polling/sync ativo Hotmart/Clint (apenas webhooks reativos — mais robusto)
- Mobile app nativo (web responsivo já cobre)
- Notificações push (pode entrar depois)

## Próximos passos após sua aprovação

1. Ativar Cloud e rodar migrations
2. Construir auth + shell + dashboard funcionando com dados seed
3. Iterar módulos em ordem de prioridade acima
4. Ao chegar no CRM, pedir credenciais Hotmart/Clint e configurar webhooks

Posso construir tudo em sequência. Será uma resposta longa com muitos arquivos.
