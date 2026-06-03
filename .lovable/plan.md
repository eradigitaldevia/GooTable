## Objetivo

Substituir o botão manual "Dividir comissão" (no detalhe do pedido) por uma **regra automática global** configurada em `/admin/configuracoes`. Quando o garçom de uma mesa for trocado, os pedidos em aberto daquela sessão passam a ter a comissão dividida 50/50 entre o garçom anterior e o novo.

## Comportamento

- **Configuração nova:** "Rateio automático na troca de garçom" (liga/desliga). Default: desligado, para não alterar restaurantes existentes.
- **Quando dispara:** ao atribuir um novo garçom a uma mesa que já tinha outro garçom ativo na mesma sessão aberta.
- **Como divide:** 50% garçom anterior + 50% garçom novo, aplicado a **todos os pedidos da sessão atual que ainda não foram pagos**. Pedidos já pagos não são alterados.
- **Múltiplas trocas na mesma sessão:** sempre o último estado prevalece — divide igualmente entre todos os garçons que passaram pela mesa naquela sessão (ex.: 3 garçons → 33,33% cada, com ajuste no último para somar 100).
- **Quando a opção está desligada:** comportamento atual (100% para o garçom que lançou o pedido).
- **Botão manual "Dividir comissão":** removido do `detalhe-pedido.tsx` e o componente `dividir-comissao-dialog.tsx` deixa de ser usado (mantido no repo por enquanto, sem import).

## Mudanças

### 1. Banco de dados (migration)

- `ALTER TABLE restaurantes ADD COLUMN comissao_rateio_troca_turno boolean NOT NULL DEFAULT false;`
- Criar/atualizar RPC `atribuir_garcom_mesa` (ou criar wrapper) para:
  - Ler `comissao_rateio_troca_turno` do restaurante.
  - Se ligado, identificar a sessão aberta da mesa, coletar todos os `garcons` que passaram por ela (via `mesa_garcom` da sessão, incluindo o novo).
  - Para cada pedido da sessão com `status != 'pago'`, regravar `pedido_garcons` com peso igualitário entre esses garçons (último recebe o resto para fechar 100).

### 2. Backend (server functions)

- `src/lib/configuracoes.functions.ts`: incluir `comissao_rateio_troca_turno` no schema de leitura/escrita das configurações.
- `src/lib/garcons.functions.ts`: `atribuirGarcomMesaFn` continua chamando a RPC (sem mudança de assinatura).

### 3. Frontend

- `src/components/configuracoes/comissao-modo-form.tsx` (ou novo bloco em `/admin/configuracoes`): adicionar Switch "Dividir comissão automaticamente quando o garçom da mesa for trocado (50/50)" com texto curto explicando.
- `src/hooks/use-configuracoes.ts`: tipar e propagar o novo campo.
- `src/components/pedidos/detalhe-pedido.tsx`: remover botão "Dividir comissão" e o `<DividirComissaoDialog>` + import.

## Fora do escopo

- `comissao_modo` (Por pedido / Por item) continua como está.
- Cálculo proporcional ao tempo (descartado em favor de 50/50).
- Ação manual de rateio no admin (descartado — só automatização).
- Não há migração retroativa de pedidos antigos.

## Riscos

- Pedidos parcialmente pagos: a regra só toca pedidos com `status != 'pago'`. Se houver pagamento parcial via comanda, a comissão já calculada para o que foi pago não é refeita.
- Restaurantes que ativarem a opção no meio de uma sessão: a divisão só passa a valer a partir da próxima troca de garçom.
