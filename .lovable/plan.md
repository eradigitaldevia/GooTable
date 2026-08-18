# Correções do fluxo financeiro e de pedidos

Sete etapas independentes, na ordem recomendada. Cada etapa pode ser aplicada e validada sozinha.

## Etapa 1 — Pagamento fecha a comanda (crítico)

Hoje a RPC `registrar_pagamento` só grava o pagamento e soma `total_pago`; nada muda `comandas.status`. Por isso comandas pagas continuam "abertas" e reaparecem em Minha Conta.

- Migração: dentro de `registrar_pagamento`, após somar `total_pago`, se `total_pago >= total` então `status = 'fechada'` e `fechada_em = now()`, e fechar a sessão da mesa quando não restar comanda aberta (mesma lógica já existente em `confirmar_pagamento`).
- Extrair isso para uma função única `fechar_comanda_se_quitada(_comanda_id)` chamada pelas duas RPCs, evitando divergência futura.
- Registrar o fechamento em `audit_logs`.

## Etapa 2 — Total da comanda com fórmula única

`aplicar_cashback`, `aplicar_cupom_comanda` e `recalcular_couvert_comanda` calculam `total` de três formas diferentes; a de cashback ignora `desconto_cupom`.

- Criar `recalcular_total_comanda(_comanda_id)`: `total = subtotal + couvert - cashback_resgatado - desconto_cupom`, nunca negativo.
- Substituir os três cálculos por chamadas a essa função; idem em `remover_cupom_comanda`.
- Rodar uma correção pontual nas comandas abertas existentes.

## Etapa 3 — Limpeza dos gatilhos duplicados

Em `pedido_itens` existem dois sistemas de derivação de status e um gatilho duplicado; hoje só funciona por causa da ordem alfabética dos nomes.

- Remover `pedido_itens_derivar_status_au`, `pedido_itens_derivar_status_aiud` e a função legada `derivar_status_pedido`.
- Manter apenas `pedido_itens_destino_status_trg` (por destino) e `pedido_itens_set_destino_trg`.
- Validar que criar pedido, avançar na cozinha/bar e entregar continuam derivando `pedidos.status` corretamente.

## Etapa 4 — Taxa de serviço persistida

Hoje a taxa só existe no cálculo de exibição em `resumoContaFn`; some dos relatórios e do caixa.

- Nova coluna `taxa_servico_valor` em `comandas` (default 0).
- `recalcular_total_comanda` passa a gravar a taxa (percentual do restaurante sobre o subtotal, quando habilitada) e somá-la ao `total`.
- Tela de conta e caixa passam a ler o valor persistido em vez de recalcular na hora.
- Repasse de taxa a garçons passa a usar o valor gravado.

## Etapa 5 — Fechar o vazamento de dados do cliente

`minhaContaFn` valida QR e restaurante, mas não confere se o `clienteId` pertence à sessão.

- Validar o `clienteId` contra os clientes da sessão ativa antes de retornar dados; caso contrário, negar acesso.
- Aplicar a mesma verificação nas demais funções públicas que recebem `clienteId` (histórico, saldo, aplicar cupom).
- O cashback já está protegido no banco (exige itens próprios na comanda) — sem alteração.

## Etapa 6 — "Avançar" na cozinha não zera mais o progresso por unidade

`atualizar_status_destino` reseta `quantidade_pronta = 0` de todos os itens do destino.

- Só zerar em regressão explícita de `pronto` para `recebido`; ao passar para `em_preparo`, preservar o que já foi marcado.
- Ao marcar `pronto`, continuar preenchendo `quantidade_pronta = quantidade`.

## Etapa 7 — Ajustes menores

- Assinar `pedido_itens` no realtime de `/admin/pedidos` (cozinha e bar já assinam).
- Marcar entregue em lote: parar de engolir erro de cashback — contabilizar a falha e reportá-la no retorno.
- Histórico de pedidos: indicar na UI que o período vai até ontem, em vez de truncar em silêncio.
- Comissão: revisar a geração na entrega para considerar cupom/cashback e comanda efetivamente paga (definir a regra com você antes de implementar).

## Notas técnicas

- Etapas 1 a 4 e 6 são migrações no banco; 5 e 7 são alterações no código.
- Nenhuma mudança de layout, cores ou textos fora do indicado.
- Após cada etapa: typecheck e teste do fluxo mesa -> pedido -> cozinha -> entrega -> pagamento.