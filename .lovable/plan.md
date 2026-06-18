## Problema

`src/components/cardapio/categoria-chip.tsx` (linha 42) usa `window.confirm()` nativo para confirmar a exclusão da categoria. Por isso aparece o dialog do navegador com o título "Uma página incorporada em … diz".

## Correção

Substituir o `confirm()` pelo componente `AlertDialog` do shadcn, que já é o padrão do projeto (`src/components/cardapio/produto-row.tsx`, `produto-card.tsx`, `equipe-panel.tsx`).

### Mudança única em `src/components/cardapio/categoria-chip.tsx`

- Adicionar imports do `AlertDialog` (Trigger, Content, Header, Title, Description, Footer, Action, Cancel) de `@/components/ui/alert-dialog`.
- Trocar o botão "Excluir" por um `<AlertDialogTrigger asChild>` envolvendo o mesmo `<button>` com o ícone `Trash2`.
- Mover a lógica de exclusão para o `onClick` do `AlertDialogAction`.
- Conteúdo do dialog:
  - **Título**: "Excluir categoria?"
  - **Descrição**: "Os produtos vinculados ficarão sem categoria."
  - **Cancelar** / **Excluir** (ação destrutiva — `bg-destructive text-destructive-foreground hover:bg-destructive/90`, mesmo padrão usado em `produto-row.tsx`).

Comportamento atual preservado: toasts de sucesso/erro, chamada de `excluir.mutateAsync`, `onChanged()`.

## Fora de escopo

- Não mexer em outros `confirm()` do projeto.
- Não mexer em estilos visuais do chip, edição inline, ou em qualquer outro componente.
- Não alterar o hook `useExcluirCategoria` nem o backend.

## Arquivo afetado

- `src/components/cardapio/categoria-chip.tsx` (único)

&nbsp;

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.