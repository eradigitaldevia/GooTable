# Plano: Papel "Bar" e separação Cozinha × Bar

## Visão geral

Hoje todos os itens de pedido vão para `/cozinha` (KDS único). Vamos:

1. Classificar itens como **cozinha** ou **bar** (híbrido: categoria define, produto pode sobrescrever).
2. Criar painel `/bar` customizado para o ritmo de bar.
3. Cada destino tem status próprio (`recebido | em_preparo | pronto`), independente do outro.
4. Novo papel `bar` na equipe, com acesso restrito ao painel do Bar.
5. Tela de migração assistida para classificar o cardápio existente antes de ativar o Bar.

---

## 1. Banco de dados (migração única)

### 1.1 Enum de papéis

- `ALTER TYPE app_role ADD VALUE 'bar';`

### 1.2 Classificação do cardápio

- `categorias.destino` — enum `destino_preparo` (`cozinha` | `bar`), default `cozinha`.
- `produtos.destino_override` — enum `destino_preparo` nullable (sobrescreve a categoria quando preenchido).
- Coluna derivada `pedido_itens.destino` (`cozinha` | `bar`), preenchida no insert por trigger a partir de `produto.destino_override` ?? `categoria.destino`. Congelar no item evita inconsistências quando o admin reclassificar depois.

### 1.3 Status por destino

- Nova tabela `pedido_destino_status`:
  - `pedido_id` (fk), `destino` (enum), `status` (`recebido|em_preparo|pronto`), `atualizado_em`.
  - PK composta `(pedido_id, destino)`.
  - GRANTs para `authenticated` + `service_role`. RLS via membro do restaurante (join em `pedidos`).
- Trigger no insert de `pedido_itens`: garante linha em `pedido_destino_status` para cada destino presente no pedido (status inicial `recebido`).
- `pedidos.status` continua existindo e passa a ser **derivado**: vira `pronto` quando todos os destinos do pedido estão `pronto`; vira `em_preparo` se qualquer destino sair de `recebido`. Atualizado por trigger em `pedido_destino_status`.

### 1.4 RPCs novas / ajustadas

- `atualizar_status_destino(_pedido_id, _destino, _status)` — SECURITY DEFINER, valida transição e que o usuário tem papel compatível (`cozinheiro|admin|staff` para destino cozinha; `bar|admin|staff` para destino bar).
- `cancelar_item_pedido` / `cancelar_pedido` existentes: continuam funcionando; quando último item de um destino for cancelado, remove a linha de `pedido_destino_status` correspondente.
- `marcar_item_unidades` (KDS por unidade) já existe; passa a respeitar o destino do item.

---

## 2. Frontend

### 2.1 Tipos e hooks

- `src/lib/equipe.functions.ts`: adicionar `"bar"` em `PAPEIS`.
- Atualizar `PAPEL_LABEL` em `equipe-panel.tsx` (rótulo "Bar").
- Novo helper em `src/lib/auth.server.ts`: `assertPapelBar` / `assertPapelCozinha`.

### 2.2 Cardápio (admin)

- `produto-form-fields.tsx`: adicionar select "Destino" (Padrão da categoria / Cozinha / Bar).
- `categoria-dialog-body.tsx`: adicionar select "Destino padrão" (Cozinha / Bar).
- Badge visual nas listas indicando destino efetivo do produto.

### 2.3 Migração assistida

- Nova rota `/_authenticated/admin/destinos-preparo.tsx` (link no admin sidebar quando houver categorias/produtos sem classificação explícita ou quando o papel Bar for criado pela primeira vez).
- Tabela editável: cada categoria com select de destino + lista de produtos com override.
- Banner em `/_authenticated/admin/equipe.tsx` quando admin tenta convidar alguém como Bar mas nenhum produto está marcado como bar: "Configure os destinos antes de ativar o painel do Bar."

### 2.4 Painel do Bar (novo, customizado)

- Nova rota `/_authenticated/bar.tsx`.
- Layout pensado para bebidas (rápido, alto volume, prep curto):
  - **Lista única em fluxo** (não kanban por status). Cards compactos horizontais ordenados por chegada.
  - Cada card mostra: mesa, garçom, bebidas (nome + qtd + observação), tempo decorrido. Sem categorização por status — apenas botão "✓ Pronto" por item ou "Tudo pronto" no card.
  - Sem coluna "Em preparo" separada: bebidas geralmente vão direto de "recebido" → "pronto". Status `em_preparo` é opcional (atalho para drinks que demoram).
  - Cabeçalho enxuto: contador de pendentes, toggle de som, badge de conexão.
  - Reaproveita `useRealtimeStatus`, `KdsConnectionBanner` e `useTick`.
- Novos componentes em `src/components/bar/`:
  - `bar-header.tsx`
  - `bar-card.tsx` (compacto, horizontal)
  - `bar-empty-state.tsx`

### 2.5 Cozinha (ajustes)

- `src/routes/_authenticated/cozinha.tsx` e `kds-card.tsx`: filtrar `pedido_itens` para `destino = 'cozinha'`. Pedidos com apenas itens de bar não aparecem mais. Pedidos mistos aparecem só com os itens de cozinha; status mostrado vem de `pedido_destino_status` (destino cozinha).
- Botão "Avançar" passa a chamar `atualizar_status_destino` em vez de `atualizar_status_pedido`.

### 2.6 Roteamento e acesso

- `_authenticated.tsx`: redirecionar usuário com papel `bar` para `/bar` por padrão (igual ao que hoje acontece com `cozinheiro` → `/cozinha`, conferir e seguir o mesmo padrão).
- Sidebar admin: novo item "Bar" para admin/staff visualizarem o painel.
- Equipe: papel "Bar" aparece no select de convite e alteração.

### 2.7 Detalhe do pedido (admin)

- `detalhe-pedido.tsx`: agrupar itens por destino (seção "Cozinha" e seção "Bar"), cada uma com seu status próprio vindo de `pedido_destino_status`.

---

## 3. Realtime

- Bar e Cozinha assinam mudanças em `pedido_itens` + `pedido_destino_status` filtradas pelo restaurante. Banner de conexão idêntico ao KDS.

---

## 4. Áreas explicitamente fora do escopo

- Sem mudanças em comissões, pagamentos, fidelidade, cupons.
- Sem mudanças no fluxo do garçom/cliente (eles continuam vendo um pedido único; a separação cozinha/bar é interna).
- Sem alteração visual no card do cliente (status timeline continua usando `pedidos.status` derivado).

---

## 5. Arquivos afetados

**Criar**

- `supabase/migrations/<timestamp>_papel_bar_destino_preparo.sql`
- `src/routes/_authenticated/bar.tsx`
- `src/routes/_authenticated/admin/destinos-preparo.tsx`
- `src/components/bar/bar-header.tsx`
- `src/components/bar/bar-card.tsx`
- `src/components/bar/bar-empty-state.tsx`
- `src/lib/bar.functions.ts`
- `src/hooks/use-bar.ts`

**Editar**

- `src/lib/equipe.functions.ts` (PAPEIS)
- `src/components/admin/equipe-panel.tsx` (label + select)
- `src/lib/cardapio.functions.ts` (destino em categoria/produto)
- `src/components/cardapio/produto-form-fields.tsx`
- `src/components/cardapio/categoria-dialog-body.tsx`
- `src/lib/pedidos.functions.ts` (filtro destino + RPC nova)
- `src/hooks/use-pedidos.ts`
- `src/routes/_authenticated/cozinha.tsx` (filtro cozinha + novo RPC)
- `src/components/cozinha/kds-card.tsx` (consumir status do destino)
- `src/components/pedidos/detalhe-pedido.tsx` (agrupar por destino)
- `src/components/admin/admin-sidebar.tsx` (link Bar)
- `src/routes/_authenticated.tsx` (redirect por papel)

---

## 6. Confirmação solicitada antes de implementar

1. OK manter os papéis existentes intactos e apenas **adicionar** `bar` (sem renomear `cozinheiro`)?  
Resposta: Sim, manter os papéis existentes intactos e apenas **adicionar** `bar.`
2. O painel do Bar pode começar **sem coluna "em_preparo"** (apenas pendente → pronto, com `em_preparo` como atalho opcional)? Ou prefere as duas colunas iguais à cozinha mesmo sendo "customizado"?  
Resposta: Sim, painel do Bar pode começar **sem coluna "em_preparo"** (apenas pendente → pronto, com `em_preparo` como atalho opcional)
3. Migração assistida: posso bloquear o convite de membro `bar` até existir pelo menos 1 produto/categoria marcado como destino bar, ou prefere apenas avisar com banner sem bloquear?  
Resposta: Prefiro apenas avisar com banner sem bloquear.