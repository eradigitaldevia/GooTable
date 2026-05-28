## Lançamento de pedidos pelo garçom (verbal) — fluxo `/sala`

Objetivo: permitir que o garçom abra pedidos diretamente em uma mesa quando o cliente pediu verbalmente, sem usar o cardápio via QR. Sem alterar nenhum fluxo existente.

---

### 1. Banco de dados

**Migração — nova RPC `criar_pedido_garcom`** (SECURITY DEFINER, `search_path = public`):

Parâmetros:
- `_restaurante_id uuid`
- `_mesa_id uuid`
- `_garcom_id uuid` (NULL permitido — garçom não obrigatório no schema, mas validado quando informado)
- `_cliente_id uuid` (NULL = anônimo)
- `_comanda_id uuid` (NULL = resolver automaticamente)
- `_observacao text`
- `_total numeric`
- `_itens jsonb`

Comportamento:
1. Verifica `is_restaurante_membro(auth.uid(), _restaurante_id) OR is_platform_admin(auth.uid())`. Caso contrário, `RAISE EXCEPTION`.
2. Valida que `mesa` pertence ao restaurante e está `ativa`.
3. Garante `mesa_sessao` aberta na mesa: se não houver, cria uma nova (`status='aberta'`).
4. Resolve comanda:
   - Se `_comanda_id` informado: valida que pertence à sessão e está `aberta`.
   - Senão, conta comandas abertas da sessão:
     - 0 → cria `compartilhada` automaticamente.
     - 1 → usa essa.
     - 2+ → `RAISE EXCEPTION 'multiplas_comandas_abertas'` (frontend trata mostrando seletor).
5. Insere `pedidos` com `garcom_id = _garcom_id`, `cliente_id = _cliente_id`, `status='recebido'`, `total = _total`, `comanda_id`, `sessao_id`.
6. Insere `pedido_itens` a partir de `_itens` (mesmo formato do `criar_pedido_publico`).
7. Retorna `pedido_id uuid`.

Sem alterações em tabelas existentes. Trigger `trg_pedido_log_status` (criado anteriormente) já vai registrar o pedido em `pedido_status_historico`.

---

### 2. Server function

**Arquivo:** `src/lib/pedidos.functions.ts` (adicionar ao final, sem tocar no que já existe).

```ts
export const criarPedidoGarcomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(...)  // zod: restauranteId, mesaId, garcomId?, clienteId?, comandaId?, observacao?, itens[]
  .handler(async ({ context, data }) => {
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    // Recalcula total no backend a partir de produtos.preco (anti-tampering, igual ao público)
    // Chama RPC criar_pedido_garcom
    // Retorna { id, comandaId, sessaoId }
  });
```

Trata erro `multiplas_comandas_abertas` retornando shape específico para o frontend.

---

### 3. Hook

**Arquivo:** `src/hooks/use-pedidos.ts` — adicionar `useCriarPedidoGarcom()` (mutation, invalida `SALA_KEY` no `onSuccess`).

---

### 4. Nova rota `/sala/nova-comanda/$mesaId`

**Arquivo:** `src/routes/_authenticated/sala.nova-comanda.$mesaId.tsx`

Layout otimizado para velocidade do garçom (mobile-first, mesma identidade visual do `/sala`):

```text
┌────────────────────────────────────┐
│ ← Mesa 12        [Identificar 📞] │
├────────────────────────────────────┤
│ 🔍 Buscar produto...               │
│ [Todas][Bebidas][Pratos][Sobr.]    │ ← chips horizontais scrolláveis
├────────────────────────────────────┤
│ Coca-Cola Lata        R$ 7,00  [+]│
│ Heineken 600ml       R$ 18,00  [+]│ ← lista densa, sem imagens
│ Picanha na Chapa     R$ 89,00  [+]│
│ ...                                 │
├────────────────────────────────────┤
│ 3 itens · R$ 32,00     [Enviar →] │ ← barra fixa
└────────────────────────────────────┘
```

Comportamento:
- Tap em `[+]`: adiciona qtd 1 ao carrinho. Tap novamente: incrementa.
- Item já no carrinho mostra contador `[− 2 +]` no lugar do `[+]`.
- Ícone discreto de observação por item no carrinho (drawer "Revisar pedido").
- Botão "Identificar 📞" (top-right): abre modal reutilizando `buscarClientePorTelefoneFn` (já existe via `use-garcom-lookup` / hook similar). Cliente identificado mostra chip com nome no header; pode remover.
- Pedido enviado anonimamente se nenhum cliente foi identificado.
- "Enviar →":
  - Chama `criarPedidoGarcomFn` com `garcomId = garçom logado` (do `useSalaDados`).
  - Se RPC retornar `multiplas_comandas_abertas`: abre modal seletor com lista de comandas abertas da sessão + opção "+ Nova comanda individual"; reenvia com `comandaId`.
  - Em sucesso: toast + `navigate({ to: "/sala" })`.

Componentes novos (todos em `src/components/sala/nova-comanda/`):
- `cardapio-denso-list.tsx` — lista de produtos com busca + chips.
- `carrinho-bar.tsx` — barra inferior fixa com total e botão enviar.
- `revisar-pedido-drawer.tsx` — drawer com itens + observação + qtd.
- `identificar-cliente-modal.tsx` — busca por telefone.
- `escolher-comanda-modal.tsx` — seletor quando há 2+ comandas abertas.

Cardápio carregado via hook existente `useCardapio(restauranteId)` (já lista categorias + produtos) — não criar fetch novo.

---

### 5. Entry points em `/sala`

**Arquivo:** `src/components/sala/minhas-mesas-grid.tsx` — adicionar botão `+` discreto no `mesa-card` que faz `navigate({ to: "/sala/nova-comanda/$mesaId", params: { mesaId } })`. Sem alterar layout existente do card além desse botão.

Nenhuma alteração em outras telas (`/admin/pedidos`, KDS, cliente público).

---

### 6. Realtime

Sem mudanças. O `useRealtimeSala` já escuta INSERT em `pedidos` filtrado por `restaurante_id` e atualiza KDS/painéis automaticamente. O pedido criado pelo garçom aparece naturalmente.

---

### Arquivos afetados (resumo)

**Novos:**
- `supabase/migrations/<timestamp>_criar_pedido_garcom_rpc.sql`
- `src/routes/_authenticated/sala.nova-comanda.$mesaId.tsx`
- `src/components/sala/nova-comanda/cardapio-denso-list.tsx`
- `src/components/sala/nova-comanda/carrinho-bar.tsx`
- `src/components/sala/nova-comanda/revisar-pedido-drawer.tsx`
- `src/components/sala/nova-comanda/identificar-cliente-modal.tsx`
- `src/components/sala/nova-comanda/escolher-comanda-modal.tsx`

**Editados (cirurgicamente):**
- `src/lib/pedidos.functions.ts` — adiciona `criarPedidoGarcomFn` no final.
- `src/hooks/use-pedidos.ts` — adiciona `useCriarPedidoGarcom`.
- `src/components/sala/minhas-mesas-grid.tsx` — adiciona botão `+` no card.

---

### Garantias

- Zero alteração em fluxos existentes (cliente público, admin pedidos, KDS, cozinha, sala).
- Zero alteração em RLS de tabelas existentes.
- Reuso de RPC pattern, validação anti-tampering e middleware já estabelecidos no projeto.
- Métricas operacionais e comissões/cashback (via `creditar_cashback_pedido` no `entregue`) funcionam automaticamente porque o pedido entra na mesma tabela.

Confirme para eu implementar.