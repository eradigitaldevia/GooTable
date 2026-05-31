## Objetivo

Criar uma área dedicada `/caixa` com layout próprio, independente do `/admin`. Operadores com papel `caixa` (e também `admin`/platform admin) usam essa área para abrir/fechar turno, registrar sangrias/suprimentos, ver relatório e confirmar pagamentos pendentes de comandas — sem precisar entrar no painel admin.

## Estrutura de rotas

Novo grupo de rotas sob o gate de autenticação:

```text
src/routes/_authenticated/
  caixa.tsx                 -> layout próprio (header + abas + Outlet)
  caixa.index.tsx           -> /caixa            (painel do turno)
  caixa.movimentos.tsx      -> /caixa/movimentos (sangrias/suprimentos)
  caixa.relatorio.tsx       -> /caixa/relatorio  (histórico/snapshot)
  caixa.pagamentos.tsx      -> /caixa/pagamentos (comandas com pagamento pendente)
```

A rota atual `src/routes/_authenticated/admin/caixa.tsx` passa a ser um simples redirect para `/caixa` (mantém compat de bookmark). O item "Caixa" no `AdminSidebar` é atualizado para apontar para `/caixa` (admin continua acessando a mesma área).

## Layout próprio (`caixa.tsx`)

Componente novo `CaixaShell` (em `src/components/caixa/caixa-shell.tsx`), separado do `AdminSidebar`:

- Header fino: nome do restaurante, nome do operador, badge do status do turno (Aberto/Fechado), botão "Sair".
- Barra de abas horizontal: Caixa | Movimentos | Relatório | Pagamentos.
- `<Outlet />` para a aba ativa.
- Sem sidebar, sem menu admin, sem chamados/badges.
- `beforeLoad` do layout: consulta papel via `getMeuPapelFn` (ou platform admin) — se não for `admin`/`caixa`/platform admin, `throw redirect({ to: "/" })`.

## Conteúdo das abas

- **/caixa (index)**: reaproveita `AbrirCaixaCard` e `TurnoAbertoPainel` que já existem.
- **/caixa/movimentos**: reaproveita `MovimentosPanel`.
- **/caixa/relatorio**: reaproveita `RelatorioPanel`.
- **/caixa/pagamentos** (novo): lista comandas com pagamento em aberto. Detalhe técnico na seção abaixo.

Nenhuma alteração visual nesses 4 componentes existentes — apenas mudam de container.

## Nova tela: Pagamentos pendentes

- Nova server function `listarComandasPagamentoPendenteFn({ restauranteId })` em `src/lib/pagamentos.functions.ts`:
  - Retorna comandas com `status in ('aberta','fechando')` e `total > total_pago`, com `mesa.numero`, `titular`, `subtotal`, `total`, `total_pago`, `restante`, contagem de pagamentos pendentes.
  - Padrão do projeto: `requireSupabaseAuth` + `assertAcessoRestaurante` + role gate (admin/caixa/platform admin).
- Novo hook `useComandasPagamentoPendente` em `src/hooks/use-pagamentos.ts` (TanStack Query, refetch 30s).
- UI: tabela compacta (Mesa | Titular | Total | Pago | Restante | ação). Ação "Registrar/confirmar pagamento" abre o `ConfirmarPagamentoDialog` já existente (sem mudar o dialog). Após sucesso, invalida a query.

Sem novas tabelas, sem migração.

## Login: redirecionar caixa para /caixa

Em `src/routes/login.tsx`, função `resolveDestination`:

- Acrescentar caso `membro?.papel === "caixa"` → `"/caixa"`.
- Demais papéis intocados.

## Sidebar admin

Em `src/components/admin/admin-sidebar.tsx`:

- Trocar o item `"/admin/caixa"` por `"/caixa"`.
- Remover o filtro especial `ehCaixa`/`itensCaixa` (a área dedicada já isola o caixa pelo gate; admins continuam vendo o item).
- Manter ícone `Wallet`.

## Compat da URL antiga

`src/routes/_authenticated/admin/caixa.tsx` vira:

```tsx
beforeLoad: () => { throw redirect({ to: "/caixa", replace: true }); }
```

Assim qualquer bookmark/link antigo segue funcionando.

## Fora de escopo

- Reescrever fluxo de pagamentos (continua o mesmo, só nova listagem).
- Bloquear vendas/pedidos quando não há turno aberto.
- Alterar a função de fechamento, snapshot ou cálculo de diferença.
- Mudanças visuais nas telas Caixa/Movimentos/Relatório já existentes.
- Mudanças em outras áreas (`/admin/*`, `/sala`, `/cozinha`, `/bar`).

## Verificação

1. Login com usuário papel `caixa` → cai em `/caixa` direto.
2. `/caixa` mostra header + 4 abas, sem sidebar admin.
3. Abrir turno, registrar sangria, ver relatório — funciona igual à versão atual.
4. Aba **Pagamentos** lista comandas com saldo a pagar; abrir dialog e confirmar pagamento atualiza a lista.
5. Usuário papel `cozinheiro`/`bar`/`staff` que digite `/caixa` é redirecionado.
6. Admin acessa `/caixa` pela sidebar; bookmark `/admin/caixa` redireciona para `/caixa`.
