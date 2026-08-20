# Liberar mesas ociosas automaticamente

## Situação atual

Existe hoje 1 sessão aberta na Mesa 01 desde 10/08, com nenhum pedido e 1 comanda aberta sem consumo. Como nada fecha essa sessão, o card fica preso em "Aguardando pedido" indefinidamente.

## Regra proposta

Uma sessão é encerrada automaticamente quando, ao mesmo tempo:

- está aberta há mais tempo que o limite configurado (padrão 4 horas);
- não possui nenhum pedido;
- não possui comanda com valor lançado (subtotal, couvert ou total maiores que zero).

Sessões com qualquer consumo nunca são encerradas por este mecanismo — permanecem como estão hoje.

Ao encerrar: a sessão passa para `fechada` (com `fechada_em`), as comandas vazias da sessão são fechadas e os vínculos de cliente da sessão recebem data de saída. O card volta para "Livre" no grid, que já é atualizado em tempo real.

## Configuração

Nova opção em Configurações → Geral: "Liberar mesa sem pedido após (horas)", padrão 4, faixa de 1 a 48. Guardada no cadastro do restaurante.

## Etapas

1. **Banco — campo de configuração**: adicionar `sessao_ociosa_horas` (inteiro, padrão 4) em `restaurantes`.
2. **Banco — função de limpeza**: criar `encerrar_sessoes_ociosas()` (security definer) que percorre as sessões abertas de todos os restaurantes aplicando a regra acima e retorna a quantidade encerrada.
3. **Banco — agendamento**: agendar a função com `pg_cron` a cada 15 minutos (SQL puro, sem endpoint externo).
4. **Limpeza inicial**: executar a função uma vez para liberar a sessão presa da Mesa 01.
5. **Frontend — configuração**: incluir o campo de horas no formulário da aba Geral (`src/components/configuracoes/geral-form.tsx`) e no salvamento em `src/lib/configuracoes.functions.ts`, seguindo o padrão dos campos existentes.

## Observações técnicas

- Nada muda em pedidos, comandas com consumo, pagamentos ou comissões.
- A checagem também pode ser reaproveitada depois por uma ação manual, mas não faz parte deste escopo.
- Como `mesa_sessoes` e `comandas` já estão no realtime do grid de mesas, a liberação aparece sozinha na tela.
