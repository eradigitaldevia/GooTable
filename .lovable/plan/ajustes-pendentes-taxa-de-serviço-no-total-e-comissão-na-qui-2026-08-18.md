# Ajustes pendentes: taxa de serviço no total e comissão na quitação

Complemento do plano de correções do fluxo financeiro. As etapas 1 a 7 já estão aplicadas no banco; aqui seguem os dois pontos que ficaram pendentes de decisão.

## Etapa 1 — Somar taxa de serviço ao total da comanda

Hoje `comandas.total` guarda apenas `subtotal - cashback - cupom`. A taxa de serviço fica persistida em `taxa_servico_valor`, mas o cliente ainda paga o total sem a taxa embutida.

- Alterar `public.recalcular_total_comanda` para `total = v_liquido + v_taxa`.
- Backfill das comandas abertas para refletir o novo total.
- Revisar `resumoContaFn` em `src/lib/pedidos.functions.ts` para parar de somar a taxa manualmente em `total_sugerido`; o `total` já virá com taxa incluída.
- Revisar tela de pagamento/caixa para garantir que o valor a receber usa `comandas.total` diretamente.
- Validar que `fechar_comanda_se_quitada` continua fechando corretamente quando `total_pago >= total` (agora maior por conta da taxa).

## Etapa 2 — Gerar comissão apenas na quitação da comanda

Hoje a comissão é gerada quando `pedidos.status` muda para `entregue`. Isso pode pagar comissão sobre pedidos que depois serão cancelados ou de comandas não quitadas.

- Remover a inserção em `public.comissoes` da trigger `trg_pedido_gerar_comissao` (mantém a trigger, mas só sem a geração de comissão).
- Criar trigger em `public.comandas` que dispara quando `status` muda para `fechada` e `total_pago >= total`.
- A nova função deve gerar comissões para todos os pedidos da comanda que já estão `entregue` (evita comissão sobre pedidos cancelados/ativos).
- Calcular o valor base da comissão sobre o valor líquido do pedido, proporcional aos descontos da comanda:
  - `fator_liquido = (subtotal - cashback_resgatado - desconto_cupom) / subtotal` (quando subtotal > 0).
  - `base_comissao_pedido = pedido.total * fator_liquido`.
  - Aplica o percentual do garçom/produto conforme o modo atual (`pedido` ou `item`).
- Preservar a lógica de divisão por peso em `pedido_garcons` e a regra de percentual específico para pedidos do cliente (`comissao_pedido_cliente_percentual`).
- A trigger `trg_comanda_repasse_taxa_servico` já gera o repasse no fechamento; nenhuma mudança lá.
- Garantir que pedidos entregues em comandas ainda abertas não gerem comissão até o fechamento.

## Notas

- Nenhuma mudança de layout, cores ou textos.
- Após aplicar: typecheck e teste do fluxo mesa → pedido → cozinha → entrega → pagamento.
