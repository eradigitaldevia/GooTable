# Sugestões do carrinho: destaque manual + contextual

Substituir a regra atual (apenas categorias prioritárias por regex) por uma lógica em 3 camadas, com controle do restaurante e contexto do pedido.

## 1. Banco de dados

Migração adicionando coluna na tabela `produtos`:

- `destaque_upsell boolean NOT NULL DEFAULT false`
- Índice parcial para acelerar a leitura: `CREATE INDEX ON produtos (restaurante_id) WHERE destaque_upsell = true`

Atualizar o select público em `src/lib/cardapio-publico.functions.ts` para retornar o novo campo, e o tipo `ProdutoPublico`.

## 2. Admin do cardápio

Em `src/routes/_authenticated/admin/cardapio.tsx` (ou no formulário de produto correspondente):

- Adicionar um `Switch` "Sugerir no carrinho (upsell)" no formulário de criação/edição de produto.
- Adicionar um ícone de estrela no card do produto na listagem indicando quando está em destaque, com toggle rápido (clique para ligar/desligar) para facilitar a curadoria.
- Persistir via mutação existente de update de produto.

## 3. Nova lógica em `upsell-carrinho.tsx`

Substituir o algoritmo atual por:

```text
candidatos = produtos disponíveis e não presentes no carrinho

categoriasNoCarrinho = set de categoria_id dos itens do carrinho

camada A — destaques: candidatos com destaque_upsell = true,
           ordenados por: (a) categoria ainda não no carrinho, (b) preço asc

camada B — contextuais: candidatos cuja categoria casa regras:
           - se não há bebida no carrinho → 1 bebida
           - se não há sobremesa no carrinho e já existe prato principal → 1 sobremesa
           - evita categorias já presentes
           detecta categoria por nome (regex igual ao atual, mantida como utilitário)

camada C — fallback: demais candidatos disponíveis (qualquer categoria
           ainda não representada), para completar até 3 sugestões

sugestoes = dedup(A ++ B ++ C).slice(0, 3)
```

Comportamento adicional:

- Se `sugestoes` ficar vazio (catálogo pequeno, tudo já no carrinho), não renderiza a seção (igual hoje).
- Mantém o toggle global `upsell_habilitado` do restaurante como gate (sem mudança).
- Sem chamadas extras de rede: tudo derivado de `produtos`/`categorias` já carregados.

## 4. Detalhes técnicos

Arquivos afetados:

- `supabase/migrations/<novo>.sql` — `ALTER TABLE produtos ADD COLUMN destaque_upsell ...` + índice
- `src/integrations/supabase/types.ts` — regenerado após a migração
- `src/lib/cardapio-publico.functions.ts` — incluir `destaque_upsell` no select e no tipo `ProdutoPublico`
- `src/lib/produtos.functions.ts` (ou equivalente do admin) — incluir `destaque_upsell` nos schemas Zod de create/update
- `src/routes/_authenticated/admin/cardapio.tsx` — `Switch` no form + indicador na lista
- `src/components/cliente/upsell-carrinho.tsx` — reescrever `ordenados`/`sugestoes` com as 3 camadas; extrair `detectarCategoria(nome)` para um util pequeno

Sem mudanças em RLS (coluna nova herda as policies existentes de `produtos`).

## 5. Fora de escopo

- Ranking por histórico de pedidos (popularidade real)
- Sugestão por IA
- A/B testing de sugestões

Esses ficam para uma fase futura caso o restaurante peça mais inteligência.
