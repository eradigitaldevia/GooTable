# Plano: Refinamentos do Upsell (3, 5, 7, 8)

Implementar 4 melhorias na sugestão de upsell sem alterar schema do banco.

## 3) Ocultar upsell quando o carrinho está vazio

**Arquivo:** `src/components/cliente/upsell-carrinho.tsx`

- Adicionar guarda no início: se `items.length === 0`, retornar `null`.
- Mantém o componente visível assim que o cliente adicionar o 1º item.

## 5) Rotação por sessão via localStorage

**Arquivo novo:** `src/lib/upsell-rotacao.ts`

- Funções `registrarImpressao(qrToken, produtoId)` e `getImpressoes(qrToken): Record<string, number>`.
- Storage key: `upsell:imp:<qrToken>` com TTL de 6h (expira no carregamento se ultrapassado).
- Estrutura: `{ ts: number, counts: Record<string, number> }`.

**Arquivo:** `src/lib/upsell.ts`

- Adicionar 6º parâmetro opcional `impressoes?: Record<string, number>` em `sugerirUpsell`.
- Ao ordenar cada camada (A/B/C), deprioriza itens com `impressoes[id] >= 2` (joga para o fim, mantendo ordem interna).

**Arquivo:** `src/components/cliente/upsell-carrinho.tsx`

- Ler impressões com `getImpressoes(qrToken)` e passar para `sugerirUpsell`.
- Em `useEffect`, ao renderizar as sugestões, chamar `registrarImpressao` para cada `id` exibido (uma vez por mudança de lista).

## 7) Thumbnails nas sugestões

**Arquivo:** `src/components/cliente/upsell-carrinho.tsx`

- Renderizar `<img src={p.imagem_url}>` (16x16 → `h-12 w-12 rounded-md object-cover`) ao lado esquerdo do nome quando `imagem_url` existir.
- Fallback: ícone neutro (`<UtensilsCrossed />` em caixa cinza) quando não há imagem.
- `loading="lazy"` e `decoding="async"`.

## 8) Badges de motivação

**Arquivo:** `src/lib/upsell.ts`

- Trocar retorno de `sugerirUpsell` para `Array<{ produto: ProdutoPublico; motivo: MotivoUpsell }>`.
- Tipo `MotivoUpsell = "destaque" | "bebida" | "sobremesa" | "popular"`.
  - Camada A → `"destaque"`
  - Camada B (bebida) → `"bebida"`
  - Camada B (sobremesa) → `"sobremesa"`
  - Camada C → `"popular"`

**Arquivo:** `src/components/cliente/upsell-carrinho.tsx`

- Map `motivo → { label, icon }`:
  - `destaque` → ⭐ Destaque
  - `bebida` → 🥤 Combina com seu pedido
  - `sobremesa` → 🍰 Para finalizar
  - `popular` → 👍 Mais pedidos
- Renderizar como `<Badge variant="secondary" className="text-[10px]">` acima/abaixo do preço.

## Detalhes técnicos

- Sem mudança de schema, RLS, ou edge function.
- Sem mudança no fluxo `produtosJaPedidos` já implementado.
- Camada A continua respeitando ordenação por tipo novo + preço; rotação age como tiebreaker final.
- Build TS: tipo de retorno muda em `sugerirUpsell` — único consumidor é `UpsellCarrinho`, então é seguro.

## Fora de escopo

- `bloqueado_upsell` (rec #1), filtro por ticket (#2), tabela `upsell_eventos` (#4), `tipo_upsell` em categorias (#6), A/B test do título (#9).
