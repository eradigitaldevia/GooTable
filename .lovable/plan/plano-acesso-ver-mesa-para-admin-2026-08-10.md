# Plano: Acesso "Ver mesa" para Admin

## Objetivo

Permitir que o administrador visualize a conta detalhada de uma mesa (sessão, comandas, pedidos, totais) a partir de três pontos de entrada, sempre em modo somente leitura:

1. Botão "Ver mesa" no card de cada mesa em `/admin/mesas`
2. Número da mesa clicável nos cards do Kanban em `/admin/pedidos` (aba Hoje)
3. Número da mesa clicável na coluna "Mesa / Cliente" das tabelas de pedidos (abas Histórico, Em Aberto, Cancelados)

Somente pedidos de salão (canal `mesa`) terão o link. Pedidos de delivery/retirada continuam exibindo texto simples, sem link.

## Etapa 1 — Nova rota read-only `/admin/mesas/$mesaId`

**Arquivo novo:** `src/routes/_authenticated/admin/mesas_.$mesaId.tsx`

Seguir o padrão da rota existente `garcons_.$garcomId.sala_.mesa.$mesaId.tsx`:
- `createFileRoute("/_authenticated/admin/mesas/$mesaId")`
- Banner amarelo "Visualizando — modo somente leitura" (igual à rota do garçom)
- Botão "Voltar" → `<Link to="/admin/mesas">`
- Renderiza `<MesaDetalheView mesaId={mesaId} readOnly backTo={{ to: "/admin/mesas" }} />`

## Etapa 2 — Estender `BackTo` em `MesaDetalheView`

**Arquivo:** `src/components/sala/mesa-detalhe-view.tsx`

- Adicionar `{ to: "/admin/mesas" }` ao tipo `BackTo` (linha 65-67)
- Adicionar branch no `backLink` (linha 172-183) para renderizar `<Link to="/admin/mesas">Voltar</Link>` quando `backTo.to === "/admin/mesas"`

## Etapa 3 — Botão "Ver mesa" no `MesaCard`

**Arquivo:** `src/components/mesas/mesa-card.tsx`

- Adicionar `import { Link } from "@tanstack/react-router"` e ícone `Eye` do lucide-react
- Na área `no-print` (linha 74), adicionar um botão "Ver mesa" como `<Link to="/admin/mesas/$mesaId" params={{ mesaId: mesa.id }}>` com `variant="outline"` e `size="sm"`
- Mantê-lo oculto na impressão (já está dentro do bloco `no-print`)

## Etapa 4 — Número da mesa clicável no Kanban (`PedidoCard`)

**Arquivo:** `src/components/pedidos/pedido-card.tsx`

- Adicionar `import { Link } from "@tanstack/react-router"`
- Na linha 90-97, quando o canal for `mesa` (ou nulo), envolver o texto `Mesa {mesaNumero}` em um `<Link to="/admin/mesas/$mesaId" params={{ mesaId: pedido.mesa_id }}>` com `onClick={(e) => e.stopPropagation()}` para não acionar o `onClick` do card
- Pedidos de delivery/retirada continuam como texto simples (sem link)

## Etapa 5 — Número da mesa clicável nas tabelas (`TabelaPedidos`)

**Arquivo:** `src/components/pedidos/tabela-pedidos.tsx`

- Adicionar `import { Link } from "@tanstack/react-router"`
- Na coluna "Mesa / Cliente" (linha 162), quando `canal === "mesa"` e `mesa` existir, renderizar `<Link to="/admin/mesas/$mesaId" params={{ mesaId: p.mesa_id }}>` com `onClick={(e) => e.stopPropagation()}` envolvendo o texto `Mesa {mesa}`
- O `onClick` da linha (linha 141) já filtra cliques em `button, [role=checkbox], input` — adicionar `a` ao seletor `closest()` para evitar conflito
- Delivery/retirada continuam exibindo o nome do cliente como texto simples

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/routes/_authenticated/admin/mesas_.$mesaId.tsx` | **Novo** — rota read-only |
| `src/components/sala/mesa-detalhe-view.tsx` | Editar — tipo `BackTo` + branch do link |
| `src/components/mesas/mesa-card.tsx` | Editar — botão "Ver mesa" |
| `src/components/pedidos/pedido-card.tsx` | Editar — link no número da mesa |
| `src/components/pedidos/tabela-pedidos.tsx` | Editar — link na coluna "Mesa / Cliente" |

Nenhuma alteração em banco de dados, regras de negócio, ou componentes não relacionados.
