# Status por item no KDS (com granularidade por unidade)

## Objetivo
Permitir que a cozinha marque cada **unidade** de cada item como pronta. Ex.: pedido com `2x Coca` permite marcar "1 de 2 prontas" e depois "2 de 2 prontas". O status do pedido (`pedidos.status`) é derivado automaticamente via trigger no banco. O cliente vê o progresso por item na página de acompanhamento (somente leitura).

---

## 1. Modelo de dados

### 1.1 Novo enum
```sql
CREATE TYPE public.pedido_item_status AS ENUM ('pendente', 'em_preparo', 'pronto');
```

### 1.2 Colunas novas em `pedido_itens`
- `status pedido_item_status NOT NULL DEFAULT 'pendente'` — status agregado do item (derivado de `quantidade_pronta`).
- `quantidade_pronta integer NOT NULL DEFAULT 0` — quantas unidades já saíram. Constraints:
  - `CHECK (quantidade_pronta >= 0 AND quantidade_pronta <= quantidade)`.
- Regra de derivação do `status` (na própria função `marcar_item_unidade`):
  - `quantidade_pronta = 0` → `pendente`
  - `0 < quantidade_pronta < quantidade` → `em_preparo`
  - `quantidade_pronta = quantidade` → `pronto`

### 1.3 Backfill
- Itens existentes: `quantidade_pronta = 0`, `status = 'pendente'` (default).
- Para pedidos historicamente `entregue` ou `pronto`: setar `quantidade_pronta = quantidade` e `status = 'pronto'` (consistência retroativa).

### 1.4 Índice
```sql
CREATE INDEX idx_pedido_itens_pedido_status ON public.pedido_itens(pedido_id, status);
```

### 1.5 RLS
- `pedido_itens` hoje não tem UPDATE permitido. Adicionar policy:
  ```sql
  CREATE POLICY itens_update_membro ON public.pedido_itens
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM pedidos p
                  WHERE p.id = pedido_itens.pedido_id
                    AND (is_restaurante_membro(auth.uid(), p.restaurante_id)
                         OR is_platform_admin(auth.uid()))))
  WITH CHECK (...mesma expressão...);
  ```
- Demais policies inalteradas.

### 1.6 Função + trigger de derivação do pedido
Função `public.derivar_status_pedido(_pedido_id uuid)` (SECURITY DEFINER, search_path=public):
- Lê `pedidos.status` atual.
- Se for `entregue` ou `cancelado` → não faz nada (terminais).
- Conta itens do pedido por `status`.
- Se **todos** os itens estão `pronto` → `pedidos.status = 'pronto'`.
- Senão, se **≥1** item está `em_preparo` ou `pronto` → `pedidos.status = 'em_preparo'`.
- Senão (todos `pendente`) → `pedidos.status = 'recebido'`.
- Atualiza `atualizado_em`.

Trigger `AFTER INSERT OR UPDATE OF status OR DELETE ON pedido_itens FOR EACH ROW` → chama a função para o `pedido_id` afetado.

---

## 2. Server functions

Arquivo novo `src/lib/kds.functions.ts` (não tocar `pedidos.functions.ts`):

### 2.1 `marcarItemUnidadesFn({ itemId, quantidadePronta })`
- Middleware `requireSupabaseAuth`.
- Zod: `itemId uuid`, `quantidadePronta int >= 0`.
- Handler:
  1. Lê item + `pedidos.restaurante_id, pedidos.status`.
  2. Valida `is_restaurante_membro` (admin/staff/cozinheiro) OR `is_platform_admin`.
  3. Bloqueia se pedido está em `entregue` ou `cancelado`.
  4. Valida `0 <= quantidadePronta <= item.quantidade`.
  5. Calcula `status` derivado pela regra do §1.2.
  6. UPDATE `pedido_itens SET quantidade_pronta = ..., status = ...`.
  7. (Trigger atualiza o pedido.)
  8. Audit log `marcar_item_unidades` com `{itemId, de, para}`.

### 2.2 `marcarItemProntoTotalFn({ itemId })`
- Atalho que seta `quantidade_pronta = item.quantidade` (status `pronto`). Reusa 2.1 internamente.

### 2.3 `desfazerItemFn({ itemId })`
- Atalho que seta `quantidade_pronta = 0` (status `pendente`).

Hook novo `src/hooks/use-kds-item.ts`:
- `useMarcarItemUnidades()`, `useMarcarItemProntoTotal()`, `useDesfazerItem()` — TanStack Mutations que invalidam as queries de pedidos do restaurante.

---

## 3. UI — KDS (cozinha)

### 3.1 `src/components/cozinha/kds-card.tsx`
Cada linha de item passa a mostrar `quantidade_pronta / quantidade` e ganha controles:

- **Caso `quantidade === 1`** (maioria dos casos): botão único que cicla `pendente → pronto → pendente`.
- **Caso `quantidade > 1`**:
  - Botão `+1` (incrementa `quantidade_pronta`, desabilitado quando já cheio).
  - Botão `−1` discreto (decrementa, desabilitado em 0).
  - Botão "Marcar tudo" (atalho `marcarItemProntoTotalFn`).
  - Visual: contador `2 / 3`, badge `Em preparo` quando parcial, riscado + check verde quando completo.

- Botão atual "marcar pedido inteiro como pronto" preservado (atalho global do card).
- Se o arquivo passar de 150 linhas, extrair `kds-item-row.tsx`.

### 3.2 `src/routes/_authenticated/cozinha.tsx`
- Apenas ajusta o tipo do item lido (incluir `status` e `quantidade_pronta`).
- Realtime de `pedido_itens` já existe — sem mudança de subscrição.

---

## 4. UI — Cliente (somente leitura)

`src/routes/m.$qrToken.status.$pedidoId.tsx`:
- Para cada item, mostrar badge com progresso:
  - `quantidade === 1`: `Aguardando` / `Preparando` / `Pronto`.
  - `quantidade > 1`: `Pronto: X / Y` + badge de estado agregado.
- Sem botões. Apenas leitura.
- Realtime já ativo na rota.

---

## 5. Arquivos afetados

**Novos**
- `supabase/migrations/<timestamp>_pedido_item_status.sql`
- `src/lib/kds.functions.ts`
- `src/hooks/use-kds-item.ts`

**Editados**
- `src/components/cozinha/kds-card.tsx` (controles por item + visual)
- `src/routes/_authenticated/cozinha.tsx` (tipagem dos itens)
- `src/routes/m.$qrToken.status.$pedidoId.tsx` (badge por item + progresso X/Y)
- `src/integrations/supabase/types.ts` (regenerado pela migration — não editar à mão)

**Não tocar**: nada fora desta lista.

---

## 6. Validação após implementar
1. Migration roda. Itens novos nascem `pendente` / `0`. Pedidos `entregue` ficam com itens `pronto` / `quantidade_pronta = quantidade`.
2. Item `quantidade = 1`: 1 clique vira `pronto`; desfazer volta para `pendente`.
3. Item `quantidade = 3`: `+1` → "1/3" (item `em_preparo`, pedido `em_preparo`). `+1` → "2/3". `+1` → "3/3" (item `pronto`).
4. Quando todos os itens de um pedido ficam `pronto` → pedido vira `pronto` automaticamente.
5. Desfazer 1 unidade de "3/3" → item volta para `em_preparo` → pedido volta para `em_preparo`.
6. Pedido `entregue` não é alterado pela trigger; server fn recusa marcação.
7. Anon (cliente público) não consegue chamar `marcarItemUnidadesFn` (sem bearer válido).
8. Tela do cliente mostra `X / Y` em tempo real ao incrementar no KDS.

---

## 7. Fora de escopo
- Roteamento por estação de preparo (bar / cozinha quente / fria).
- Notificação push ao garçom quando item fica pronto.
- Métricas de tempo por item / por estação.
- Histórico granular por unidade (apenas o contador atual é guardado, não o log de cada `+1`).
