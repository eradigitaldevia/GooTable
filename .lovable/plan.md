## Não sugerir itens já presentes no carrinho ou nos pedidos da comanda

Hoje `sugerirUpsell` só remove itens do **carrinho local** (`idsNoCarrinho`). Itens que já foram enviados em pedidos anteriores da mesma comanda continuam aparecendo como sugestão, o que causa recomendações redundantes (ex.: cliente já pediu Coca, o upsell ainda sugere Coca).

### Mudança proposta

1. **Backend — expor produtos já pedidos na comanda**
   - Em `src/lib/status-pedido-publico.functions.ts`, dentro de `listarPedidosComandaPublicoFn`:
     - Adicionar `produto_id` e `status` ao select de `pedido_itens` (já carrega os itens, é só incluir o campo).
     - Retornar, junto de `pedidos`, um novo campo `produto_ids: string[]` — conjunto distinto de `produto_id` de itens **não cancelados** (qualquer status ≠ `cancelado`).
   - Atualizar o tipo de retorno da fn.

2. **Frontend — passar esse conjunto ao upsell**
   - Em `src/routes/m.$qrToken_.carrinho.tsx`:
     - Chamar `usePedidosComanda(qrToken, identidade?.comandaId)` (hook já existe).
     - Extrair `produtosJaPedidos = new Set(data?.produto_ids ?? [])`.
     - Passar como nova prop `produtosJaPedidos` ao `<UpsellCarrinho />` (vazio quando não houver comanda).

3. **Lógica — excluir do pool de candidatos**
   - Em `src/lib/upsell.ts`, `sugerirUpsell` recebe um 4º parâmetro opcional `idsExcluidos?: Set<string>`.
   - O filtro `candidatos` passa a ser:
     ```ts
     produtos.filter(p => p.disponivel && !idsNoCarrinho.has(p.id) && !idsExcluidos?.has(p.id))
     ```
   - O cálculo de `tiposNoCarrinho` também considera `idsExcluidos` (se já pedimos bebida, não sugerir outra bebida na camada B). Renomear internamente para `tiposJaConsumidos` para refletir a semântica.

4. **`UpsellCarrinho`**
   - Aceita `produtosJaPedidos?: Set<string>` e repassa para `sugerirUpsell` como `idsExcluidos`.

### Arquivos afetados

- `src/lib/status-pedido-publico.functions.ts` — incluir `produto_id`/`status` no select e devolver `produto_ids` no retorno.
- `src/routes/m.$qrToken_.carrinho.tsx` — consumir `usePedidosComanda` e propagar o set.
- `src/components/cliente/upsell-carrinho.tsx` — nova prop opcional.
- `src/lib/upsell.ts` — parâmetro `idsExcluidos` + uso em `candidatos` e em `tiposJaConsumidos`.

### Fora de escopo

- Não muda RLS nem schema do banco.
- Não muda nada na tela de status do pedido (a fn só ganha um campo extra, retrocompatível).
- Não toca nas camadas A/B/C nem nos rótulos de motivo (continuam como discutido anteriormente, separadamente).
