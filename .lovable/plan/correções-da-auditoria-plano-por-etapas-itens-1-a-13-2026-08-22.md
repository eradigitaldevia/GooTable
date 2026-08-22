# Correções da auditoria — plano por etapas (itens 1 a 13)

Ordem de ataque: 1+2 → 3 → 5+6 → 4 → 7+8 → 9 → 10+11 → 12+13.
Cada etapa é independente e pode ser validada sozinha. Nenhuma mudança de layout, cores ou textos fora do que estiver descrito.

## Etapa A — Total da comanda com fonte única (itens 1 e 2)

Problema: pedido lançado pelo garçom não atualiza o total da comanda, e três funções recalculam o total sem a taxa de serviço, apagando-a.

- Criar trigger em `public.pedidos` (AFTER INSERT / UPDATE OF status, comanda_id, total / DELETE) que chama `recalcular_couvert_comanda` + `recalcular_total_comanda` para a comanda afetada (e para a comanda antiga em UPDATE).
- Remover os cálculos manuais de total em `criar_pedido_publico`, `cancelar_pedido` e `cancelar_item_pedido`; todos passam a depender da função central.
- Backfill: recalcular todas as comandas abertas.
- Validar: pedido do garçom, pedido do QR, cancelamento de item e de pedido — total sempre com couvert + taxa.

## Etapa B — Repasse da taxa de serviço (item 3)

`gerar_repasse_taxa_servico` usa `total_pago − total` (sempre 0), então nada é gravado.

- Passar a base para `comandas.taxa_servico_valor` da comanda quitada.
- Manter o rateio por peso em `pedido_garcons` e o percentual `taxa_servico_repasse_percentual`.
- Backfill opcional das comandas já fechadas com taxa e sem repasse (confirmar antes de rodar).

## Etapa C — Pagamento e cancelamento consistentes (itens 5 e 6)

- `registrar_pagamento`: bloquear valor acima do saldo devedor (`total − total_pago`), com margem de arredondamento; travar a comanda com `FOR UPDATE` para evitar duplo clique/duplicidade.
- Cancelamento: ao cancelar pedido/item, reavaliar cupom e cashback resgatado — estornar em `cashback_movimentos` a parte que excede o novo subtotal e reduzir `cashback_resgatado`/`desconto_cupom` proporcionalmente, em vez de mascarar com `GREATEST(...,0)`.

## Etapa D — Identidade do cliente (item 4)

Hoje só o telefone libera nome, saldo de cashback e endereços.

- Não devolver saldo de cashback nem endereços antes da confirmação: a busca por telefone retorna apenas se existe cadastro e o primeiro nome mascarado.
- Throttling por telefone + IP nas funções `identificarClienteFn`, `buscarClientePorTelefoneFn` e `buscarClienteDeliveryFn` (tabela de tentativas com janela curta).
- Confirmação por código: a decisão do canal (WhatsApp/SMS) fica para a Etapa D2 — sem provedor contratado, a Etapa D entrega mascaramento + throttling, e o código de confirmação entra depois.

## Etapa E — Corridas e lote (itens 7 e 8)

- `atualizarStatusPedidoFn` passa a usar a mesma trava/validação de `cancelar_pedido` (não avançar pedido cancelado; travar a linha).
- Marcar entregue em lote: contar linhas realmente afetadas; pedido não atualizado vira falha reportada, não sucesso silencioso. Cashback creditado só uma vez por pedido.

## Etapa F — Comprovante com taxa de serviço (item 9)

- Adicionar a linha de taxa de serviço (e couvert, quando houver) no comprovante de conta, entre desconto e total, para que subtotal − desconto + taxa = total.

## Etapa G — Realtime consistente (itens 10 e 11)

- `useRealtimeCumim` e `useRealtimePedidos` passam a assinar também `pedido_itens` e `pedido_destino_status`, igual ao KDS.
- Cumim: exibir há quanto tempo o item está pronto (mesmo cálculo já usado na cozinha).

## Etapa H — Comissões e enum morto (itens 12 e 13)

- Comissões: substituir `ON CONFLICT DO NOTHING` por recomputo idempotente (recalcula e atualiza a linha existente enquanto estiver `pendente`; comissão já paga não é alterada).
- `pagamento_status`: manter só `confirmado` no fluxo — bloquear criação de pagamentos em outro status por função e documentar; a remoção dos valores do enum não é feita (risco desnecessário).

## Notas técnicas

- Etapas A, B, C, E (parte SQL) e H são migrações no banco; D, F, G e parte da E são código.
- Após cada etapa: typecheck e teste do fluxo mesa → pedido → cozinha → entrega → pagamento → fechamento.
- Nenhuma refatoração fora do escopo descrito.
