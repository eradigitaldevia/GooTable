## Objetivo

Adicionar duas novas métricas ao Dashboard do admin (`/admin`):

1. **Produtos mais vendidos** — top N produtos por quantidade vendida no período.
2. **Ticket médio por mesa** — total faturado dividido pelo número de mesas (sessões) atendidas.

Ambas seguem o padrão atual do dashboard (server function + RPC quando possível + componente em card).

## Decisões a confirmar antes de codar

1. **Período das novas métricas**:
  - Opção A: **fixo em "hoje"** (igual aos cards de topo).
  - Opção B (recomendada): **seletor Hoje / 7d / 30d** (igual à seção "Métricas operacionais"), pois "mais vendidos do dia" costuma ter pouca amostra.
2. **Produtos mais vendidos — critério de ranking**:
  - Opção A (recomendada): **quantidade vendida** (`SUM(quantidade)` em `pedido_itens`).
  - Opção B: **faturamento** (`SUM(quantidade * preco_unit)`).
  - Opção C: exibir ambas as colunas (qtd e R$) e ordenar por qtd.
3. **Produtos mais vendidos — filtro de status do pedido**:
  - Opção A (recomendada): apenas pedidos com status `entregue` (mesmo critério usado em `faturamentoHoje`).
  - Opção B: todos os pedidos exceto `cancelado`.
4. **Ticket médio por mesa — definição de "mesa atendida"**:
  - Opção A (recomendada): **por sessão de mesa** — `SUM(total) / COUNT(DISTINCT sessao_id)` considerando pedidos `entregue` com `sessao_id` não nulo (exclui delivery e balcão). Reflete o ticket por "visita".
  - Opção B: por mesa física — `SUM(total) / COUNT(DISTINCT mesa_id)` no período (uma mesa usada 3x conta como 1).
  - Opção C: por pedido em mesa — `AVG(total)` dos pedidos com `mesa_id` não nulo.
5. **Top N de produtos**: 5 ou 10? (recomendo **5** no card, com possibilidade futura de "Ver todos").

## Mudanças por arquivo (após confirmação)

### Backend

**Nova migração** — criar RPC `dashboard_produtos_top` e `dashboard_ticket_medio_mesa` (ou estender `dashboard_admin_resumo` com os novos campos). Recomendo **RPCs separadas** para não inflar o payload do resumo principal e permitir cache independente por período.

- `dashboard_produtos_top(_restaurante_id uuid, _periodo text, _limit int)` → retorna `[{ produto_id, nome, quantidade, faturamento }]`.
- `dashboard_ticket_medio_mesa(_restaurante_id uuid, _periodo text)` → retorna `{ ticket_medio, mesas_atendidas, faturamento_total }`.

Ambas com `SECURITY DEFINER` e validação de acesso ao restaurante (padrão das RPCs existentes).

### `src/lib/dashboard.functions.ts`

Adicionar duas server functions com `requireSupabaseAuth` + `assertAcessoRestaurante`:

- `dashboardProdutosTopFn({ restauranteId, periodo, limit })`
- `dashboardTicketMedioMesaFn({ restauranteId, periodo })`

Sem alterar as funções existentes.

### `src/hooks/use-dashboard.ts`

Adicionar dois hooks no mesmo padrão dos existentes:

- `useDashboardProdutosTop(restauranteId, periodo, limit)`
- `useDashboardTicketMedioMesa(restauranteId, periodo)`

### Novos componentes (UI)

- `src/components/admin/metricas/produtos-top-card.tsx` — lista ordenada com nome, qtd e barra proporcional ou badge de faturamento.
- `src/components/admin/metricas/ticket-medio-mesa-card.tsx` — card padrão (igual aos demais do topo) com valor formatado em BRL e legenda "X mesas atendidas".

Ambos com skeleton de loading no mesmo padrão dos atuais.

### `src/routes/_authenticated/admin/index.tsx`

Inserir os dois novos componentes **abaixo da seção "Métricas operacionais"** (ou conforme preferência), sem mexer no resto do layout.

Realtime: aproveitar o `useEffect` existente que invalida `dashboard-metricas` em mudanças de `pedidos` — adicionar invalidação das novas queries (`dashboard-produtos-top`, `dashboard-ticket-medio-mesa`).

## Não será alterado

- Estrutura visual existente (cards, gráficos, métricas operacionais).
- Server functions e RPCs já existentes.
- Hooks existentes.
- Backend de pedidos/itens (apenas leitura via novas RPCs).

## Confirmações necessárias

Por favor, responda as 5 decisões acima (ou diga "todas opção recomendada") antes de eu iniciar a implementação.  
  
Confirmações:  
1. Recomendada.  
2. Opção C.  
3. Recomendada.  
4. Recomendada.  
5. Recomendada.

&nbsp;

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.