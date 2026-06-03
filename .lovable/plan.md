# Plano: Cancelamento de pedido/item na área do garçom

## Contexto

O backend (`cancelar_pedido`, `cancelar_item_pedido`), as server functions (`cancelarPedidoFn`, `cancelarItemPedidoFn`) e os hooks (`useCancelarPedido`, `useCancelarItemPedido`) **já existem** desde a entrega anterior do Cenário C. O componente reutilizável `DetalhePedido` (com `AlertDialog` de motivo + lixeira por item) também já existe e está em uso no admin.

O que faltou: **ligar essa UI na tela do garçom** (`src/routes/_authenticated/sala_.mesa.$mesaId.tsx`), onde hoje os pedidos da sessão só são listados em modo leitura.

## Mudanças

### 1. `src/routes/_authenticated/sala_.mesa.$mesaId.tsx`

- Em cada item da lista "Pedidos da sessão", trocar a renderização inline atual por um disclosure (clique no card → abre `Sheet`/`Dialog` com `DetalhePedido`).
- Passar para `DetalhePedido` os handlers `onCancelar` (pedido inteiro) e `onCancelarItem` (item individual) usando os hooks já existentes:
  - `useCancelarPedido(restauranteId)` → `cancelarPedidoFn`
  - `useCancelarItemPedido(restauranteId)` → `cancelarItemPedidoFn`
- Após sucesso, invalidar `queryKeys.resumoContaMesa` para o card recarregar totais.
- Carregar os itens detalhados via `useItensPedido(pedidoId)` somente quando o disclosure abrir (lazy).

### 2. Regras de visibilidade (frontend)

- Botão "Cancelar pedido" oculto quando `pedido.status ∈ {entregue, cancelado}` (mesma regra já usada no admin).
- Lixeira por item oculta nas mesmas condições.
- Quando `quantidade_pronta > 0` ou status `em_preparo`/`pronto`, o `AlertDialog` (já existente em `DetalhePedido`) exige motivo — sem mudanças aqui.

### 3. Sem mudanças

- Banco, RPCs, RLS, server functions, hooks, `DetalhePedido`, admin/pedidos: nada muda. Cliente continua sem cancelar pós-envio (só FAB "Chamar garçom").
- Recálculo de `comandas.subtotal/total`, auditoria em `audit_logs` e bloqueio de `entregue` continuam sendo feitos no servidor — frontend só chama.

## Arquivos

```text
modificar:
  src/routes/_authenticated/sala_.mesa.$mesaId.tsx
    - importar useCancelarPedido, useCancelarItemPedido, useItensPedido, DetalhePedido
    - tornar cada pedido clicável → Sheet com DetalhePedido + handlers
    - invalidar resumo-conta-mesa no onSuccess
```

Sem migration, sem novos componentes, sem mudanças no admin.

## Validação

- Garçom abre mesa → clica em pedido `recebido` → "Cancelar pedido" → confirma sem motivo → comanda recalcula.
- Garçom clica em pedido `em_preparo` → tenta cancelar → `AlertDialog` exige motivo (≥3 chars) → confirma → `audit_logs` registra.
- Garçom clica em item específico → lixeira → mesma regra de motivo → item sumir, totais atualizam.
- Pedido `entregue` → botões ocultos.

## Pergunta

1. Disclosure preferido: `Sheet` lateral (mesma estética do admin) ou `Dialog` central? Sugiro **Sheet** para mobile-friendly.  
Resposta: **Sheet** 