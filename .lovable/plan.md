## Diagnóstico

O pedido `c96d20a3…` (Mesa 01) já está corretamente marcado como `cancelado` no banco (verificado via SQL), e o RPC `cancelar_pedido` ajusta os totais da comanda. O problema está **apenas na camada de leitura/UI**:

- `resumoContaMesaFn` (`src/lib/pedidos.functions.ts`, l. 947–953) faz `select … from pedidos` **sem filtrar `status='cancelado'`**, então o pedido cancelado continua aparecendo no card "Pedidos da sessão".
- Os itens carregados (l. 988–992) também não filtram itens com `status='cancelado'`, então cancelamentos de item individual continuariam visíveis.
- Ao clicar no pedido, o `DetalhePedido` é aberto e mostra o bloco de "Confirmar pagamento" mesmo quando o pedido está cancelado, porque o componente foi reaproveitado do admin e nunca foi pensado para o garçom (que não cobra).

## Correção proposta

Mudanças cirúrgicas, apenas frontend/serverFn de leitura — não mexer no RPC nem na lógica de cancelamento (que está OK).

### 1. `src/lib/pedidos.functions.ts` — `resumoContaMesaFn`
- Adicionar `.neq("status", "cancelado")` no `select` de `pedidos` (l. 947–953), para que pedidos cancelados não voltem para a tela.
- Adicionar `.neq("status", "cancelado")` no `select` de `pedido_itens` (l. 988–992), cobrindo o caso de cancelamento item-a-item dentro de um pedido que continua ativo.

### 2. `src/routes/_authenticated/sala_.mesa.$mesaId.tsx`
- Quando o garçom abrir um pedido pelo card, **não** propagar a opção de cobrança. Passar uma flag (`hideCobranca`) ou usar uma variante do `DetalhePedido` que oculte o bloco "Saldo da comanda" + botão "Confirmar pagamento" — cobrança é responsabilidade do Caixa, não do garçom. O garçom mantém: ver itens, cancelar pedido, cancelar item, dividir comissão.

### 3. `src/components/pedidos/detalhe-pedido.tsx`
- Aceitar nova prop opcional `mostrarPagamento?: boolean` (default `true`, para não quebrar a tela admin).
- Quando `false`, não renderizar o bloco "Saldo da comanda" nem o `ConfirmarPagamentoDialog`.
- Independente da prop: se `pedido.status === "cancelado"`, ocultar todo o bloco de pagamento (não faz sentido cobrar pedido cancelado, mesmo no admin).

## Resultado esperado

- O pedido `c96d20a3…` (e qualquer cancelado) deixa de aparecer no card "Pedidos da sessão" da área do garçom — assim que o React Query reidratar (já invalidamos `["resumo-conta-mesa"]` no `useCancelarPedido`).
- Itens cancelados dentro de pedidos ativos somem da lista.
- Na Sala, ao abrir um pedido, o garçom não vê mais o botão "Confirmar pagamento".

## Arquivos a alterar

- `src/lib/pedidos.functions.ts`
- `src/routes/_authenticated/sala_.mesa.$mesaId.tsx`
- `src/components/pedidos/detalhe-pedido.tsx`
