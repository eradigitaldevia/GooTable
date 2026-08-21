# Horário de funcionamento sempre valendo

## Situação atual (verificada no código)

Existem hoje dois controles:

1. **Delivery > "Delivery"** (`delivery_ativo`) — já é o switch mestre: desligado, o delivery não aceita pedidos.
2. **Geral > "Horário de funcionamento"** — um switch que apenas decide *se a restrição de horário é aplicada*. Desligado, o horário é salvo vazio e o delivery aceita pedidos 24h — que é justamente o comportamento incoerente que você apontou.

## Mudança proposta

Adotar sua regra: **delivery ligado = aceita pedidos somente no horário cadastrado**.

1. **Remover o switch do card "Horário de funcionamento"**. O horário passa a valer sempre; não existe mais modo "24h por omissão".
2. Os dias/turnos ficam sempre visíveis e editáveis. Um dia sem turno = fechado naquele dia.
3. Se **nenhum dia** estiver aberto, o card mostra um aviso: "Nenhum dia configurado — o delivery não aceitará pedidos." (delivery permanece fechado, coerente com a nova regra).
4. Ao salvar, o horário é sempre gravado (não é mais zerado quando "desligado").
5. Textos do card atualizados: "O delivery aceita pedidos apenas nos dias e horários definidos abaixo. Fora do horário, o cardápio fica somente leitura."
6. O switch **"Aceitar pedidos de delivery"** continua sendo o `delivery_ativo` na aba Delivery — apenas ajustar a descrição dele para: "Quando desligado, o delivery não recebe pedidos. Quando ligado, recebe apenas dentro do horário de funcionamento."

## Impacto em quem já usa

Restaurantes que hoje estão com a restrição desligada (horário vazio) passariam a ficar fechados. Para evitar surpresa, na migração/normalização: se o horário estiver vazio, preencher o padrão **todos os dias 11:00–23:00**, que o admin ajusta depois.

## Escopo técnico

- `src/components/configuracoes/horario-funcionamento-form.tsx`: remover a prop `habilitado`/switch, sempre renderizar a lista de dias, aviso quando nenhum dia aberto, textos novos.
- `src/components/configuracoes/geral-form.tsx`: parar de repassar `horarioHabilitado`.
- `src/routes/_authenticated/admin/configuracoes.tsx`: remover o campo `horario_funcionamento_habilitado` do form/estado/dirty-check e salvar sempre `horario_funcionamento`; ao carregar, se vier vazio, usar o padrão 11:00–23:00.
- `src/components/configuracoes/delivery-form.tsx`: apenas ajuste de texto no card "Delivery".
- Backend (`restaurante_aberto_agora`, `delivery.functions.ts`): sem alteração de lógica — com horário sempre preenchido, a checagem atual já produz o comportamento desejado.
- Migração opcional para preencher horário padrão em restaurantes com `horario_funcionamento` vazio.
