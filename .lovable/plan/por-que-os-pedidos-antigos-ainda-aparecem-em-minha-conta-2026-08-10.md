# Por que os pedidos antigos ainda aparecem em "Minha conta"

## Diagnóstico (confirmado no banco)

Ao ler o QR da Mesa 01, o app reconhece o telefone da cliente Alison Maia e reaproveita o vínculo/comanda que ainda está **aberta** naquela mesa — por isso o pedido antigo reaparece.

Estado atual dos dados:

- Sessão da Mesa 01 aberta desde **31/05/2026**, nunca fechada.
- Comanda compartilhada da Alison nessa sessão: status **aberta**, total 45,00 e total_pago 45,00.
- Pagamento PIX de R$ 45,00 já **confirmado** em 24/06.
- Pedido `entregue` de 01/06 vinculado a essa comanda.

Causa raiz: a função `confirmar_pagamento` credita o `total_pago` da comanda, mas **não fecha a comanda** quando ela é integralmente paga, e nada fecha a sessão da mesa. Com sessão e comanda abertas, a re-identificação por telefone (comportamento intencional de "voltar para a mesma comanda") devolve a comanda antiga junto com o histórico de pedidos.

## O que fazer

### 1. Fechar a comanda quando ela for totalmente paga

Ajustar `confirmar_pagamento` (migração SQL): após somar o pagamento, se `total_pago >= total` e `total > 0`, marcar a comanda como `fechada` com `fechada_em = now()`. Pagamento parcial continua com o comportamento atual.

### 2. Re-identificação

Nenhuma mudança de código necessária: `buscarClientePorTelefoneFn` já só reaproveita comandas com status `aberta`. Com o item 1, ela passa a criar comanda nova e "Minha conta" começa zerada.

### 3. Limpeza dos dados atuais

Migração pontual fechando a comanda já quitada da Alison e, conforme sua escolha abaixo, encerrando as sessões antigas das Mesas 01 e 02 (abertas desde maio).

## Ponto em aberto (preciso da sua decisão)

Existem comandas abertas **sem consumo** (total 0,00) de outros clientes nessas sessões antigas. Devo:

- (a) fechar apenas a comanda paga da Alison, ou
- (b) encerrar por completo as sessões antigas das Mesas 01 e 02, fechando também as comandas zeradas?  
Resposta: (b) encerrar por completo as sessões antigas das Mesas 01 e 02, fechando também as comandas zeradas.

## Detalhes técnicos

- Migração 1: `CREATE OR REPLACE FUNCTION public.confirmar_pagamento` — mesma assinatura e permissões, apenas com o fechamento condicional da comanda.
- Migração 2 (dados): `UPDATE public.comandas SET status='fechada', fechada_em=now()` no escopo escolhido em (a)/(b) e, na opção (b), `UPDATE public.mesa_sessoes SET status='fechada', fechada_em=now()`.
- Nenhuma alteração de UI, layout ou de outros fluxos.