
## Contexto

A rota `/admin/garcons/$garcomId/sala` permite que o admin visualize a área do garçom em modo "somente leitura". Hoje:

- Os cards de mesa em `MinhasMesasGrid` navegam para `/sala/mesa/$mesaId` (rota do próprio garçom), saindo do contexto admin.
- `MesaDetalhePage` (`/sala/mesa/$mesaId`) sempre volta para `/sala` e expõe ações de escrita (cancelar pedido/item, dividir, juntar, lançar couvert, confirmar pagamento) — sem flag `readOnly`.
- O header da página de detalhe da mesa não é `sticky` (apenas o `SalaHeader` é).
- `carregarSalaAdminFn` sempre lista só as mesas atribuídas via `mesa_garcom`, ignorando `permitir_atendimento_cruzado=true`. Já a `carregarSalaFn` (garçom) mostra todas as mesas ativas quando cruzado está ON.

## Mudanças

### 1) Voltar para a área do garçom (admin)

- Adicionar prop `readOnly?: boolean` em `MinhasMesasGrid` que troca o `<Link>` do card por um `<Link>` para `/admin/garcons/$garcomId/sala/mesa/$mesaId` (nova rota — ver passo 2). O botão "+" de novo pedido já fica desabilitado em readOnly (comportamento atual).
- Em `src/routes/_authenticated/admin/garcons_.$garcomId.sala.tsx`, passar `garcomId` para `MinhasMesasGrid` para montar o link admin.

### 2) Detalhe da mesa em modo readOnly (admin)

Criar nova rota admin que reaproveita o componente de detalhe:

- Novo arquivo `src/routes/_authenticated/admin/garcons_.$garcomId.sala_.mesa.$mesaId.tsx` — render igual a `sala_.mesa.$mesaId.tsx`, porém:
  - banner amarelo "Visualizando como X — somente leitura" (igual ao de `garcons_.$garcomId.sala`).
  - botão Voltar → `/admin/garcons/$garcomId/sala`.
  - passa `readOnly` para `DetalhePedido` e oculta botões "Juntar comandas", "Dividir total", "Lançar couvert", "Remover couvert".

Refatorar `MesaDetalhePage` para extrair o conteúdo num componente compartilhado `MesaDetalheView` (em `src/components/sala/mesa-detalhe-view.tsx`) com prop `readOnly` e prop opcional `backTo` ({ to, params }). As duas rotas (garçom e admin) renderizam esse componente.

### 3) Header `DetalhePedido` em modo readOnly

Adicionar prop `readOnly?: boolean` em `DetalhePedido`:

- Quando `true`: ocultar botão "Cancelar pedido", botão "Trash" por item, botão "Confirmar pagamento" e botão "Confirmar PIX".
- A área admin (passo 2) passa `readOnly`.

### 4) Header fixo na página de detalhe da mesa

No header da `MesaDetalheView` (extraído no passo 2), aplicar `sticky top-0 z-10 bg-card/95 backdrop-blur` (mesmo padrão de `SalaHeader`). Vale para garçom e admin.

### 5) Listagem de mesas no admin respeitando `permitir_atendimento_cruzado`

Em `src/lib/sala.functions.ts` → `carregarSalaAdminFn`:

- Ler `permitir_atendimento_cruzado` do restaurante (já lido) e, quando `true`, listar todas as mesas ativas do restaurante com `is_virtual=false` (mesmo SELECT já usado em `carregarSalaFn`), ordenando por número. Quando `false`, manter o comportamento atual (somente atribuídas via `mesa_garcom`).
- Preservar o cálculo de `pedidos_prontos` e `chamados_pendentes` (já depende de `mesaIds`, então passa a refletir todas as mesas quando cruzado está ON, idêntico ao garçom).

## Arquivos afetados

- `src/lib/sala.functions.ts` (passo 5)
- `src/components/sala/minhas-mesas-grid.tsx` (passo 1 — prop `adminGarcomId?`)
- `src/components/sala/mesa-detalhe-view.tsx` (novo — extração do conteúdo atual de `MesaDetalhePage`)
- `src/components/pedidos/detalhe-pedido.tsx` (passo 3 — prop `readOnly`)
- `src/routes/_authenticated/sala_.mesa.$mesaId.tsx` (passa a usar `MesaDetalheView`; header sticky)
- `src/routes/_authenticated/admin/garcons_.$garcomId.sala.tsx` (passa `adminGarcomId` ao grid)
- `src/routes/_authenticated/admin/garcons_.$garcomId.sala_.mesa.$mesaId.tsx` (novo — usa `MesaDetalheView` em readOnly)

## Fora de escopo

- Erro de hidratação `<a>` aninhado em `MinhasMesasGrid` (Link dentro de Link). Não foi pedido; deixo para um PR específico.
- Mudanças visuais/de estilo além do `sticky` do header.
