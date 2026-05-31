## Problema

O papel `caixa` existe no enum do banco e na constante `PAPEIS` (`src/lib/equipe.functions.ts`), mas os três `Select` em `src/components/admin/equipe-panel.tsx` iteram arrays literais hardcoded sem `"caixa"`, então a opção nunca aparece na UI.

## Mudança (apenas 1 arquivo)

`src/components/admin/equipe-panel.tsx` — trocar os 3 arrays literais por `PAPEIS` importado de `@/lib/equipe.functions`:

- Linha 239 (aba **Convidar membro**)
- Linha 295 (aba **Criar conta com senha**)
- Linha 355 (linha do membro existente, dropdown de alterar papel)

Substituir `(["admin", "staff", "cozinheiro", "bar"] as PapelMembro[])` por `PAPEIS` nos três locais e adicionar `PAPEIS` ao import já existente de `@/lib/equipe.functions`.

## Resultado esperado

Em /admin/equipe os três seletores passam a listar: Admin, Staff, Cozinheiro, Bar, **Caixa**. Nada mais é alterado.

## Fora de escopo

- Não mexer em `garcom` (esse papel é gerenciado pela página /admin/garcons, como já indica a nota no painel).
- Nenhuma mudança em banco, server functions, hooks, sidebar ou outras telas.
