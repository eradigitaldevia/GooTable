# Melhorias de UX na página /admin/cardapio

Objetivo: tornar o gerenciamento do cardápio mais rápido e organizado quando o restaurante tem dezenas/centenas de itens. **Sem alterar** nenhuma lógica de cardápio (categorias, produtos, comissão, destinos) — apenas a página `src/routes/_authenticated/admin/cardapio.tsx` e componentes de apresentação.

## Melhorias propostas

### 1. Barra de busca de produtos

Campo de texto no topo da seção de produtos que filtra por **nome** e **descrição** (case-insensitive, sem acento). Ícone de lupa, botão "limpar", contador "X de Y produtos".

### 2. Filtros rápidos (chips)

Logo abaixo da busca, chips de filtro combinável:

- **Categoria**: clicar em um chip da seção "Categorias" passa a filtrar a grid (visual de "selecionado"). Inclui chip "Sem categoria".
- **Disponibilidade**: Todos / Disponíveis / Indisponíveis.
- **Destino**: Todos / Cozinha / Bar (deriva de `destino_override` ou `categoria.destino`).
- Chip "Limpar filtros" quando algum filtro estiver ativo.

### 3. Agrupamento por categoria (toggle)

Botão de alternância **"Agrupar por categoria"** (padrão ligado). Quando ligado: cada categoria vira uma sub-seção com seu próprio cabeçalho (nome + contagem + destino). Quando desligado: grid plana como hoje.

### 4. Ordenação

Select com opções: **Ordem padrão** (atual), **Nome A–Z**, **Preço ↑**, **Preço ↓**, **Indisponíveis primeiro**. Persistente apenas durante a sessão.

### 5. Alternância de visualização: Grid / Lista

Botão Grid (atual) vs Lista densa (linhas compactas com thumb pequena, nome, categoria, preço, switch, ações) — útil para varrer muitos itens rapidamente.

### 6. Estados vazios contextuais

Quando filtros não retornam nada: mensagem clara "Nenhum produto corresponde aos filtros" + botão "Limpar filtros". Hoje, com filtros aplicados, a grid simplesmente fica vazia.

### 7. Sticky toolbar

Header + busca/filtros ficam grudados no topo ao rolar (`sticky top-0`), com leve blur de fundo. Categorias permanecem como seção rolável acima.

### 8. Atalhos de teclado

- `/` foca a busca
- `Esc` limpa a busca

### 9. Melhorias visuais menores no ProdutoCard

- Mostrar **destino** (Cozinha/Bar) como badge discreto ao lado da categoria.
- Mostrar indicador quando o produto tem **comissão customizada** (`percentual_comissao` não nulo) — pequeno badge "%".
- Confirmar exclusão com `AlertDialog` em vez de `confirm()` nativo (consistência visual já usada em outras telas).

### 10. Contagem global no header

"Cardápio" passa a exibir, no subtítulo, contagens vivas: "X categorias · Y produtos (Z disponíveis)".

## Escopo técnico

Arquivos afetados (apenas apresentação):

- `src/routes/_authenticated/admin/cardapio.tsx` — estado local de busca/filtros/ordenação/visualização, derivação de lista filtrada, toolbar sticky, agrupamento.
- `src/components/cardapio/produto-card.tsx` — badges de destino/comissão, troca de `confirm()` por `AlertDialog`.
- Novo `src/components/cardapio/produto-row.tsx` — linha densa para o modo "Lista".
- Novo `src/components/cardapio/cardapio-toolbar.tsx` — encapsula busca/filtros/ordenação/visualização (mantém o route file enxuto).

**Não serão tocados**: hooks (`use-cardapio`), server functions (`cardapio.functions.ts`), schemas, banco, dialogs de criação/edição, lógica de destino/comissão.

Persistência das preferências (ordenação/visualização/agrupamento): apenas em estado React (sessão). Sem `localStorage` para manter escopo mínimo.

## Sugestões fora do escopo (não implementar agora)

Drag-and-drop para reordenar produtos/categorias, duplicar produto, ações em lote (selecionar vários e marcar indisponível/excluir), import/export CSV — exigiriam alterações em server functions e banco.

## Pergunta antes de partir para o plano final

Quer que eu inclua **todas** as 10 melhorias acima, ou prefere selecionar um subconjunto (ex.: só 1, 2, 3, 6 para um primeiro passo mais focado)?  
  
Resposta: incluas as melhorias 1, 2, 3, 4, 5, 6, 9 e 10.  


  
IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada. 

NÃO refatore, otimize, melhore ou modifique código não relacionado. 

NÃO faça suposições. 

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa. 

Preserve 100% do comportamento e da funcionalidade existentes.