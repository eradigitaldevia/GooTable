## Objetivo

Reordenar o fluxo do cardápio público de delivery (`/delivery/$slug`) para que o **cardápio seja a tela inicial**, deixando identificação, endereço e pagamento para o final — semelhante ao padrão dos grandes apps de delivery (iFood, Rappi).

## Fluxo atual vs. proposto

```text
ATUAL:    Identificação (telefone+nome+modalidade) → Cardápio → Revisão (endereço+pagamento) → Confirmação
PROPOSTO: Cardápio (entrada) → Revisão dos itens → Identificação (telefone+nome+modalidade) → Endereço/Pagamento → Confirmação
```

Na prática, no código atual já existem 3 steps (`identificacao`, `cardapio`, `revisao`). A mudança principal é:

1. `cardapio` passa a ser o **step inicial padrão**.
2. `identificacao` deixa de ser bloqueio de entrada e vira parte da **finalização**, junto com endereço/pagamento.
3. A modalidade (entrega/retirada) sai da identificação e passa a ser perguntada no checkout (junto com endereço).

## Mudanças por arquivo

### `src/routes/delivery.$slug.tsx`

1. `**searchSchema**`: trocar o default de `"identificacao"` para `"cardapio"`. A ordem do enum permanece igual (não há impacto em URLs já abertas — se um cliente cair em `?step=identificacao`, continua funcionando).
2. **Navegação entre steps**:
  - Botão "Voltar" do `StepCardapio` deixa de ir para `identificacao` e passa a não existir (ou vira link para trocar de restaurante / não navega — a entrada é o próprio cardápio).
  - Botão "Revisar" do `StepCardapio` continua indo para `revisao`.
  - `StepRevisao` ganha a responsabilidade de coletar **nome + telefone + modalidade** antes de exibir endereço/pagamento, OU encaminhar para `identificacao` como sub-etapa do checkout.
3. **Decisão de arquitetura (recomendada)**: manter os 3 steps existentes, mas inverter o papel deles:
  - `step=cardapio` → entrada (default).
  - `step=identificacao` → coleta nome+telefone+modalidade (acessada a partir do botão "Revisar" do cardápio quando ainda não há identificação salva).
  - `step=revisao` → endereço (se delivery) + pagamento + envio.
   O botão "Revisar" do cardápio passa a decidir:
  - Se já existe `state.telefone` e `state.nome` preenchidos (cliente recorrente, vindo do `localStorage`): pula direto para `revisao`.
  - Caso contrário: vai para `identificacao` e, ao concluir, segue para `revisao` (não volta para o cardápio).
4. `**StepCardapio**`:
  - Remover a prop `onVoltar` (e o botão de voltar no header).
  - A prop `modo` deixa de vir do `state` no momento da entrada (cliente ainda não escolheu) — passa a ser apenas informativa no rodapé ("entrega/retirada" só aparece após identificação). Sugestão: exibir apenas o subtítulo do `DeliveryHeader` como "Cardápio" enquanto o modo ainda não foi escolhido; quando `state.telefone` já existir, mostrar o modo escolhido.
  - O cálculo de `taxa` exibido no rodapé do carrinho só faz sentido quando `modo` está definido. Enquanto não estiver, exibir apenas "Subtotal" sem taxa.
5. `**StepIdentificacao**`:
  - O botão "Continuar" passa a navegar para `revisao` (e não mais para `cardapio`).
  - Acrescentar um botão/seta "Voltar ao cardápio" no header.
  - Manter 100% da lógica de `buscarClienteDeliveryFn` (lookup por telefone) e da hidratação de endereços salvos.
6. `**StepRevisao**`:
  - Acrescentar um guard: se `state.telefone` estiver vazio, redirecionar para `identificacao` (evita acesso direto via URL sem identificação).
  - Botão "Voltar" passa a ir para `cardapio` (já é o comportamento atual — manter).
7. **Banner "Fechado"**: passar a ser exibido também no `StepCardapio` (já é). Sem mudança.
8. **Pedido mínimo**: já existe o bloco "Faltam R$ X para o pedido mínimo" no rodapé do cardápio. Manter.

### Outros arquivos

- Nenhuma alteração em `src/lib/delivery.functions.ts`, hooks, componentes de `endereco-form`, `carrinho-item-row`, ou backend. Toda a mudança é de **ordem de navegação no frontend**.
- Nenhuma alteração em `src/routes/delivery.$slug_.pedido.$pedidoId.tsx` (tela de acompanhamento pós-pedido).

## Comportamentos preservados

- Persistência em `localStorage` (`delivery-state:{slug}`, `delivery-cart:{slug}`, `delivery-last-phone:{slug}`).
- `buscarClienteDeliveryFn` continua sendo chamado na identificação para pré-preencher nome e endereços salvos.
- Validações de pedido mínimo, endereço completo, métodos de pagamento, restaurante fechado — todas mantidas.
- `criarPedidoDeliveryFn` e payload do pedido — sem mudança.
- URLs `?step=identificacao` ainda funcionam (compatibilidade com QR/links antigos).

## Pontos de decisão (preciso da sua confirmação antes de codar)

1. **Onde fica a modalidade (entrega/retirada)?**
  - **Opção A (recomendada)**: continua no step `identificacao`, junto com nome+telefone — o cliente decide ao iniciar o checkout. Mantém o componente como está hoje, só muda a ordem de navegação.
  - **Opção B**: move para o step `revisao`, acima do bloco de endereço. Identificação fica só com nome+telefone. Mais próximo do iFood, mas exige refatorar dois componentes.
2. **Cliente recorrente (telefone já salvo no `localStorage`)**: ao clicar em "Revisar" no cardápio, devo **pular automaticamente** o step de identificação e ir direto para `revisao`? (Recomendo **sim**, com um link discreto "Não é você? Trocar identificação" no topo da revisão.)
3. **Botão "Voltar" no cardápio**: como a entrada agora é o próprio cardápio, **removo o botão de voltar** do header do `StepCardapio`? (Recomendo **sim**.)

Confirme essas 3 decisões (ou ajuste) e parto para a implementação.  
  
Confirmações:  
  
1. Opção B  
2. Sim.  
3. Sim.  
  
IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.