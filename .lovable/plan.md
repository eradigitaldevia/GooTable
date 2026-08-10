# Acesso direto "Ver mesa" no admin

Objetivo: permitir que o administrador abra a visão completa da mesa (sessão, comandas, itens, totais) em modo somente leitura, a partir de `/admin/mesas` e clicando no número da mesa em `/admin/pedidos`.

## O que será feito

1. **Nova página de detalhe da mesa no admin** (`/admin/mesas/{id}`)
   - Reaproveita o componente `MesaDetalheView` já existente, em modo somente leitura (sem cancelar pedidos, juntar/dividir comandas, lançar couvert).
   - Faixa de aviso "modo somente leitura" e botão "Voltar" para `/admin/mesas`, no mesmo padrão da visualização da área do garçom.

2. **Botão "Ver mesa" em `/admin/mesas`**
   - Adicionado no card de cada mesa, na área de ações (junto do switch Ativa e do excluir), marcado como `no-print` para não sair na impressão dos QR Codes.

3. **Número da mesa clicável em `/admin/pedidos`**
   - No card do kanban: o texto "Mesa X" vira link para a nova página.
   - Nas tabelas (Histórico, Em aberto, Cancelados): a coluna "Mesa / Cliente" vira link quando o canal é `mesa`.
   - Pedidos de delivery/retirada continuam exibindo o texto atual, sem link.

## Detalhes técnicos

- Novo arquivo `src/routes/_authenticated/admin/mesas_.$mesaId.tsx` com `createFileRoute("/_authenticated/admin/mesas_/$mesaId")`, renderizando `MesaDetalheView` com `readOnly` e `backTo={{ to: "/admin/mesas" }}`.
- `src/components/sala/mesa-detalhe-view.tsx`: acrescentar `{ to: "/admin/mesas" }` ao tipo `BackTo` (união de destinos). Nenhuma outra alteração no componente.
- `src/components/mesas/mesa-card.tsx`: acrescentar `<Link to="/admin/mesas/$mesaId" params={{ mesaId: mesa.id }}>` estilizado como botão.
- `src/components/pedidos/pedido-card.tsx`: envolver o rótulo "Mesa X" em `Link` quando `canal === "mesa"` e houver `mesa_id`, preservando o texto e o estilo atuais (apenas underline no hover).
- `src/components/pedidos/tabela-pedidos.tsx`: mesma abordagem na célula "Mesa / Cliente".
- Sem migrações, sem alteração de server functions, hooks ou regras de negócio. Nenhum comportamento existente é removido.
