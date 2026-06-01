
# Análise e recomendações

## 1) Edição de categoria não permite alterar o destino (cozinha/bar)

### Diagnóstico

- Em `src/components/cardapio/categoria-dialog-body.tsx` (criação) o campo **Destino padrão** existe e é enviado.
- Em `src/components/cardapio/categoria-chip.tsx` (edição inline) só há o campo `nome`. O `destino` nunca é editado pela UI, embora `atualizarCategoriaFn` já aceite o parâmetro.
- Consequência observada pelo usuário: produtos vinculados a uma categoria criada sem destino correto não chegam ao KDS, porque o filtro do `/cozinha` exige `pedido_itens.destino = 'cozinha'`, derivado da categoria.

### Correção (escopo mínimo)

**Arquivo:** `src/components/cardapio/categoria-chip.tsx`

- Receber o `destino` atual da categoria via props (`cat.destino`).
- No modo `editing`, adicionar um `Select` (mesmos componentes shadcn já usados em `categoria-dialog-body.tsx`) com opções **Cozinha** e **Bar**, ao lado do `Input` do nome.
- No `save()`, passar `{ id, nome, destino }` para `atualizar.mutateAsync`.
- Sair do modo de edição e chamar `onChanged()` como já faz hoje.

**Arquivo:** `src/routes/_authenticated/admin/cardapio.tsx` (ou onde o chip é renderizado)

- Garantir que o objeto `cat` passado para `<CategoriaChip />` contém `destino` (o hook `useCardapio` já retorna `destino` no tipo `Categoria`).

Nada mais é tocado: o `atualizarCategoriaFn`, o tipo `Categoria`, o hook `useAtualizarCategoria` e o destino dos produtos individuais (`destino_override`) continuam idênticos. Nenhuma migração de banco.

### Como validar
Após a alteração:
1. Editar uma categoria existente, mudar destino para "Cozinha", salvar.
2. Criar um pedido com um produto dessa categoria.
3. Conferir se aparece no display `/cozinha`.

---

## 2) `/admin/pedidos` permite avançar status, desconectado do KDS

### Diagnóstico

Existem **dois conceitos paralelos de status**:

- **Status global do pedido** (`pedidos.status`) — exibido e avançado em `/admin/pedidos`.
- **Status por destino** (`pedido_destino_status`, destino `cozinha`/`bar`) — lido/atualizado pelos displays `/cozinha` e `/bar`.

O Kanban admin não atualiza `pedido_destino_status`, então avançar status por lá não comunica nada ao KDS. Isso cria sensação de desincronização.

### Recomendações (não aplicar agora)

- **R2.1** — Tornar `/admin/pedidos` somente leitura para a fila operacional: remover os botões "avançar" do Kanban; manter visualização completa (filtros, totais, detalhe, garçom, cliente, itens) e a ação de cancelamento.
- **R2.2** — No Kanban admin, exibir chips do estado por destino lidos de `pedido_destino_status` para refletir o que realmente está acontecendo na cozinha/bar.
- **R2.3** — No KDS, quando `pedidos.length > 0` e `ativos.length === 0`, mostrar aviso de diagnóstico ("X pedidos já estão prontos/entregues ou sem itens da cozinha").
- **R2.4** — Mostrar nome do restaurante no header do KDS para evitar confusão de conta.

---

## 3) Garçom não consegue ver conta e pedidos da mesa

### Diagnóstico

Em `/sala`, os cards de `MinhasMesasGrid` só oferecem o atalho **"+"** para nova comanda. Não há ação "abrir mesa" com visão consolidada. Backend já tem peças reaproveitáveis: `listarComandasAbertasMesaFn`, `resumoContaFn`, `buscarItensPedidoFn`, `listarPedidosDoDiaFn`.

### Recomendações (não aplicar agora)

- **R3.1** — Nova rota `/sala/mesa/$mesaId` exibindo: cabeçalho da mesa, comandas ativas (titular, total parcial, total pago, saldo), pedidos da sessão em ordem cronológica com status por destino, e conta consolidada (subtotal, descontos, cashback, total a pagar, total pago, saldo).
- **R3.2** — Tornar o card da mesa em `MinhasMesasGrid` clicável (abre `/sala/mesa/:mesaId`); manter o botão "+" como atalho no canto. Mesma melhoria em `/admin/garcons/:garcomId/sala` (modo somente leitura).
- **R3.3** — Criar `resumoContaMesaFn(restauranteId, mesaId)` (com `requireSupabaseAuth` + `assertAcessoRestaurante`) para servir o mesmo formato consolidado sem depender de `qrToken`/`clienteId`. Permite reaproveitar o componente "Conta da mesa".

---

## Escopo a aplicar agora

Apenas o **ponto 1** (edição de destino no chip de categoria). Após implementar, testar:
1. Editar categoria existente para destino "Cozinha".
2. Criar pedido com produto dessa categoria.
3. Confirmar exibição no display `/cozinha`.

As recomendações dos pontos 2 e 3 ficam preservadas no plano para implementação futura, conforme priorização do usuário.

## Arquivos alterados (agora)
1. `src/components/cardapio/categoria-chip.tsx` — adicionar `Select` de destino no modo edição; enviar `destino` no `atualizar.mutateAsync`.
2. `src/routes/_authenticated/admin/cardapio.tsx` *(somente se necessário)* — garantir que `destino` é repassado ao `CategoriaChip`.

## Fora de escopo
- Nada de banco de dados, RLS, hooks ou outras telas.
- Sem mudanças de layout, cores, textos, espaçamentos ou comportamento de outros componentes.
