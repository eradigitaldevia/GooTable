# Clarificar o toggle de Horário de funcionamento

## O que acontece hoje (verificado no código)

O switch do card não liga/desliga o delivery. Ele liga/desliga a **restrição por horário**:

- **Ligado**: são salvos os dias e turnos; fora desses horários o cardápio de delivery fica somente leitura e o envio do pedido é recusado com "Estamos fechados no momento".
- **Desligado**: o horário é salvo vazio e o delivery passa a aceitar pedidos 24h.

Ou seja, a frase "Quando desligado, o delivery aceita pedidos a qualquer momento" descreve o comportamento real. A incoerência é de **rótulo**: o título "Horário de funcionamento" com um switch ao lado dá a entender que o switch é "restaurante aberto/fechado", quando na verdade é "aplicar restrição de horário".

## Proposta (somente texto/rótulos, sem mudar comportamento)

No card de horário (`src/components/configuracoes/horario-funcionamento-form.tsx`):

- Título: **"Restringir pedidos por horário de funcionamento"** (mantendo o bloco dentro da seção Horário de funcionamento).
- Descrição principal: "Quando ativado, o cardápio de delivery só aceita pedidos nos dias e horários definidos abaixo. Fora do horário, o cardápio fica somente leitura."
- Linha secundária: "Quando desativado, não há restrição de horário e o delivery aceita pedidos a qualquer momento."
- `aria-label` do switch alinhado ao novo título.

## Alternativa (se preferir mudar o comportamento)

Se a intenção for mesmo "desligado = delivery fechado", isso é outra funcionalidade: um switch **"Aceitar pedidos de delivery"** separado, que bloqueia o delivery independentemente do horário. Pode ser adicionado depois sem conflitar com a restrição por horário.

## Escopo técnico

- Arquivo alterado: `src/components/configuracoes/horario-funcionamento-form.tsx` (apenas textos e `aria-label`).
- Nenhuma alteração em banco, validações ou lógica de `delivery.functions.ts`.
