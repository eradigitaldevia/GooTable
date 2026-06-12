## Objetivo

Tornar o upsell no carrinho **estritamente manual**: só aparecem produtos marcados com "Sugerir no carrinho (upsell)" (`destaque_upsell = true`). Se não houver nenhum marcado, a seção simplesmente não aparece — sem complementação automática por bebida, sobremesa ou populares.

## Diagnóstico atual

`src/lib/upsell.ts` → função `sugerirUpsell` usa 3 camadas:
- **A (manual)**: produtos com `destaque_upsell = true`
- **B (contextual)**: bebida se faltar, sobremesa se houver prato e faltar sobremesa — por regex no nome da categoria
- **C (fallback)**: qualquer outro produto disponível ordenado por menos visto + preço

As camadas B e C explicam a "complementação automática" que você quer remover. O componente `upsell-carrinho.tsx` já esconde a seção quando `sugestoes.length === 0`, então basta a função devolver array vazio quando não houver destaques.

## Mudança proposta

**Arquivo único:** `src/lib/upsell.ts`

1. Remover as camadas B (contextual) e C (fallback) da função `sugerirUpsell`.
2. Manter apenas a camada A: filtrar `candidatos` por `destaque_upsell === true`, com a ordenação atual (menos visto → tipo novo no carrinho → menor preço), dedup e `max`.
3. Manter assinatura da função e o tipo `SugestaoUpsell` — todos os retornos passam a ter `motivo: "destaque"`.
4. O tipo `MotivoUpsell` pode permanecer como está (união com `"bebida" | "sobremesa" | "popular"`) para não mexer em `upsell-carrinho.tsx`; esses valores simplesmente deixam de ocorrer em runtime. Sem mudança no componente, sem mudança no schema, sem mudança no backend.

## Outras alterações realizadas

- Texto de ajuda na aba Cardápio da tela de Configurações atualizado em `src/routes/_authenticated/admin/configuracoes.tsx` para refletir que o sistema não faz complementação automática e que o bloco não aparece se nenhum produto estiver marcado.

## Efeito visível

- Sem nenhum produto marcado → bloco "Que tal acompanhar?" não aparece.
- Com 1, 2 ou 3 produtos marcados → aparecem apenas eles, ordenados pelos mesmos critérios de hoje.
- Com mais de 3 marcados → mostra os 3 melhores pelo critério atual.
