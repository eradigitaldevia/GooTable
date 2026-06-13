## Objetivo

Agrupar **Cardápio**, **Destinos de preparo** e **Prévia do cardápio** em uma única página com abas em `/admin/cardapio`, preservando 100% do comportamento atual. Sidebar passa a ter apenas o item "Cardápio".

## Estrutura final

```
/admin/cardapio?tab=itens      → conteúdo atual de cardapio.tsx
/admin/cardapio?tab=destinos   → conteúdo atual de destinos-preparo.tsx
/admin/cardapio?tab=previa     → conteúdo atual de cardapio-preview.tsx
```

Default: `tab=itens`. URLs antigas redirecionam para a nova com a aba correspondente.

## Arquivos afetados (6)

1. **Criar** `src/components/cardapio/cardapio-itens-panel.tsx` — extrai o corpo de `cardapio.tsx` (todo o conteúdo do `function Cardapio()`, sem `createFileRoute` nem `loader`).
2. **Criar** `src/components/cardapio/destinos-preparo-panel.tsx` — extrai o corpo de `destinos-preparo.tsx`.
3. **Criar** `src/components/cardapio/cardapio-previa-panel.tsx` — extrai o corpo de `cardapio-preview.tsx`.
4. **Reescrever** `src/routes/_authenticated/admin/cardapio.tsx` — vira shell com Tabs (`shadcn/ui Tabs`), `validateSearch` com `tab` via `zodValidator + fallback`, mantém o `loader` que pré-carrega `["cardapio", restauranteId]`. Renderiza o panel ativo conforme `tab`.
5. **Reescrever** `src/routes/_authenticated/admin/cardapio-preview.tsx` — vira apenas um redirect (`beforeLoad: () => redirect({ to: "/admin/cardapio", search: { tab: "previa" } })`), preservando bookmarks.
6. **Reescrever** `src/routes/_authenticated/admin/destinos-preparo.tsx` — idem, redirect para `?tab=destinos`.
7. **Editar** `src/components/admin/admin-sidebar.tsx` — no grupo "Mesas & Cardápio", remover os itens "Prévia do cardápio" e "Destinos de preparo". Manter apenas "Mesas" e "Cardápio".

## Detalhes técnicos

- **Tabs**: `shadcn/ui Tabs` (já usado em Couvert artístico, Configurações). Layout: `TabsList` no topo, abaixo do `<h1>` da página, com 3 triggers: "Itens", "Destinos de preparo", "Prévia".
- **Header da página**: um único `<h1>Cardápio</h1>` no shell. Os panels removem o próprio `<h1>` (Cardápio / Destinos de preparo / Prévia do cardápio) e mantêm apenas o conteúdo (toolbar, ações, tabelas, etc.). Subtítulo descritivo fica na aba ativa quando fizer sentido.
- **Ações do header (botões "Nova categoria" / "Novo produto")**: ficam dentro do panel "Itens" (continuam visíveis só quando a aba Itens está ativa), preservando comportamento atual.
- **Search param `tab**`: `validateSearch` com `zodValidator(z.object({ tab: fallback(z.enum(["itens","destinos","previa"]), "itens").default("itens") }))`. Troca de aba via `navigate({ search: { tab } })` — sem reload, mantém cache.
- **Loader**: mantém `ensureQueryData(["cardapio", restauranteId])` no shell — já cobre as 3 abas (todas usam `useCardapio`).
- **Redirects**: nas rotas antigas, `beforeLoad` chama `redirect({ to: "/admin/cardapio", search: { tab: "destinos" | "previa" }, replace: true, throw: true })`. Componente fica vazio (`() => null`).
- **Sidebar**: o item "Cardápio" continua com `exact: true`. Como `?tab=...` é search param, o active state continua funcionando para qualquer aba.
- **Permissões / gates**: nenhuma das 3 rotas hoje tem gate de papel — nada muda.

## O que NÃO muda

- Nenhuma regra de negócio, query, mutation, validação ou endpoint backend.
- Nenhum componente filho (`CategoriaDialog`, `ProdutoDialog`, `CardapioToolbar`, `ProdutoCard`, `ProdutoRow`, `CategoriaChip`, `TemaCardapioProvider`, etc.).
- Nenhum hook (`useCardapio`, `useMeuRestaurante`, etc.).
- Layout interno de cada panel — só remove o `<h1>` duplicado.
- Estilo, cores, espaçamentos, ícones do sidebar dos demais grupos.

## Pontos a confirmar antes de implementar

1. **Header unificado**: ok manter `<h1>Cardápio</h1>` no shell e remover os títulos individuais dos 3 panels? (alternativa: manter o `<h1>` de cada panel, sem título global)
2. **Botões "Nova categoria / Novo produto"**: confirmar que devem aparecer **apenas** na aba Itens (comportamento mais limpo) — ou mantê-los visíveis sempre no header global?
3. **Subtítulo de contagem** ("X categorias · Y produtos") da página atual de cardápio: mantenho dentro da aba Itens (junto da seção Produtos) ou subo para o shell ao lado do `<h1>`?

Confirmações:  
1. ok manter `<h1>Cardápio</h1>` no shell e remover os títulos individuais dos 3 panels  
2. devem aparecer **apenas** na aba Itens (comportamento mais limpo)   
3. manter dentro da aba Itens