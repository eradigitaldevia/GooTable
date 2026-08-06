# Correções no fluxo de pedidos e displays

Três etapas independentes, na ordem de impacto. Cada etapa pode ser aprovada/entregue separadamente.

## Etapa 1 — Corrigir o "hoje" para o fuso de Brasília (crítico)

Hoje o servidor roda em UTC, então o corte do dia acontece às 21h de Brasília. Na prática: depois das 21h os pedidos novos "somem" do dia atual, e entre 00h e 03h os displays aparecem vazios.

O que será feito:

- Criar um utilitário único (`src/lib/data-fuso.ts`) que calcula o início/fim do dia em `America/Sao_Paulo` e converte para o instante correto.
- Trocar todos os cortes de dia por esse utilitário:
  - `src/lib/pedidos.functions.ts:72` (Kanban Hoje / KDS), `:1467`, `:1501`, `:1600` (histórico, auditoria, cancelados)
  - `src/lib/cumim.functions.ts:32` (display do cumim)
  - `src/lib/sala.functions.ts:187` e `:370` (sala do garçom)
  - `src/lib/dashboard.functions.ts:62` e `:273` (resumo do dia e do mês)
- No cliente, trocar `toISOString().slice(0,10)` por formatação em data local nos filtros: `src/components/pedidos/aba-historico.tsx:18`, `aba-cancelados.tsx:16`, `admin/garcons/extrato-garcom-dialog.tsx`, `admin/garcons/relatorio-exportar-card.tsx`.

Resultado: o dia operacional passa a virar à meia-noite de Brasília em todas as telas.

## Etapa 2 — Sincronizar avanço por destino com os itens

Na Cozinha, o botão "avançar" grava só o status do destino; os itens continuam como "pendente". O Bar avança item a item. Isso deixa o card e os itens com estados diferentes.

O que será feito:

- Migração ajustando a função `atualizar_status_destino` para, além de gravar em `pedido_destino_status`, atualizar os itens daquele pedido/destino: `status` correspondente e `quantidade_pronta` = `quantidade` quando o destino vira "pronto" (e zerada ao voltar para "em preparo").
- Proteção contra recursão com os gatilhos de agregação já existentes (`recomputar_destino_status` / `derivar_pedido_status`).
- Sem alteração de UI.

Resultado: card da cozinha, lista do bar e detalhe do pedido sempre mostram o mesmo estado.

## Etapa 3 — Realtime do kanban do admin

`/admin/pedidos` só escuta `pedidos` e `pedido_itens`. Quando a cozinha ou o bar avançam um destino, os selos de status no kanban só mudam no próximo refetch.

O que será feito:

- Adicionar a assinatura de `pedido_destino_status` ao canal em `src/routes/_authenticated/admin/pedidos.tsx:129-169`, invalidando a mesma query já usada.

Resultado: o kanban do admin atualiza na hora, igual aos displays de cozinha e bar.

## Observações técnicas

- Etapa 1 é só código de aplicação (sem migração); Etapa 2 exige uma migração de banco; Etapa 3 é uma linha de assinatura realtime.
- Nenhuma mudança visual, de layout ou de regras de negócio além do corte de data e da sincronização de status descritos.
- Depois de cada etapa, validação pelo preview: conferir Cozinha, Bar, Cumim, Sala e /admin/pedidos com pedidos do dia.

&nbsp;

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.