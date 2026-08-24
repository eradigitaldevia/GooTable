# Testes das RPCs Financeiras

## Objetivo
Criar uma suite de testes automatizados de integração para garantir a consistência dos cálculos financeiros do sistema: comandas, pagamentos, taxa de serviço, comissões, caixa, cashback, cupons e repasses de couvert.

## Estratégia
- Usar **Vitest** como runner de testes.
- Testes de **integração com banco real** (Supabase) usando `service_role`, executados localmente.
- Não mockar o banco: validar as triggers, funções e cálculos reais.
- Criar um helper de **fixtures** que cria e limpa restaurante, mesa, produto, categoria, cliente, sessão e comanda a cada teste.
- Testar as **funções RPC do Supabase** diretamente, pois a lógica financeira vive no banco.
- Cobrir cenários felizes, casos de borda e regras de negócio críticas.

## Escopo dos testes

### 1. Setup e infraestrutura
- Instalar `vitest`, `@vitest/coverage-v8` (opcional) e tipar `process.env` para testes.
- Criar `src/lib/test/__helpers/fixtures.ts` para criação e limpeza de dados.
- Criar `src/lib/test/__helpers/supabase.ts` para inicializar o client de service role.
- Adicionar script `test` ao `package.json`.
- Configurar `.env.test` (não versionado) com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Comanda e recálculo de total
- `recalcular_total_comanda`: subtotal + taxa de serviço - descontos/cashback.
- `recalcular_couvert_comanda`: soma pedidos não cancelados + couverts.
- `fechar_comanda_se_quitada`: comanda fecha apenas quando total_pago >= total.
- Garantir que comandas canceladas/não quitadas não fechem.

### 3. Pagamentos
- `registrar_pagamento`: pagamento parcial, pagamento excedente (erro), pagamento completo.
- `confirmar_pagamento`: confirmação de pagamento pendente.
- `trg_pagamento_cancelado_sync`: cancelamento devolve total_pago e reabre comanda.

### 4. Taxa de serviço e repasse
- Taxa de serviço somada ao total quando habilitada.
- `gerar_repasse_taxa_servico`: cálculo proporcional e integral ao pagamento.
- Verificar que repasse só ocorre com configuração habilitada.

### 5. Comissões
- `gerar_comissao_comanda`: comissão só gerada quando comanda é fechada e paga.
- Modos `pedido` e `item`.
- Percentual por cliente (`comissao_pedido_cliente`).
- Fator líquido aplicado sobre descontos/cashback.

### 6. Caixa
- `abrir_turno_caixa`: abertura única, validação de papel.
- `registrar_movimento_caixa`: sangria e suprimento.
- `fechar_turno_caixa`: cálculo de diferença e snapshots.
- `totais_turno_caixa`: totais por método de pagamento.

### 7. Cashback e cupons
- `aplicar_cashback`: limites por percentual máximo e saldo.
- `aplicar_cupom_comanda`: desconto aplicado e recálculo.
- `remover_cupom_comanda`: estorno de uso e recálculo.
- `validar_cupom`: regras de uso, validade e mínimo.

### 8. Repasses de couvert artístico
- `gerar_repasse_couvert_artistico`: cálculo por artista/apresentação.
- `pagar_repasses_couvert_artistico`: mudança de status.

### 9. Relatório e cobertura
- Documentar como rodar os testes.
- Adicionar instruções de CI/CD (opcional).
- Garantir que testes limpam dados após execução.

## Ordem de implementação
1. Setup do Vitest e helper de conexão Supabase.
2. Helper de fixtures (restaurante, mesa, produto, cliente, sessão, comanda).
3. Testes de comanda/recálculo de total.
4. Testes de pagamentos.
5. Testes de taxa de serviço e repasse.
6. Testes de comissões.
7. Testes de caixa.
8. Testes de cashback e cupons.
9. Testes de repasses de couvert.
10. Documentação e ajustes finais.

## Riscos
- Testes de integração dependem de conexão com Supabase e service role key.
- Execução pode ser lenta devido a criação/limpeza de fixtures por teste.
- Não é possível testar server functions do TanStack Start diretamente sem um servidor real; focamos na lógica do banco via RPC.

## Critérios de aceitação
- `npm test` executa a suite completa.
- Cada função financeira principal tem pelo menos 2-3 cenários testados.
- Dados de teste são limpos após cada execução.
- Nenhum teste depende de dados manuais no banco.
