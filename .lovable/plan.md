# Plano: Estados visuais das mesas em /admin/mesas (com realtime)

## Objetivo

Substituir o único destaque atual ("Em atendimento" verde para qualquer sessão aberta) por uma escala de situações, mostrar resumo de pedidos/valor no card e atualizar o grid em tempo real.

## Situações

| Situação | Regra | Visual |
|---|---|---|
| `livre` | sem sessão aberta | card atual, sem destaque |
| `aguardando` | sessão aberta, nenhum pedido | contorno âmbar + badge "Aguardando pedido" |
| `em_atendimento` | sessão aberta com pedidos ativos (recebido/em_preparo/pronto) | contorno verde + badge "Em atendimento" |
| `a_pagar` | sessão aberta, comanda aberta, sem pedidos ativos e com consumo lançado | contorno azul + badge "Sem pedidos ativos" |

Prioridade de avaliação: `a_pagar` só quando não há pedido ativo; `em_atendimento` prevalece sobre `a_pagar`.

## Etapa 1 — Agregado no backend

**Arquivo:** `src/lib/mesas.functions.ts`

- Em `listarMesasFn`, após buscar mesas e sessões abertas, consultar:
  - `pedidos` (mesa_id, status, total) das sessões abertas, status em `recebido|em_preparo|pronto`;
  - `comandas` (sessao_id, status, total) com `status = 'aberta'` das sessões abertas.
- Derivar por mesa: `situacao`, `pedidos_ativos` (contagem) e `total_parcial` (soma das comandas abertas da sessão).
- Estender a interface `Mesa` com `situacao`, `pedidos_ativos`, `total_parcial`, mantendo `sessao_aberta` para compatibilidade.
- Toda a regra fica no servidor; o frontend apenas mapeia a string.

## Etapa 2 — Card com estados e resumo

**Arquivo:** `src/components/mesas/mesa-card.tsx`

- Mapear `situacao` para cor de borda/ring e rótulo do badge (tabela acima), substituindo a condição booleana atual.
- Quando houver sessão aberta, exibir uma linha compacta: "N pedido(s) • R$ total" (oculta quando `livre`).
- Manter QR, switch e ações inalterados; destaque e resumo suprimidos na impressão (`no-print` / regras de print já existentes).

## Etapa 3 — Realtime no grid

**Arquivos:** `src/hooks/use-mesas.ts` e `src/routes/_authenticated/admin/mesas.tsx`

- Novo hook `useRealtimeMesas(restauranteId)` em `src/hooks/use-mesas.ts`: um canal Supabase (`useEffect`, com `removeChannel` no cleanup) escutando `mesa_sessoes`, `pedidos` e `comandas` filtrados por `restaurante_id`, invalidando `queryKeys.mesas(restauranteId)`.
- Chamar o hook em `/admin/mesas`. Invalidação com pequeno debounce para evitar rajadas.
- Requer Realtime habilitado para `mesa_sessoes`, `pedidos` e `comandas`; se alguma tabela não estiver na publicação, será adicionada por migração (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`), sem alterar schema, RLS ou dados.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/lib/mesas.functions.ts` | Editar — agregado de situação/pedidos/total |
| `src/components/mesas/mesa-card.tsx` | Editar — estados visuais + resumo |
| `src/hooks/use-mesas.ts` | Editar — hook de realtime |
| `src/routes/_authenticated/admin/mesas.tsx` | Editar — ativar realtime |
| Migração | Apenas publicação de realtime, se necessário |

Nenhuma mudança em regras de negócio existentes, layout geral ou outras páginas.
