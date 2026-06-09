# Plano: Melhorias no fluxo de pedidos do cliente

Objetivo: tornar a experiência "uma refeição contínua" em vez de "pedidos isolados", aplicando as 12 oportunidades discutidas. Tudo é frontend + um serverFn de leitura adicional + ativação de Realtime. Sem alterações de schema.

## Escopo das melhorias

1. **Carrinho persistente flutuante** em todas as telas do cliente (cardápio, status, conta, minha conta).
2. **Agrupar pedidos da comanda** na tela de status (timeline da refeição).
3. **Estados de preparo por item** mais claros (bebida pronta vs. prato em preparo).
4. **Confirmação antes de enviar** com resumo (itens, observações, total, tempo estimado).
5. **Observações por item** no carrinho.
6. **Upsell/recomendações** no carrinho.
7. **Polling → Realtime** na tela de status e conta.
8. **Notificação quando o pedido fica pronto** (som + vibração + toast).
9. **Tempo estimado de preparo** por pedido/item.
10. **Chamar garçom com motivo rápido** (FAB existente + drawer com motivos).
11. **Cancelar item pelo cliente até antes do preparo** (regra atualizada — ver detalhes).
12. **Divisão de conta** visual na tela "Conta da mesa" (somente cálculo — ver detalhes).

## Entregas por fase

### Fase 1 — Carrinho persistente + Realtime + Agrupamento (núcleo)

**1.1 Carrinho persistente flutuante**
- Novo `src/components/cliente/carrinho-persistente.tsx`: pílula flutuante (canto inferior direito) com badge de qtd e total; clique navega para `/m/$qrToken/carrinho`.
- Substitui `CarrinhoFlutuante` (barra full-width) por pílula compacta para conviver com FAB "Chamar garçom" e botões da tela de status.
- Mostrado em `/m/$qrToken`, `/m/$qrToken/status/$pedidoId`, `/m/$qrToken/conta`, `/m/$qrToken/minha-conta`.
- Lê do mesmo `localStorage` (`mesa-cart:${qrToken}`) e ouve o evento `mesa-cart-change` já existente.
- Visível só quando há itens e o cliente está identificado.
- Reposicionar `ChamarGarcomFab` com offset quando o carrinho estiver visível.

**1.2 Realtime no status e na conta**
- Novo hook `useRealtimePedidoPublico(restauranteId, pedidoId)` em `src/hooks/use-realtime.ts`: `postgres_changes` em `pedidos` (filtro por `id`) e `pedido_itens` (filtro por `pedido_id`); invalida `["status-pedido-publico", qrToken, pedidoId]` e `["pedidos-comanda", qrToken, comandaId]`.
- Trocar `refetchInterval: 5000` da tela de status pelo hook (mantém o fetch inicial).
- Em `useRealtimeMesa`, trocar `setInterval` por subscrição real a `pedidos`/`pedido_itens` filtrada por `sessao_id`/`comanda_id`.
- Pré-requisito: garantir que `pedidos` e `pedido_itens` estão na `publication supabase_realtime`. Se não estiverem, criar migration `ALTER PUBLICATION supabase_realtime ADD TABLE ...`.

**1.3 Agrupar pedidos da comanda no status**
- Novo serverFn `listarPedidosComandaPublicoFn` em `src/lib/status-pedido-publico.functions.ts`: dado `qrToken` + `comandaId`, valida e retorna lista de pedidos da comanda (id, status, criado_em, total, itens prontos/total).
- Carregar via `useQuery` na tela de status; render como **timeline** ("Pedido #1 entregue · Pedido #2 preparando · Pedido #3 recebido"). Clique expande os itens (reaproveita `ItensPedido`).
- Cabeçalho passa a ser "Sua refeição na Mesa X" + total acumulado.

### Fase 2 — Confirmação, observações, notificações

**2.1 Confirmação antes de enviar** — `AlertDialog` no carrinho com resumo (itens, qtd, obs, total, tempo estimado). Confirmar dispara o envio atual.

**2.2 Observações por item** — campo "Observação" colapsável em `carrinho-item-row.tsx` (tipo `CartItem` já tem `observacao`; falta apenas UI).

**2.3 Notificação "pedido pronto"** — hook `useNotificarPedidoPronto(pedido)`: detecta transição para `pronto`/`entregue` via Realtime e dispara `navigator.vibrate(...)`, beep curto (Web Audio API, sem assets) e `toast.success`. Marca o último status visto em `sessionStorage` por pedido para não repetir.

**2.4 Tempo estimado** — MVP: 15 min comida / 5 min bebida calculado a partir dos itens (usa `destino_preparo` do cardápio público quando disponível; senão soma fixa). Configurável depois.

### Fase 3 — Polish

**3.1 Recomendações/upsell** — bloco "Que tal acompanhar?" no carrinho com até 3 produtos (bebidas/sobremesas) do cardápio em cache.

**3.2 Chamar garçom com motivos** — `ChamarGarcomFab` abre `Drawer` com chips ("Mais um copo", "Talheres", "Conta", "Outro") e envia para o backend de chamados existente.

**3.3 Cancelamento de item pelo cliente (regra atualizada)**
- Regra de negócio: **o cliente só pode cancelar um item enquanto ele estiver com `status = 'pendente'`**. Assim que o item entrar em `em_preparo` (ou `pronto`/`entregue`), o cancelamento pelo cliente fica indisponível. **A capacidade do garçom de cancelar o pedido a qualquer momento permanece intacta** — nenhuma rota/serverFn do garçom é tocada.
- UI: na tela de status, cada item em `pendente` ganha botão "Cancelar este item" (`AlertDialog` de confirmação). Itens em `em_preparo`/`pronto`/`entregue` não exibem o botão.
- Backend: novo `cancelarItemPedidoPublicoFn` em `src/lib/status-pedido-publico.functions.ts`:
  - Valida `qrToken` + `pedidoId` + `itemId` + `comandaId` do cliente (mesma validação de pertença usada nas outras funções públicas).
  - **Guard obrigatório**: só executa se `pedido_itens.status = 'pendente'`. Qualquer outro status retorna erro "Este item já entrou em preparo e não pode mais ser cancelado".
  - Ação: `UPDATE pedido_itens SET status = 'cancelado', ...` recalculando o `pedidos.total` (soma dos itens não-cancelados). Se todos os itens do pedido ficarem cancelados, marca `pedidos.status = 'cancelado'`. Nenhum efeito em comissões/comandas além do recálculo de total.
  - Não altera nenhuma função/fluxo existente do garçom (cancelamento total continua via rotas autenticadas atuais).
- Realtime já cobre a atualização da UI após o cancelamento.

**3.4 Divisão de conta (somente visual — regra atualizada)**
- Botão "Dividir conta" na `m.$qrToken_.conta.tsx` abre `Dialog` puramente de **cálculo visual**:
  - Modo "Igualmente entre N pessoas": input numérico → mostra `total / N` por pessoa.
  - Modo "Por pessoa (referência)": apenas lê o agrupamento `por_cliente` já retornado por `useResumoConta` e exibe quanto cada cliente deve, com botão "Copiar".
- **Restrições explícitas**:
  - **NÃO altera** a separação de pedidos em comandas individuais (lógica de `escolha: "separada"`/`"compartilhada"` em `entrarNaMesaFn` permanece intocada).
  - **NÃO altera** a função de juntar comandas do garçom (`juntarComandasMesaFn` e UI `juntar-comandas-dialog.tsx` permanecem intocadas).
  - **NÃO chama** `gerarDivisaoContaFn` nem persiste divisão alguma — é só apresentação.
  - **NÃO modifica** `comandas`, `pagamentos`, nem qualquer tabela. Nada de mutation.
- Resultado: o cliente vê quanto cada pessoa deve para alinhar pagamento entre si; o fluxo operacional de comandas/pagamento do restaurante segue exatamente como hoje.

## Arquivos afetados

**Novos**
- `src/components/cliente/carrinho-persistente.tsx`
- `src/components/cliente/refeicao-timeline.tsx`
- `src/components/cliente/dividir-conta-dialog.tsx`
- `src/components/cliente/chamar-garcom-drawer.tsx`
- `src/components/cliente/cancelar-item-button.tsx`
- `src/hooks/use-notificar-pedido-pronto.ts`
- `src/hooks/use-pedidos-comanda.ts`

**Editados**
- `src/hooks/use-realtime.ts` — `useRealtimePedidoPublico` + Realtime real em `useRealtimeMesa`.
- `src/lib/status-pedido-publico.functions.ts` — `listarPedidosComandaPublicoFn` + `cancelarItemPedidoPublicoFn` (com guard de `status='pendente'`).
- `src/routes/m.$qrToken.tsx` — usa carrinho persistente; FAB com offset.
- `src/routes/m.$qrToken_.carrinho.tsx` — diálogo de confirmação; observação por item; upsell.
- `src/routes/m.$qrToken_.status.$pedidoId.tsx` — timeline da comanda, realtime, notificação, botão "Cancelar item" por item pendente, carrinho persistente.
- `src/routes/m.$qrToken_.conta.tsx` — botão "Dividir conta" (visual) + carrinho persistente.
- `src/routes/m.$qrToken_.minha-conta.tsx` — carrinho persistente.
- `src/components/cliente/carrinho-item-row.tsx` — campo observação.
- `src/components/cliente/chamar-garcom-fab.tsx` — abre drawer com motivos.

**Possível migration (somente se necessária)**
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos, public.pedido_itens;` — só se ainda não estiverem na publication.

**Removido**
- `src/components/cliente/carrinho-flutuante.tsx`.

## Pontos técnicos

- **Sem alterações de schema** além da publication de realtime (se necessária).
- **Cancelamento de item** sempre revalidado no servidor pelo `status='pendente'`; UI esconde o botão como UX, mas a regra real está no backend.
- **Garçom intocado**: nenhuma rota/serverFn em `_authenticated/`, `sala*`, `cozinha*`, `bar*` é editada. Cancelamentos pelo garçom continuam exatamente como hoje.
- **Divisão de conta**: zero mutations, zero impacto em comandas/pagamentos. Pura UI sobre dados já carregados por `useResumoConta`.
- **Realtime**: cleanup correto em `useEffect`; filtros por `pedido_id`/`comanda_id`/`sessao_id`.
- **localStorage existente** segue como fonte do carrinho.
- **Beep**: Web Audio API, sem assets.

## Ordem de execução

Fase 1 (núcleo) → validar → Fase 2 → Fase 3. Cada fase é independente e testável isoladamente.
