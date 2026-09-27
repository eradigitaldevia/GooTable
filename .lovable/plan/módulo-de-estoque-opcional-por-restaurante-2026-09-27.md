# Módulo de Estoque (opcional por restaurante)

## Objetivo

Controlar insumos do restaurante com fichas técnicas, baixa automática nas vendas, movimentações manuais e inventário (contagem física com ajuste automático das diferenças). Restaurantes que não usarem o módulo não percebem nenhuma diferença.

## Decisões

- Módulo completo: insumos, fichas técnicas (simples e compostas), movimentações manuais e automáticas.
- Liga/desliga em Configurações (nova aba "Estoque"). Desligado = menu escondido e nenhuma baixa ocorre.
- Baixa automática ao **receber o pedido**; estorno automático ao cancelar pedido ou item.
- Estoque zerado: **configurável por insumo** — "bloquear" (produto fica indisponível no cardápio, garçom e delivery) ou "apenas alertar" (pode ficar negativo).

## O que o admin vai ver

Novo item **Estoque** no menu (grupo Operação, só admin), com abas:

1. **Visão geral** — cards: itens abaixo do mínimo, zerados, valor total em estoque; lista de alertas.
2. **Insumos** — cadastro (nome, unidade: un/kg/g/L/ml, custo médio, estoque mínimo, comportamento ao zerar, ativo). Saldo atual visível.
3. **Fichas técnicas** — por produto do cardápio: lista de insumos e quantidades. Suporta **preparos intermediários** (ex.: "Molho da casa" feito de outros insumos) que podem entrar em outras fichas. Mostra custo estimado do prato e margem.
4. **Movimentações** — histórico filtrável (período, insumo, tipo). Lançamentos manuais: Entrada (compra, com custo e fornecedor opcional), Perda/Quebra, Ajuste, Produção de preparo intermediário.
5. **Inventário** — contagem física: informa quantidade real, sistema gera ajustes da diferença.

Produtos sem ficha técnica nunca são afetados (venda normal).

## Integração com Financeiro (opcional)

Entrada com custo pode gerar, marcando uma opção, uma conta a pagar no Financeiro vinculada ao fornecedor.

## Detalhes técnicos

- Tabelas novas: `estoque_insumos` (unidade, custo_medio, saldo, estoque_minimo, bloquear_ao_zerar, is_preparo), `estoque_fichas` (produto_id ou insumo_preparo_id → insumo_id, quantidade), `estoque_movimentos` (tipo: entrada/saida_venda/estorno/perda/ajuste/producao, quantidade, custo_unit, pedido_id, pedido_item_id, observacao, criado_por). GRANTs + RLS via `is_restaurante_membro OR is_platform_admin`.
- Coluna `restaurantes.estoque_ativo boolean default false`.
- RPCs security definer: `estoque_baixar_pedido(pedido_id)` (explode fichas recursivamente, grava movimentos, `FOR UPDATE` nos saldos), `estoque_estornar_pedido/item`, `estoque_registrar_movimento`, `estoque_produzir_preparo`, `estoque_aplicar_inventario`, `estoque_resumo`, `estoque_produtos_bloqueados(restaurante_id)`.
- Hooks em `criar_pedido_publico`, `criar_pedido_garcom`, pedido delivery, `cancelar_pedido`, `cancelar_item_pedido`: chamam baixa/estorno só se `estoque_ativo`. Idempotente por `pedido_item_id`.
- Custo médio ponderado recalculado a cada entrada.
- Bloqueio: produtos com insumo "bloquear" sem saldo suficiente são marcados indisponíveis nas listagens públicas/garçom e validados no servidor ao criar pedido (erro amigável).
- Frontend: `src/lib/estoque.functions.ts`, `src/hooks/use-estoque.ts`, rota `src/routes/_authenticated/admin/estoque.tsx`, componentes em `src/components/estoque/` (<150 linhas cada), aba Estoque em Configurações, item no `admin-sidebar`.
- Testes vitest para baixa, estorno, receita composta e bloqueio.

## Entrega em etapas

1. Banco + toggle + cadastro de insumos + movimentações manuais.
2. Fichas técnicas (simples e compostas) + custo do prato.
3. Baixa/estorno automáticos + bloqueio/alerta.
4. Inventário, visão geral e integração com Financeiro.

&nbsp;

Garanta que esse plano seja implementado corretamente e de forma cirúrgica, sem afetar outras funcionalidades da aplicação.

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.