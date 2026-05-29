## Cenário C — Exclusão/Cancelamento de itens (pré e pós-envio)

Cobre exclusão no carrinho antes do envio e cancelamento depois do envio, com regras diferenciadas por ator (cliente vs. garçom/admin).

---

### Parte A — Carrinho do garçom (pré-envio)

**1. `src/components/sala/nova-comanda/cardapio-denso-list.tsx`**
- Adicionar prop opcional `onRemoveAll?: (produtoId: string) => void`.
- Quando `qtd > 0`, exibir um terceiro botão `Trash2` (lixeira) ao lado dos botões `-` / `+`, que chama `onRemoveAll(p.id)`.
- Sem `onRemoveAll`, o componente continua funcionando como hoje (não quebra outros call sites).

**2. `src/routes/_authenticated/sala.nova-comanda.$mesaId.tsx`**
- Criar `handleRemoveAll(produtoId)` que remove todas as ocorrências daquele produto do carrinho local (`itensCarrinho.filter(i => i.produto_id !== produtoId)`).
- Passar `onRemoveAll={handleRemoveAll}` para `<CardapioDensoList>`.

> Carrinho do cliente (`/m/$qrToken/carrinho`) já tem lixeira por item — nada a fazer.

---

### Parte B — Pós-envio: cancelar pedido inteiro (garçom/admin)

Hoje `atualizarStatusPedidoFn("cancelado")` apenas troca status, sem reverter `comandas.subtotal/total`. Substituir por RPC dedicada.

**1. Migration: criar função `cancelar_pedido(_pedido_id, _motivo)`**
- `SECURITY DEFINER`, `search_path = public`.
- Valida `is_restaurante_membro(auth.uid(), pedido.restaurante_id)`.
- Bloqueia se `pedido.status IN ('entregue','cancelado')`.
- Se `quantidade_pronta > 0` em algum item OU `pedido.status IN ('em_preparo','pronto')`, exige `_motivo` não vazio (`RAISE EXCEPTION` se faltar).
- Subtrai `pedido.total` de `comandas.subtotal`; recalcula `comandas.total = GREATEST(subtotal - cashback_resgatado - desconto_cupom, 0)`.
- Atualiza `pedidos.status = 'cancelado'`.
- Insere em `audit_logs` (`entidade='pedido'`, `acao='cancelar'`, metadata com motivo, total revertido, status anterior).
- Trigger de comissão já é seguro (só dispara em `entregue`).

**2. `src/lib/pedidos.functions.ts`**
- Nova serverFn `cancelarPedidoFn({ pedidoId, restauranteId, motivo? })` que chama a RPC via `supabase.rpc('cancelar_pedido', ...)`.
- Manter `atualizarStatusPedidoFn` apenas para transições não-cancelamento (recebido → em_preparo → pronto → entregue).

**3. `src/hooks/use-pedidos.ts`**
- Novo hook `useCancelarPedido(restauranteId)` que invalida `queryKeys.pedidos(restauranteId)`.

**4. `src/components/pedidos/detalhe-pedido.tsx`**
- Substituir `onCancelar` direto por fluxo com `AlertDialog`:
  - Se `pedido.status === 'recebido'` e todos itens com `quantidade_pronta === 0`: confirmação simples.
  - Caso contrário (em preparo / pronto / algum item já pronto parcialmente): exigir campo `Textarea` com motivo (obrigatório, min 3 chars) antes de confirmar.
- Bloquear botão quando `status IN ('entregue','cancelado')`.

**5. `src/routes/_authenticated/admin/pedidos.tsx`**
- Trocar `onCancelar` para usar `useCancelarPedido` em vez de `atualizarStatus(aberto, "cancelado")`.

---

### Parte C — Pós-envio: cancelar item individual (garçom/admin)

Hoje não existe. `pedido_itens` não tem DELETE em RLS e `pedido_item_status` não tem `'cancelado'`.

**1. Migration: criar função `cancelar_item_pedido(_item_id, _motivo)`**
- `SECURITY DEFINER`, valida membro do restaurante via `pedido.restaurante_id`.
- Bloqueia se pedido pai estiver `entregue`/`cancelado`.
- Se `item.quantidade_pronta > 0` OU `pedido.status IN ('em_preparo','pronto')`, exige `_motivo` não vazio.
- Calcula `valor_item = preco_unit * quantidade`.
- `DELETE FROM pedido_itens WHERE id = _item_id`.
- Subtrai `valor_item` de `pedidos.total` e `comandas.subtotal`; recalcula `comandas.total`.
- Se foi o último item do pedido → marca `pedidos.status = 'cancelado'`.
- Insere em `audit_logs` (`entidade='pedido_item'`, `acao='cancelar'`, metadata com produto, qtd, valor, motivo).

**2. `src/lib/pedidos.functions.ts`**
- Nova serverFn `cancelarItemPedidoFn({ itemId, pedidoId, restauranteId, motivo? })`.

**3. `src/hooks/use-pedidos.ts`**
- Novo hook `useCancelarItemPedido(restauranteId)` que invalida `queryKeys.pedidos(restauranteId)` e `queryKeys.pedido(pedidoId)`.

**4. `src/components/pedidos/detalhe-pedido.tsx`**
- Em cada linha de item, adicionar botão `Trash2` (apenas para garçom/admin, ou seja sempre dentro deste componente — ele já é admin-only):
  - Desabilitado se `pedido.status IN ('entregue','cancelado')`.
  - Ao clicar: abre `AlertDialog` inline. Se item já tem `quantidade_pronta > 0` ou pedido está `em_preparo/pronto`, exige motivo.
- Tradução: confirmação tipo "Cancelar este item? Motivo é obrigatório porque a cozinha já começou a preparar."

---

### Parte D — Cliente NÃO pode cancelar pós-envio

- Nenhuma mudança na rota `/m/$qrToken/status/$pedidoId` nem em componentes do cliente.
- Cliente continua tendo apenas o FAB "Chamar garçom" (`chamar-garcom-fab.tsx`) — canal já existente para solicitar cancelamento.
- Nenhuma RPC chamável publicamente (todas as novas RPCs validam `is_restaurante_membro`).

---

### Resumo de regras

| Cenário | Quem | Como |
|---|---|---|
| Item no carrinho (cliente, QR) | Cliente | Lixeira já existente — OK |
| Item no carrinho (garçom) | Garçom | **Nova lixeira** (Parte A) |
| Cancelar pedido enviado, cozinha não viu (`quantidade_pronta=0`) | Garçom/Admin | Confirmação simples (Parte B) |
| Cancelar pedido `em_preparo`/`pronto` | Garçom/Admin | Motivo obrigatório (Parte B) |
| Cancelar item individual enviado | Garçom/Admin | Lixeira por item, motivo se cozinha começou (Parte C) |
| Cancelar pedido `entregue` | — | **Bloqueado** (fluxo de estorno é fora de escopo) |
| Cliente cancela pós-envio | — | **Bloqueado** — usa FAB de garçom |

---

### Detalhes técnicos

- **Cashback gerado**: só é creditado quando pedido atinge `entregue`, então cancelamentos antes disso não precisam estornar. Cashback **resgatado** fica preservado na comanda (não é por pedido).
- **Comissões**: trigger só dispara em `entregue`, então cancelar antes não gera comissão fantasma.
- **Auditoria**: toda cancelamento (pedido ou item) registra em `audit_logs` com `actor_user_id = auth.uid()`, motivo e valores revertidos — rastreável no superadmin.
- **Concorrência**: RPCs usam `SELECT ... FOR UPDATE` em `pedidos` e `comandas` para evitar race com outras atualizações de total.

Confirma que posso aplicar?
