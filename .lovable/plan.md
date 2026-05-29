# Plano — Finalização do papel "Bar" e separação Cozinha × Bar

Continuação direta da implementação já aprovada. A base (enum `bar`, `destino_preparo`, `pedido_destino_status`, triggers e RPC `atualizar_status_destino`) já está no banco. Falta a camada de UI/UX e a integração dos botões do KDS com o novo RPC.

## 1. Painel do Bar (`/bar`) — layout customizado

Rota nova: `src/routes/_authenticated/bar.tsx` (acessível por papéis `bar`, `admin`, `owner`).

Layout intencionalmente diferente da Cozinha (decisão já tomada: "Customizado para bar"):

- Sem kanban de colunas. Lista vertical compacta agrupada por mesa.
- Cada linha = 1 item de bebida com: quantidade, nome, observação, mesa, tempo desde o pedido, botão único "Pronto" (marca todas as unidades) + botão secundário "−1" para marcar unidade a unidade.
- Cabeçalho fixo com: contagem de pendentes, contagem de prontos hoje, filtro rápido (Pendentes | Em preparo | Todos).
- Som curto opcional ao chegar novo item (reaproveitar hook de som da cozinha se existir; senão, deixar como follow-up).

Arquivos novos:
- `src/routes/_authenticated/bar.tsx`
- `src/components/bar/bar-header.tsx`
- `src/components/bar/bar-item-row.tsx`
- `src/components/bar/bar-empty-state.tsx`
- `src/lib/bar.functions.ts` — `listarItensBar({ restauranteId })` filtrando `destino = 'bar'` e status do destino ≠ `pronto`.
- `src/hooks/use-bar.ts` — query + realtime em `pedido_itens` e `pedido_destino_status` filtrados por restaurante.

## 2. Migração assistida — `/admin/destinos-preparo`

Rota nova para classificar o que existe hoje antes de operar o bar.

- `src/routes/_authenticated/admin/destinos-preparo.tsx`
- Tabela 1: Categorias → seletor `cozinha | bar` por linha.
- Tabela 2: Produtos sem categoria OU com override → seletor `(herdar) | cozinha | bar`.
- Botão "Salvar" em lote (uma chamada por linha alterada via funções já existentes em `cardapio.functions.ts`).
- Banner no topo do painel `/bar` quando 0 categorias/produtos estão marcados como `bar`, com link para essa rota.
- Item no `admin-sidebar.tsx`: "Destinos de preparo" (logo abaixo de Cardápio).

Sem bloqueio rígido: convite de membro `bar` continua permitido, apenas com aviso visual.

## 3. Detalhe do pedido — agrupar por destino

Editar `src/components/pedidos/detalhe-pedido.tsx`:

- Agrupar `itens` em duas seções: "Cozinha" e "Bar" (ocultar seção vazia).
- Para cada seção, exibir o status atual vindo de `pedido_destino_status` (badge: Recebido / Em preparo / Pronto).
- Status geral do pedido (já derivado pelo trigger) permanece no header — apenas leitura.

## 4. KDS Cozinha — usar novo RPC por destino

Editar `src/routes/_authenticated/cozinha.tsx` e `src/components/cozinha/kds-card.tsx` (ou equivalente):

- Botões "Iniciar preparo" / "Marcar pronto" passam a chamar `atualizar_status_destino({ pedido_id, destino: 'cozinha', novo_status })` em vez de atualizar `pedidos.status` diretamente.
- Manter marcação por unidade (`quantidade_pronta`) como está — o trigger já recomputa o destino.

## 5. Realtime

- `/bar` e `/cozinha` se inscrevem em `pedido_itens` (filtro client-side por `destino`) e em `pedido_destino_status`.
- Invalidar queries de pedidos no admin quando `pedido_destino_status` mudar (status geral é derivado).

## Arquivos afetados

Novos:
- `src/routes/_authenticated/bar.tsx`
- `src/routes/_authenticated/admin/destinos-preparo.tsx`
- `src/components/bar/bar-header.tsx`
- `src/components/bar/bar-item-row.tsx`
- `src/components/bar/bar-empty-state.tsx`
- `src/lib/bar.functions.ts`
- `src/hooks/use-bar.ts`

Editados (mínimo necessário):
- `src/components/admin/admin-sidebar.tsx` — item "Destinos de preparo"
- `src/components/pedidos/detalhe-pedido.tsx` — agrupar por destino + badges
- `src/routes/_authenticated/cozinha.tsx` — usar RPC por destino
- `src/components/cozinha/kds-card.tsx` (ou caminho real do card) — idem
- `src/hooks/use-pedidos.ts` — incluir `destino_status` na query do detalhe

## Fora de escopo

- Som no painel do Bar (decidir depois).
- Bloqueio rígido de convite `bar` antes da classificação.
- Métricas/relatórios por destino.
