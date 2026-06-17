# Melhorias na página Pedidos

Reestruturar `/admin/pedidos` em quatro abas, mantendo o comportamento atual intacto na primeira aba e adicionando visões de auditoria e histórico.

## 1. Estrutura geral

Adicionar um `Tabs` principal acima do filtro de canal já existente:

- **Hoje** (default) — Kanban atual, sem mudanças funcionais.
- **Histórico** — pedidos de dias anteriores (somente leitura).
- **Em aberto (auditoria)** — pedidos antigos ainda em status `recebido` / `em_preparo` / `pronto`.
- **Cancelados** — pedidos com status `cancelado`.

O filtro de canal (Salão/Delivery/Retirada) e a busca permanecem disponíveis em todas as abas onde fizerem sentido.

## 2. Aba "Hoje" — reforço visual

Sem mudar o Kanban. Apenas adicionar no cabeçalho:

- Badge ao lado do título: **"Hoje · 17/06/2026"** (data atual formatada em pt-BR).
- Subtítulo curto: "Pedidos criados hoje. Para dias anteriores, use a aba Histórico."

Nenhuma alteração em colunas, cards, realtime ou regras de avanço.

## 3. Aba "Histórico"

Lista tabular paginada de pedidos de **dias anteriores** (não inclui hoje).

Filtros no topo:

- Intervalo de datas (date range picker) — default: últimos 7 dias.
- Canal (Todos / Salão / Delivery / Retirada).
- Status (Todos / Entregue / Cancelado / Em aberto).
- Busca por número da mesa ou nome do cliente.

Colunas: Data/hora · Canal · Mesa/Cliente · Itens (contagem) · Total · Status · Garçom.

Clique na linha abre o `DetalhePedido` (já existente) em modo somente leitura.

Paginação server-side (50 por página).

## 4. Aba "Em aberto (auditoria)"

Lista todos os pedidos com status em `('recebido','em_preparo','pronto')` **criados antes de hoje** (ou seja, abertos há mais de 1 dia — pedidos órfãos / esquecidos).

Colunas: idade (ex.: "16 dias"), data criação, canal, mesa/cliente, status atual, total, garçom.

Ações por linha:

- **Cancelar** (com motivo) — reutiliza `cancelarPedidoFn`.
- **Marcar como entregue** — reutiliza `atualizarStatusPedidoFn` para `entregue`.

Ações em lote (via checkbox por linha + barra de ações):

- **Cancelar selecionados** — abre dialog único pedindo motivo, aplica a todos.
- **Marcar selecionados como entregues**.

Confirmação obrigatória antes de ambas as ações em lote.

## 5. Aba "Cancelados"

Lista pedidos com `status = 'cancelado'`, com filtro de período (default: últimos 30 dias).

Colunas: data, canal, mesa/cliente, total, **motivo do cancelamento**, **cancelado por**, **cancelado em** (timestamp).

Somente leitura. Clique abre o `DetalhePedido`.

## 6. Permissões

Mantém-se idêntico ao atual: rota `/admin/pedidos` (já sob `_authenticated/admin`). Nenhuma mudança de RLS ou de papéis.

---

## Detalhes técnicos

### Backend (server functions novas em `src/lib/pedidos.functions.ts`)

Todas autenticadas via `requireSupabaseAuth` + verificação de `restaurante_id`:

1. `**listarPedidosHistoricoFn**` — input: `{ restauranteId, dataInicio, dataFim, canal?, status?, busca?, page, pageSize }`. Retorna `{ pedidos, itens, mesas, destinoStatus, total }`. Filtra `criado_em < hoje` por padrão (o range cobre isso).
2. `**listarPedidosAbertosAntigosFn**` — input: `{ restauranteId }`. Retorna pedidos com status em `('recebido','em_preparo','pronto')` e `criado_em < start_of_today`.
3. `**listarPedidosCanceladosFn**` — input: `{ restauranteId, dataInicio, dataFim }`. Inclui join com `pedido_status_historico` para obter motivo, autor e timestamp do cancelamento.
4. `**cancelarPedidosEmLoteFn**` — input: `{ restauranteId, pedidoIds: string[], motivo: string }`. Itera chamando a mesma lógica de `cancelarPedidoFn` (transacional por pedido; coleta resultado). Limita a 50 IDs por chamada.
5. `**marcarPedidosEntreguesEmLoteFn**` — input: `{ restauranteId, pedidoIds: string[] }`. Idem para `entregue`.

Nenhuma migração de schema necessária — os dados já existem nas tabelas `pedidos`, `pedido_itens`, `pedido_status_historico`.

### Frontend

Estrutura de arquivos novos em `src/components/pedidos/`:

- `aba-historico.tsx`
- `aba-em-aberto.tsx`
- `aba-cancelados.tsx`
- `tabela-pedidos.tsx` (componente compartilhado de tabela com colunas configuráveis)
- `acoes-lote-bar.tsx` (barra flutuante de ações em lote)
- `cancelar-pedido-dialog.tsx` (dialog reutilizável com campo motivo)

Hooks novos em `src/hooks/use-pedidos.ts`:

- `usePedidosHistorico`, `usePedidosAbertosAntigos`, `usePedidosCancelados`
- `useCancelarPedidosEmLote`, `useMarcarPedidosEntreguesEmLote`

Estado das abas e filtros via **search params** (`?aba=historico&inicio=...&fim=...&canal=...`) usando `validateSearch` com Zod, para deep-link e refresh sem perder contexto.

Arquivo `src/routes/_authenticated/admin/pedidos.tsx`:

- Adiciona `Tabs` principal acima do filtro de canal atual.
- Move o conteúdo atual (Kanban + filtro de canal) para dentro da aba "Hoje" sem alterações.
- Renderiza as novas abas via componentes acima.

### Limites e edge cases

- Paginação obrigatória em Histórico e Cancelados (server-side, 50/página) para não sobrecarregar.
- Ações em lote limitadas a 50 pedidos por execução.
- Realtime continua só na aba "Hoje" — as outras abas usam `staleTime` de 30s e refetch manual.
- Cancelamento em lote: se algum pedido falhar, mostra toast com contagem de sucesso/falha e mantém os demais.

## Arquivos afetados

Novos:

- `src/components/pedidos/aba-historico.tsx`
- `src/components/pedidos/aba-em-aberto.tsx`
- `src/components/pedidos/aba-cancelados.tsx`
- `src/components/pedidos/tabela-pedidos.tsx`
- `src/components/pedidos/acoes-lote-bar.tsx`
- `src/components/pedidos/cancelar-pedido-dialog.tsx`

Editados:

- `src/lib/pedidos.functions.ts` (adicionar 5 server fns; sem alterar as existentes)
- `src/hooks/use-pedidos.ts` (adicionar novos hooks; sem alterar os existentes)
- `src/routes/_authenticated/admin/pedidos.tsx` (envolver conteúdo atual em Tabs + search params)

Nenhuma alteração em: realtime atual, `PedidosKanban`, `DetalhePedido`, RLS, schema do banco.  
  
IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.