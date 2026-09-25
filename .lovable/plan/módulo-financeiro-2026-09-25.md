# Módulo Financeiro

Gestão completa das finanças do restaurante em uma nova seção **Admin > Financeiro**, com contas a pagar, contas a receber, DRE gerencial, fluxo de caixa e integração com o Caixa. Todos os cálculos são feitos no backend.

## 1. Banco de dados

Tabelas com RLS (membros do restaurante ou platform admin) e GRANTs:

- `categorias_financeiras`: tipo (receita | despesa), nome, icone, cor, padrao, restaurante_id.
- `fornecedores_financeiro`: nome, cnpj_cpf, telefone, email, restaurante_id.
- `lancamentos_financeiros`: tipo (pagar | receber), descricao, categoria_id, fornecedor_id, valor, data_vencimento, data_competencia, data_pagamento, status (pendente | pago | cancelado), forma_pagamento, comprovante_url, origem (manual | caixa_sangria | comissao | couvert | faturamento), restaurante_id.

Categorias padrão criadas por restaurante (existentes e novos, via trigger):

- Despesas: Insumos & CMV, Equipe & Pessoal, Aluguel & Ocupação, Serviços & Utilidades, Taxas & Impostos, Marketing & Divulgação, Manutenção & Outros.
- Receitas: Vendas Restaurante & Delivery, Serviços & Taxas, Aportes / Outras Receitas.

RPCs (security definer, validando acesso ao restaurante):

- `obter_resumo_financeiro`: a pagar, a receber, liquidado, vencidos, saldo em aberto no período.
- `obter_dre_gerencial`: receita bruta (pedidos + lançamentos), deduções/comissões, CMV, despesas por categoria, resultado líquido.
- `obter_fluxo_caixa`: entradas e saídas por dia/mês, previsto x realizado.
- `integrar_repasses_caixa_financeiro`: registra sangrias do caixa e pagamentos de comissões/couvert como despesas liquidadas (idempotente).

## 2. Interface (`/admin/financeiro`)

Abas:

1. Visão Geral: KPIs e alertas de contas vencidas.
2. Contas a Pagar: tabela com filtros (período, status, categoria, fornecedor) e baixa rápida.
3. Contas a Receber: entradas manuais e faturamento operacional.
4. DRE Gerencial: demonstrativo hierárquico por período.
5. Fluxo de Caixa: gráfico e matriz previsto x realizado.
6. Categorias & Fornecedores: cadastros.

## 3. Arquivos

Novos:

- `src/lib/financeiro.functions.ts`
- `src/hooks/use-financeiro.ts`
- `src/routes/_authenticated/admin/financeiro.tsx`
- `src/components/financeiro/`: financeiro-header, financeiro-kpis, aba-visao-geral, aba-contas-pagar, aba-contas-receber, aba-dre, aba-fluxo-caixa, aba-categorias-fornecedores, novo-lancamento-dialog, baixar-lancamento-dialog

Alterado:

- `src/components/admin/admin-sidebar.tsx`: item "Financeiro" (visível para admin/platform admin).

## Detalhes técnicos

- Server functions com `requireSupabaseAuth` + `assertAcessoRestaurante`; Zod nas entradas.
- TanStack Query com invalidação após mutações; componentes < 150 linhas.
- Datas no fuso BRT via `src/lib/data-fuso.ts`.

&nbsp;

Garanta que esse plano seja implementado corretamente e de forma cirúrgica, sem afetar outras funcionalidades da aplicação.

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.