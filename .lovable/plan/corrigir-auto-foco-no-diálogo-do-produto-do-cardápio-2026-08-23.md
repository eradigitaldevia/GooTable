# Corrigir auto-foco no diálogo do produto do cardápio

## Problema
No cardápio público, ao tocar em um produto, o diálogo de detalhes abre com o campo **Observação (opcional)** já focado, forçando a abertura do teclado. Isso cria uma interação desnecessária, pois a maioria dos clientes não adiciona observação.

## Causa
O componente `DialogContent` (Radix UI) foca automaticamente o primeiro elemento focável ao abrir. Como o `Textarea` de observação é o primeiro campo do formulário, ele recebe foco e dispara o teclado em dispositivos móveis.

## Solução
Interromper o comportamento padrão de auto-foco do diálogo, mantendo a usabilidade: o cliente ainda pode tocar no campo de observação manualmente se desejar.

## Arquivos alterados
- `src/components/cliente/produto-dialog.tsx`

## Implementação
1. Adicionar `onOpenAutoFocus={(e) => e.preventDefault()}` no `DialogContent`.
2. Garantir que o campo de observação não tenha `autoFocus={true}` (hoje não tem, mas confirmar).
3. Validar no preview mobile que o teclado não abre automaticamente ao abrir o produto.

## Critério de aceitação
- Ao tocar em um produto no cardápio, o diálogo abre sem o teclado ser exibido.
- O campo de observação continua disponível para edição quando o cliente toca nele.
- A acessibilidade do diálogo não é quebrada (foco pode ser redirecionado para o título ou botão de fechar se necessário, mas a prioridade é não focar o textarea).
