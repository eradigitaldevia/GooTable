## Métricas Operacionais no Dashboard

Adicionar uma nova seção ao Dashboard (`/admin`) com três métricas operacionais, com seletor de período (Hoje / 7d / 30d) e atualização realtime via canal de `pedidos`.

### Métricas

1. **Tempo médio por fase** — recebido → em_preparo → pronto → entregue (em minutos)
2. **Fila atual (snapshot)** — quantidade de pedidos em cada status ativo + idade do mais antigo
3. **Throughput por hora** — pedidos entregues por hora (24 barras, 0h–23h)

### Backend (migrations)

**1ª migration — histórico de status (pré-requisito para tempo por fase):**

```text
public.pedido_status_historico
  id uuid pk
  pedido_id uuid
  restaurante_id uuid
  status_anterior pedido_status (nullable)
  status_novo pedido_status
  mudou_em timestamptz default now()
  index (restaurante_id, mudou_em)
  index (pedido_id)
```

- GRANTs: `service_role` ALL; `authenticated` SELECT (consumido por RPC SECURITY DEFINER, mas mantém leitura coerente com pedidos).
- RLS: policy SELECT igual ao padrão (`is_restaurante_membro OR is_platform_admin`).
- Trigger `trg_pedido_log_status` em `public.pedidos` AFTER INSERT OR UPDATE OF status — insere uma linha quando status muda (e na criação registra `null → recebido`).
- **Backfill** para pedidos já existentes: insere linha sintética por pedido usando `criado_em` (status atual) — assim métricas funcionam imediatamente para o status presente, mas tempos por fase só serão precisos para pedidos criados a partir de agora. *Observação importante para o usuário: histórico retroativo de transições não pode ser reconstruído.*

**2ª migration — RPC `dashboard_metricas_operacionais(_restaurante_id uuid, _periodo text)`:**

- `_periodo` aceita `'hoje' | '7d' | '30d'`.
- Retorna `jsonb` com:
  - `fila`: `{ recebido: int, em_preparo: int, pronto: int, mais_antigo_min: int }` (snapshot atual, sem filtro de período)
  - `tempo_fases`: `{ recebido_para_preparo_min: numeric, preparo_para_pronto_min: numeric, pronto_para_entregue_min: numeric, ciclo_total_min: numeric }` — médias calculadas via auto-join no `pedido_status_historico` dentro do período
  - `throughput_24h`: `[{ hora: 0..23, total: int }]` — pedidos `entregue` agrupados por `EXTRACT(HOUR FROM criado_em)` dentro do período
- SECURITY DEFINER com `is_restaurante_membro OR is_platform_admin`.

### Server function

`src/lib/dashboard.functions.ts` — adicionar:

```text
dashboardMetricasOperacionaisFn({ restauranteId, periodo })
  → DashboardMetricasOperacionais
```

Wrapper da RPC, segue padrão de `dashboardAdminFn` (middleware `requireSupabaseAuth` + `assertAcessoRestaurante`).

### Frontend

**Hook** — `src/hooks/use-dashboard.ts`:

```text
useDashboardMetricasOperacionais(restauranteId, periodo)
```

**Componentes novos** — `src/components/admin/metricas/`:

- `metricas-operacionais-section.tsx` — wrapper com `<Tabs>` (Hoje / 7d / 30d) e os 3 blocos
- `fila-cards.tsx` — 3 cards (Recebidos, Em preparo, Prontos) + idade do mais antigo
- `tempo-fases-cards.tsx` — 4 cards (Recebido→Preparo, Preparo→Pronto, Pronto→Entregue, Ciclo total)
- `throughput-chart.tsx` — gráfico de barras (recharts `BarChart`, padrão visual de `dashboard-chart.tsx`)

**Integração** — `src/routes/_authenticated/admin/index.tsx`:

- Renderizar `<MetricasOperacionaisSection restauranteId={...} />` lazy-loaded abaixo do gráfico de faturamento existente.
- Reaproveitar o canal realtime já existente (`dash-${restauranteId}`) para invalidar também a query de métricas.

### Restrições respeitadas

- Não altera nada do Dashboard atual (cards, gráfico, layout) — apenas adiciona seção abaixo.
- Não toca em outras telas, rotas, RLS de outras tabelas ou business logic.
- Toda lógica pesada (agregações, joins de histórico) fica no Postgres via RPC.
- Padrões existentes mantidos: server fn + react-query + invalidação realtime.

### Ordem de execução

1. Migration 1 (tabela `pedido_status_historico` + trigger + backfill + GRANTs/RLS) — submetida via `supabase--migration` e aguarda aprovação.
2. Migration 2 (RPC `dashboard_metricas_operacionais`) — submetida em sequência.
3. Após aprovação, criar server fn + hook + componentes + integração no Dashboard.

### Pergunta antes de implementar

- Confirma que posso criar a tabela `pedido_status_historico` + trigger + backfill sintético (tempos por fase só passam a ser exatos para pedidos novos)? Sem isso, não é possível medir tempo por fase.  
Resposta: Sim, confirmo que pode criar.